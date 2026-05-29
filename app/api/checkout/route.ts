import Stripe from 'stripe';
import { NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const BUNDLE_PRICES: Record<string, number> = {
  essential:  1800,
  classic:    2800,
  bundle:     4500,
  signature:  5800,
};

const ADDON_PRICES: Record<string, number> = {
  qr_video:        1000,
  card_jacket:      500,
  metallic_marker:  400,
  oil_marker:       400,
  extra_print:     1000,
  extra_sticker:   1200,
};

const BUNDLE_NAMES: Record<string, string> = {
  essential:  'Momento Essential',
  classic:    'Momento Classic',
  bundle:     'Momento Bundle',
  signature:  'Momento Signature',
};

const ADDON_NAMES: Record<string, string> = {
  qr_video:        'QR Video Memory Upgrade',
  card_jacket:     'Black Card Jacket',
  metallic_marker: 'Metallic Marker',
  oil_marker:      'Oil-Based Marker',
  extra_print:     'Extra Photo Print',
  extra_sticker:   'Extra Sticker Sheet',
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bundle_id, addons = [], form, event_slug } = body;

    if (!bundle_id || !BUNDLE_PRICES[bundle_id]) {
      return NextResponse.json(
        { error: 'Invalid bundle' },
        { status: 400 }
      );
    }

    // Build line items
    const lineItems = [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: BUNDLE_NAMES[bundle_id],
            description: 'Instant print keepsake — ships in 4–5 days',
          },
          unit_amount: BUNDLE_PRICES[bundle_id],
        },
        quantity: 1,
      },
      ...addons
        .filter((id: string) => ADDON_PRICES[id])
        .map((id: string) => ({
          price_data: {
            currency: 'usd',
            product_data: { name: ADDON_NAMES[id] },
            unit_amount: ADDON_PRICES[id],
          },
          quantity: 1,
        })),
    ];

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      automatic_tax: { enabled: true },
      customer_email: form.email,
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.NEXT_PUBLIC_SITE_URL}/event/grad-2026`,
      metadata: {
        bundle_id,
        addons:     JSON.stringify(addons),
        event_slug: event_slug || 'grad-2026',
        buyer_name: form.name,
        buyer_email: form.email,
        buyer_phone: form.phone || '',
        ship_address: form.address,
        ship_city:    form.city,
        ship_state:   form.state,
        ship_zip:     form.zip,
        grad_name:    form.grad_name || '',
        school:       form.school || '',
        grad_date:    form.grad_date || '',
        notes:        form.notes || '',
      },
    });

    return NextResponse.json({ url: session.url });

  } catch (err: any) {
    console.error('[checkout]', err.message);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}