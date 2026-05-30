import { redirect }     from 'next/navigation';
import { currentUser }  from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import AdminClient      from './AdminClient';

const ADMIN_EMAIL = 'ceojess@unmomentoprints.com';

export default async function AdminPage() {
  const user = await currentUser();
  if (!user) redirect('/sign-in');

  const email = user.emailAddresses?.[0]?.emailAddress || '';
  if (email !== ADMIN_EMAIL) redirect('/');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const today     = new Date().toISOString().split('T')[0];
  const thirtyAgo = new Date(Date.now() - 30*24*60*60*1000).toISOString();

  // Fetch all data in parallel
  const [
    { data: todayOrders,   error: e1 },
    { data: recentOrders,  error: e2 },
    { data: allOrders,     error: e3 },
    { count: pendingCount, error: e4 },
    { data: creators,      error: e5 },
    { data: pendingApps,   error: e6 },
    { data: reorderAlerts, error: e7 },
    { data: credits,       error: e8 },
    { data: events,        error: e9 },
    { data: hardware,      error: e10 },
    { data: assemblyQueue, error: e11 },
    { data: printQueue,    error: e12 },
    { data: staffRoster,   error: e13 },
    { data: contractors,   error: e14 },
  ] = await Promise.all([
    supabase.from('orders').select('*').gte('created_at', `${today}T00:00:00`).order('created_at', { ascending: false }),
    supabase.from('orders').select('*').gte('created_at', thirtyAgo).order('created_at', { ascending: false }).limit(100),
    supabase.from('orders').select('tokens_spent, created_at, fulfillment_source, campaign_slug'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('fulfillment_status', 'pending'),
    supabase.from('creator_profiles').select('*').order('total_earned', { ascending: false }).limit(50),
    supabase.from('creator_applications').select('*').eq('status', 'pending').order('created_at', { ascending: true }),
    supabase.from('reorder_alerts').select('*'),
    supabase.from('referral_credits').select('amount, referrer_handle, created_at').order('created_at', { ascending: false }).limit(50),
    supabase.from('event_pages').select('*').order('event_date', { ascending: false }).limit(20),
    supabase.from('event_hardware').select('*').order('device_type', { ascending: true }),
    supabase.from('order_assembly').select('*, orders(buyer_name, buyer_phone, product_type, fulfillment_type), event_pages(name)').limit(50),
    supabase.from('print_queue').select('*, event_hardware(device_name, asset_tag), event_pages(name), orders(buyer_name)').limit(50),
    supabase.from('event_staff').select('*, contractors(first_name, last_name, phone, email), staff_roles(color, base_hourly), event_pages(name, event_date)').limit(100),
    supabase.from('contractors').select('*').order('last_name').limit(100),
  ]);

  // Log errors for debugging
  const errors = {e1,e2,e3,e4,e5,e6,e7,e8,e9,e10,e11,e12,e13,e14};
  Object.entries(errors).forEach(([k,v]) => {
    if (v) console.error(`[admin] query ${k} error:`, v.message);
  });

  console.log('[admin] events:', events?.length, 'hardware:', hardware?.length, 'creators:', creators?.length);

  const totalRevenue  = (allOrders||[]).reduce((s,o) => s+(o.tokens_spent||0), 0);
  const todayRevenue  = (todayOrders||[]).reduce((s,o) => s+(o.tokens_spent||0), 0);
  const onlineRevenue = (allOrders||[]).filter(o=>o.fulfillment_source==='online').reduce((s,o)=>s+(o.tokens_spent||0),0);
  const onsiteRevenue = (allOrders||[]).filter(o=>o.fulfillment_source==='onsite').reduce((s,o)=>s+(o.tokens_spent||0),0);
  const totalDonated  = (credits||[]).reduce((s,c) => s+(c.amount||0), 0);

  // Enrich hardware with event names
  const eventMap         = Object.fromEntries((events||[]).map(e => [e.id, e]));
  const enrichedHardware = (hardware||[]).map(h => ({
    ...h,
    event_pages: eventMap[(h as any).event_id] || null,
  }));

  // Flatten joined queries
  const flatAssembly = (assemblyQueue||[]).map((a:any) => ({
    ...a,
    buyer_name:        a.orders?.buyer_name,
    buyer_phone:       a.orders?.buyer_phone,
    product_type:      a.orders?.product_type,
    fulfillment_type:  a.orders?.fulfillment_type,
    event_name:        a.event_pages?.name,
  }));

  const flatPrintQueue = (printQueue||[]).map((p:any) => ({
    ...p,
    device_name:  p.event_hardware?.device_name,
    asset_tag:    p.event_hardware?.asset_tag,
    event_name:   p.event_pages?.name,
    buyer_name:   p.orders?.buyer_name,
  }));

  const flatStaff = (staffRoster||[]).map((s:any) => ({
    ...s,
    first_name:    s.contractors?.first_name,
    last_name:     s.contractors?.last_name,
    phone:         s.contractors?.phone,
    email:         s.contractors?.email,
    role_color:    s.staff_roles?.color,
    base_hourly:   s.staff_roles?.base_hourly,
    event_name:    s.event_pages?.name,
    event_date:    s.event_pages?.event_date,
  }));

  return (
    <AdminClient
      stats={{
        todayRevenue,
        totalRevenue,
        onlineRevenue,
        onsiteRevenue,
        todayOrderCount:  (todayOrders  ||[]).length,
        totalOrderCount:  (allOrders    ||[]).length,
        pendingCount:     pendingCount  || 0,
        creatorCount:     (creators     ||[]).length,
        totalDonated,
      }}
      recentOrders={recentOrders   || []}
      creators={creators           || []}
      pendingApps={pendingApps     || []}
      reorderAlerts={reorderAlerts || []}
      credits={credits             || []}
      events={events               || []}
      hardware={enrichedHardware}
      assemblyQueue={flatAssembly}
      printQueue={flatPrintQueue}
      staffRoster={flatStaff}
      contractors={contractors     || []}
    />
  );
}