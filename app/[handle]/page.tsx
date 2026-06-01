import { createClient } from '@supabase/supabase-js';
import { notFound }     from 'next/navigation';
import CreatorStorefront from './CreatorStorefront';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function CreatorPage({
  params,
}: {
  params: { handle: string };
}) {
  const { handle } = await params;

  console.log('[storefront] looking up handle:', handle);

  const { data: creator, error } = await supabase
    .from('creator_profiles')
    .select('*')
    .eq('handle', handle)
    .eq('is_active', true)
    .single();

  console.log('[storefront] creator:', creator?.display_name, 'error:', error?.message);

  if (!creator) {
    console.log('[storefront] not found — returning 404');
    notFound();
  }

  // Fetch school separately
  let school = null;
  if (creator.school_id) {
    const { data: schoolData } = await supabase
      .from('schools')
      .select('name, city, state_abbr, type')
      .eq('id', creator.school_id)
      .single();
    school = schoolData;
  }

  // Fetch campaign stats
  const { data: campaignStats } = await supabase
    .from('campaign_creator_performance')
    .select('*')
    .eq('creator_handle', handle)
    .single();

  // Fetch school total
  const { data: schoolStats } = await supabase
    .from('fundraiser_summary')
    .select('*')
    .eq('school_id', creator.school_id)
    .single();

  // Fetch creator rank
  const { data: schoolCreators } = await supabase
    .from('creator_profiles')
    .select('handle, total_donated')
    .eq('school_id', creator.school_id)
    .eq('is_active', true)
    .order('total_donated', { ascending: false });

  const rank = (schoolCreators||[]).findIndex(c => c.handle === handle) + 1;

  return (
    <CreatorStorefront
      creator={creator}
      school={school}
      campaignStats={campaignStats || null}
      schoolStats={schoolStats    || null}
      rank={rank}
    />
  );
}

export async function generateMetadata({
  params,
}: {
  params: { handle: string };
}) {
  const { handle } = await params;
  const { data: creator } = await supabase
    .from('creator_profiles')
    .select('display_name, school_id')
    .eq('handle', handle)
    .single();

  if (!creator) return { title: 'Creator | Un Momento' };

  let schoolName = 'their school';
  if (creator.school_id) {
    const { data: school } = await supabase
      .from('schools')
      .select('name')
      .eq('id', creator.school_id)
      .single();
    schoolName = school?.name || 'their school';
  }

  return {
    title: `${creator.display_name} · Un Momento`,
    description: `Support ${creator.display_name} — 10% of your order goes to ${schoolName}.`,
  };
}