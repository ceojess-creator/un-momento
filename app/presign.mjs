import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createClient } from '@supabase/supabase-js';

const r2 = new S3Client({
  region: 'auto',
  endpoint: 'https://f43d01f11c3415e5c046b23b0edd813e.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: '50215eef9b15dacb69797b247181b4f7',
    secretAccessKey: '481f87543f807a2fcbaddc30c6dcb81c455bebaebf3263d27a2f6b50dc0ec571'
  }
});

const supabase = createClient(
  'https://lmdkpnakmpwueocratof.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtZGtwbmFrbXB3dWVvY3JhdG9mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA1OTM1OSwiZXhwIjoyMDk1NjM1MzU5fQ.NtDK8owUa217yVIOoIDTi9sMGhDt-OI82plbmFZP5Fo'
);

const ORDER_ID = 'dc0b1ef4-b7e0-49fe-9164-b8e467d976ca';
const PQ_ID    = 'f36e14dd-1597-4b9e-9009-247b43b2876d';

const url = await getSignedUrl(r2, new GetObjectCommand({
  Bucket: 'un-momento-uploads',
  Key: 'orders/dc0b1ef4-b7e0-49fe-9164-b8e467d976ca/print_preview.jpeg'
}), { expiresIn: 86400 });

console.log('Presigned URL:', url);

await supabase.from('orders').update({ print_preview_url: url }).eq('id', ORDER_ID);
await supabase.from('print_queue').update({ file_url: url, status: 'queued' }).eq('id', PQ_ID);

console.log('✅ Both rows updated. Print server will retry within 30s.');
