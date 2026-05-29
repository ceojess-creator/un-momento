import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const handle = searchParams.get('handle');

    if (!handle) {
      return NextResponse.json(
        { error: 'Handle is required' },
        { status: 400 }
      );
    }

    // Get creator profile
    const { data: profile, error: profileError } = await supabase
      .from('creator_profiles')
      .select('id, display_name, earnings_balance, total_earned, total_donated')
      .eq('handle', handle)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      );
    }

    // Get order count
    const { count } = await supabase
      .from('creator_orders')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', profile.id);

    // Get recent orders
    const { data: orders } = await supabase
      .from('creator_orders')
      .select('id, created_at, buyer_name, order_total, creator_earnings, ptso_amount, fulfillment_status')
      .eq('creator_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      earnings: {
        earnings_balance: profile.earnings_balance,
        total_earned:     profile.total_earned,
        total_donated:    profile.total_donated,
        total_orders:     count || 0,
      },
      orders: orders || [],
    });

  } catch (err: any) {
    console.error('[earnings]', err.message);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}