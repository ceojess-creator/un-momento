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
  const body      = await request.text();
  const headerList = await headers();
  const sig       = headerList.get('stripe-signature');

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body, sig, process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error('[webhook] signature error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session  = event.data.object as Stripe.Checkout.Session;
    const meta     = session.metadata || {};

    try {
      // Create order in Supabase
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          buyer_name:       meta.buyer_name       || session.customer_details?.name || '',
          buyer_email:      meta.buyer_email       || session.customer_email || '',
          buyer_phone:      meta.buyer_phone       || '',
          ship_address:     meta.ship_address      || session.shipping_details?.address?.line1 || '',
          ship_city:        meta.ship_city         || session.shipping_details?.address?.city  || '',
          ship_state:       meta.ship_state        || session.shipping_details?.address?.state || '',
          ship_zip:         meta.ship_zip          || session.shipping_details?.address?.postal_code || '',
          product_type:     meta.bundle_id         || 'bundle',
          stripe_payment_id: session.payment_intent as string,
          fulfillment_type: meta.fulfillment_type  || 'ship',
          fulfillment_source: 'online',
          campaign_slug:    meta.event_slug        || 'grad-2026',
          referral_code:    meta.referral_code     || null,
          tokens_spent:     session.amount_total   ? session.amount_total / 100 : 0,
        })
        .select('id')
        .single();

      if (orderError) {
        console.error('[webhook] order error:', orderError);
      }

      const orderId    = order?.id;
      const orderTotal = session.amount_total ? session.amount_total / 100 : 0;

      // Credit referral if creator handle present
      if (meta.referral_code && orderId) {
        const { data: creditResult } = await supabase.rpc('credit_referral', {
          p_order_id:       orderId,
          p_creator_handle: meta.referral_code,
          p_order_total:    orderTotal,
        });

        if (creditResult?.success) {
          console.log(`[webhook] credited ${meta.referral_code}: $${creditResult.creator_credit}`);
        } else {
          console.error('[webhook] referral credit failed:', creditResult?.error);
        }
      } else if (orderId) {
        // No creator — credit general fund
        console.log(`[webhook] order ${orderId} → general fund`);

        // Update fundraiser general pool
        const { data: generalFund } = await supabase
          .from('accounts')
          .select('id')
          .eq('email', 'fund@unmomentoprints.com')
          .single();

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

      // Create or link buyer account
      const buyerEmail = meta.buyer_email || session.customer_email;
      if (buyerEmail) {
        const { data: existingAccount } = await supabase
          .from('accounts')
          .select('id')
          .eq('email', buyerEmail)
          .single();

        if (!existingAccount) {
          // Create account — they'll claim it after checkout
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