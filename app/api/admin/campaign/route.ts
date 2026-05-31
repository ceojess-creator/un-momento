import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { currentUser } from '@clerk/nextjs/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_EMAIL = 'ceojess@unmomentoprints.com';

export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const email = user.emailAddresses?.[0]?.emailAddress || '';
    if (email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug') || 'grad-2026';

    // Campaign summary from item totals view
    const { data: itemData } = await supabase
      .from('campaign_item_totals')
      .select('*')
      .eq('campaign_slug', slug)
      .single();

    // Creator performance
    const { data: creatorData } = await supabase
      .from('campaign_creator_performance')
      .select('*')
      .eq('campaign_slug', slug)
      .order('revenue_attributed', { ascending: false });

    // Recent orders
    const { data: orderData } = await supabase
      .from('campaign_order_summary')
      .select('*')
      .eq('campaign_slug', slug)
      .order('created_at', { ascending: false })
      .limit(50);

    return NextResponse.json({
      summary:  itemData   || {},
      items:    itemData   || {},
      creators: creatorData || [],
      orders:   orderData  || [],
    });

  } catch (err: any) {
    console.error('[campaign]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}