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

// Shipping charge for non-pickup orders
const SHIPPING_CHARGE = 600; // $6.00

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      bundle_id, addons = [], form,
      event_slug, referral_code,
      fulfillment_type, editor_state,
      media_url, media_type,
      creator_handle,
    } = body;

    if (!bundle_id || !BUNDLE_PRICES[bundle_id]) {
      return NextResponse.json({ error: 'Invalid bundle' }, { status: 400 });
    }

    const isShip = fulfillment_type === 'ship';

    // Build line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name:        BUNDLE_NAMES[bundle_id],
            description: isShip
              ? 'Instant print keepsake — ships in 4–5 days'
              : 'Instant print keepsake — pickup at booth',
          },
          unit_amount: BUNDLE_PRICES[bundle_id],
        },
        quantity: 1,
      },
      // Add-ons
      ...addons
        .filter((id: string) => ADDON_PRICES[id])
        .map((id: string) => ({
          price_data: {
            currency:     'usd',
            product_data: { name: ADDON_NAMES[id] },
            unit_amount:  ADDON_PRICES[id],
          },
          quantity: 1,
        })),
    ];

    // Add shipping charge for ship orders
    if (isShip) {
      lineItems.push({
        price_data: {
          currency:     'usd',
          product_data: { name: 'Standard shipping (4–5 business days)' },
          unit_amount:  SHIPPING_CHARGE,
        },
        quantity: 1,
      });
    }

    // Truncate print URL for Stripe metadata (500 char limit per value)
    const printPreviewUrl = editor_state?.dataUrl
      ? editor_state.dataUrl.slice(0, 490)
      : '';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items:           lineItems,
      mode:                 'payment',
      automatic_tax:        { enabled: true },
      customer_email:       form.email,
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.NEXT_PUBLIC_SITE_URL}/event/grad-2026`,
      metadata: {
        bundle_id,
        addons:            JSON.stringify(addons),
        event_slug:        event_slug        || 'grad-2026',
        fulfillment_type:  fulfillment_type  || 'ship',
        buyer_name:        form.name         || '',
        buyer_email:       form.email        || '',
        buyer_phone:       form.phone        || '',
        ship_address:      form.address      || '',
        ship_city:         form.city         || '',
        ship_state:        form.state        || '',
        ship_zip:          form.zip          || '',
        grad_name:         form.grad_name    || '',
        school:            form.school       || '',
        referral_code:     creator_handle    || referral_code || '',
        media_url:         media_url         || '',
        media_type:        media_type        || '',
        print_preview_url: printPreviewUrl,
      },
    });

    return NextResponse.json({ url: session.url });

  } catch (err: any) {
    console.error('[checkout]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}