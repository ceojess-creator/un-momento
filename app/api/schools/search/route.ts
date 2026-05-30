import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')     || '';
    const state = searchParams.get('state') || '';
    const type  = searchParams.get('type')  || '';

    if (!query || query.length < 2) {
      return NextResponse.json({ schools: [] });
    }

    let data: any[] = [];

    // Try RPC function first
    const { data: rpcData, error: rpcError } = await supabase.rpc('search_schools', {
      p_query: query,
      p_state: state || null,
      p_type:  type  || null,
    });

    if (!rpcError && rpcData && rpcData.length > 0) {
      data = rpcData;
    } else {
      // Fallback to direct query
      let q = supabase
        .from('schools')
        .select('id, nces_id, name, type, city, state_abbr, zip')
        .eq('is_active', true)
        .ilike('name', `%${query}%`);

      if (state) q = q.eq('state_abbr', state);
      if (type)  q = q.eq('type', type);

      const { data: directData, error: directError } = await q
        .order('name')
        .limit(20);

      if (directError) console.error('[schools/search] direct query error:', directError.message);
      data = directData || [];
    }

    return NextResponse.json({ schools: data });

  } catch (err: any) {
    console.error('[schools/search]', err.message);
    return NextResponse.json({ schools: [] });
  }
}