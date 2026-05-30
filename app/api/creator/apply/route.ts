import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { headers }      from 'next/headers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Generate unique handle with 4-char suffix
async function generateHandle(firstName: string, lastName: string): Promise<string> {
  const base = `${firstName}-${lastName}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .slice(0, 30);

  let handle = '';
  let attempts = 0;

  while (attempts < 10) {
    const suffix = Math.random().toString(36).slice(2, 6);
    const candidate = `${base}-${suffix}`;

    const { count } = await supabase
      .from('creator_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('handle', candidate);

    if (count === 0) { handle = candidate; break; }
    attempts++;
  }

  return handle || `${base}-${Date.now().toString(36).slice(-4)}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      first_name, last_name, institution_name,
      institution_country, graduation_date,
      program_or_grade, edu_email, parent_email,
      social_link, referred_by, phone, attestation,
    } = body;

    // Validate required fields
    if (!first_name || !last_name || !institution_name ||
        !program_or_grade || !phone || !attestation) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate graduation date is Spring 2026
    const gradDate = new Date(graduation_date);
    const minDate  = new Date('2026-04-01');
    const maxDate  = new Date('2026-06-30');
    if (gradDate < minDate || gradDate > maxDate) {
      return NextResponse.json(
        { error: 'Graduation date must be between April 1 and June 30, 2026 for this campaign.' },
        { status: 400 }
      );
    }

    // Rate limiting — max 3 signups per IP per day
    const headerList  = await headers();
    const ip          = headerList.get('x-forwarded-for') || 'unknown';
    const oneDayAgo   = new Date(Date.now() - 24*60*60*1000).toISOString();

    const { count: recentAttempts } = await supabase
      .from('signup_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ip)
      .gte('created_at', oneDayAgo);

    if ((recentAttempts || 0) >= 3) {
      return NextResponse.json(
        { error: 'Too many signups from this location. Please try again tomorrow.' },
        { status: 429 }
      );
    }

    // Check phone number uniqueness
    const { count: phoneCount } = await supabase
      .from('creator_applications')
      .select('*', { count: 'exact', head: true })
      .eq('phone_number', phone);

    if ((phoneCount || 0) > 0) {
      return NextResponse.json(
        { error: 'A creator account already exists for this phone number.' },
        { status: 400 }
      );
    }

    // Determine verification level
    let verificationLevel = 'attestation';
    let status            = 'pending';

    if (edu_email && (
      edu_email.includes('.edu') ||
      edu_email.includes('.ac.') ||
      edu_email.includes('.school')
    )) {
      verificationLevel = 'edu_email';
      status            = 'approved';
    } else if (referred_by) {
      // Verify referrer exists
      const { data: referrer } = await supabase
        .from('creator_profiles')
        .select('id, is_verified')
        .eq('handle', referred_by)
        .single();

      if (referrer?.is_verified) {
        verificationLevel = 'referred';
        status            = 'approved';
      }
    } else if (parent_email) {
      verificationLevel = 'parent_email';
      status            = 'pending'; // 24-48hr review
    }

    // Create or get account
    const accountEmail = edu_email || parent_email || `${phone.replace(/\D/g,'')}@unmomentoprints.com`;

    let accountId: string;
    const { data: existingAccount } = await supabase
      .from('accounts')
      .select('id')
      .eq('email', accountEmail)
      .single();

    if (existingAccount) {
      accountId = existingAccount.id;
    } else {
      const { data: newAccount } = await supabase
        .from('accounts')
        .insert({
          name:            `${first_name} ${last_name}`,
          email:           accountEmail,
          phone,
          is_creator:      status === 'approved',
          onboarding_step: status === 'approved' ? 'complete' : 'pending',
        })
        .select('id')
        .single();
      accountId = newAccount!.id;
    }

    // Generate handle
    const handle = await generateHandle(first_name, last_name);

    // Create creator profile if approved
    if (status === 'approved') {
      const { error: profileError } = await supabase
        .from('creator_profiles')
        .insert({
          account_id:          accountId,
          handle,
          display_name:        `${first_name} ${last_name}`,
          school_name:         institution_name,
          institution_country,
          graduation_year:     2026,
          verification_level:  verificationLevel,
          is_verified:         true,
          is_active:           true,
          referred_by_handle:  referred_by || null,
          social_link:         social_link || null,
          parent_email:        parent_email || null,
        });

      if (profileError) {
        console.error('[apply] profile error:', profileError);
      }
    }

    // Create application record
    await supabase.from('creator_applications').insert({
      account_id:          accountId,
      first_name,
      last_name,
      institution_name,
      institution_country,
      graduation_date,
      program_or_grade,
      edu_email:           edu_email || null,
      parent_email:        parent_email || null,
      social_link:         social_link || null,
      referred_by:         referred_by || null,
      phone_number:        phone,
      verification_level:  verificationLevel,
      status,
      ip_address:          ip,
    });

    // Log signup attempt for rate limiting
    await supabase.from('signup_attempts').insert({
      ip_address: ip,
      phone,
    });

    // Send notification email to you for pending applications
    if (status === 'pending') {
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
            subject: `New creator application — ${first_name} ${last_name} · ${institution_name}`,
            html: `
              <h2>New Creator Application</h2>
              <p><strong>Name:</strong> ${first_name} ${last_name}</p>
              <p><strong>School:</strong> ${institution_name} (${institution_country})</p>
              <p><strong>Graduation:</strong> ${graduation_date}</p>
              <p><strong>Program:</strong> ${program_or_grade}</p>
              <p><strong>Verification:</strong> ${verificationLevel}</p>
              <p><strong>Referred by:</strong> ${referred_by || 'None'}</p>
              <p><strong>Social:</strong> ${social_link || 'None'}</p>
              <p><strong>Phone:</strong> ${phone}</p>
              <hr/>
              <p>Review at: <a href="https://unmomentoprints.com/admin/creators">Admin → Creators</a></p>
            `,
          }),
        });
      } catch (e) {
        console.error('[apply] email error:', e);
      }
    }

    return NextResponse.json({
      success:            true,
      handle:             status === 'approved' ? handle : null,
      status,
      verification_level: verificationLevel,
      message:            status === 'approved'
        ? `Your storefront is live at unmomentoprints.com/${handle}`
        : 'Application submitted. You\'ll hear back within 24–48 hours.',
    });

  } catch (err: any) {
    console.error('[apply]', err.message);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}