import { redirect }    from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import AdminClient     from './AdminClient';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_EMAIL = 'ceojess@unmomentoprints.com';

export default async function AdminPage() {
  const user = await currentUser();
  if (!user) redirect('/sign-in');

  const email = user.emailAddresses?.[0]?.emailAddress || '';
  if (email !== ADMIN_EMAIL) redirect('/');

  const today       = new Date().toISOString().split('T')[0];
  const thirtyAgo   = new Date(Date.now()-30*24*60*60*1000).toISOString();

  const [
    { data: todayOrders },
    { data: recentOrders },
    { data: allOrders },
    { count: pendingCount },
    { data: creators },
    { data: pendingApps },
    { data: reorderAlerts },
    { data: credits },
    { data: events },
    { data: hardware },
    { data: assemblyQueue },
    { data: printQueue },
    { data: staffRoster },
    { data: contractors },
  ] = await Promise.all([
    supabase.from('orders').select('*').gte('created_at',`${today}T00:00:00`).order('created_at',{ascending:false}),
    supabase.from('orders').select('*').gte('created_at',thirtyAgo).order('created_at',{ascending:false}).limit(100),
    supabase.from('orders').select('tokens_spent,created_at,fulfillment_source,campaign_slug'),
    supabase.from('orders').select('*',{count:'exact',head:true}).eq('fulfillment_status','pending'),
    supabase.from('creator_profiles').select('*').order('total_earned',{ascending:false}).limit(50),
    supabase.from('creator_applications').select('*').eq('status','pending').order('created_at',{ascending:true}),
    supabase.from('reorder_alerts').select('*'),
    supabase.from('referral_credits').select('amount,referrer_handle,created_at').order('created_at',{ascending:false}).limit(50),
    supabase.from('event_pages').select('*').order('event_date',{ascending:false}).limit(20),
    supabase.from('event_hardware').select('*, event_pages!event_hardware_event_id_fkey(name, slug)').order('device_type', { ascending: true }),
    supabase.from('assembly_queue').select('*').limit(50),
    supabase.from('active_print_queue').select('*').limit(50),
    supabase.from('event_staff_roster').select('*').limit(100),
    supabase.from('contractors').select('*').order('last_name').limit(100),
  ]);

  const totalRevenue  = (allOrders||[]).reduce((s,o)=>s+(o.tokens_spent||0),0);
  const todayRevenue  = (todayOrders||[]).reduce((s,o)=>s+(o.tokens_spent||0),0);
  const onlineRevenue = (allOrders||[]).filter(o=>o.fulfillment_source==='online').reduce((s,o)=>s+(o.tokens_spent||0),0);
  const onsiteRevenue = (allOrders||[]).filter(o=>o.fulfillment_source==='onsite').reduce((s,o)=>s+(o.tokens_spent||0),0);
  const totalDonated  = (credits||[]).reduce((s,c)=>s+(c.amount||0),0);

  return (
    <AdminClient
      stats={{
        todayRevenue,
        totalRevenue,
        onlineRevenue,
        onsiteRevenue,
        todayOrderCount:  (todayOrders ||[]).length,
        totalOrderCount:  (allOrders   ||[]).length,
        pendingCount:     pendingCount ||0,
        creatorCount:     (creators    ||[]).length,
        totalDonated,
      }}
      recentOrders={recentOrders  ||[]}
      creators={creators          ||[]}
      pendingApps={pendingApps    ||[]}
      reorderAlerts={reorderAlerts||[]}
      credits={credits            ||[]}
      events={events              ||[]}
      hardware={hardware          ||[]}
      assemblyQueue={assemblyQueue||[]}
      printQueue={printQueue      ||[]}
      staffRoster={staffRoster    ||[]}
      contractors={contractors    ||[]}
    />
  );
}