import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('print_queue')
      .select(`
        *,
        orders (buyer_name, order_number),
        event_hardware (device_name, asset_tag),
        event_pages (name)
      `)
      .in('status', ['queued', 'printing'])
      .order('priority', { ascending: true })
      .order('queued_at', { ascending: true });

    if (error) {
      console.error('[picker/print-queue]', error.message);
      return NextResponse.json({ items: [] });
    }

    const items = (data || []).map((p: any) => ({
      id:            p.id,
      queued_at:     p.queued_at,
      print_type:    p.print_type,
      status:        p.status,
      file_url:      p.file_url,
      customer_name: p.customer_name,
      asset_tag:     p.event_hardware?.asset_tag  || p.asset_tag || '',
      device_name:   p.event_hardware?.device_name || '',
      event_name:    p.event_pages?.name           || '',
      buyer_name:    p.orders?.buyer_name          || p.customer_name || '',
      order_number:  p.orders?.order_number        || null,
    }));

    return NextResponse.json({ items });

  } catch (err: any) {
    console.error('[picker/print-queue]', err.message);
    return NextResponse.json({ items: [] });
  }
}