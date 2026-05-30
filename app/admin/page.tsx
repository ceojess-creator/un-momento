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

  // ── Fetch all dashboard data ──────────────────────────────

  // Today's orders
  const today = new Date().toISOString().split('T')[0];
  const { data: todayOrders } = await supabase
    .from('orders')
    .select('*')
    .gte('created_at', `${today}T00:00:00`)
    .order('created_at', { ascending: false });

  // All orders (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30*24*60*60*1000).toISOString();
  const { data: recentOrders } = await supabase
    .from('orders')
    .select('*')
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: false })
    .limit(100);

  // Revenue totals
  const { data: allOrders } = await supabase
    .from('orders')
    .select('tokens_spent, created_at, fulfillment_source, campaign_slug');

  const totalRevenue  = (allOrders || []).reduce((s, o) => s + (o.tokens_spent || 0), 0);
  const todayRevenue  = (todayOrders || []).reduce((s, o) => s + (o.tokens_spent || 0), 0);
  const onlineRevenue = (allOrders || [])
    .filter(o => o.fulfillment_source === 'online')
    .reduce((s, o) => s + (o.tokens_spent || 0), 0);
  const onsiteRevenue = (allOrders || [])
    .filter(o => o.fulfillment_source === 'onsite')
    .reduce((s, o) => s + (o.tokens_spent || 0), 0);

  // Pending fulfillment
  const { count: pendingCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('fulfillment_status', 'pending');

  // Creators
  const { data: creators } = await supabase
    .from('creator_profiles')
    .select('*')
    .order('total_earned', { ascending: false })
    .limit(50);

  // Pending creator applications
  const { data: pendingApps } = await supabase
    .from('creator_applications')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  // Inventory alerts
  const { data: reorderAlerts } = await supabase
    .from('reorder_alerts')
    .select('*');

  // Referral credits (revenue splits)
  const { data: credits } = await supabase
    .from('referral_credits')
    .select('amount, referrer_handle, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  const totalDonated = (credits || []).reduce((s, c) => s + (c.amount || 0), 0);

  // Event pages
  const { data: events } = await supabase
    .from('event_pages')
    .select('*')
    .order('event_date', { ascending: false })
    .limit(20);

  return (
    <AdminClient
      stats={{
        todayRevenue,
        totalRevenue,
        onlineRevenue,
        onsiteRevenue,
        todayOrderCount:  (todayOrders  || []).length,
        totalOrderCount:  (allOrders    || []).length,
        pendingCount:     pendingCount  || 0,
        creatorCount:     (creators     || []).length,
        totalDonated,
      }}
      recentOrders={recentOrders  || []}
      creators={creators          || []}
      pendingApps={pendingApps    || []}
      reorderAlerts={reorderAlerts|| []}
      credits={credits            || []}
      events={events              || []}
    />
  );
}