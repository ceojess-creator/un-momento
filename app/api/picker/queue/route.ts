import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('order_assembly')
      .select(`
        *,
        orders (
          buyer_name,
          buyer_phone,
          buyer_email,
          product_type,
          fulfillment_type,
          order_number
        ),
        event_pages (name)
      `)
      .not('status', 'eq', 'handed_off')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[picker/queue]', error.message);
      return NextResponse.json({ items: [] });
    }

    const items = (data || []).map((a: any) => ({
      id:                a.id,
      status:            a.status,
      items_expected:    a.items_expected,
      items_ready:       a.items_ready,
      pickup_location:   a.pickup_location,
      ready_at:          a.ready_at,
      customer_notified: a.customer_notified,
      buyer_name:        a.orders?.buyer_name   || '',
      buyer_phone:       a.orders?.buyer_phone  || '',
      buyer_email:       a.orders?.buyer_email  || '',
      product_type:      a.orders?.product_type || '',
      fulfillment_type:  a.orders?.fulfillment_type || '',
      order_number:      a.orders?.order_number || null,
      event_name:        a.event_pages?.name    || '',
    }));

    return NextResponse.json({ items });

  } catch (err: any) {
    console.error('[picker/queue]', err.message);
    return NextResponse.json({ items: [] });
  }
}