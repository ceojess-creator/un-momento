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
      first_name, last_name, phone, email: contractorEmail,
      preferred_role, can_drive, has_vehicle,
      t_shirt_size, emergency_name, emergency_phone, notes,
    } = body;

    if (!first_name || !last_name || !phone) {
      return NextResponse.json(
        { error: 'First name, last name, and phone are required.' },
        { status: 400 }
      );
    }

    // Check for duplicate phone
    const { count } = await supabase
      .from('contractors')
      .select('*', { count: 'exact', head: true })
      .eq('phone', phone);

    if ((count || 0) > 0) {
      return NextResponse.json(
        { error: 'A contractor with this phone number already exists.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('contractors')
      .insert({
        first_name,
        last_name,
        phone,
        email:           contractorEmail || null,
        preferred_role:  preferred_role  || null,
        can_drive:       can_drive       || false,
        has_vehicle:     has_vehicle     || false,
        t_shirt_size:    t_shirt_size    || null,
        emergency_name:  emergency_name  || null,
        emergency_phone: emergency_phone || null,
        notes:           notes           || null,
        is_active:       true,
        rating:          5.0,
        total_events:    0,
      })
      .select('id, first_name, last_name')
      .single();

    if (error) {
      console.error('[add-contractor]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      id:      data.id,
      name:    `${data.first_name} ${data.last_name}`,
    });

  } catch (err: any) {
    console.error('[add-contractor]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}