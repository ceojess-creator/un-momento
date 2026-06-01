import { currentUser } from '@clerk/nextjs/server';
import { redirect }    from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import AccountClient   from './AccountClient';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function AccountPage() {
  const user = await currentUser();
  if (!user) redirect('/sign-in');

  const email = user.emailAddresses?.[0]?.emailAddress || '';

  // Get or create account
  let { data: account } = await supabase
    .from('accounts')
    .select('*, token_wallets(*), creator_profiles!creator_profiles_account_id_fkey(*, schools(name, city, state_abbr))')
    .eq('email', email)
    .single();

  if (!account) {
    const { data: newAccount } = await supabase
      .from('accounts')
      .insert({
        name:  `${user.firstName || ''} ${user.lastName || ''}`.trim()
               || email.split('@')[0],
        email,
        is_creator:      false,
        onboarding_step: 'welcome',
      })
      .select('*, token_wallets(*), creator_profiles!creator_profiles_account_id_fkey(*)')
      .single();
    account = newAccount;
  }

  // Get recent orders
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('buyer_email', email)
    .order('created_at', { ascending: false })
    .limit(20);

  // Get referral credits if creator
  const creatorHandle = account?.creator_profiles?.handle;
  let referralCredits: any[] = [];

  if (creatorHandle) {
    const { data: credits } = await supabase
      .from('referral_credits')
      .select('*')
      .eq('referrer_handle', creatorHandle)
      .order('created_at', { ascending: false })
      .limit(50);
    referralCredits = credits || [];
  }

  return (
    <AccountClient
      account={account}
      orders={orders          || []}
      referralCredits={referralCredits}
      userImage={user.imageUrl}
    />
  );
}