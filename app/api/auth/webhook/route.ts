import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { WebhookEvent } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { Webhook } from 'svix';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'Missing webhook secret' },
      { status: 400 }
    );
  }

  // Verify webhook signature
  const headerPayload = await headers();
  const svix_id        = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json(
      { error: 'Missing svix headers' },
      { status: 400 }
    );
  }

  const payload = await request.json();
  const body    = JSON.stringify(payload);
  const wh      = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;
  try {
    evt = wh.verify(body, {
      'svix-id':        svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid webhook signature' },
      { status: 400 }
    );
  }

  // Handle user created event
  if (evt.type === 'user.created') {
    const { id, email_addresses, first_name, last_name } = evt.data;

    const email = email_addresses?.[0]?.email_address || '';
    const name  = [first_name, last_name].filter(Boolean).join(' ') || email.split('@')[0];

    // Create account in Supabase
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .insert({
        name,
        email,
        is_creator:      false,
        onboarding_step: 'welcome',
      })
      .select('id')
      .single();

    if (accountError) {
      console.error('[auth webhook] account error:', accountError.message);
      return NextResponse.json(
        { error: accountError.message },
        { status: 500 }
      );
    }

    console.log(`[auth webhook] Created account for ${email} — ${account.id}`);
  }

  // Handle user deleted event
  if (evt.type === 'user.deleted') {
    const { id } = evt.data;
    console.log(`[auth webhook] User deleted: ${id}`);
    // Soft delete — keep the account record for order history
  }

  return NextResponse.json({ success: true });
}