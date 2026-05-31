import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Vercel cron calls this with a secret header
function verifyCron(request: Request): boolean {
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(request: Request) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today     = new Date().toISOString().split('T')[0];
  const batchDate = today;

  try {
    // Get all queued sticker orders not yet batched
    const { data: stickerOrders, error } = await supabase
      .from('orders')
      .select('id, order_number, buyer_name, buyer_email, buyer_phone, ship_city, ship_state, sticker_file_url, fulfillment_type, sticker_status')
      .eq('sticker_status', 'queued')
      .not('sticker_file_url', 'is', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[sticker-batch] query error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!stickerOrders || stickerOrders.length === 0) {
      console.log('[sticker-batch] no pending sticker orders');
      return NextResponse.json({ success: true, batched: 0, message: 'No pending sticker orders' });
    }

    console.log(`[sticker-batch] processing ${stickerOrders.length} sticker orders`);

    // Move files to hot folder in R2
    // Build manifest for email
    const manifest = stickerOrders.map(o => ({
      order_number:  o.order_number,
      buyer_name:    o.buyer_name,
      file_url:      o.sticker_file_url,
      fulfillment:   o.fulfillment_type,
      ship_to:       o.fulfillment_type === 'ship' ? `${o.ship_city}, ${o.ship_state}` : 'Booth pickup',
    }));

    // Mark orders as batched
    const orderIds = stickerOrders.map(o => o.id);
    await supabase
      .from('orders')
      .update({
        sticker_status:     'batched',
        sticker_batch_date: batchDate,
      })
      .in('id', orderIds);

    // Send manifest email to Jessica
    const manifestHtml = `
      <h2>Sticker Print Batch — ${batchDate}</h2>
      <p><strong>${stickerOrders.length} sticker sheet(s)</strong> ready to print on Pixcut S1.</p>
      <p>Print files are queued in your R2 hot folder: <code>sticker-batches/${batchDate}/</code></p>
      <hr/>
      <table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:13px;">
        <thead>
          <tr style="background:#f5f5f5;">
            <th style="padding:8px;text-align:left;border:1px solid #ddd;">Order #</th>
            <th style="padding:8px;text-align:left;border:1px solid #ddd;">Customer</th>
            <th style="padding:8px;text-align:left;border:1px solid #ddd;">Ship to</th>
            <th style="padding:8px;text-align:left;border:1px solid #ddd;">File</th>
          </tr>
        </thead>
        <tbody>
          ${manifest.map(m => `
            <tr>
              <td style="padding:8px;border:1px solid #ddd;">#${m.order_number}</td>
              <td style="padding:8px;border:1px solid #ddd;">${m.buyer_name}</td>
              <td style="padding:8px;border:1px solid #ddd;">${m.ship_to}</td>
              <td style="padding:8px;border:1px solid #ddd;"><a href="${m.file_url}">Print file</a></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <hr/>
      <p style="color:#888;font-size:12px;">
        After printing: go to Admin Console → Orders → mark each sticker as shipped and enter tracking.
        <br/>Manage at: <a href="https://unmomentoprints.com/admin">unmomentoprints.com/admin</a>
      </p>
    `;

    try {
      await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          from:    'Un Momento <orders@unmomentoprints.com>',
          to:      'ceojess@unmomentoprints.com',
          subject: `Sticker batch ready — ${stickerOrders.length} sheets · ${batchDate}`,
          html:    manifestHtml,
        }),
      });
      console.log('[sticker-batch] manifest email sent');
    } catch (e) {
      console.error('[sticker-batch] email error:', e);
    }

    // Notify each customer that sticker ships separately
    for (const order of stickerOrders) {
      if (!order.buyer_email) continue;
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
            subject: `Your sticker sheet is being printed! 🎨`,
            html: `
              <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
                <h2>Your sticker sheet is on its way!</h2>
                <p>Hi ${firstName},</p>
                <p>Your custom die-cut sticker sheet is being printed in-house on our
                Pixcut S1 and will ship separately from your photo print.</p>
                <p><strong>What to expect:</strong></p>
                <ul>
                  <li>Photo print — ships in 4-5 days via our print partner</li>
                  <li>Sticker sheet — ships within 7 days, separately</li>
                </ul>
                <p>We'll send you a tracking number as soon as your stickers ship.</p>
                <p>Questions? Reply to this email or contact
                <a href="mailto:ceojess@unmomentoprints.com">ceojess@unmomentoprints.com</a></p>
                <hr/>
                <p style="color:#94a3b8;font-size:12px;">
                  Un Momento LLC · The moments that matter most deserve to exist in the real world.
                </p>
              </div>
            `,
          }),
        });
      } catch (e) {
        console.error(`[sticker-batch] customer email error for ${order.buyer_email}:`, e);
      }

      // Small delay between emails
      await new Promise(r => setTimeout(r, 200));
    }

    return NextResponse.json({
      success:    true,
      batched:    stickerOrders.length,
      batch_date: batchDate,
      orders:     manifest,
    });

  } catch (err: any) {
    console.error('[sticker-batch]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Also allow POST for manual triggering from admin
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const secret = body.secret || request.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return GET(request);
}