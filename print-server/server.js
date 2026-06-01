/**
 * Un Momento Print Server
 * Runs on booth laptop/Pi — polls print queue and sends jobs to printers
 * 
 * Supports:
 *   - Liene M100 x2 (photo prints via Windows printer)
 *   - Liene PixCut S1 x2 (sticker prints via Liene Photo app DB injection)
 */

const { execSync, exec } = require('child_process');
const fs   = require('fs');
const path = require('path');
const http = require('https');

// ── CONFIG ────────────────────────────────────────────────────────────────────
const CONFIG = {
  // Your Supabase API
  supabaseUrl:  process.env.SUPABASE_URL  || 'https://lmdkpnakmpwueocratof.supabase.co',
  supabaseKey:  process.env.SUPABASE_KEY  || '', // set in .env
  
  // Picker API base URL
  apiBase: process.env.API_BASE || 'https://www.unmomentoprints.com',
  pickerPin: process.env.PICKER_PIN || '2026',

  // Poll interval (ms)
  pollInterval: 30000, // 30 seconds

  // Printers (Windows printer names)
  printers: {
    photo: [
      'Liene M100 001',
      'Liene M100 002',
    ],
    sticker: [
      'Liene PixCut S1 1001',
      'Liene PixCut S1 1002',
    ],
  },

  // Liene app data path
  lieneDataPath: path.join(
    process.env.APPDATA || '',
    'com.hannto',
    'Liene Photo'
  ),

  // Liene user ID (from login)
  lieneUserId: '74ac2c7e45d811f1891602747969286b',

  // PixCut device IDs
  pixcutDevices: [
    '1121LW62104RD', // PixCut S1-6899
    '1121LW611018Y', // PixCut S1-29C4
  ],

  // Temp directory for print files
  tempDir: path.join(process.env.TEMP || 'C:\\Temp', 'unmomento-print'),

  // Media sizes / types for PixCut
  pixcut: {
    mediaSize: 5013,   // 4x7 sticker sheet
    mediaType: 2030,   // sticker media
    jobType:   600,    // standard job
  },
};

// ── PLT TEMPLATES (pre-generated cut paths) ──────────────────────────────────
// These are fixed cut paths for standard shapes on 4x7 sticker sheet
// Generated from analyzing the sample cut.plt file

const PLT_CIRCLE = (cx, cy, r) => {
  // Generate approximate circle in HPGL
  const points = [];
  const steps  = 72;
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const x     = Math.round(cx + r * Math.cos(angle));
    const y     = Math.round(cy + r * Math.sin(angle));
    points.push(`${i===0?'U':'D'}${x},${y}`);
  }
  return points.join(' ') + ' @';
};

const PLT_ROUNDED_RECT = (x, y, w, h, r) => {
  // Rounded rectangle HPGL path
  return [
    `U${x+r},${y}`,
    `D${x+w-r},${y}`,
    `D${x+w},${y+r}`,
    `D${x+w},${y+h-r}`,
    `D${x+w-r},${y+h}`,
    `D${x+r},${y+h}`,
    `D${x},${y+h-r}`,
    `D${x},${y+r}`,
    `D${x+r},${y}`,
    '@'
  ].join(' ');
};

// Pre-built PLT for standard 4x7 full sheet (single sticker)
const PLT_FULL_SHEET = `IN VER0.1.0 KP42 U36,36 D3924,36 D3924,5004 D36,5004 D36,36 @`;

// ── SQLITE INJECTION ──────────────────────────────────────────────────────────
// We write print jobs to ht_device_kit.db using PowerShell + built-in SQLite
function injectPixcutJob(filePath, pltPath, deviceId, copies = 1) {
  const dbPath  = path.join(CONFIG.lieneDataPath, 'ht_device_kit.db');
  const jobInfo = JSON.stringify({
    uid:       CONFIG.lieneUserId,
    did:       deviceId,
    mediaSize: CONFIG.pixcut.mediaSize,
    mediaType: CONFIG.pixcut.mediaType,
    jobType:   CONFIG.pixcut.jobType,
    copies,
    filePath:  filePath.replace(/\\/g, '\\\\'),
    pltPath:   pltPath.replace(/\\/g, '\\\\'),
    state:     null,
    jobState:  0, // 0 = pending
  }).replace(/'/g, "''");

  const sql = `INSERT INTO jobs (user_id, jobInfo) VALUES ('${CONFIG.lieneUserId}', '${jobInfo}');`;
  
  // Use PowerShell to run SQLite via .NET
  const psCmd = `
    Add-Type -Path "C:\\Program Files\\Liene Photo\\e_sqlite3.dll" 2>$null;
    $conn = New-Object System.Data.SQLite.SQLiteConnection("Data Source=${dbPath}");
    $conn.Open();
    $cmd = $conn.CreateCommand();
    $cmd.CommandText = '${sql}';
    $cmd.ExecuteNonQuery();
    $conn.Close();
  `;

  try {
    execSync(`powershell -Command "${psCmd}"`, { timeout: 5000 });
    console.log(`[pixcut] job injected for device ${deviceId}`);
    return true;
  } catch (e) {
    console.error('[pixcut] DB inject failed:', e.message);
    return false;
  }
}

// ── WINDOWS PRINT (M100) ──────────────────────────────────────────────────────
function printToM100(filePath, printerName, copies = 1) {
  try {
    // Use PowerShell to print JPEG to Windows printer
    const psCmd = [
      `$img = [System.Drawing.Image]::FromFile('${filePath.replace(/\\/g, '\\\\')}');`,
      `$pd = New-Object System.Drawing.Printing.PrintDocument;`,
      `$pd.PrinterSettings.PrinterName = '${printerName}';`,
      `$pd.PrinterSettings.Copies = ${copies};`,
      `$pd.add_PrintPage({`,
      `  param($s, $e)`,
      `  $e.Graphics.DrawImage($img, $e.MarginBounds);`,
      `  $img.Dispose();`,
      `});`,
      `$pd.Print();`,
    ].join(' ');

    execSync(`powershell -Command "Add-Type -AssemblyName System.Drawing; ${psCmd}"`, {
      timeout: 30000,
    });
    console.log(`[m100] printed to ${printerName}`);
    return true;
  } catch (e) {
    console.error(`[m100] print failed on ${printerName}:`, e.message);
    return false;
  }
}

// ── DOWNLOAD FILE ─────────────────────────────────────────────────────────────
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    http.get(url, res => {
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(destPath); });
    }).on('error', err => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

// ── SUPABASE API ──────────────────────────────────────────────────────────────
async function fetchPrintQueue() {
  const url = `${CONFIG.supabaseUrl}/rest/v1/print_queue?status=eq.queued&select=*,orders(buyer_name,buyer_phone,order_number,product_type)&order=priority.asc,queued_at.asc&limit=10`;
  
  return new Promise((resolve, reject) => {
    const req = http.get(url, {
      headers: {
        'apikey':        CONFIG.supabaseKey,
        'Authorization': `Bearer ${CONFIG.supabaseKey}`,
        'Content-Type':  'application/json',
      },
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
  });
}

async function updateJobStatus(jobId, status, assetTag) {
  const url  = `${CONFIG.supabaseUrl}/rest/v1/print_queue?id=eq.${jobId}`;
  const body = JSON.stringify({ status, asset_tag: assetTag });

  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req    = require('https').request({
      hostname: urlObj.hostname,
      path:     urlObj.pathname + urlObj.search,
      method:   'PATCH',
      headers: {
        'apikey':        CONFIG.supabaseKey,
        'Authorization': `Bearer ${CONFIG.supabaseKey}`,
        'Content-Type':  'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── ROUND-ROBIN PRINTER SELECTION ─────────────────────────────────────────────
let photoIdx   = 0;
let stickerIdx = 0;

function nextPhotoPrinter()   { return CONFIG.printers.photo[photoIdx++ % CONFIG.printers.photo.length]; }
function nextStickerPrinter() { return CONFIG.printers.sticker[stickerIdx++ % CONFIG.printers.sticker.length]; }
function nextStickerDevice()  { return CONFIG.pixcutDevices[stickerIdx % CONFIG.pixcutDevices.length]; }

// ── PROCESS JOB ───────────────────────────────────────────────────────────────
async function processJob(job) {
  const isSticker = job.print_type === 'sticker_sheet';
  const isPrint   = job.print_type === 'photo_print' || !job.print_type;
  
  console.log(`[job] processing ${job.id} — type: ${job.print_type} — order: ${job.orders?.order_number}`);

  // Download print file
  const ext      = isSticker ? 'jpg' : 'jpg';
  const localFile = path.join(CONFIG.tempDir, `${job.id}.${ext}`);
  
  try {
    await downloadFile(job.file_url, localFile);
    console.log(`[job] downloaded: ${localFile}`);
  } catch (e) {
    console.error(`[job] download failed:`, e.message);
    return false;
  }

  // Mark as printing
  await updateJobStatus(job.id, 'printing', job.asset_tag);

  let success = false;

  if (isPrint) {
    // ── Photo print → M100 ──
    const printer = nextPhotoPrinter();
    console.log(`[job] sending to M100: ${printer}`);
    success = printToM100(localFile, printer, job.copies || 1);

  } else if (isSticker) {
    // ── Sticker → PixCut S1 ──
    const timestamp = Date.now();
    const jobDir    = path.join(
      CONFIG.lieneDataPath,
      CONFIG.lieneUserId,
      'printJob',
      String(timestamp)
    );
    fs.mkdirSync(jobDir, { recursive: true });

    // Copy JPEG to job folder
    const jobJpeg = path.join(jobDir, `${timestamp}.jpg`);
    fs.copyFileSync(localFile, jobJpeg);

    // Write PLT file (full sheet die-cut)
    const pltPath = path.join(jobDir, 'cut.plt');
    fs.writeFileSync(pltPath, PLT_FULL_SHEET);

    const deviceId = nextStickerDevice();
    console.log(`[job] injecting PixCut job for device: ${deviceId}`);
    success = injectPixcutJob(jobJpeg, pltPath, deviceId, job.copies || 1);
  }

  // Update status
  if (success) {
    await updateJobStatus(job.id, 'printing', job.asset_tag);
    console.log(`[job] ✓ sent to printer — ${job.orders?.buyer_name}`);
  } else {
    await updateJobStatus(job.id, 'queued', job.asset_tag); // retry
    console.log(`[job] ✗ failed — requeued`);
  }

  // Cleanup temp file
  try { fs.unlinkSync(localFile); } catch {}

  return success;
}

// ── MAIN POLL LOOP ────────────────────────────────────────────────────────────
async function poll() {
  console.log(`[poll] checking print queue...`);
  try {
    const jobs = await fetchPrintQueue();
    if (!jobs || jobs.length === 0) {
      console.log('[poll] queue empty');
      return;
    }

    console.log(`[poll] ${jobs.length} job(s) in queue`);
    for (const job of jobs) {
      await processJob(job);
      // Small delay between jobs
      await new Promise(r => setTimeout(r, 2000));
    }
  } catch (e) {
    console.error('[poll] error:', e.message);
  }
}

// ── STARTUP ───────────────────────────────────────────────────────────────────
function startup() {
  console.log('='.repeat(60));
  console.log('  Un Momento Print Server');
  console.log('  Booth: grad-2026');
  console.log(`  Poll interval: ${CONFIG.pollInterval / 1000}s`);
  console.log(`  Photo printers: ${CONFIG.printers.photo.join(', ')}`);
  console.log(`  Sticker printers: ${CONFIG.printers.sticker.join(', ')}`);
  console.log('='.repeat(60));

  // Create temp dir
  fs.mkdirSync(CONFIG.tempDir, { recursive: true });

  // Validate config
  if (!CONFIG.supabaseKey) {
    console.error('[ERROR] SUPABASE_KEY not set. Create a .env file.');
    process.exit(1);
  }

  // Initial poll then interval
  poll();
  setInterval(poll, CONFIG.pollInterval);
}

startup();