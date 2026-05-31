import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function verifyCron(request: Request): boolean {
  const auth   = request.headers.get('authorization');
  const body   = request.headers.get('x-cron-secret');
  return auth === `Bearer ${process.env.CRON_SECRET}` || body === process.env.CRON_SECRET;
}

// Print dimensions at 300dpi
const SHEET_W = 1800; // 6 inches
const SHEET_H = 1200; // 4 inches
const MARGIN  = 36;   // 3mm at 300dpi
const BLEED   = 18;   // 1.5mm bleed between buttons

// Button print dimensions at 300dpi + label height
const BUTTON_DIMS: Record<string, { w:number; h:number; shape:string; label:string }> = {
  '56mm_circle':   { w:661,  h:661,  shape:'circle',  label:'56mm Circle'         },
  '50mm_square':   { w:591,  h:591,  shape:'square',  label:'50mm Square'         },
  '32mm_circle':   { w:378,  h:378,  shape:'circle',  label:'32mm Circle'         },
  '56mm_magnet':   { w:661,  h:661,  shape:'circle',  label:'56mm Magnet'         },
  '32mm_magnet':   { w:378,  h:378,  shape:'circle',  label:'32mm Magnet'         },
  'keychain_oval': { w:472,  h:354,  shape:'oval',    label:'Keychain 40mm Oval'  },
  'keychain_rect': { w:413,  h:531,  shape:'rect',    label:'Keychain 35x45mm'    },
};

const LABEL_H = 48; // px for order label below each button

// Order colors for visual separation (cycles through orders)
const ORDER_COLORS = [
  '#4ADE80','#60a5fa','#f59e0b','#f472b6',
  '#a78bfa','#34d399','#fb923c','#38bdf8',
];

interface ButtonJob {
  id:           string;
  order_id:     string;
  order_number: number;
  buyer_name:   string;
  product_id:   string;
  file_url:     string;
  asset_tag:    string;
  color:        string;
}

interface PackedButton {
  job:  ButtonJob;
  x:    number;
  y:    number;
  w:    number;
  h:    number;
}

// Simple shelf bin-packing algorithm
function packButtons(jobs: ButtonJob[]): { sheets: PackedButton[][]; sheetCount: number } {
  const sheets: PackedButton[][] = [];
  let currentSheet: PackedButton[] = [];
  let shelves: { y: number; h: number; usedW: number }[] = [{ y: MARGIN, h: 0, usedW: MARGIN }];

  for (const job of jobs) {
    const dims = BUTTON_DIMS[job.product_id];
    if (!dims) continue;

    const bw = dims.w + BLEED;
    const bh = dims.h + LABEL_H + BLEED;

    let placed = false;

    // Try to fit in existing shelf
    for (const shelf of shelves) {
      if (shelf.usedW + bw <= SHEET_W - MARGIN &&
          shelf.y + Math.max(shelf.h, bh) <= SHEET_H - MARGIN) {
        currentSheet.push({
          job,
          x: shelf.usedW,
          y: shelf.y,
          w: dims.w,
          h: dims.h,
        });
        shelf.usedW += bw;
        shelf.h      = Math.max(shelf.h, bh);
        placed        = true;
        break;
      }
    }

    // Try new shelf on current sheet
    if (!placed) {
      const lastShelf  = shelves[shelves.length - 1];
      const newShelfY  = lastShelf.y + lastShelf.h + BLEED;

      if (newShelfY + bh <= SHEET_H - MARGIN && bw <= SHEET_W - MARGIN * 2) {
        shelves.push({ y: newShelfY, h: bh, usedW: MARGIN + bw });
        currentSheet.push({
          job,
          x: MARGIN,
          y: newShelfY,
          w: dims.w,
          h: dims.h,
        });
        placed = true;
      }
    }

    // Need a new sheet
    if (!placed) {
      if (currentSheet.length > 0) {
        sheets.push(currentSheet);
        currentSheet = [];
        shelves      = [{ y: MARGIN, h: 0, usedW: MARGIN }];
      }

      shelves.push({ y: MARGIN, h: bh, usedW: MARGIN + bw });
      currentSheet.push({
        job,
        x: MARGIN,
        y: MARGIN,
        w: dims.w,
        h: dims.h,
      });
    }
  }

  if (currentSheet.length > 0) sheets.push(currentSheet);

  return { sheets, sheetCount: sheets.length };
}

// Generate gang sheet as base64 PNG using Canvas API (server-side via node-canvas would be ideal,
// but we'll generate an SVG description and save the layout data for client rendering)
function generateSheetSVG(packed: PackedButton[], sheetNum: number, totalSheets: number): string {
  const svgParts: string[] = [];

  // Scale for display (SVG at 600x400 display resolution, actual print is 1800x1200)
  const scaleX = 600 / SHEET_W;
  const scaleY = 400 / SHEET_H;

  svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="600" height="400">`);

  // Background
  svgParts.push(`<rect width="600" height="400" fill="white" stroke="#ccc" stroke-width="1"/>`);

  // Sheet label
  svgParts.push(`<text x="300" y="16" text-anchor="middle" font-family="Arial" font-size="10" fill="#999">Gang Sheet ${sheetNum}/${totalSheets} · 4×6 · ${packed.length} buttons</text>`);

  // Registration marks
  const regSize = 12;
  const regPositions = [[4,4],[600-regSize-4,4],[4,400-regSize-4],[600-regSize-4,400-regSize-4]];
  regPositions.forEach(([rx,ry]) => {
    svgParts.push(`<rect x="${rx}" y="${ry}" width="${regSize}" height="${regSize}" fill="black"/>`);
  });

  // Each button
  for (const p of packed) {
    const dims   = BUTTON_DIMS[p.job.product_id];
    const sx     = p.x * scaleX;
    const sy     = p.y * scaleY;
    const sw     = p.w * scaleX;
    const sh     = p.h * scaleY;
    const lh     = LABEL_H * scaleY;
    const color  = p.job.color;

    // Button area background
    if (dims.shape === 'circle' || dims.shape === 'oval') {
      const rx = sw/2, ry = sh/2;
      svgParts.push(`<ellipse cx="${sx+sw/2}" cy="${sy+sh/2}" rx="${rx}" ry="${ry}" fill="#f8f8f8" stroke="${color}" stroke-width="2"/>`);
    } else {
      const r = Math.min(sw,sh)*0.1;
      svgParts.push(`<rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="${r}" ry="${r}" fill="#f8f8f8" stroke="${color}" stroke-width="2"/>`);
    }

    // Button image placeholder (cross-hatch)
    svgParts.push(`<line x1="${sx}" y1="${sy}" x2="${sx+sw}" y2="${sy+sh}" stroke="#ddd" stroke-width="0.5"/>`);
    svgParts.push(`<line x1="${sx+sw}" y1="${sy}" x2="${sx}" y2="${sy+sh}" stroke="#ddd" stroke-width="0.5"/>`);

    // Label strip below button
    svgParts.push(`<rect x="${sx}" y="${sy+sh}" width="${sw}" height="${lh}" fill="${color}22" stroke="${color}" stroke-width="1"/>`);
    svgParts.push(`<text x="${sx+sw/2}" y="${sy+sh+lh*0.38}" text-anchor="middle" font-family="Arial" font-size="${Math.round(lh*0.28)}px" font-weight="bold" fill="${color}">#${p.job.order_number}</text>`);
    svgParts.push(`<text x="${sx+sw/2}" y="${sy+sh+lh*0.75}" text-anchor="middle" font-family="Arial" font-size="${Math.round(lh*0.22)}px" fill="#555">${dims.label}</text>`);
    svgParts.push(`<text x="${sx+sw/2}" y="${sy+sh+lh*0.95}" text-anchor="middle" font-family="Arial" font-size="${Math.round(lh*0.18)}px" fill="#999">${p.job.asset_tag}</text>`);
  }

  svgParts.push(`</svg>`);
  return svgParts.join('\n');
}

export async function GET(request: Request) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date().toISOString().split('T')[0];

  try {
    // Get all queued button orders
    const { data: buttonOrders, error } = await supabase
      .from('orders')
      .select('id, order_number, buyer_name, buyer_email, buyer_phone, ship_city, ship_state, button_file_url, button_status, fulfillment_type')
      .eq('button_status', 'queued')
      .not('button_file_url', 'is', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[button-batch] query error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!buttonOrders || buttonOrders.length === 0) {
      console.log('[button-batch] no pending button orders');
      return NextResponse.json({ success: true, batched: 0, sheets: 0 });
    }

    console.log(`[button-batch] processing ${buttonOrders.length} button orders`);

    // Get button sizes from orders
    const { data: orderDetails } = await supabase
      .from('orders')
      .select('id, order_number, buyer_name, button_file_url')
      .in('id', buttonOrders.map(o => o.id));

    // Build job list with asset tags and colors
    let assetCounter = 1;
    const jobs: ButtonJob[] = [];

    buttonOrders.forEach((order, idx) => {
      const color = ORDER_COLORS[idx % ORDER_COLORS.length];

      // Parse button size from order — stored in button_design JSON
      // We'll use a default for now and enhance with actual size data
      const productId = 'button_size' in order ? (order as any).button_size : '56mm_circle';

      const assetTag = `BTN-${today.replace(/-/g,'')}-${String(assetCounter).padStart(3,'0')}`;
      assetCounter++;

      jobs.push({
        id:           `${order.id}-btn`,
        order_id:     order.id,
        order_number: order.order_number || 0,
        buyer_name:   order.buyer_name   || '',
        product_id:   productId,
        file_url:     order.button_file_url || '',
        asset_tag:    assetTag,
        color,
      });
    });

    // Pack buttons onto gang sheets
    const { sheets, sheetCount } = packButtons(jobs);

    console.log(`[button-batch] packed ${jobs.length} buttons onto ${sheetCount} sheets`);

    // Generate SVG previews and save gang sheet records
    const gangSheetRecords = [];
    const svgPreviews: string[] = [];

    for (let i = 0; i < sheets.length; i++) {
      const sheetPacked = sheets[i];
      const svg         = generateSheetSVG(sheetPacked, i+1, sheetCount);
      svgPreviews.push(svg);

      const { data: sheetRecord } = await supabase
        .from('button_gang_sheets')
        .insert({
          batch_date:   today,
          sheet_number: i + 1,
          button_count: sheetPacked.length,
          order_ids:    sheetPacked.map(p => p.job.order_id),
          status:       'pending',
        })
        .select('id')
        .single();

      if (sheetRecord) gangSheetRecords.push(sheetRecord.id);
    }

    // Mark orders as batched
    const orderIds = buttonOrders.map(o => o.id);
    await supabase
      .from('orders')
      .update({
        button_status:     'batched',
        button_batch_date: today,
      })
      .in('id', orderIds);

    // Build manifest email
    const manifestHtml = `
      <h2>Button Gang Sheet Batch — ${today}</h2>
      <p>
        <strong>${buttonOrders.length} button(s)</strong> packed onto
        <strong>${sheetCount} gang sheet(s)</strong>.
        Print each sheet on your 4×6 printer, then use the button press.
      </p>

      ${sheets.map((sheet, i) => `
        <h3>Sheet ${i+1} of ${sheetCount} — ${sheet.length} buttons</h3>
        <table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:12px;margin-bottom:16px;">
          <thead>
            <tr style="background:#f5f5f5;">
              <th style="padding:6px 8px;border:1px solid #ddd;text-align:left;">Asset Tag</th>
              <th style="padding:6px 8px;border:1px solid #ddd;text-align:left;">Order #</th>
              <th style="padding:6px 8px;border:1px solid #ddd;text-align:left;">Customer</th>
              <th style="padding:6px 8px;border:1px solid #ddd;text-align:left;">Size</th>
              <th style="padding:6px 8px;border:1px solid #ddd;text-align:left;">File</th>
            </tr>
          </thead>
          <tbody>
            ${sheet.map(p => `
              <tr>
                <td style="padding:6px 8px;border:1px solid #ddd;font-family:monospace;">${p.job.asset_tag}</td>
                <td style="padding:6px 8px;border:1px solid #ddd;font-weight:bold;">#${p.job.order_number}</td>
                <td style="padding:6px 8px;border:1px solid #ddd;">${p.job.buyer_name}</td>
                <td style="padding:6px 8px;border:1px solid #ddd;">${BUTTON_DIMS[p.job.product_id]?.label||p.job.product_id}</td>
                <td style="padding:6px 8px;border:1px solid #ddd;">
                  <a href="${p.job.file_url}">Print file</a>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `).join('')}

      <hr/>
      <p style="font-size:12px;color:#888;">
        After pressing: go to Admin → Stickers/Buttons → mark each order shipped with tracking.
        <br/>Manage at: <a href="https://unmomentoprints.com/admin">unmomentoprints.com/admin</a>
      </p>
    `;

    try {
      await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          from:    'Un Momento <orders@unmomentoprints.com>',
          to:      'ceojess@unmomentoprints.com',
          subject: `Button gang sheets ready — ${buttonOrders.length} buttons · ${sheetCount} sheets · ${today}`,
          html:    manifestHtml,
        }),
      });
      console.log('[button-batch] manifest email sent');
    } catch (e) {
      console.error('[button-batch] email error:', e);
    }

    // Notify customers
    for (const order of buttonOrders) {
      if (!order.buyer_email) continue;
      const firstName = order.buyer_name?.split(' ')[0] || 'there';
      try {
        await fetch('https://api.resend.com/emails', {
          method:  'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type':  'application/json',
          },
          body: JSON.stringify({
            from:    'Un Momento <orders@unmomentoprints.com>',
            to:      order.buyer_email,
            subject: 'Your button is being pressed! 🎓',
            html: `
              <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
                <h2>Your custom button is in production!</h2>
                <p>Hi ${firstName},</p>
                <p>Your custom button/magnet is being printed and pressed in-house
                and will ship within 7 days.</p>
                <p><strong>What to expect:</strong></p>
                <ul>
                  <li>Photo print — ships in 4-5 days via our print partner</li>
                  <li>Button/magnet — pressed in-house, ships within 7 days</li>
                  <li>Sticker sheet (if ordered) — ships within 7 days</li>
                </ul>
                <p>We'll send you a tracking number as soon as your button ships.</p>
                <hr/>
                <p style="color:#94a3b8;font-size:12px;">
                  Un Momento LLC · The moments that matter most deserve to exist in the real world.
                </p>
              </div>
            `,
          }),
        });
      } catch (e) {
        console.error('[button-batch] customer email error:', e);
      }
      await new Promise(r => setTimeout(r, 200));
    }

    return NextResponse.json({
      success:     true,
      batched:     buttonOrders.length,
      sheets:      sheetCount,
      batch_date:  today,
      gang_sheets: gangSheetRecords,
    });

  } catch (err: any) {
    console.error('[button-batch]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body   = await request.json().catch(() => ({}));
  const secret = body.secret || request.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return GET(request);
}