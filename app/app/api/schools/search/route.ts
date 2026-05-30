import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query  = searchParams.get('q')     || '';
    const state  = searchParams.get('state') || '';
    const type   = searchParams.get('type')  || '';

    if (!query || query.length < 2) {
      return NextResponse.json({ schools: [] });
    }

    // Use the search_schools function if available
    // Fall back to direct query
    let data: any[] = [];

    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('search_schools', {
        p_query: query,
        p_state: state || null,
        p_type:  type  || null,
      });

      if (!rpcError && rpcData) {
        data = rpcData;
      }
    } catch {
      // fallback to direct query
    }

    if (data.length === 0) {
      const q = supabase
        .from('schools')
        .select('id, nces_id, name, type, city, state_abbr, zip')
        .eq('is_active', true)
        .ilike('name', `%${query}%`);

      if (state) q.eq('state_abbr', state);
      if (type)  q.eq('type', type);

      const { data: directData } = await q
        .order('name')
        .limit(20);

      data = directData || [];
    }

    return NextResponse.json({ schools: data });

  } catch (err: any) {
    console.error('[schools/search]', err.message);
    return NextResponse.json({ schools: [] });
  }
}