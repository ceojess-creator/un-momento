import { NextResponse }  from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import { nanoid }        from 'nanoid';

const s3 = new S3Client({
  region:   'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.CLOUDFLARE_R2_ACCESS_KEY!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY!,
  },
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const formData    = await request.formData();
    const productType = formData.get('product_type') as string;
    const title       = formData.get('title') as string;
    const description = formData.get('description') as string;
    const price       = Number(formData.get('price'));
    const handle      = formData.get('handle') as string;
    const layout      = formData.get('layout') as string;

    if (!productType || !handle || price <= 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Collect all uploaded photos
    const photoUrls: string[] = [];
    let i = 0;
    while (formData.get(`photo_${i}`)) {
      const photo  = formData.get(`photo_${i}`) as File;
      const key    = `creator/${handle}/${nanoid()}.jpg`;
      const buffer = Buffer.from(await photo.arrayBuffer());

      await s3.send(new PutObjectCommand({
        Bucket:      process.env.CLOUDFLARE_R2_BUCKET!,
        Key:         key,
        Body:        buffer,
        ContentType: photo.type || 'image/jpeg',
      }));

      const url = `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.CLOUDFLARE_R2_BUCKET}/${key}`;
      photoUrls.push(url);
      i++;
    }

    if (photoUrls.length === 0) {
      return NextResponse.json(
        { error: 'At least one photo is required' },
        { status: 400 }
      );
    }

    // Create or get account (simplified — no Clerk auth yet)
    const { data: existingAccount } = await supabase
      .from('accounts')
      .select('id')
      .eq('name', handle)
      .single();

    let accountId = existingAccount?.id;

    if (!accountId) {
      const { data: newAccount } = await supabase
        .from('accounts')
        .insert({
          name:         handle,
          is_creator:   true,
          onboarding_step: 'complete',
        })
        .select('id')
        .single();
      accountId = newAccount?.id;
    }

    // Create or get creator profile
    const { data: existingProfile } = await supabase
      .from('creator_profiles')
      .select('id')
      .eq('handle', handle)
      .single();

    let profileId = existingProfile?.id;

    if (!profileId) {
      const { data: newProfile } = await supabase
        .from('creator_profiles')
        .insert({
          account_id:   accountId,
          handle,
          display_name: handle,
          is_active:    true,
        })
        .select('id')
        .single();
      profileId = newProfile?.id;
    }

    // Create the product
    const baseCost = price * 0.85;  // 15% platform fee

    const { data: product, error } = await supabase
      .from('creator_products')
      .insert({
        creator_id:     profileId,
        product_type:   productType,
        title:          title || `${handle}'s graduation print`,
        description:    description || '',
        image_url:      photoUrls[0],
        photo_urls:     photoUrls,
        layout_template: layout,
        price,
        base_cost:      baseCost,
        creator_pct:    0.05,
        is_active:      true,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[publish]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const storefrontUrl = `https://unmomentoprints.com/${handle}`;

    return NextResponse.json({
      success: true,
      url:     storefrontUrl,
      product_id: product.id,
      profile_id: profileId,
    });

  } catch (err: any) {
    console.error('[publish]', err.message);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}