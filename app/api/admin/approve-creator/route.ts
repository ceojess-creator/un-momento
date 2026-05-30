import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { currentUser } from '@clerk/nextjs/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_EMAIL = 'ceojess@unmomentoprints.com';

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const email = user.emailAddresses?.[0]?.emailAddress || '';
    if (email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { application_id } = await request.json();
    if (!application_id) {
      return NextResponse.json({ error: 'Missing application_id' }, { status: 400 });
    }

    // Get application
    const { data: app } = await supabase
      .from('creator_applications')
      .select('*')
      .eq('id', application_id)
      .single();

    if (!app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Generate handle
    const base   = `${app.first_name}-${app.last_name}`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .slice(0, 30);
    const suffix = Math.random().toString(36).slice(2, 6);
    const handle = `${base}-${suffix}`;

    // Update application status
    await supabase
      .from('creator_applications')
      .update({
        status:             'approved',
        verification_level: 'manual',
        reviewed_at:        new Date().toISOString(),
        reviewed_by:        email,
      })
      .eq('id', application_id);

    // Update account
    await supabase
      .from('accounts')
      .update({
        is_creator:      true,
        onboarding_step: 'complete',
      })
      .eq('id', app.account_id);

    // Create creator profile
    const { error: profileError } = await supabase
      .from('creator_profiles')
      .insert({
        account_id:         app.account_id,
        handle,
        display_name:       `${app.first_name} ${app.last_name}`,
        school_name:        app.institution_name,
        institution_country: app.institution_country,
        graduation_year:    2026,
        verification_level: 'manual',
        is_verified:        true,
        is_active:          true,
        referred_by_handle: app.referred_by || null,
        social_link:        app.social_link  || null,
        parent_email:       app.parent_email || null,
      });

    if (profileError) {
      console.error('[approve-creator]', profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // Send approval email via Resend
    try {
      const contactEmail = app.edu_email || app.parent_email;
      if (contactEmail) {
        await fetch('https://api.resend.com/emails', {
          method:  'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type':  'application/json',
          },
          body: JSON.stringify({
            from:    'Un Momento Prints <memories@unmomentoprints.com>',
            to:      contactEmail,
            subject: `You're approved! Your Un Momento storefront is live`,
            html: `
              <h2>Welcome to Un Momento Prints, ${app.first_name}!</h2>
              <p>Your creator application has been approved.</p>
              <p><strong>Your storefront:</strong>
                <a href="https://unmomentoprints.com/${handle}">
                  unmomentoprints.com/${handle}
                </a>
              </p>
              <p>Share your link with family and friends. Every order through
              your link earns you 10% — and 10% goes to your school.</p>
              <p>Campaign runs through June 30, 2026.</p>
              <hr/>
              <p>Questions? Reply to this email or contact
                <a href="mailto:ceojess@unmomentoprints.com">
                  ceojess@unmomentoprints.com
                </a>
              </p>
            `,
          }),
        });
      }
    } catch (e) {
      console.error('[approve-creator] email error:', e);
    }

    return NextResponse.json({
      success: true,
      handle,
      message: `${app.first_name} ${app.last_name} approved — storefront: unmomentoprints.com/${handle}`,
    });

  } catch (err: any) {
    console.error('[approve-creator]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}