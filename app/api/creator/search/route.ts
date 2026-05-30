import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query  = searchParams.get('q')      || '';
    const school = searchParams.get('school') || '';
    const year   = searchParams.get('year')   || '';
    const handle = searchParams.get('handle') || '';

    if (!query && !handle) {
      return NextResponse.json({ creators: [] });
    }

    // Exact handle lookup
    if (handle) {
      const { data } = await supabase
        .from('creator_profiles')
        .select('handle, display_name, graduation_year, total_donated, avatar_url, is_verified, schools(name, city, state_abbr)')
        .eq('handle', handle)
        .eq('is_active', true)
        .single();

      if (!data) return NextResponse.json({ creators: [] });

      return NextResponse.json({
        creators: [{
          ...data,
          school_name: (data as any).schools?.name || '',
        }],
      });
    }

    // Search query
    let q = supabase
      .from('creator_profiles')
      .select('handle, display_name, graduation_year, total_donated, avatar_url, is_verified, schools(name, city, state_abbr)')
      .eq('is_active', true)
      .or(`display_name.ilike.%${query}%,handle.ilike.%${query}%`);

    if (year) q = q.eq('graduation_year', parseInt(year));

    const { data, error } = await q
      .order('total_donated', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[creator search] query error:', error.message);
      return NextResponse.json({ creators: [] });
    }

    const creators = (data || []).map((c: any) => ({
      ...c,
      school_name: c.schools?.name     || '',
      school_city: c.schools?.city     || '',
      school_state:c.schools?.state_abbr || '',
    }));

    // Filter by school name if provided
    const filtered = school
      ? creators.filter(c => c.school_name.toLowerCase().includes(school.toLowerCase()))
      : creators;

    return NextResponse.json({ creators: filtered });

  } catch (err: any) {
    console.error('[creator search]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}