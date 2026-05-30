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

    const body = await request.json();
    const {
      event_id, contractor_id, role_name,
      call_time, start_time, end_time,
      hourly_rate, notes,
    } = body;

    if (!event_id || !contractor_id || !role_name) {
      return NextResponse.json(
        { error: 'event_id, contractor_id, and role_name are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('event_staff')
      .upsert({
        event_id,
        contractor_id,
        role_name,
        call_time:   call_time   || null,
        start_time:  start_time  || null,
        end_time:    end_time    || null,
        hourly_rate: hourly_rate || null,
        notes:       notes       || null,
        confirmed:   false,
      }, { onConflict: 'event_id,contractor_id,role_name' })
      .select('id')
      .single();

    if (error) {
      console.error('[assign-staff]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id });

  } catch (err: any) {
    console.error('[assign-staff]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const email = user.emailAddresses?.[0]?.emailAddress || '';
    if (email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('id');

    if (!staffId) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const { error } = await supabase
      .from('event_staff')
      .delete()
      .eq('id', staffId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const email = user.emailAddresses?.[0]?.emailAddress || '';
    if (email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, confirmed, checked_in, checked_out_at } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const updates: any = {};
    if (confirmed     !== undefined) updates.confirmed      = confirmed;
    if (checked_in    !== undefined) updates.checked_in     = checked_in;
    if (checked_in    === true)      updates.checked_in_at  = new Date().toISOString();
    if (checked_out_at !== undefined) updates.checked_out_at = checked_out_at;

    const { error } = await supabase
      .from('event_staff')
      .update(updates)
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}