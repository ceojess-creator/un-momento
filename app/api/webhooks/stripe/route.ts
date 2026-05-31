import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe           from 'stripe';
import { headers }      from 'next/headers';

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const body       = await request.text();
  const headerList = await headers();
  const sig        = headerList.get('stripe-signature');

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('[webhook] signature error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const meta    = session.metadata || {};

    try {
      // ── Create order ──────────────────────────────────────
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          buyer_name:         meta.buyer_name        || session.customer_details?.name || '',
          buyer_email:        meta.buyer_email        || session.customer_email         || '',
          buyer_phone:        meta.buyer_phone        || '',
          ship_address:       meta.ship_address       || '',
          ship_city:          meta.ship_city          || '',
          ship_state:         meta.ship_state         || '',
          ship_zip:           meta.ship_zip           || '',
          product_type:       meta.bundle_id          || 'bundle',
          stripe_payment_id:  session.payment_intent as string,
          fulfillment_type:   meta.fulfillment_type   || 'ship',
          fulfillment_source: meta.fulfillment_type === 'pickup' ? 'local' : 'prodigi',
          fulfillment_status: meta.fulfillment_type === 'pickup' ? 'queued' : 'pending',
          campaign_slug:      meta.event_slug         || 'grad-2026',
          referral_code:      meta.referral_code      || null,
          media_url:          meta.media_url          || null,
          media_type:         meta.media_type         || null,
          print_preview_url:  meta.print_preview_url  || null,
          holo_upgrade:       meta.holo_upgrade === 'true',
          holo_style_sku:     meta.holo_style_sku     || null,
          holo_style_name:    meta.holo_style_name    || null,
          tokens_spent:       session.amount_total ? session.amount_total / 100 : 0,
        })
        .select('id')
        .single();

      if (orderError) console.error('[webhook] order error:', orderError);

      const orderId    = order?.id;
      const orderTotal = session.amount_total ? session.amount_total / 100 : 0;

      // ── Credit referral ───────────────────────────────────
      if (meta.referral_code && orderId) {
        const { data: creditResult } = await supabase.rpc('credit_referral', {
          p_order_id:       orderId,
          p_creator_handle: meta.referral_code,
          p_order_total:    orderTotal,
        });
        if (creditResult?.success) {
          console.log(`[webhook] credited ${meta.referral_code}: $${creditResult.creator_credit}`);
        }
      } else if (orderId) {
        const { data: generalFund } = await supabase
          .from('accounts').select('id').eq('email','fund@unmomentoprints.com').single();
        if (generalFund) {
          await supabase.from('referral_credits').insert({
            referrer_handle:     'general-fund',
            referrer_account_id: generalFund.id,
            order_id:            orderId,
            amount:              orderTotal * 0.10,
            is_current_period:   true,
          });
        }
      }

      // ── Deduct all inventory ──────────────────────────────
      if (orderId && meta.bundle_id) {
        try {
          const addonIds   = JSON.parse(meta.addons || '[]') as string[];
          const buttonSize = meta.button_size || null;
          const fulfType   = meta.fulfillment_type || 'ship';

          const { data: deductResult } = await supabase.rpc('deduct_order_inventory', {
            p_bundle_id:   meta.bundle_id,
            p_addon_ids:   addonIds,
            p_button_size: buttonSize,
            p_fulfillment: fulfType,
          });

          if (deductResult?.alerts?.length > 0) {
            console.warn('[webhook] reorder alerts:', JSON.stringify(deductResult.alerts));
          }
          console.log(`[webhook] inventory deducted:`, JSON.stringify(deductResult?.deducted));
        } catch (e) {
          console.error('[webhook] inventory deduction error:', e);
        }
      }

      // ── Holo upgrade inventory deduction ──────────────────
      if (orderId && meta.holo_upgrade === 'true') {
        try {
          let holoSku  = meta.holo_style_sku  || null;
          let holoName = meta.holo_style_name || '';

          if (!holoSku || holoSku === 'default') {
            const { data: defaultStyle } = await supabase.rpc('get_default_holo_style');
            if (defaultStyle?.[0]) {
              holoSku  = defaultStyle[0].sku;
              holoName = defaultStyle[0].name;
            }
          }

          if (holoSku) {
            await supabase
              .from('inventory')
              .update({ updated_at: new Date().toISOString() })
              .eq('sku', holoSku);

            // Raw decrement via RPC
            await supabase.rpc('deduct_addon_inventory', {
              p_addon_ids: ['holo_upgrade'],
            });

            await supabase.from('orders').update({
              holo_style_sku:  holoSku,
              holo_style_name: holoName,
            }).eq('id', orderId);

            console.log(`[webhook] holo style assigned: ${holoSku}`);
          }
        } catch (e) {
          console.error('[webhook] holo deduction error:', e);
        }
      }

      // ── Prodigi — ship photo print ────────────────────────
      if (meta.fulfillment_type === 'ship' && orderId) {
        const printUrl = meta.print_preview_url;
        if (printUrl && meta.ship_address) {
          try {
            const prodigiRes = await fetch(
              `${process.env.NEXT_PUBLIC_SITE_URL}/api/fulfillment/prodigi`,
              {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  order_id:        orderId,
                  print_url:       printUrl,
                  recipient_name:  meta.buyer_name   || '',
                  recipient_email: meta.buyer_email  || '',
                  recipient_phone: meta.buyer_phone  || '',
                  address_line1:   meta.ship_address || '',
                  city:            meta.ship_city    || '',
                  state:           meta.ship_state   || '',
                  zip:             meta.ship_zip     || '',
                  bundle_id:       meta.bundle_id    || 'essential',
                }),
              }
            );
            const prodigiData = await prodigiRes.json();
            console.log(`[webhook] Prodigi submitted:`, prodigiData.prodigi_order_id || prodigiData.error);
          } catch (e) {
            console.error('[webhook] Prodigi failed:', e);
          }
        }
      }

      // ── Route sticker fulfillment ─────────────────────────
      if (orderId && meta.sticker_data_url) {
        const { data: eventPage } = await supabase
          .from('event_pages')
          .select('id, booth_active')
          .eq('slug', meta.event_slug || 'grad-2026')
          .single();

        let stickerStatus = 'queued';

        if (eventPage?.booth_active && meta.fulfillment_type === 'pickup') {
          const { data: pixcuts } = await supabase
            .from('event_hardware')
            .select('queue_depth, max_capacity')
            .eq('event_id', eventPage.id)
            .eq('device_type', 'sticker_printer')
            .eq('is_online', true);

          const totalQueued   = (pixcuts||[]).reduce((s,h) => s+(h.queue_depth||0), 0);
          const totalCapacity = (pixcuts||[]).reduce((s,h) => s+(h.max_capacity||160), 0);
          if (totalQueued < totalCapacity) stickerStatus = 'local';
        }

        await supabase.from('orders').update({
          sticker_status:   stickerStatus,
          sticker_file_url: meta.sticker_data_url,
        }).eq('id', orderId);

        if (stickerStatus === 'local' && eventPage) {
          const { data: pixcut } = await supabase
            .from('event_hardware')
            .select('id, asset_tag')
            .eq('event_id', eventPage.id)
            .eq('device_type', 'sticker_printer')
            .eq('is_online', true)
            .order('queue_depth', { ascending: true })
            .limit(1)
            .single();

          if (pixcut) {
            await supabase.from('print_queue').insert({
              order_id:      orderId,
              event_id:      eventPage.id,
              hardware_id:   pixcut.id,
              asset_tag:     pixcut.asset_tag,
              print_type:    'sticker_sheet',
              file_url:      meta.sticker_data_url,
              status:        'queued',
              priority:      5,
              customer_name: meta.buyer_name  || '',
              customer_phone:meta.buyer_phone || '',
            });
          }
        }
        console.log(`[webhook] sticker routed: ${stickerStatus}`);
      }

      // ── Route button to batch queue ───────────────────────
      if (orderId && meta.button_design_url && meta.button_size) {
        await supabase.from('orders').update({
          button_status:   'queued',
          button_file_url: meta.button_design_url,
          button_size:     meta.button_size,
        }).eq('id', orderId);
        console.log(`[webhook] button queued for batch: order ${orderId}`);
      }

      // ── Pickup — create assembly record ──────────────────
      if (meta.fulfillment_type === 'pickup' && orderId) {
        const { data: eventPage } = await supabase
          .from('event_pages').select('id')
          .eq('slug', meta.event_slug || 'grad-2026').single();

        if (eventPage) {
          const addonIds = JSON.parse(meta.addons || '[]') as string[];
          const physicalAddons = addonIds.filter(id =>
            ['metallic_marker','oil_marker','card_jacket','holo_upgrade'].includes(id)
          );
          const packNote = physicalAddons.length > 0
            ? `Pack: ${physicalAddons.map(id =>
                id==='metallic_marker'?'Metallic Marker':
                id==='oil_marker'?'Oil Marker':
                id==='card_jacket'?'Card Jacket':
                id==='holo_upgrade'?'Holo Film':id
              ).join(', ')}`
            : null;

          await supabase.from('order_assembly').upsert({
            order_id:        orderId,
            event_id:        eventPage.id,
            status:          'pending',
            items_expected:  1 + physicalAddons.length,
            pickup_location: 'Un Momento booth — see Hand-off Associate',
            notes:           packNote,
          }, { onConflict: 'order_id' });
        }
      }

      // ── Ship — packing list for physical add-ons ─────────
      if (meta.fulfillment_type === 'ship' && orderId) {
        const addonIds = JSON.parse(meta.addons || '[]') as string[];
        const physicalAddons = addonIds.filter(id =>
          ['metallic_marker','oil_marker','card_jacket','holo_upgrade'].includes(id)
        );
        if (physicalAddons.length > 0) {
          const packNote = `Pack with print: ${physicalAddons.map(id =>
            id==='metallic_marker'?'Metallic Marker':
            id==='oil_marker'?'Oil Marker':
            id==='card_jacket'?'Card Jacket':
            id==='holo_upgrade'?`Holo Film (${meta.holo_style_name||'auto'})`:id
          ).join(', ')}`;

          await supabase.from('order_assembly').upsert({
            order_id:        orderId,
            event_id:        null,
            status:          'pending',
            items_expected:  physicalAddons.length + 1,
            pickup_location: 'Ship with print',
            notes:           packNote,
          }, { onConflict: 'order_id' });
        }
      }

      // ── Full inventory deduction ──────────────────────────
      if (orderId) {
        try {
          const addonIds    = JSON.parse(meta.addons || '[]') as string[];
          const bundleId    = meta.bundle_id    || '';
          const buttonSize  = meta.button_size  || null;
          const fulfillType = meta.fulfillment_type || 'ship';

          const { data: deductResult } = await supabase.rpc('deduct_order_inventory', {
            p_bundle_id:   bundleId,
            p_addon_ids:   addonIds,
            p_button_size: buttonSize,
            p_fulfillment: fulfillType,
          });

          if (deductResult?.alerts?.length > 0) {
            console.warn('[webhook] reorder alerts:', JSON.stringify(deductResult.alerts));
          }
          console.log(`[webhook] inventory deducted: ${JSON.stringify(deductResult?.deducted)}`);
        } catch (e) {
          console.error('[webhook] inventory deduction error:', e);
        }
      }

      // ── Holo upgrade inventory deduction ─────────────────
      if (orderId && meta.holo_upgrade === 'true') {
        try {
          let holoSku  = meta.holo_style_sku  || null;
          let holoName = meta.holo_style_name || '';

          if (!holoSku || holoSku === 'default') {
            const { data: defaultStyle } = await supabase.rpc('get_default_holo_style');
            if (defaultStyle?.[0]) {
              holoSku  = defaultStyle[0].sku;
              holoName = defaultStyle[0].name;
            }
          }

          if (holoSku) {
            await supabase.from('inventory')
              .update({ updated_at: new Date().toISOString() })
              .eq('sku', holoSku);

            await supabase.rpc('deduct_addon_inventory', {
              p_addon_ids: ['holo_upgrade'],
            });

            await supabase.from('orders')
              .update({
                holo_upgrade:    true,
                holo_style_sku:  holoSku,
                holo_style_name: holoName,
              })
              .eq('id', orderId);

            console.log(`[webhook] holo: ${holoSku} assigned to order ${orderId}`);
          }
        } catch (e) {
          console.error('[webhook] holo deduction error:', e);
        }
      }
      
      // ── Create or link buyer account ──────────────────────
      const buyerEmail = meta.buyer_email || session.customer_email;
      if (buyerEmail) {
        const { data: existingAccount } = await supabase
          .from('accounts').select('id').eq('email', buyerEmail).single();
        if (!existingAccount) {
          await supabase.from('accounts').insert({
            name:            meta.buyer_name || buyerEmail.split('@')[0],
            email:           buyerEmail,
            phone:           meta.buyer_phone || '',
            is_creator:      false,
            onboarding_step: 'claim',
          });
        }
      }

      console.log(`[webhook] order ${orderId} processed — $${orderTotal}`);

    } catch (err: any) {
      console.error('[webhook] processing error:', err.message);
    }
  }

  return NextResponse.json({ received: true });
}