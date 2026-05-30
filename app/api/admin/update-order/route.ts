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

    const { order_id, fulfillment_status } = await request.json();

    if (!order_id || !fulfillment_status) {
      return NextResponse.json(
        { error: 'Missing order_id or fulfillment_status' },
        { status: 400 }
      );
    }

    const validStatuses = ['pending','fulfilled','shipped','delivered','cancelled'];
    if (!validStatuses.includes(fulfillment_status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const updates: any = { fulfillment_status };
    if (fulfillment_status === 'delivered') {
      updates.delivered_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', order_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, fulfillment_status });

  } catch (err: any) {
    console.error('[update-order]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}