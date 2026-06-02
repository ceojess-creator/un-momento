import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { nanoid } from 'nanoid';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.CLOUDFLARE_R2_ACCESS_KEY!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY!,
  },
});

export async function POST(request: Request) {
  try {
    const { contentType, folder = 'media' } = await request.json();
    const ext = contentType.split('/')[1]?.split(';')[0] || 'mp4';
    const key = `${folder}/${nanoid()}.${ext}`;

    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket:      process.env.CLOUDFLARE_R2_BUCKET!,
        Key:         key,
        ContentType: contentType,
      }),
      { expiresIn: 300 }
    );

    return NextResponse.json({ uploadUrl, key });
  } catch (err: any) {
    console.error('[upload-url]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
