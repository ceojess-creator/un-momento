import { createClient } from '@supabase/supabase-js';
import { notFound }     from 'next/navigation';
import StorefrontClient from './StorefrontClient';

export const revalidate = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const { data } = await supabase
    .from('creator_profiles')
    .select('display_name')
    .eq('handle', handle)
    .single();

  if (!data) return { title: 'Un Momento Prints' };

  return {
    title: `${data.display_name} — Un Momento Prints`,
    description: `Order graduation prints and keepsakes from ${data.display_name}. Ships anywhere in the US.`,
  };
}

export default async function StorefrontPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;

  const { data: profile } = await supabase
    .from('creator_profiles')
    .select('*')
    .eq('handle', handle)
    .eq('is_active', true)
    .single();

  if (!profile) notFound();

  const { data: products } = await supabase
    .from('creator_products')
    .select('*')
    .eq('creator_id', profile.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  return (
    <StorefrontClient
      profile={profile}
      products={products || []}
    />
  );
}