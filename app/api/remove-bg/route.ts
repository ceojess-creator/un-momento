import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image    = formData.get('image') as File;

    if (!image) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    // Send to Remove.bg API
    const removeForm = new FormData();
    removeForm.append('image_file', image);
    removeForm.append('size', 'auto');

    const res = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': process.env.REMOVE_BG_API_KEY!,
      },
      body: removeForm,
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[remove-bg]', err);
      return NextResponse.json(
        { error: 'Background removal failed' },
        { status: 500 }
      );
    }

    // Return the PNG with background removed as base64
    const buffer     = await res.arrayBuffer();
    const base64     = Buffer.from(buffer).toString('base64');
    const dataUrl    = `data:image/png;base64,${base64}`;

    return NextResponse.json({ url: dataUrl });

  } catch (err: any) {
    console.error('[remove-bg]', err.message);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}