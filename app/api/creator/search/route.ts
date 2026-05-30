import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query  = searchParams.get('q')           || '';
    const school = searchParams.get('school')      || '';
    const year   = searchParams.get('year')        || '';
    const handle = searchParams.get('handle')      || '';

    if (!query && !handle) {
      return NextResponse.json({ creators: [] });
    }

    // Exact handle lookup
    if (handle) {
      const { data } = await supabase
        .from('creator_profiles')
        .select('handle, display_name, school_name, graduation_year, total_donated, avatar_url, is_verified')
        .eq('handle', handle)
        .eq('is_active', true)
        .single();

      return NextResponse.json({ creators: data ? [data] : [] });
    }

    // Build search query
    let q = supabase
      .from('creator_profiles')
      .select('handle, display_name, school_name, graduation_year, total_donated, avatar_url, is_verified')
      .eq('is_active', true)
      .or(`display_name.ilike.%${query}%,handle.ilike.%${query}%`);

    if (school) q = q.ilike('school_name', `%${school}%`);
    if (year)   q = q.eq('graduation_year', parseInt(year));

    const { data, error } = await q
      .order('total_donated', { ascending: false })
      .limit(20);

    if (error) throw error;

    return NextResponse.json({ creators: data || [] });

  } catch (err: any) {
    console.error('[creator search]', err.message);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}