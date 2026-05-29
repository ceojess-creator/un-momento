import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json(
        { booth_active: false },
        { status: 400 }
      );
    }

    // Auto-activate booth if event_date is today
    const today = new Date().toISOString().split('T')[0];

    // First auto-activate any events happening today
    await supabase.rpc('auto_activate_booth');

    // Then check if this event has an active booth
    const { data: event } = await supabase
      .from('event_pages')
      .select('booth_active, fulfillment_mode, venue_name, venue_city')
      .eq('slug', slug)
      .single();

    return NextResponse.json({
      booth_active:     event?.booth_active || false,
      fulfillment_mode: event?.fulfillment_mode || 'ship',
      venue_name:       event?.venue_name || null,
      venue_city:       event?.venue_city || null,
    });

  } catch (err: any) {
    console.error('[booth-check]', err.message);
    return NextResponse.json({ booth_active: false });
  }
}