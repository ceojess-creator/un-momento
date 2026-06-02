import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

const ORDER_ID       = 'dc0b1ef4-b7e0-49fe-9164-b8e467d976ca';
const PQ_ID          = 'f36e14dd-1597-4b9e-9009-247b43b2876d';
const ASSET_TAG      = 'UMP-PHT-2026-001';
const CUSTOMER_NAME  = 'Jessica Ealy';
const CUSTOMER_PHONE = '2623885790';

const SUPABASE_URL  = 'https://lmdkpnakmpwueocratof.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtZGtwbmFrbXB3dWVvY3JhdG9mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA1OTM1OSwiZXhwIjoyMDk1NjM1MzU5fQ.NtDK8owUa217yVIOoIDTi9sMGhDt-OI82plbmFZP5Fo';
const R2_ACCESS_KEY = '50215eef9b15dacb69797b247181b4f7';
const R2_SECRET_KEY = '481f87543f807a2fcbaddc30c6dcb81c455bebaebf3263d27a2f6b50dc0ec571';
const R2_BUCKET     = 'un-momento-uploads';
const ACCOUNT_ID    = 'f43d01f11c3415e5c046b23b0edd813e';
const R2_ENDPOINT   = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const r2 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
});

async function main() {
  console.log('Step 1: Fetching order...');
  const { data: order, error: fetchErr } = await supabase
    .from('orders').select('id, order_number, print_preview_url, buyer_name')
    .eq('id', ORDER_ID).single();
  if (fetchErr) throw new Error('Fetch failed: ' + fetchErr.message);
  console.log(`  Order #${order.order_number} for ${order.buyer_name}`);

  const dataUrl = order.print_preview_url;
  if (!dataUrl.startsWith('data:image/')) {
    console.log('  Already an HTTP URL, nothing to do:', dataUrl);
    process.exit(0);
  }

  console.log('Step 2: Decoding base64...');
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/s);
  if (!match) throw new Error('Could not parse data URL');
  const mimeType = match[1];
  const ext = mimeType.split('/')[1];
  const buffer = Buffer.from(match[2], 'base64');
  console.log(`  Decoded ${(buffer.length/1024).toFixed(1)} KB`);

  console.log('Step 3: Uploading to R2...');
  const key = `orders/${ORDER_ID}/print_preview.${ext}`;
  await r2.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: buffer, ContentType: mimeType }));
  const publicUrl = `${R2_ENDPOINT}/${R2_BUCKET}/${key}`;
  console.log('  URL:', publicUrl);

  console.log('Step 4: Updating orders table...');
  const { error: e1 } = await supabase.from('orders').update({ print_preview_url: publicUrl }).eq('id', ORDER_ID);
  if (e1) throw new Error('Order update failed: ' + e1.message);
  console.log('  Done');

  console.log('Step 5: Updating print_queue...');
  const { error: e2 } = await supabase.from('print_queue')
    .update({ file_url: publicUrl, asset_tag: ASSET_TAG, customer_name: CUSTOMER_NAME, customer_phone: CUSTOMER_PHONE })
    .eq('id', PQ_ID);
  if (e2) throw new Error('Queue update failed: ' + e2.message);
  console.log('  Done');

  console.log('\n✅ Order #1002 ready to print. Print server will pick it up within 30s.');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
