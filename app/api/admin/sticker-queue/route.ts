import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { currentUser } from '@clerk/nextjs/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_EMAIL = 'ceojess@unmomentoprints.com';

export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const email = user.emailAddresses?.[0]?.emailAddress || '';
    if (email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data, error } = await supabase
      .from('orders')
      .select('id, order_number, buyer_name, buyer_email, buyer_phone, ship_city, ship_state, fulfillment_type, sticker_status, sticker_file_url, sticker_batch_date, sticker_tracking, created_at')
      .not('sticker_status', 'eq', 'none')
      .not('sticker_status', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[sticker-queue]', error.message);
      return NextResponse.json({ orders: [] });
    }

    return NextResponse.json({ orders: data || [] });

  } catch (err: any) {
    console.error('[sticker-queue]', err.message);
    return NextResponse.json({ orders: [] });
  }
}

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const email = user.emailAddresses?.[0]?.emailAddress || '';
    if (email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { order_id, tracking, status } = await request.json();

    if (!order_id) {
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
    }

    const updates: any = {};
    if (status)   updates.sticker_status   = status;
    if (tracking) updates.sticker_tracking = tracking;

    const { error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', order_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Send tracking email to customer if shipped
    if (status === 'shipped' && tracking) {
      const { data: order } = await supabase
        .from('orders')
        .select('buyer_name, buyer_email, ship_city, ship_state, order_number')
        .eq('id', order_id)
        .single();

      if (order?.buyer_email) {
        const firstName = order.buyer_name?.split(' ')[0] || 'there';
        try {
          await fetch('https://api.resend.com/emails', {
            method:  'POST',
            headers: {
              'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
              'Content-Type':  'application/json',
            },
            body: JSON.stringify({
              from:    'Un Momento <orders@unmomentoprints.com>',
              to:      order.buyer_email,
              subject: 'Your sticker sheet has shipped! 🎨',
              html: `
                <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
                  <h2>Your sticker sheet is on the way!</h2>
                  <p>Hi ${firstName},</p>
                  <p>Your custom die-cut sticker sheet has shipped to
                  ${order.ship_city}, ${order.ship_state}.</p>
                  <div style="background:#f0fdf4;border:1px solid #bbf7d0;
                              border-radius:8px;padding:16px;margin:16px 0;">
                    <p style="margin:0 0 4px;font-weight:600;">Tracking</p>
                    <p style="margin:0;color:#64748b;">${tracking}</p>
                  </div>
                  <p>Order #${order.order_number}</p>
                  <hr/>
                  <p style="color:#94a3b8;font-size:12px;">
                    Un Momento LLC · The moments that matter most deserve to exist in the real world.
                  </p>
                </div>
              `,
            }),
          });
        } catch (e) {
          console.error('[sticker-queue] email error:', e);
        }
      }
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('[sticker-queue]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}