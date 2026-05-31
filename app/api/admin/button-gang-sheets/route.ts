import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { currentUser } from '@clerk/nextjs/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_EMAIL = 'ceojess@unmomentoprints.com';

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const email = user.emailAddresses?.[0]?.emailAddress || '';
    if (email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data, error } = await supabase
      .from('button_gang_sheets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[button-gang-sheets]', error.message);
      return NextResponse.json({ sheets: [] });
    }

    return NextResponse.json({ sheets: data || [] });

  } catch (err: any) {
    console.error('[button-gang-sheets]', err.message);
    return NextResponse.json({ sheets: [] });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const email = user.emailAddresses?.[0]?.emailAddress || '';
    if (email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { sheet_id, status } = await request.json();
    if (!sheet_id) return NextResponse.json({ error: 'Missing sheet_id' }, { status: 400 });

    const updates: any = { status };
    if (status === 'printed') updates.printed_at = new Date().toISOString();

    const { error } = await supabase
      .from('button_gang_sheets')
      .update(updates)
      .eq('id', sheet_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('[button-gang-sheets PATCH]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}