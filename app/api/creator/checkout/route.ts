import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe           from 'stripe';

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { product_id, creator_id, price, title } = await request.json();

    if (!product_id || !price) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get product details
    const { data: product } = await supabase
      .from('creator_products')
      .select('*, creator_profiles(handle, display_name, school_id)')
      .eq('id', product_id)
      .single();

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const creatorEarnings = price * 0.05;
    const ptsoAmount      = price * 0.10;
    const handle          = product.creator_profiles?.handle || creator_id;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency:     'usd',
          product_data: {
            name:        title || product.title,
            description: `${product.description || ''} — Ships in 4–5 days`,
            images:      product.image_url ? [product.image_url] : [],
          },
          unit_amount: Math.round(price * 100),
        },
        quantity: 1,
      }],
      mode:           'payment',
      automatic_tax:  { enabled: true },
      shipping_address_collection: {
        allowed_countries: ['US'],
      },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}&handle=${handle}`,
      cancel_url:  `${process.env.NEXT_PUBLIC_SITE_URL}/${handle}`,
      metadata: {
        product_id,
        creator_id:      handle,
        creator_earnings: String(creatorEarnings.toFixed(2)),
        ptso_amount:      String(ptsoAmount.toFixed(2)),
        school_id:        product.creator_profiles?.school_id || '',
        type:             'creator_order',
      },
    });

    return NextResponse.json({ url: session.url });

  } catch (err: any) {
    console.error('[creator checkout]', err.message);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}