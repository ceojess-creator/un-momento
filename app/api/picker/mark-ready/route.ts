import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { assembly_id, pickup_location } = await request.json();

    if (!assembly_id) {
      return NextResponse.json({ error: 'Missing assembly_id' }, { status: 400 });
    }

    // Get assembly + order info
    const { data: assembly, error: aError } = await supabase
      .from('order_assembly')
      .select('*, orders(buyer_name, buyer_phone, buyer_email, order_number, product_type)')
      .eq('id', assembly_id)
      .single();

    if (aError || !assembly) {
      return NextResponse.json({ error: 'Assembly not found' }, { status: 404 });
    }

    const order       = assembly.orders as any;
    const buyerName   = order?.buyer_name   || 'there';
    const buyerPhone  = order?.buyer_phone  || '';
    const orderNumber = order?.order_number || '';
    const firstName   = buyerName.split(' ')[0];
    const location    = pickup_location || 'the Un Momento booth';

    // Mark assembly as ready
    await supabase
      .from('order_assembly')
      .update({
        status:            'ready',
        ready_at:          new Date().toISOString(),
        pickup_location:   location,
      })
      .eq('id', assembly_id);

    // Update order status
    await supabase
      .from('orders')
      .update({ fulfillment_status: 'ready_for_pickup' })
      .eq('id', assembly.order_id);

    // Send SMS if phone available
    let smsSent = false;
    if (buyerPhone) {
      const cleanPhone = buyerPhone.replace(/\D/g, '');
      const e164Phone  = cleanPhone.startsWith('1')
        ? `+${cleanPhone}` : `+1${cleanPhone}`;

      const message = orderNumber
        ? `Hi ${firstName}! 🎓 Your Un Momento order #${orderNumber} is ready for pickup at ${location}. Show this text to your Hand-off Associate. — Un Momento`
        : `Hi ${firstName}! 🎓 Your Un Momento order is ready for pickup at ${location}. Show this text to your Hand-off Associate. — Un Momento`;

      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;

      const twilioRes = await fetch(twilioUrl, {
        method:  'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(
            `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
          ).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: process.env.TWILIO_PHONE_NUMBER!,
          To:   e164Phone,
          Body: message,
        }),
      });

      const twilioData = await twilioRes.json();

      // Log SMS
      await supabase.from('sms_log').insert({
        order_id:   assembly.order_id,
        to_phone:   e164Phone,
        message,
        status:     twilioData.status || 'sent',
        twilio_sid: twilioData.sid    || null,
        error:      twilioData.error_message || null,
      });

      // Mark customer notified
      await supabase
        .from('order_assembly')
        .update({
          customer_notified: true,
          sms_sent_at:       new Date().toISOString(),
        })
        .eq('id', assembly_id);

      smsSent = twilioRes.ok;
    }

    return NextResponse.json({
      success:      true,
      sms_sent:     smsSent,
      buyer_name:   buyerName,
      order_number: orderNumber,
    });

  } catch (err: any) {
    console.error('[picker/mark-ready]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}