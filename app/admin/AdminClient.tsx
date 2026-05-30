'use client';
import { useState } from 'react';

interface Stats {
  todayRevenue:     number;
  totalRevenue:     number;
  onlineRevenue:    number;
  onsiteRevenue:    number;
  todayOrderCount:  number;
  totalOrderCount:  number;
  pendingCount:     number;
  creatorCount:     number;
  totalDonated:     number;
}

interface Order {
  id:                string;
  created_at:        string;
  buyer_name:        string;
  buyer_email:       string;
  product_type:      string;
  tokens_spent:      number;
  fulfillment_status:string;
  fulfillment_source:string;
  fulfillment_type:  string;
  referral_code:     string;
  ship_city:         string;
  ship_state:        string;
  campaign_slug:     string;
}

interface Creator {
  id:               string;
  handle:           string;
  display_name:     string;
  school_name:      string;
  graduation_year:  number;
  earnings_balance: number;
  total_earned:     number;
  total_donated:    number;
  is_verified:      boolean;
  is_active:        boolean;
  verification_level: string;
}

interface App {
  id:               string;
  created_at:       string;
  first_name:       string;
  last_name:        string;
  institution_name: string;
  institution_country: string;
  graduation_date:  string;
  program_or_grade: string;
  edu_email:        string;
  parent_email:     string;
  social_link:      string;
  referred_by:      string;
  verification_level: string;
  phone_number:     string;
}

interface Alert {
  alert_level:  string;
  sku:          string;
  name:         string;
  category:     string;
  on_hand:      number;
  reorder_at:   number;
  suggest_order:number;
  supplier_name:string;
}

interface Credit {
  amount:           number;
  referrer_handle:  string;
  created_at:       string;
}

interface Event {
  id:           string;
  slug:         string;
  name:         string;
  event_date:   string;
  event_type:   string;
  venue_name:   string;
  venue_city:   string;
  venue_state:  string;
  booth_active: boolean;
  presale_open: boolean;
  is_active:    boolean;
}

interface AdminClientProps {
  stats:         Stats;
  recentOrders:  Order[];
  creators:      Creator[];
  pendingApps:   App[];
  reorderAlerts: Alert[];
  credits:       Credit[];
  events:        Event[];
}

type Tab = 'dashboard'|'orders'|'revenue'|'creators'|'applications'|'events'|'inventory';

export default function AdminClient({
  stats, recentOrders, creators, pendingApps,
  reorderAlerts, credits, events,
}: AdminClientProps) {
  const [tab,          setTab]          = useState<Tab>('dashboard');
  const [orderFilter,  setOrderFilter]  = useState('all');
  const [approvingId,  setApprovingId]  = useState<string|null>(null);
  const [message,      setMessage]      = useState<string|null>(null);

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(n);

  async function approveApp(appId: string) {
    setApprovingId(appId);
    try {
      const res  = await fetch('/api/admin/approve-creator', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ application_id: appId }),
      });
      const data = await res.json();
      setMessage(data.success ? '✓ Creator approved' : `Error: ${data.error}`);
    } catch (err) {
      setMessage('Network error');
    }
    setApprovingId(null);
    setTimeout(() => setMessage(null), 3000);
  }

  async function updateFulfillment(orderId: string, status: string) {
    await fetch('/api/admin/update-order', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ order_id: orderId, fulfillment_status: status }),
    });
    setMessage(`✓ Order marked ${status}`);
    setTimeout(() => setMessage(null), 2000);
  }

  const filteredOrders = orderFilter === 'all'
    ? recentOrders
    : recentOrders.filter(o => o.fulfillment_status === orderFilter);

  const tabStyle = (t: Tab) => ({
    padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
    background: tab === t ? '#1a1a1a' : 'transparent',
    border:     tab === t ? '1px solid #333' : '1px solid transparent',
    color:      tab === t ? '#fff'    : '#666',
    fontSize: 12, fontWeight: tab === t ? 500 : 400,
    whiteSpace: 'nowrap' as const,
  });

  const statCard = (label: string, value: string, sub?: string, color = '#fff') => (
    <div key={label} style={{
      background: '#111', borderRadius: 10, padding: '16px',
      border: '1px solid #1a1a1a',
    }}>
      <p style={{ fontSize: 11, color: '#555', margin: '0 0 6px' }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 600, color, margin: '0 0 2px' }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: '#444', margin: 0 }}>{sub}</p>}
    </div>
  );

  const badge = (text: string, color: string) => (
    <span style={{
      fontSize: 10, padding: '2px 7px', borderRadius: 10,
      background: color + '22', color, fontWeight: 500,
    }}>{text}</span>
  );

  return (
    <main style={{
      minHeight: '100vh', background: '#0a0a0a', color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    }}>

      {/* Header */}
      <div style={{
        background: '#111', borderBottom: '1px solid #1a1a1a',
        padding: '16px 20px', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <p style={{ fontSize: 11, color: '#555', letterSpacing: 3,
                      textTransform: 'uppercase', margin: '0 0 2px' }}>
            Un Momento Prints
          </p>
          <h1 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>
            Admin Console
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {message && (
            <span style={{ fontSize: 12, color: '#4ADE80',
                           background: '#0d1f0d', padding: '4px 10px',
                           borderRadius: 6 }}>
              {message}
            </span>
          )}
          {pendingApps.length > 0 && (
            <span style={{ fontSize: 11, background: '#BA7517',
                           color: '#000', padding: '3px 8px',
                           borderRadius: 10, fontWeight: 700 }}>
              {pendingApps.length} pending
            </span>
          )}
          {reorderAlerts.length > 0 && (
            <span style={{ fontSize: 11, background: '#ff4444',
                           color: '#fff', padding: '3px 8px',
                           borderRadius: 10, fontWeight: 700 }}>
              {reorderAlerts.length} reorder
            </span>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 4, padding: '10px 16px',
        borderBottom: '1px solid #1a1a1a', overflowX: 'auto',
        background: '#0d0d0d',
      }}>
        {([
          ['dashboard',    '📊 Dashboard'   ],
          ['orders',       '📦 Orders'      ],
          ['revenue',      '💰 Revenue'     ],
          ['creators',     '🎓 Creators'    ],
          ['applications', '📋 Applications'],
          ['events',       '📍 Events'      ],
          ['inventory',    '📦 Inventory'   ],
        ] as [Tab, string][]).map(([t, lbl]) => (
          <button key={t} onClick={() => setTab(t)} style={tabStyle(t)}>
            {lbl}
            {t === 'applications' && pendingApps.length > 0 && (
              <span style={{ marginLeft: 4, background: '#BA7517',
                             color: '#000', fontSize: 9, padding: '1px 5px',
                             borderRadius: 8, fontWeight: 700 }}>
                {pendingApps.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ padding: '20px 16px', maxWidth: 1000, margin: '0 auto' }}>

        {/* ── DASHBOARD ───────────────────────────────────── */}
        {tab === 'dashboard' && (
          <div>
            <p style={{ fontSize: 13, color: '#555', margin: '0 0 16px' }}>
              {new Date().toLocaleDateString('en-US', {
                weekday:'long', year:'numeric', month:'long', day:'numeric'
              })}
            </p>

            {/* Today */}
            <p style={{ fontSize: 11, color: '#555', letterSpacing: 3,
                        textTransform: 'uppercase', margin: '0 0 10px' }}>
              Today
            </p>
            <div style={{ display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))',
                          gap: 8, marginBottom: 24 }}>
              {statCard('Revenue today',   fmt(stats.todayRevenue),  undefined, '#4ADE80')}
              {statCard('Orders today',    String(stats.todayOrderCount))}
              {statCard('Pending',         String(stats.pendingCount), 'need fulfillment', '#BA7517')}
            </div>

            {/* All time */}
            <p style={{ fontSize: 11, color: '#555', letterSpacing: 3,
                        textTransform: 'uppercase', margin: '0 0 10px' }}>
              All time
            </p>
            <div style={{ display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))',
                          gap: 8, marginBottom: 24 }}>
              {statCard('Total revenue',   fmt(stats.totalRevenue),   undefined, '#4ADE80')}
              {statCard('Total orders',    String(stats.totalOrderCount))}
              {statCard('Online revenue',  fmt(stats.onlineRevenue),  'via web')}
              {statCard('Onsite revenue',  fmt(stats.onsiteRevenue),  'at booth')}
              {statCard('Total donated',   fmt(stats.totalDonated),   'to schools + pool', '#4ADE80')}
              {statCard('Active creators', String(stats.creatorCount))}
            </div>

            {/* Alerts */}
            {(reorderAlerts.length > 0 || pendingApps.length > 0) && (
              <div>
                <p style={{ fontSize: 11, color: '#555', letterSpacing: 3,
                            textTransform: 'uppercase', margin: '0 0 10px' }}>
                  Action needed
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {pendingApps.length > 0 && (
                    <div onClick={() => setTab('applications')}
                      style={{ background: '#2a1a00', border: '1px solid #BA7517',
                               borderRadius: 8, padding: '10px 14px',
                               cursor: 'pointer', display: 'flex',
                               justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: '#BA7517' }}>
                        {pendingApps.length} creator application{pendingApps.length !== 1 ? 's' : ''} awaiting review
                      </span>
                      <span style={{ color: '#BA7517', fontSize: 12 }}>Review →</span>
                    </div>
                  )}
                  {reorderAlerts.map(a => (
                    <div key={a.sku} style={{
                      background: a.alert_level === 'OUT OF STOCK' ? '#2a0a0a' : '#1a1000',
                      border: `1px solid ${a.alert_level === 'OUT OF STOCK' ? '#A32D2D' : '#BA7517'}`,
                      borderRadius: 8, padding: '10px 14px',
                      display: 'flex', justifyContent: 'space-between',
                    }}>
                      <div>
                        <span style={{ fontSize: 12,
                                       color: a.alert_level === 'OUT OF STOCK' ? '#ff6b6b' : '#BA7517',
                                       fontWeight: 500 }}>
                          {a.alert_level} — {a.name}
                        </span>
                        <p style={{ fontSize: 11, color: '#555', margin: '2px 0 0' }}>
                          {a.on_hand} remaining · reorder {a.suggest_order} from {a.supplier_name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ORDERS ──────────────────────────────────────── */}
        {tab === 'orders' && (
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16,
                          flexWrap: 'wrap' }}>
              {['all','pending','fulfilled','delivered'].map(f => (
                <button key={f} onClick={() => setOrderFilter(f)} style={{
                  padding: '5px 12px', borderRadius: 16,
                  border: orderFilter === f ? '1px solid #4ADE80' : '1px solid #333',
                  background: orderFilter === f ? '#0d1f0d' : 'transparent',
                  color: orderFilter === f ? '#4ADE80' : '#666',
                  fontSize: 12, cursor: 'pointer', textTransform: 'capitalize',
                }}>{f}</button>
              ))}
              <span style={{ fontSize: 12, color: '#555',
                             alignSelf: 'center', marginLeft: 4 }}>
                {filteredOrders.length} orders
              </span>
            </div>

            {filteredOrders.map(o => (
              <div key={o.id} style={{
                background: '#111', borderRadius: 10, padding: '14px 16px',
                marginBottom: 8, border: '1px solid #1a1a1a',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                              alignItems: 'flex-start', gap: 10,
                              flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <p style={{ fontWeight: 600, fontSize: 13,
                                margin: '0 0 3px' }}>
                      {o.buyer_name || o.buyer_email}
                    </p>
                    <p style={{ fontSize: 12, color: '#888', margin: '0 0 4px' }}>
                      {o.product_type?.replace(/_/g,' ')}
                      {o.ship_city ? ` · ${o.ship_city}, ${o.ship_state}` : ''}
                      {o.referral_code ? ` · ref: ${o.referral_code}` : ''}
                    </p>
                    <p style={{ fontSize: 11, color: '#444', margin: 0 }}>
                      {new Date(o.created_at).toLocaleString()}
                      {o.fulfillment_source === 'onsite'
                        ? ' · 🎪 onsite'
                        : ' · 📦 online'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 6,
                                alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 600,
                                   color: '#4ADE80' }}>
                      ${o.tokens_spent?.toFixed(2)}
                    </span>
                    {badge(
                      o.fulfillment_status,
                      o.fulfillment_status === 'delivered' ? '#4ADE80'
                      : o.fulfillment_status === 'fulfilled' ? '#60a5fa'
                      : '#BA7517'
                    )}
                    {o.fulfillment_status === 'pending' && (
                      <button
                        onClick={() => updateFulfillment(o.id, 'fulfilled')}
                        style={{ padding: '4px 10px', background: '#1a1a1a',
                                 border: '1px solid #333', borderRadius: 6,
                                 color: '#fff', fontSize: 11, cursor: 'pointer' }}>
                        Mark fulfilled
                      </button>
                    )}
                    {o.fulfillment_status === 'fulfilled' && (
                      <button
                        onClick={() => updateFulfillment(o.id, 'delivered')}
                        style={{ padding: '4px 10px', background: '#1a1a1a',
                                 border: '1px solid #333', borderRadius: 6,
                                 color: '#fff', fontSize: 11, cursor: 'pointer' }}>
                        Mark delivered
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredOrders.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px',
                            color: '#444', fontSize: 14 }}>
                No {orderFilter === 'all' ? '' : orderFilter} orders yet.
              </div>
            )}
          </div>
        )}

        {/* ── REVENUE ─────────────────────────────────────── */}
        {tab === 'revenue' && (
          <div>
            <div style={{ display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))',
                          gap: 8, marginBottom: 24 }}>
              {statCard('Gross revenue',   fmt(stats.totalRevenue),  undefined, '#4ADE80')}
              {statCard('Online',          fmt(stats.onlineRevenue), '% of total')}
              {statCard('Onsite',          fmt(stats.onsiteRevenue), 'booth sales')}
              {statCard('Total donated',   fmt(stats.totalDonated),  'schools + pool', '#4ADE80')}
              {statCard('Stripe fees est.',fmt(stats.totalRevenue * 0.029 + stats.totalOrderCount * 0.30), '2.9% + $0.30/order')}
              {statCard('Net est.',        fmt(stats.totalRevenue - stats.totalDonated - (stats.totalRevenue * 0.029 + stats.totalOrderCount * 0.30)), 'after fees + donations')}
            </div>

            <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 12px' }}>
              Recent referral credits
            </p>
            {credits.length === 0 ? (
              <p style={{ color: '#444', fontSize: 13 }}>No credits yet.</p>
            ) : (
              credits.map((c, i) => (
                <div key={i} style={{
                  background: '#111', borderRadius: 8, padding: '10px 14px',
                  marginBottom: 6, border: '1px solid #1a1a1a',
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: 13,
                }}>
                  <span style={{ color: '#888' }}>{c.referrer_handle || 'general-fund'}</span>
                  <span style={{ color: '#4ADE80' }}>{fmt(c.amount)}</span>
                  <span style={{ color: '#444' }}>
                    {new Date(c.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── CREATORS ────────────────────────────────────── */}
        {tab === 'creators' && (
          <div>
            <p style={{ fontSize: 13, color: '#555', margin: '0 0 16px' }}>
              {creators.length} active creators
            </p>
            {creators.map(c => (
              <div key={c.id} style={{
                background: '#111', borderRadius: 10, padding: '14px 16px',
                marginBottom: 8, border: '1px solid #1a1a1a',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                              alignItems: 'flex-start', gap: 10,
                              flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <p style={{ fontWeight: 600, fontSize: 13,
                                margin: '0 0 2px', display: 'flex',
                                alignItems: 'center', gap: 6 }}>
                      {c.display_name}
                      {c.is_verified && badge('verified', '#4ADE80')}
                      {!c.is_active && badge('inactive', '#ff4444')}
                    </p>
                    <p style={{ fontSize: 12, color: '#888', margin: '0 0 2px' }}>
                      {c.school_name}
                      {c.graduation_year ? ` · ${c.graduation_year}` : ''}
                    </p>
                    <p style={{ fontSize: 11, color: '#555', margin: 0,
                                fontFamily: 'monospace' }}>
                      {c.handle} · {c.verification_level}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 14, fontWeight: 600,
                                color: '#4ADE80', margin: '0 0 2px' }}>
                      {fmt(c.earnings_balance)} available
                    </p>
                    <p style={{ fontSize: 12, color: '#888', margin: '0 0 2px' }}>
                      {fmt(c.total_earned)} total earned
                    </p>
                    <p style={{ fontSize: 11, color: '#555', margin: 0 }}>
                      {fmt(c.total_donated)} donated
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── APPLICATIONS ────────────────────────────────── */}
        {tab === 'applications' && (
          <div>
            {pendingApps.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px',
                            color: '#444', fontSize: 14 }}>
                ✓ No pending applications
              </div>
            ) : (
              pendingApps.map(app => (
                <div key={app.id} style={{
                  background: '#111', borderRadius: 10, padding: '16px',
                  marginBottom: 10, border: '1px solid #1a1a1a',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between',
                                alignItems: 'flex-start', gap: 10,
                                flexWrap: 'wrap', marginBottom: 10 }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 14, margin: '0 0 3px' }}>
                        {app.first_name} {app.last_name}
                      </p>
                      <p style={{ fontSize: 12, color: '#888', margin: '0 0 3px' }}>
                        {app.institution_name} · {app.institution_country}
                      </p>
                      <p style={{ fontSize: 12, color: '#888', margin: '0 0 3px' }}>
                        {app.program_or_grade} · Grad: {app.graduation_date}
                      </p>
                      {app.edu_email && (
                        <p style={{ fontSize: 11, color: '#4ADE80', margin: '0 0 2px' }}>
                          📧 {app.edu_email}
                        </p>
                      )}
                      {app.parent_email && (
                        <p style={{ fontSize: 11, color: '#BA7517', margin: '0 0 2px' }}>
                          👨‍👩‍👧 {app.parent_email}
                        </p>
                      )}
                      {app.referred_by && (
                        <p style={{ fontSize: 11, color: '#60a5fa', margin: '0 0 2px' }}>
                          🔗 Referred by {app.referred_by}
                        </p>
                      )}
                      {app.social_link && (
                        <a href={app.social_link} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 11, color: '#888' }}>
                          {app.social_link}
                        </a>
                      )}
                      <p style={{ fontSize: 10, color: '#444', margin: '4px 0 0' }}>
                        {new Date(app.created_at).toLocaleString()}
                        {' · '}{app.verification_level}
                        {app.phone_number ? ` · ${app.phone_number}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => approveApp(app.id)}
                      disabled={approvingId === app.id}
                      style={{
                        padding: '10px 18px',
                        background: approvingId === app.id ? '#333' : '#4ADE80',
                        color: approvingId === app.id ? '#888' : '#000',
                        border: 'none', borderRadius: 8,
                        fontSize: 13, fontWeight: 700,
                        cursor: approvingId === app.id ? 'wait' : 'pointer',
                        flexShrink: 0,
                      }}>
                      {approvingId === app.id ? 'Approving…' : 'Approve ✓'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── EVENTS ──────────────────────────────────────── */}
        {tab === 'events' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between',
                          alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: '#555', margin: 0 }}>
                {events.length} events
              </p>
              <a href="/admin/events/new" style={{
                padding: '8px 14px', background: '#4ADE80', color: '#000',
                borderRadius: 8, textDecoration: 'none',
                fontSize: 12, fontWeight: 700,
              }}>+ Add event</a>
            </div>

            {events.map(ev => (
              <div key={ev.id} style={{
                background: '#111', borderRadius: 10, padding: '14px 16px',
                marginBottom: 8, border: '1px solid #1a1a1a',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                              alignItems: 'flex-start', gap: 10,
                              flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 13,
                                margin: '0 0 3px', display: 'flex',
                                alignItems: 'center', gap: 6 }}>
                      {ev.name}
                      {ev.booth_active && badge('booth active', '#4ADE80')}
                      {!ev.is_active && badge('inactive', '#444')}
                    </p>
                    <p style={{ fontSize: 12, color: '#888', margin: '0 0 2px' }}>
                      {ev.event_date} · {ev.event_type}
                      {ev.venue_name ? ` · ${ev.venue_name}` : ''}
                      {ev.venue_city ? `, ${ev.venue_city}` : ''}
                    </p>
                    <p style={{ fontSize: 11, color: '#444', margin: 0,
                                fontFamily: 'monospace' }}>
                      /event/{ev.slug}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <a href={`/event/${ev.slug}`} target="_blank"
                      rel="noopener noreferrer"
                      style={{ padding: '5px 10px', background: '#1a1a1a',
                               border: '1px solid #333', borderRadius: 6,
                               color: '#fff', fontSize: 11,
                               textDecoration: 'none' }}>
                      View →
                    </a>
                    <a href={`https://unmomentoprints.com/event/${ev.slug}`}
                      onClick={e => {
                        e.preventDefault();
                        navigator.clipboard.writeText(`https://unmomentoprints.com/event/${ev.slug}`);
                      }}
                      style={{ padding: '5px 10px', background: '#1a1a1a',
                               border: '1px solid #333', borderRadius: 6,
                               color: '#888', fontSize: 11, cursor: 'pointer',
                               textDecoration: 'none' }}>
                      Copy link
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── INVENTORY ───────────────────────────────────── */}
        {tab === 'inventory' && (
          <div>
            {reorderAlerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px',
                            color: '#4ADE80', fontSize: 14 }}>
                ✓ All inventory levels are healthy
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 13, color: '#555', margin: '0 0 16px' }}>
                  {reorderAlerts.length} item{reorderAlerts.length !== 1 ? 's' : ''} need attention
                </p>
                {reorderAlerts.map(a => (
                  <div key={a.sku} style={{
                    background: '#111', borderRadius: 10,
                    padding: '14px 16px', marginBottom: 8,
                    border: `1px solid ${a.alert_level === 'OUT OF STOCK' ? '#A32D2D' : '#BA751733'}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between',
                                  alignItems: 'flex-start', gap: 10,
                                  flexWrap: 'wrap' }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: 13,
                                    margin: '0 0 3px', display: 'flex',
                                    alignItems: 'center', gap: 6 }}>
                          {a.name}
                          {badge(a.alert_level,
                            a.alert_level === 'OUT OF STOCK' ? '#ff4444'
                            : a.alert_level === 'CRITICAL'   ? '#ff6b6b'
                            : '#BA7517'
                          )}
                        </p>
                        <p style={{ fontSize: 12, color: '#888', margin: '0 0 2px' }}>
                          SKU: {a.sku} · {a.category}
                        </p>
                        <p style={{ fontSize: 11, color: '#555', margin: 0 }}>
                          {a.on_hand} on hand · reorder at {a.reorder_at} ·
                          suggest ordering {a.suggest_order}
                          {a.supplier_name ? ` from ${a.supplier_name}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  );
}