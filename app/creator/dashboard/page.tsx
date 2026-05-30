import { currentUser } from '@clerk/nextjs/server';
import { redirect }    from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import CreatorDashboardClient from './CreatorDashboardClient';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function CreatorDashboardPage() {
  const user = await currentUser();
  if (!user) redirect('/sign-in');

  const email = user.emailAddresses?.[0]?.emailAddress || '';

  // Get account + creator profile
  const { data: account } = await supabase
    .from('accounts')
    .select('*, creator_profiles(*)')
    .eq('email', email)
    .single();

  const creatorProfile = Array.isArray(account?.creator_profiles)
    ? account.creator_profiles[0]
    : account?.creator_profiles;

  if (!creatorProfile) {
    redirect('/creator/signup');
  }

  const handle = creatorProfile.handle;

  // Get referral credits with order details
  const { data: credits } = await supabase
    .from('referral_credits')
    .select('*, orders(buyer_name, buyer_email, product_type, tokens_spent, fulfillment_status, created_at)')
    .eq('referrer_handle', handle)
    .order('created_at', { ascending: false })
    .limit(50);

  // Get school info
  let school = null;
  if (creatorProfile.school_id) {
    const { data: schoolData } = await supabase
      .from('schools')
      .select('name, city, state_abbr, type')
      .eq('id', creatorProfile.school_id)
      .single();
    school = schoolData;
  }

  // Campaign stats
  const { data: contestPeriod } = await supabase
    .from('contest_periods')
    .select('*')
    .eq('is_active', true)
    .single();

  const totalEarned   = creatorProfile.total_earned     || 0;
  const balance       = creatorProfile.earnings_balance  || 0;
  const totalDonated  = creatorProfile.total_donated     || 0;
  const totalOrders   = (credits || []).length;

  return (
    <CreatorDashboardClient
      handle={handle}
      displayName={creatorProfile.display_name}
      isVerified={creatorProfile.is_verified}
      verificationLevel={creatorProfile.verification_level}
      school={school}
      balance={balance}
      totalEarned={totalEarned}
      totalDonated={totalDonated}
      totalOrders={totalOrders}
      credits={credits || []}
      contestPeriod={contestPeriod}
    />
  );
}