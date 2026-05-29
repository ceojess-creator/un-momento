import { compositeQR } from '@/lib/compose';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    
    const photo    = formData.get('photo');
    const qrUrl    = formData.get('qrUrl');
    const gradName = formData.get('gradName') || '';
    const orderNum = formData.get('orderNumber') || null;

    if (!photo || !qrUrl) {
      return NextResponse.json(
        { error: 'photo and qrUrl are required' },
        { status: 400 }
      );
    }

    // Convert uploaded file to buffer
    const arrayBuffer = await photo.arrayBuffer();
    const photoBuffer = Buffer.from(arrayBuffer);

    // Composite the QR into the print
    const printBuffer = await compositeQR(photoBuffer, qrUrl, {
      gradName:    gradName,
      orderNumber: orderNum,
    });

    // Return the composited image
    return new Response(printBuffer, {
      status: 200,
      headers: {
        'Content-Type':        'image/jpeg',
        'Content-Disposition': `attachment; filename="unmomento-print.jpg"`,
      },
    });

  } catch (err) {
    console.error('[compose] Error:', err.message);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}