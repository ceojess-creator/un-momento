import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { print_id } = await request.json();

    if (!print_id) {
      return NextResponse.json({ error: 'Missing print_id' }, { status: 400 });
    }

    // Get print job
    const { data: printJob, error: pError } = await supabase
      .from('print_queue')
      .select('*, order_assembly(id, items_ready, items_expected, order_id)')
      .eq('id', print_id)
      .single();

    if (pError || !printJob) {
      return NextResponse.json({ error: 'Print job not found' }, { status: 404 });
    }

    // Mark print complete
    await supabase
      .from('print_queue')
      .update({
        status:       'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', print_id);

    // Update assembly items_ready count
    const assembly = printJob.order_assembly as any;
    if (assembly) {
      const newReady = (assembly.items_ready || 0) + 1;
      const isAllReady = newReady >= (assembly.items_expected || 1);

      await supabase
        .from('order_assembly')
        .update({
          items_ready: newReady,
          status:      isAllReady ? 'assembling' : 'pending',
        })
        .eq('id', assembly.id);
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('[picker/print-done]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}