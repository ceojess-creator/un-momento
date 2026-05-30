import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('[prodigi webhook]', JSON.stringify(body).slice(0, 200));

    const { type, order } = body;
    if (!order?.merchantReference) {
      return NextResponse.json({ received: true });
    }

    const orderId        = order.merchantReference;
    const prodigiOrderId = order.id;
    const stage          = order.status?.stage;
    const shipments      = order.shipments || [];

    // Map Prodigi status to our status
    const statusMap: Record<string, string> = {
      'InProgress':    'printing',
      'Complete':      'shipped',
      'Cancelled':     'cancelled',
      'Ok':            'submitted',
    };

    const ourStatus = statusMap[stage] || 'pending';

    // Get tracking info if available
    const tracking    = shipments[0]?.tracking    || null;
    const trackingUrl = shipments[0]?.trackingUrl || null;
    const carrier     = shipments[0]?.carrier     || null;

    // Update order
    await supabase
      .from('orders')
      .update({
        fulfillment_status: ourStatus,
        tracking_number:    tracking,
      })
      .eq('id', orderId);

    // If shipped — send tracking email to customer
    if (stage === 'Complete' && tracking) {
      const { data: orderData } = await supabase
        .from('orders')
        .select('buyer_name, buyer_email, ship_city, ship_state')
        .eq('id', orderId)
        .single();

      if (orderData?.buyer_email) {
        const firstName = orderData.buyer_name?.split(' ')[0] || 'there';

        await fetch('https://api.resend.com/emails', {
          method:  'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type':  'application/json',
          },
          body: JSON.stringify({
            from:    'Un Momento Prints <orders@unmomentoprints.com>',
            to:      orderData.buyer_email,
            subject: 'Your Un Momento print has shipped! 📦',
            html: `
              <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
                <h2 style="color:#0f172a;">Your print is on its way!</h2>
                <p>Hi ${firstName},</p>
                <p>Your graduation keepsake print has shipped to
                ${orderData.ship_city}, ${orderData.ship_state}.</p>
                ${tracking ? `
                <div style="background:#f0fdf4;border:1px solid #bbf7d0;
                            border-radius:8px;padding:16px;margin:16px 0;">
                  <p style="margin:0 0 8px;font-weight:600;color:#0f172a;">
                    Tracking information
                  </p>
                  <p style="margin:0 0 4px;color:#64748b;">
                    Carrier: ${carrier || 'Standard shipping'}
                  </p>
                  <p style="margin:0;color:#64748b;">
                    Tracking: ${trackingUrl
                      ? `<a href="${trackingUrl}" style="color:#16a34a;">${tracking}</a>`
                      : tracking
                    }
                  </p>
                </div>
                ` : ''}
                <p>Scan the QR code on your print to hear your memory clip — forever.</p>
                <hr/>
                <p style="color:#94a3b8;font-size:12px;">
                  Un Momento Prints ·
                  The moments that matter most deserve to exist in the real world.
                </p>
              </div>
            `,
          }),
        });

        console.log(`[prodigi webhook] tracking email sent to ${orderData.buyer_email}`);
      }
    }

    return NextResponse.json({ received: true });

  } catch (err: any) {
    console.error('[prodigi webhook]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}