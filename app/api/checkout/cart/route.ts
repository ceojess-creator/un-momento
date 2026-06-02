import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe           from 'stripe';

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUNDLE_NAMES: Record<string,string> = {
  essential: 'Momento Essential',
  classic:   'Momento Classic',
  bundle:    'Momento Bundle',
  signature: 'Momento Signature',
  drop:      'Momento Drop',
  vault:     'Momento Vault',
};

const ADDON_PRICES: Record<string,number> = {
  qr_video:10, card_jacket:5, metallic_marker:4,
  oil_marker:4, extra_print:10, extra_sticker:12, holo_upgrade:2,
};

const ADDON_NAMES: Record<string,string> = {
  qr_video:'QR Video Memory Upgrade', card_jacket:'Black Card Jacket',
  metallic_marker:'Metallic Marker', oil_marker:'Oil-Based Marker',
  extra_print:'Extra Photo Print', extra_sticker:'Extra Sticker Sheet',
  holo_upgrade:'Holographic Button Upgrade',
};

export async function POST(request: Request) {
  try {
    const { items, form, event_slug } = await request.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    // ── Save cart to Supabase pending_carts table ──────────────
    // Store full item data (including dataUrls) in DB
    // Reference by cart_ref in Stripe metadata
    const cartRef = `cart_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;

    const { error: cartError } = await supabase
      .from('pending_carts')
      .insert({
        cart_ref: cartRef,
        items:      JSON.stringify(items),
        form:       JSON.stringify(form),
        event_slug: event_slug || 'grad-2026',
        created_at: new Date().toISOString(),
      });

    if (cartError) {
      console.error('[cart checkout] failed to save cart:', cartError.message);
      // Fall through — still try to create session with basic metadata
    }

    // ── Build Stripe line items ────────────────────────────────
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    for (const item of items) {
      lineItems.push({
        price_data: {
          currency:     'usd',
          unit_amount:  item.bundlePrice * 100,
          product_data: {
            name:        BUNDLE_NAMES[item.bundleId] || item.bundleName,
            description: item.creatorName
              ? `Supporting ${item.creatorName} · ${item.schoolName || 'school'}`
              : 'Un Momento print bundle',
          },
        },
        quantity: 1,
      });

      for (const addonId of (item.addons || [])) {
        const addonPrice = ADDON_PRICES[addonId] || 0;
        if (addonPrice > 0) {
          lineItems.push({
            price_data: {
              currency:    'usd',
              unit_amount: addonPrice * 100,
              product_data: { name: ADDON_NAMES[addonId] || addonId },
            },
            quantity: 1,
          });
        }
      }

      if (item.dropQR) {
        lineItems.push({
          price_data: {
            currency:    'usd',
            unit_amount: 500,
            product_data: { name: 'QR Memory Clip (Momento Drop)' },
          },
          quantity: 1,
        });
      }
    }

    // ── Minimal metadata — reference cart in DB ────────────────
    const metadata: Record<string,string> = {
      cart_ref: cartRef,
      is_cart:         'true',
      cart_item_count: String(items.length),
      event_slug:      event_slug || 'grad-2026',
      buyer_name:      form.name      || '',
      buyer_email:     form.email     || '',
      buyer_phone:     form.phone     || '',
      ship_address:    form.address   || '',
      ship_city:       form.city      || '',
      ship_state:      form.state     || '',
      ship_zip:        form.zip       || '',
    };

    // Also store per-item non-image data in metadata as backup
    items.slice(0,5).forEach((item: any, i: number) => {
      metadata[`item_${i}_bundle`]      = item.bundleId       || '';
      metadata[`item_${i}_creator`]     = item.creatorHandle  || '';
      metadata[`item_${i}_fulfillment`] = item.fulfillment    || 'ship';
      metadata[`item_${i}_addons`]      = JSON.stringify(item.addons || []).slice(0,200);
      metadata[`item_${i}_button_size`] = item.buttonSize     || '';
      metadata[`item_${i}_holo_sku`]    = item.holoStyle      || '';
      metadata[`item_${i}_holo_name`]   = item.holoStyleName  || '';
      metadata[`item_${i}_print_count`] = String(item.printCount || 1);
      metadata[`item_${i}_drop_qr`]     = item.dropQR ? 'true' : '';
      metadata[`item_${i}_media_url`]   = item.mediaUrl       || '';
      metadata[`item_${i}_media_type`]  = item.mediaType      || '';
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode:                 'payment',
      line_items:           lineItems,
      metadata,
      customer_email:       form.email || undefined,
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.NEXT_PUBLIC_SITE_URL}/event/grad-2026`,
      shipping_address_collection: items.some((i:any) => i.fulfillment==='ship')
        ? { allowed_countries: ['US'] }
        : undefined,
    });

    return NextResponse.json({ url: session.url });

  } catch (err: any) {
    console.error('[cart checkout]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}