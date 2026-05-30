import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const {
      order_id,
      pickup_location,
      custom_message,
    } = await request.json();

    if (!order_id) {
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
    }

    // Mark order ready in DB and get customer info
    const { data: result } = await supabase.rpc('mark_order_ready', {
      p_order_id:        order_id,
      p_pickup_location: pickup_location || 'the Un Momento booth',
    });

    if (!result?.success) {
      return NextResponse.json(
        { error: result?.error || 'Failed to mark order ready' },
        { status: 400 }
      );
    }

    const phone    = result.buyer_phone;
    const name     = result.buyer_name?.split(' ')[0] || 'there';
    const location = result.pickup_location;

    if (!phone) {
      return NextResponse.json({
        success: true,
        sms_sent: false,
        reason: 'No phone number on file for this order',
      });
    }

    // Format phone for Twilio — must be E.164
    const cleanPhone = phone.replace(/\D/g, '');
    const e164Phone  = cleanPhone.startsWith('1')
      ? `+${cleanPhone}`
      : `+1${cleanPhone}`;

    const message = custom_message ||
      `Hi ${name}! 🎓 Your Un Momento order is ready for pickup at ${location}. ` +
      `Show this text to your Hand-off Associate. Thank you! — Un Momento Prints`;

    // Send via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;

    const twilioRes = await fetch(twilioUrl, {
      method: 'POST',
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
      order_id,
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
      .eq('order_id', order_id);

    if (!twilioRes.ok) {
      console.error('[notify] Twilio error:', twilioData);
      return NextResponse.json({
        success:  false,
        sms_sent: false,
        error:    twilioData.message || 'Twilio error',
      });
    }

    return NextResponse.json({
      success:   true,
      sms_sent:  true,
      to:        e164Phone,
      twilio_sid: twilioData.sid,
      message,
    });

  } catch (err: any) {
    console.error('[notify/order-ready]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}