import { NextResponse }  from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { nanoid }        from 'nanoid';

const s3 = new S3Client({
  region:   'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.CLOUDFLARE_R2_ACCESS_KEY!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY!,
  },
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file     = formData.get('file') as File;
    const folder   = formData.get('folder') as string || 'uploads';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size (max 500MB)
    if (file.size > 500 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large — max 500MB' },
        { status: 400 }
      );
    }

    const ext      = file.name.split('.').pop() || 'bin';
    const key      = `${folder}/${nanoid()}.${ext}`;
    const buffer   = Buffer.from(await file.arrayBuffer());

    await s3.send(new PutObjectCommand({
      Bucket:      process.env.CLOUDFLARE_R2_BUCKET!,
      Key:         key,
      Body:        buffer,
      ContentType: file.type || 'application/octet-stream',
    }));

    // Public URL
    const url = `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.CLOUDFLARE_R2_BUCKET}/${key}`;

    return NextResponse.json({ url, key });

  } catch (err: any) {
    console.error('[upload]', err.message);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}