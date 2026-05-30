import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Total raised across all campaigns
    const { data: credits } = await supabase
      .from('referral_credits')
      .select('amount');

    const total = (credits || []).reduce((sum, r) => sum + (r.amount || 0), 0);

    // Total orders
    const { count: orderCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    // Active creators
    const { count: creatorCount } = await supabase
      .from('creator_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('is_verified', true);

    // Top schools by donation
    const { data: topSchools } = await supabase
      .from('creator_profiles')
      .select('school_name, total_donated')
      .gt('total_donated', 0)
      .order('total_donated', { ascending: false })
      .limit(5);

    return NextResponse.json({
      total:         Math.round(total * 100) / 100,
      order_count:   orderCount  || 0,
      creator_count: creatorCount || 0,
      top_schools:   topSchools  || [],
    });

  } catch (err: any) {
    console.error('[fundraiser totals]', err.message);
    return NextResponse.json({ total: 0, order_count: 0, creator_count: 0 });
  }
}