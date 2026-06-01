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
  const { handle } = params;

  // Fetch creator profile
  const { data: creator } = await supabase
    .from('creator_profiles')
    .select('*, schools(name, city, state_abbr, type)')
    .eq('handle', handle)
    .eq('is_active', true)
    .single();

  if (!creator) notFound();

  // Fetch campaign stats
  const { data: campaignStats } = await supabase
    .from('campaign_creator_performance')
    .select('*')
    .eq('creator_handle', handle)
    .single();

  // Fetch school total (all creators at same school)
  const { data: schoolStats } = await supabase
    .from('fundraiser_summary')
    .select('*')
    .eq('school_id', creator.school_id)
    .single();

  // Fetch creator rank at school
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
      school={(creator as any).schools}
      campaignStats={campaignStats || null}
      schoolStats={schoolStats   || null}
      rank={rank}
    />
  );
}

export async function generateMetadata({
  params,
}: {
  params: { handle: string };
}) {
  const { data: creator } = await supabase
    .from('creator_profiles')
    .select('display_name, schools(name)')
    .eq('handle', params.handle)
    .single();

  if (!creator) return { title: 'Creator | Un Momento' };

  return {
    title: `${creator.display_name} · Un Momento`,
    description: `Support ${creator.display_name} — 10% of your order goes to ${(creator as any).schools?.name || 'their school'}.`,
    openGraph: {
      title: `Support ${creator.display_name} on Un Momento`,
      description: `Order graduation prints and 10% goes to ${(creator as any).schools?.name || 'their school'}'s PTSO.`,
    },
  };
}