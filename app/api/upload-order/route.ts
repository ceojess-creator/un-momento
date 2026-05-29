import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Resend } from 'resend';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.CLOUDFLARE_R2_ACCESS_KEY!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY!,
  },
});

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const formData  = await request.formData();
    const photo     = formData.get('photo') as File;
    const video     = formData.get('video') as File | null;
    const sessionId = formData.get('session_id') as string;
    const gradName  = formData.get('grad_name') as string;

    if (!photo) {
      return NextResponse.json(
        { error: 'Photo is required' },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const photoKey  = `orders/${sessionId || timestamp}/photo-${timestamp}.jpg`;

    // Upload photo to Cloudflare R2
    const photoBuffer = Buffer.from(await photo.arrayBuffer());
    await s3.send(new PutObjectCommand({
      Bucket:      process.env.CLOUDFLARE_R2_BUCKET!,
      Key:         photoKey,
      Body:        photoBuffer,
      ContentType: photo.type || 'image/jpeg',
    }));

    // Upload video if provided
    let videoKey = null;
    if (video && video.size > 0) {
      videoKey = `orders/${sessionId || timestamp}/video-${timestamp}.mp4`;
      const videoBuffer = Buffer.from(await video.arrayBuffer());
      await s3.send(new PutObjectCommand({
        Bucket:      process.env.CLOUDFLARE_R2_BUCKET!,
        Key:         videoKey,
        Body:        videoBuffer,
        ContentType: video.type || 'video/mp4',
      }));
    }

    // Notify you by email
    await resend.emails.send({
      from:    'Un Momento Orders <orders@unmomentoprints.com>',
      to:      'ceojess@unmomentoprints.com',
      subject: `New order upload — ${gradName || 'Unknown graduate'}`,
      html: `
        <h2>New Un Momento Order</h2>
        <p><strong>Graduate:</strong> ${gradName || '—'}</p>
        <p><strong>Session ID:</strong> ${sessionId || '—'}</p>
        <p><strong>Photo key:</strong> ${photoKey}</p>
        <p><strong>Video key:</strong> ${videoKey || 'No video uploaded'}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <hr/>
        <p>Log into Cloudflare R2 to download the files and fulfill this order.</p>
      `,
    });

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('[upload-order]', err.message);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}