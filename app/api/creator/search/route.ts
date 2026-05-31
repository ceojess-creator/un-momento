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
      const { data, error } = await supabase
        .from('creator_profiles')
        .select('handle, display_name, graduation_year, total_donated, avatar_url, is_verified, school_id')
        .eq('handle', handle)
        .eq('is_active', true)
        .single();

      if (error || !data) return NextResponse.json({ creators: [] });

      let school_name = '';
      if ((data as any).school_id) {
        const { data: schoolData } = await supabase
          .from('schools')
          .select('name, city, state_abbr')
          .eq('id', (data as any).school_id)
          .single();
        school_name = schoolData?.name || '';
      }

      return NextResponse.json({ creators: [{ ...data, school_name }] });
    }

    // Search creators
    let q = supabase
      .from('creator_profiles')
      .select('handle, display_name, graduation_year, total_donated, avatar_url, is_verified, school_id')
      .eq('is_active', true)
      .or(`display_name.ilike.%${query}%,handle.ilike.%${query}%`);

    if (year) q = q.eq('graduation_year', parseInt(year));

    const { data, error } = await q
      .order('total_donated', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[creator search] error:', error.message);
      return NextResponse.json({ creators: [], debug_error: error.message });
    }

    console.log('[creator search] found:', data?.length, 'for query:', query);

    // Enrich with school names via separate query
    const schoolIds = [...new Set((data||[]).map((c:any) => c.school_id).filter(Boolean))];
    const schoolMap: Record<string, string> = {};

    if (schoolIds.length > 0) {
      const { data: schools } = await supabase
        .from('schools')
        .select('id, name, city, state_abbr')
        .in('id', schoolIds);
      (schools||[]).forEach((s:any) => { schoolMap[s.id] = s.name; });
    }

    const creators = (data||[]).map((c:any) => ({
      ...c,
      school_name: schoolMap[c.school_id] || '',
    }));

    const filtered = school
      ? creators.filter((c:any) => c.school_name.toLowerCase().includes(school.toLowerCase()))
      : creators;

    return NextResponse.json({ creators: filtered });

  } catch (err: any) {
    console.error('[creator search]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}