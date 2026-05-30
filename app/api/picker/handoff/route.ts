import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { assembly_id } = await request.json();

    if (!assembly_id) {
      return NextResponse.json({ error: 'Missing assembly_id' }, { status: 400 });
    }

    // Get assembly to find order_id
    const { data: assembly, error: aError } = await supabase
      .from('order_assembly')
      .select('*, orders(buyer_name, order_number)')
      .eq('id', assembly_id)
      .single();

    if (aError || !assembly) {
      return NextResponse.json({ error: 'Assembly not found' }, { status: 404 });
    }

    // Mark handed off
    await supabase
      .from('order_assembly')
      .update({
        status:       'handed_off',
        handed_off_at: new Date().toISOString(),
      })
      .eq('id', assembly_id);

    // Update order status
    await supabase
      .from('orders')
      .update({ fulfillment_status: 'delivered' })
      .eq('id', assembly.order_id);

    return NextResponse.json({
      success:      true,
      buyer_name:   (assembly.orders as any)?.buyer_name   || '',
      order_number: (assembly.orders as any)?.order_number || null,
    });

  } catch (err: any) {
    console.error('[picker/handoff]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}