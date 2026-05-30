import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name, email, phone, event_date, event_type,
      package_id, venue_name, venue_city, venue_state,
      guest_count, notes, campaign_slug,
    } = body;

    if (!name || !email || !phone || !event_date || !event_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create or get account
    let accountId: string | null = null;
    const { data: existingAccount } = await supabase
      .from('accounts')
      .select('id')
      .eq('email', email)
      .single();

    if (existingAccount) {
      accountId = existingAccount.id;
    } else {
      const { data: newAccount } = await supabase
        .from('accounts')
        .insert({
          name,
          email,
          phone,
          is_creator:      false,
          onboarding_step: 'booking',
        })
        .select('id')
        .single();
      accountId = newAccount?.id || null;
    }

    // Create venue booking
    const { data: booking, error: bookingError } = await supabase
      .from('venue_bookings')
      .insert({
        account_id:      accountId,
        contact_name:    name,
        contact_email:   email,
        contact_phone:   phone,
        event_type,
        package_id:      package_id      || null,
        event_date,
        venue_name,
        venue_city:      venue_city      || '',
        venue_state:     venue_state     || '',
        guest_count:     guest_count     ? parseInt(guest_count) : null,
        guest_count_est: guest_count     ? parseInt(guest_count) : null,
        notes:           notes           || null,
        campaign_slug:   campaign_slug   || 'events-2026',
        status:          'inquiry',
        tier:            package_id      || null,
      })
      .select('id')
      .single();

    if (bookingError) {
      console.error('[booking]', bookingError);
      return NextResponse.json(
        { error: bookingError.message },
        { status: 500 }
      );
    }

    // Send notification email to Jessica
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
          subject: `New event booking inquiry — ${event_type} · ${venue_city}, ${venue_state} · ${event_date}`,
          html: `
            <h2>New Event Booking Inquiry</h2>
            <p><strong>Contact:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone}</p>
            <p><strong>Event type:</strong> ${event_type}</p>
            <p><strong>Package:</strong> ${package_id || 'Not selected'}</p>
            <p><strong>Date:</strong> ${event_date}</p>
            <p><strong>Venue:</strong> ${venue_name}, ${venue_city}, ${venue_state}</p>
            <p><strong>Guest count:</strong> ${guest_count || 'Not specified'}</p>
            <p><strong>Notes:</strong> ${notes || 'None'}</p>
            <hr/>
            <p>Booking ID: ${booking?.id}</p>
            <p>Review at: <a href="https://unmomentoprints.com/admin">Admin Console</a></p>
          `,
        }),
      });
    } catch (e) {
      console.error('[booking] email error:', e);
    }

    // Send confirmation email to customer
    try {
      await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          from:    'Un Momento <orders@unmomentoprints.com>',
          to:      email,
          subject: `We received your booking request — Un Momento`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
              <h2>Thanks for reaching out, ${name.split(' ')[0]}!</h2>
              <p>We received your booking inquiry for your
              <strong>${event_type.replace(/_/g,' ')}</strong> on
              <strong>${event_date}</strong> at ${venue_name} in
              ${venue_city}, ${venue_state}.</p>
              <p>We'll reach out within 24 hours to confirm availability
              and send you a deposit invoice.</p>
              <p><strong>Package selected:</strong> ${package_id || 'To be confirmed'}</p>
              <hr/>
              <p>Questions? Reply to this email or call/text
              <a href="tel:+12623885790">(262) 388-5790</a></p>
              <p style="color:#94a3b8;font-size:12px;">
                Un Momento ·
                The moments that matter most deserve to exist in the real world.
              </p>
            </div>
          `,
        }),
      });
    } catch (e) {
      console.error('[booking] customer email error:', e);
    }

    return NextResponse.json({
      success:    true,
      booking_id: booking?.id,
    });

  } catch (err: any) {
    console.error('[booking]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}