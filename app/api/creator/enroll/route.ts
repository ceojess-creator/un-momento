import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const {
      creator_id, contest_period_id, school_id, graduation_date,
    } = await request.json();

    if (!creator_id) {
      return NextResponse.json({ error: 'Missing creator_id' }, { status: 400 });
    }

    // Get active contest period if not provided
    let contestId = contest_period_id;
    if (!contestId) {
      const { data: activePeriod } = await supabase
        .from('contest_periods')
        .select('id')
        .eq('is_active', true)
        .single();
      contestId = activePeriod?.id;
    }

    if (!contestId) {
      return NextResponse.json(
        { error: 'No active contest period found' },
        { status: 400 }
      );
    }

    // Resolve school_id — could be nces_id string or UUID
    let resolvedSchoolId = school_id || null;
    if (school_id && !school_id.includes('-')) {
      // Looks like an nces_id not a UUID — look up
      const { data: school } = await supabase
        .from('schools')
        .select('id')
        .eq('nces_id', school_id)
        .single();
      resolvedSchoolId = school?.id || null;
    }

    // Upsert enrollment
    const { data, error } = await supabase
      .from('creator_campaign_enrollments')
      .upsert({
        creator_id:        creator_id,
        contest_period_id: contestId,
        school_id:         resolvedSchoolId,
        graduation_date:   graduation_date || null,
        is_active:         true,
        enrolled_at:       new Date().toISOString(),
      }, { onConflict: 'creator_id,contest_period_id' })
      .select('id')
      .single();

    if (error) {
      console.error('[creator/enroll]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success:       true,
      enrollment_id: data.id,
      contest_id:    contestId,
      school_id:     resolvedSchoolId,
    });

  } catch (err: any) {
    console.error('[creator/enroll]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const creatorId = searchParams.get('creator_id');
    const handle    = searchParams.get('handle');

    let query = supabase
      .from('creator_campaign_enrollments')
      .select(`
        *,
        contest_periods (id, name, start_date, end_date, is_active),
        schools (id, name, city, state_abbr, type)
      `)
      .eq('is_active', true)
      .order('enrolled_at', { ascending: false });

    if (creatorId) {
      query = query.eq('creator_id', creatorId);
    } else if (handle) {
      const { data: profile } = await supabase
        .from('creator_profiles')
        .select('id')
        .eq('handle', handle)
        .single();
      if (!profile) {
        return NextResponse.json({ enrollments: [] });
      }
      query = query.eq('creator_id', profile.id);
    }

    const { data, error } = await query.limit(10);

    if (error) {
      console.error('[creator/enroll GET]', error.message);
      return NextResponse.json({ enrollments: [] });
    }

    return NextResponse.json({ enrollments: data || [] });

  } catch (err: any) {
    console.error('[creator/enroll GET]', err.message);
    return NextResponse.json({ enrollments: [] });
  }
}