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
  id:                 string;
  handle:             string;
  display_name:       string;
  school_name:        string;
  graduation_year:    number;
  earnings_balance:   number;
  total_earned:       number;
  total_donated:      number;
  is_verified:        boolean;
  is_active:          boolean;
  verification_level: string;
}
interface App {
  id:                  string;
  created_at:          string;
  first_name:          string;
  last_name:           string;
  institution_name:    string;
  institution_country: string;
  graduation_date:     string;
  program_or_grade:    string;
  edu_email:           string;
  parent_email:        string;
  social_link:         string;
  referred_by:         string;
  verification_level:  string;
  phone_number:        string;
}
interface Alert {
  alert_level:   string;
  sku:           string;
  name:          string;
  category:      string;
  on_hand:       number;
  reorder_at:    number;
  suggest_order: number;
  supplier_name: string;
}
interface Credit {
  amount:          number;
  referrer_handle: string;
  created_at:      string;
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
interface Hardware {
  asset_tag:         string;
  device_name:       string;
  device_type:       string;
  model:             string;
  is_online:         boolean;
  queue_depth:       number;
  max_capacity:      number;
  capacity_pct:      number;
  status:            string;
  last_seen:         string;
  event_pages?:      { name: string; slug: string } | null;
}
interface AssemblyItem {
  id:                string;
  status:            string;
  items_expected:    number;
  items_ready:       number;
  pickup_location:   string;
  ready_at:          string;
  customer_notified: boolean;
  buyer_name:        string;
  buyer_phone:       string;
  product_type:      string;
  event_name:        string;
  picker_first:      string;
  handoff_first:     string;
}
interface PrintItem {
  id:            string;
  queued_at:     string;
  print_type:    string;
  status:        string;
  customer_name: string;
  asset_tag:     string;
  device_name:   string;
  event_name:    string;
  buyer_name:    string;
}
interface StaffMember {
  id:             string;
  event_name:     string;
  event_date:     string;
  first_name:     string;
  last_name:      string;
  phone:          string;
  email:          string;
  role_name:      string;
  role_color:     string;
  call_time:      string;
  start_time:     string;
  end_time:       string;
  hourly_rate:    number;
  confirmed:      boolean;
  checked_in:     boolean;
  checked_in_at:  string;
  checked_out_at: string;
  total_hours:    number;
  total_pay:      number;
}
interface Contractor {
  id:             string;
  first_name:     string;
  last_name:      string;
  phone:          string;
  email:          string;
  preferred_role: string;
  is_active:      boolean;
  rating:         number;
  total_events:   number;
}
interface AdminClientProps {
  stats:         Stats;
  recentOrders:  Order[];
  creators:      Creator[];
  pendingApps:   App[];
  reorderAlerts: Alert[];
  credits:       Credit[];
  events:        Event[];
  hardware:      Hardware[];
  assemblyQueue: AssemblyItem[];
  printQueue:    PrintItem[];
  staffRoster:   StaffMember[];
  contractors:   Contractor[];
}

type Tab = 'dashboard'|'orders'|'revenue'|'creators'|'applications'|'events'|'inventory'|'operations';

const C = {
  bg:      '#f4f6f8',
  surface: '#ffffff',
  border:  '#e2e8f0',
  text:    '#0f172a',
  muted:   '#64748b',
  faint:   '#94a3b8',
  green:   '#16a34a',
  greenBg: '#f0fdf4',
  greenBdr:'#bbf7d0',
  amber:   '#b45309',
  amberBg: '#fffbeb',
  amberBdr:'#fde68a',
  red:     '#b91c1c',
  redBg:   '#fef2f2',
  redBdr:  '#fecaca',
  blue:    '#1d4ed8',
  blueBg:  '#eff6ff',
  blueBdr: '#bfdbfe',
};

export default function AdminClient({
  stats, recentOrders, creators, pendingApps,
  reorderAlerts, credits, events,
  hardware, assemblyQueue, printQueue,
  staffRoster, contractors,
}: AdminClientProps) {
  const [tab,         setTab]         = useState<Tab>('dashboard');
  const [orderFilter, setOrderFilter] = useState('all');
  const [approvingId, setApprovingId] = useState<string|null>(null);
  const [message,     setMessage]     = useState<string|null>(null);

  const fmt = (n:number) =>
    new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);

  async function approveApp(appId:string) {
    setApprovingId(appId);
    try {
      const res  = await fetch('/api/admin/approve-creator',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({application_id:appId}),
      });
      const data = await res.json();
      setMessage(data.success ? `✓ Approved — ${data.handle}` : `Error: ${data.error}`);
    } catch { setMessage('Network error'); }
    setApprovingId(null);
    setTimeout(()=>setMessage(null),4000);
  }

  async function updateFulfillment(orderId:string, status:string) {
    await fetch('/api/admin/update-order',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({order_id:orderId, fulfillment_status:status}),
    });
    setMessage(`✓ Order marked ${status}`);
    setTimeout(()=>setMessage(null),2000);
  }

  async function sendReadySMS(assemblyId:string, buyerName:string, buyerPhone:string, pickupLocation:string) {
    try {
      await fetch('/api/notify/order-ready',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({order_id:assemblyId, pickup_location:pickupLocation}),
      });
      setMessage(`✓ SMS sent to ${buyerName}`);
    } catch { setMessage('SMS failed'); }
    setTimeout(()=>setMessage(null),3000);
  }

  const filteredOrders = orderFilter==='all'
    ? recentOrders
    : recentOrders.filter(o=>o.fulfillment_status===orderFilter);

  const statusColor = (s:string) =>
    s==='delivered'?C.green:s==='fulfilled'||s==='shipped'?C.blue:C.amber;
  const statusBg = (s:string) =>
    s==='delivered'?C.greenBg:s==='fulfilled'||s==='shipped'?C.blueBg:C.amberBg;

  const badge = (text:string, color:string, bg:string) => (
    <span style={{fontSize:11,padding:'2px 8px',borderRadius:10,
                  background:bg,color,fontWeight:600,
                  border:`1px solid ${color}33`}}>
      {text}
    </span>
  );

  const tabStyle = (t:Tab) => ({
    padding:'8px 14px', borderRadius:8, cursor:'pointer',
    background: tab===t ? C.green    : 'transparent',
    color:      tab===t ? '#ffffff'  : C.muted,
    border:     tab===t ? 'none'     : '1px solid transparent',
    fontSize:12, fontWeight: tab===t ? 600 : 400,
    whiteSpace:'nowrap' as const,
  });

  const statCard = (label:string, value:string, sub?:string, accent=false) => (
    <div key={label} style={{
      background: accent?C.greenBg:C.surface,
      borderRadius:12, padding:'18px',
      border:`1px solid ${accent?C.greenBdr:C.border}`,
      boxShadow:'0 1px 3px rgba(0,0,0,0.05)',
    }}>
      <p style={{fontSize:11,color:C.muted,margin:'0 0 6px',fontWeight:500}}>{label}</p>
      <p style={{fontSize:24,fontWeight:700,color:accent?C.green:C.text,
                 margin:'0 0 3px',letterSpacing:'-0.02em'}}>{value}</p>
      {sub&&<p style={{fontSize:11,color:C.faint,margin:0}}>{sub}</p>}
    </div>
  );

  const sectionLabel = (text:string) => (
    <p style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:1,
               textTransform:'uppercase',margin:'0 0 10px'}}>{text}</p>
  );

  return (
    <main style={{minHeight:'100vh',background:C.bg,color:C.text,
                  fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'}}>

      {/* Header */}
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,
                   padding:'0 20px',display:'flex',alignItems:'center',
                   justifyContent:'space-between',height:56,
                   boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:32,height:32,borderRadius:8,background:C.green,
                       display:'flex',alignItems:'center',justifyContent:'center',
                       color:'#fff',fontSize:16}}>📊</div>
          <div>
            <p style={{fontSize:11,color:C.muted,margin:0}}>Un Momento LLC</p>
            <p style={{fontSize:15,fontWeight:600,margin:0,color:C.text}}>Admin Console</p>
          </div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {message&&(
            <span style={{fontSize:12,color:C.green,background:C.greenBg,
                          padding:'4px 12px',borderRadius:6,
                          border:`1px solid ${C.greenBdr}`}}>
              {message}
            </span>
          )}
          {pendingApps.length>0&&(
            <span style={{fontSize:11,background:C.amberBg,color:C.amber,
                          border:`1px solid ${C.amberBdr}`,
                          padding:'3px 10px',borderRadius:10,fontWeight:600}}>
              {pendingApps.length} pending
            </span>
          )}
          {reorderAlerts.length>0&&(
            <span style={{fontSize:11,background:C.redBg,color:C.red,
                          border:`1px solid ${C.redBdr}`,
                          padding:'3px 10px',borderRadius:10,fontWeight:600}}>
              {reorderAlerts.length} reorder
            </span>
          )}
          <a href="/" style={{fontSize:12,color:C.muted,textDecoration:'none'}}>← Site</a>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,
                   padding:'8px 16px',display:'flex',gap:4,overflowX:'auto'}}>
        {([
          ['dashboard',    '📊 Dashboard'   ],
          ['orders',       '📦 Orders'      ],
          ['revenue',      '💰 Revenue'     ],
          ['creators',     '🎓 Creators'    ],
          ['applications', '📋 Applications'],
          ['events',       '📍 Events'      ],
          ['operations',   '🎪 Operations'  ],
          ['inventory',    '🏪 Inventory'   ],
        ] as [Tab,string][]).map(([t,lbl])=>(
          <button key={t} onClick={()=>setTab(t)} style={tabStyle(t)}>
            {lbl}
            {t==='applications'&&pendingApps.length>0&&(
              <span style={{marginLeft:5,background:'#fff',color:C.green,
                            fontSize:10,padding:'1px 6px',borderRadius:8,fontWeight:700}}>
                {pendingApps.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{padding:'20px 16px',maxWidth:1000,margin:'0 auto'}}>

        {/* ── DASHBOARD ── */}
        {tab==='dashboard'&&(
          <div>
            <p style={{fontSize:13,color:C.muted,margin:'0 0 20px'}}>
              {new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
            </p>
            {sectionLabel('Today')}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',
                         gap:12,marginBottom:24}}>
              {statCard('Revenue today',  fmt(stats.todayRevenue),      undefined, true)}
              {statCard('Orders today',   String(stats.todayOrderCount))}
              {statCard('Pending',        String(stats.pendingCount),   'need fulfillment')}
            </div>
            {sectionLabel('All time')}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',
                         gap:12,marginBottom:24}}>
              {statCard('Total revenue',   fmt(stats.totalRevenue),  undefined,  true)}
              {statCard('Total orders',    String(stats.totalOrderCount))}
              {statCard('Online revenue',  fmt(stats.onlineRevenue), 'via web')}
              {statCard('Onsite revenue',  fmt(stats.onsiteRevenue), 'at booth')}
              {statCard('Total donated',   fmt(stats.totalDonated),  'to schools', true)}
              {statCard('Active creators', String(stats.creatorCount))}
            </div>
            {(reorderAlerts.length>0||pendingApps.length>0)&&(
              <div>
                {sectionLabel('Action needed')}
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {pendingApps.length>0&&(
                    <div onClick={()=>setTab('applications')} style={{
                      background:C.amberBg,border:`1px solid ${C.amberBdr}`,
                      borderRadius:10,padding:'12px 16px',cursor:'pointer',
                      display:'flex',justifyContent:'space-between',alignItems:'center',
                    }}>
                      <span style={{fontSize:13,color:C.amber,fontWeight:500}}>
                        {pendingApps.length} creator application{pendingApps.length!==1?'s':''} awaiting review
                      </span>
                      <span style={{color:C.amber,fontWeight:600}}>Review →</span>
                    </div>
                  )}
                  {reorderAlerts.map(a=>(
                    <div key={a.sku} style={{
                      background:a.alert_level==='OUT OF STOCK'?C.redBg:C.amberBg,
                      border:`1px solid ${a.alert_level==='OUT OF STOCK'?C.redBdr:C.amberBdr}`,
                      borderRadius:10,padding:'12px 16px',
                    }}>
                      <p style={{fontSize:13,fontWeight:600,margin:'0 0 3px',
                                 color:a.alert_level==='OUT OF STOCK'?C.red:C.amber}}>
                        {a.alert_level} — {a.name}
                      </p>
                      <p style={{fontSize:12,color:C.muted,margin:0}}>
                        {a.on_hand} remaining · order {a.suggest_order} from {a.supplier_name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ORDERS ── */}
        {tab==='orders'&&(
          <div>
            <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
              {['all','pending','fulfilled','delivered'].map(f=>(
                <button key={f} onClick={()=>setOrderFilter(f)} style={{
                  padding:'5px 14px',borderRadius:16,cursor:'pointer',
                  background:orderFilter===f?C.green:C.surface,
                  color:orderFilter===f?'#fff':C.muted,
                  border:`1px solid ${orderFilter===f?C.green:C.border}`,
                  fontSize:12,fontWeight:orderFilter===f?600:400,
                  textTransform:'capitalize',
                }}>{f}</button>
              ))}
              <span style={{fontSize:12,color:C.faint}}>{filteredOrders.length} orders</span>
            </div>
            {filteredOrders.length===0?(
              <div style={{textAlign:'center',padding:'48px',color:C.faint,
                           fontSize:14,background:C.surface,borderRadius:12,
                           border:`1px solid ${C.border}`}}>
                No {orderFilter==='all'?'':orderFilter} orders yet.
              </div>
            ):filteredOrders.map(o=>(
              <div key={o.id} style={{background:C.surface,borderRadius:12,
                                      padding:'14px 16px',marginBottom:8,
                                      border:`1px solid ${C.border}`,
                                      boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
                <div style={{display:'flex',justifyContent:'space-between',
                             alignItems:'flex-start',gap:10,flexWrap:'wrap'}}>
                  <div style={{flex:1,minWidth:180}}>
                    <p style={{fontWeight:600,fontSize:13,margin:'0 0 3px',color:C.text}}>
                      {o.buyer_name||o.buyer_email}
                    </p>
                    <p style={{fontSize:12,color:C.muted,margin:'0 0 3px'}}>
                      {o.product_type?.replace(/_/g,' ')}
                      {o.ship_city?` · ${o.ship_city}, ${o.ship_state}`:''}
                      {o.referral_code?` · ref: ${o.referral_code}`:''}
                    </p>
                    <p style={{fontSize:11,color:C.faint,margin:0}}>
                      {new Date(o.created_at).toLocaleString()}
                      {o.fulfillment_source==='onsite'?' · 🎪 onsite':' · 📦 online'}
                    </p>
                  </div>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                    <span style={{fontSize:16,fontWeight:700,color:C.green}}>
                      ${o.tokens_spent?.toFixed(2)}
                    </span>
                    {badge(o.fulfillment_status,statusColor(o.fulfillment_status),statusBg(o.fulfillment_status))}
                    {o.fulfillment_status==='pending'&&(
                      <button onClick={()=>updateFulfillment(o.id,'fulfilled')} style={{
                        padding:'4px 10px',background:C.surface,
                        border:`1px solid ${C.border}`,borderRadius:6,
                        color:C.text,fontSize:11,cursor:'pointer',fontWeight:500,
                      }}>Mark fulfilled</button>
                    )}
                    {o.fulfillment_status==='fulfilled'&&(
                      <button onClick={()=>updateFulfillment(o.id,'delivered')} style={{
                        padding:'4px 10px',background:C.surface,
                        border:`1px solid ${C.border}`,borderRadius:6,
                        color:C.text,fontSize:11,cursor:'pointer',fontWeight:500,
                      }}>Mark delivered</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── REVENUE ── */}
        {tab==='revenue'&&(
          <div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',
                         gap:12,marginBottom:24}}>
              {statCard('Gross revenue',    fmt(stats.totalRevenue),  undefined,  true)}
              {statCard('Online',           fmt(stats.onlineRevenue), 'via web')}
              {statCard('Onsite',           fmt(stats.onsiteRevenue), 'at booth')}
              {statCard('Total donated',    fmt(stats.totalDonated),  'schools + pool', true)}
              {statCard('Stripe fees est.', fmt(stats.totalRevenue*0.029+stats.totalOrderCount*0.30), '2.9% + $0.30/order')}
              {statCard('Net est.',         fmt(stats.totalRevenue-stats.totalDonated-(stats.totalRevenue*0.029+stats.totalOrderCount*0.30)), 'after fees + donations', true)}
            </div>
            {sectionLabel('Recent referral credits')}
            {credits.length===0?(
              <p style={{color:C.faint,fontSize:13}}>No credits yet.</p>
            ):credits.map((c,i)=>(
              <div key={i} style={{background:C.surface,borderRadius:8,
                                   padding:'10px 16px',marginBottom:6,
                                   border:`1px solid ${C.border}`,
                                   display:'flex',justifyContent:'space-between',
                                   alignItems:'center',fontSize:13}}>
                <span style={{color:C.text,fontWeight:500}}>{c.referrer_handle||'general-fund'}</span>
                <span style={{color:C.green,fontWeight:600}}>{fmt(c.amount)}</span>
                <span style={{color:C.faint}}>{new Date(c.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── CREATORS ── */}
        {tab==='creators'&&(
          <div>
            <p style={{fontSize:13,color:C.muted,margin:'0 0 16px'}}>{creators.length} active creators</p>
            {creators.map(c=>(
              <div key={c.id} style={{background:C.surface,borderRadius:12,
                                      padding:'14px 16px',marginBottom:8,
                                      border:`1px solid ${C.border}`,
                                      boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
                <div style={{display:'flex',justifyContent:'space-between',
                             alignItems:'flex-start',gap:10,flexWrap:'wrap'}}>
                  <div style={{flex:1,minWidth:180}}>
                    <p style={{fontWeight:600,fontSize:13,margin:'0 0 3px',color:C.text,
                               display:'flex',alignItems:'center',gap:6}}>
                      {c.display_name}
                      {c.is_verified&&badge('verified',C.green,C.greenBg)}
                      {!c.is_active&&badge('inactive',C.red,C.redBg)}
                    </p>
                    <p style={{fontSize:12,color:C.muted,margin:'0 0 2px'}}>
                      {c.school_name}{c.graduation_year?` · ${c.graduation_year}`:''}
                    </p>
                    <p style={{fontSize:11,color:C.faint,margin:0,fontFamily:'monospace'}}>
                      {c.handle} · {c.verification_level}
                    </p>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <p style={{fontSize:15,fontWeight:700,color:C.green,margin:'0 0 2px'}}>
                      {fmt(c.earnings_balance)} available
                    </p>
                    <p style={{fontSize:12,color:C.muted,margin:'0 0 2px'}}>{fmt(c.total_earned)} total earned</p>
                    <p style={{fontSize:11,color:C.faint,margin:0}}>{fmt(c.total_donated)} donated</p>
                  </div>
                </div>
              </div>
            ))}
            {creators.length===0&&(
              <div style={{textAlign:'center',padding:'48px',color:C.faint,
                           fontSize:14,background:C.surface,borderRadius:12,
                           border:`1px solid ${C.border}`}}>No creators yet.</div>
            )}
          </div>
        )}

        {/* ── APPLICATIONS ── */}
        {tab==='applications'&&(
          <div>
            {pendingApps.length===0?(
              <div style={{textAlign:'center',padding:'48px',background:C.greenBg,
                           borderRadius:12,border:`1px solid ${C.greenBdr}`}}>
                <p style={{fontSize:18,margin:'0 0 6px'}}>✓</p>
                <p style={{fontSize:14,color:C.green,fontWeight:500,margin:0}}>No pending applications</p>
              </div>
            ):pendingApps.map(app=>(
              <div key={app.id} style={{background:C.surface,borderRadius:12,
                                        padding:'18px',marginBottom:12,
                                        border:`1px solid ${C.border}`,
                                        boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
                <div style={{display:'flex',justifyContent:'space-between',
                             alignItems:'flex-start',gap:12,flexWrap:'wrap',marginBottom:12}}>
                  <div style={{flex:1}}>
                    <p style={{fontWeight:700,fontSize:15,margin:'0 0 4px',color:C.text}}>
                      {app.first_name} {app.last_name}
                    </p>
                    <p style={{fontSize:13,color:C.muted,margin:'0 0 3px'}}>
                      {app.institution_name} · {app.institution_country}
                    </p>
                    <p style={{fontSize:13,color:C.muted,margin:'0 0 8px'}}>
                      {app.program_or_grade} · Grad: {app.graduation_date}
                    </p>
                    <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                      {app.edu_email&&(
                        <span style={{fontSize:11,background:C.greenBg,color:C.green,
                                      padding:'2px 8px',borderRadius:8,fontWeight:500}}>
                          📧 {app.edu_email}
                        </span>
                      )}
                      {app.parent_email&&(
                        <span style={{fontSize:11,background:C.amberBg,color:C.amber,
                                      padding:'2px 8px',borderRadius:8,fontWeight:500}}>
                          👨‍👩‍👧 {app.parent_email}
                        </span>
                      )}
                      {app.referred_by&&(
                        <span style={{fontSize:11,background:C.blueBg,color:C.blue,
                                      padding:'2px 8px',borderRadius:8,fontWeight:500}}>
                          🔗 {app.referred_by}
                        </span>
                      )}
                      {app.social_link&&(
                        <a href={app.social_link} target="_blank" rel="noopener noreferrer"
                          style={{fontSize:11,color:C.blue,textDecoration:'none'}}>
                          {app.social_link}
                        </a>
                      )}
                    </div>
                    <p style={{fontSize:11,color:C.faint,margin:'6px 0 0'}}>
                      {new Date(app.created_at).toLocaleString()}
                      {app.phone_number?` · ${app.phone_number}`:''}
                      {' · '}{app.verification_level}
                    </p>
                  </div>
                  <button onClick={()=>approveApp(app.id)} disabled={approvingId===app.id}
                    style={{padding:'12px 20px',
                            background:approvingId===app.id?C.border:C.green,
                            color:approvingId===app.id?C.faint:'#fff',
                            border:'none',borderRadius:8,fontSize:13,fontWeight:700,
                            cursor:approvingId===app.id?'wait':'pointer',flexShrink:0}}>
                    {approvingId===app.id?'Approving…':'Approve ✓'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── EVENTS ── */}
        {tab==='events'&&(
          <div>
            <div style={{display:'flex',justifyContent:'space-between',
                         alignItems:'center',marginBottom:16}}>
              <p style={{fontSize:13,color:C.muted,margin:0}}>{events.length} events</p>
              <a href="/admin/events/new" style={{padding:'8px 16px',background:C.green,
                color:'#fff',borderRadius:8,textDecoration:'none',fontSize:12,fontWeight:700}}>
                + Add event
              </a>
            </div>
            {events.map(ev=>(
              <div key={ev.id} style={{background:C.surface,borderRadius:12,
                                       padding:'14px 16px',marginBottom:8,
                                       border:`1px solid ${C.border}`,
                                       boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
                <div style={{display:'flex',justifyContent:'space-between',
                             alignItems:'flex-start',gap:10,flexWrap:'wrap'}}>
                  <div>
                    <p style={{fontWeight:600,fontSize:13,margin:'0 0 3px',color:C.text,
                               display:'flex',alignItems:'center',gap:6}}>
                      {ev.name}
                      {ev.booth_active&&badge('booth active',C.green,C.greenBg)}
                      {!ev.is_active&&badge('inactive',C.faint,C.border)}
                    </p>
                    <p style={{fontSize:12,color:C.muted,margin:'0 0 2px'}}>
                      {ev.event_date} · {ev.event_type}
                      {ev.venue_name?` · ${ev.venue_name}`:''}
                      {ev.venue_city?`, ${ev.venue_city}`:''}
                    </p>
                    <p style={{fontSize:11,color:C.faint,margin:0,fontFamily:'monospace'}}>
                      /event/{ev.slug}
                    </p>
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    <a href={`/event/${ev.slug}`} target="_blank" rel="noopener noreferrer"
                      style={{padding:'5px 12px',background:C.surface,
                              border:`1px solid ${C.border}`,borderRadius:6,
                              color:C.text,fontSize:11,textDecoration:'none',fontWeight:500}}>
                      View →
                    </a>
                    <button onClick={()=>navigator.clipboard.writeText(
                      `https://unmomentoprints.com/event/${ev.slug}`
                    )} style={{padding:'5px 12px',background:C.surface,
                               border:`1px solid ${C.border}`,borderRadius:6,
                               color:C.muted,fontSize:11,cursor:'pointer'}}>
                      Copy link
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── OPERATIONS ── */}
        {tab==='operations'&&(
          <div>

            {/* Hardware status */}
            {sectionLabel('Hardware status')}
            {hardware.length===0?(
              <div style={{background:C.surface,border:`1px solid ${C.border}`,
                           borderRadius:10,padding:'20px',textAlign:'center',
                           marginBottom:24}}>
                <p style={{color:C.faint,fontSize:13,margin:0}}>
                  No hardware deployed. Assign hardware to an event in Supabase → event_hardware table.
                </p>
              </div>
            ):(
              <div style={{display:'grid',
                           gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',
                           gap:8,marginBottom:24}}>
                {hardware.map(h=>(
                  <div key={h.asset_tag} style={{
                    background:h.is_online?C.greenBg:C.surface,
                    border:`1px solid ${h.is_online?C.greenBdr:C.border}`,
                    borderRadius:10,padding:'12px',
                  }}>
                    <div style={{display:'flex',justifyContent:'space-between',
                                 alignItems:'flex-start',marginBottom:4}}>
                      <p style={{fontSize:12,fontWeight:600,margin:0,color:C.text}}>
                        {h.device_name}
                      </p>
                      <span style={{fontSize:10,padding:'2px 6px',borderRadius:8,
                                    fontWeight:600,
                                    background:h.is_online?C.green:C.border,
                                    color:h.is_online?'#fff':C.faint}}>
                        {h.is_online?'online':'offline'}
                      </span>
                    </div>
                    <p style={{fontSize:10,color:C.faint,margin:'0 0 6px',
                               fontFamily:'monospace'}}>{h.asset_tag}</p>
                    {h.max_capacity<999&&(
                      <div>
                        <div style={{display:'flex',justifyContent:'space-between',
                                     fontSize:11,color:C.muted,marginBottom:3}}>
                          <span>Queue</span>
                          <span>{h.queue_depth}/{h.max_capacity}</span>
                        </div>
                        <div style={{height:4,background:C.border,
                                     borderRadius:2,overflow:'hidden'}}>
                          <div style={{height:'100%',borderRadius:2,
                                       width:`${Math.min(h.capacity_pct||0,100)}%`,
                                       background:(h.capacity_pct||0)>80?C.red
                                         :(h.capacity_pct||0)>50?C.amber:C.green}}/>
                        </div>
                      </div>
                    )}
                    {(h as any).event_pages?.name&&(
                      <p style={{fontSize:10,color:C.faint,margin:'6px 0 0'}}>
                        📍 {(h as any).event_pages.name}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Assembly queue */}
            {sectionLabel('Assembly queue')}
            {assemblyQueue.length===0?(
              <div style={{background:C.greenBg,border:`1px solid ${C.greenBdr}`,
                           borderRadius:10,padding:'14px',textAlign:'center',
                           marginBottom:24,fontSize:13,color:C.green}}>
                ✓ No orders in assembly queue
              </div>
            ):(
              <div style={{marginBottom:24}}>
                {assemblyQueue.map(a=>(
                  <div key={a.id} style={{
                    background:a.status==='ready'?C.greenBg:C.surface,
                    border:`1px solid ${a.status==='ready'?C.greenBdr:C.border}`,
                    borderRadius:10,padding:'12px 14px',marginBottom:6,
                    display:'flex',justifyContent:'space-between',
                    alignItems:'center',gap:10,flexWrap:'wrap',
                  }}>
                    <div>
                      <p style={{fontWeight:600,fontSize:13,margin:'0 0 2px',color:C.text}}>
                        {a.buyer_name}
                      </p>
                      <p style={{fontSize:12,color:C.muted,margin:'0 0 2px'}}>
                        {a.product_type?.replace(/_/g,' ')}
                        {a.pickup_location?` · ${a.pickup_location}`:''}
                      </p>
                      <p style={{fontSize:11,color:C.faint,margin:0}}>
                        {a.items_ready}/{a.items_expected} items ready
                        {a.customer_notified?' · ✓ SMS sent':''}
                      </p>
                    </div>
                    <div style={{display:'flex',gap:6,alignItems:'center'}}>
                      {badge(
                        a.status,
                        a.status==='ready'?C.green:a.status==='assembling'?C.blue:C.amber,
                        a.status==='ready'?C.greenBg:a.status==='assembling'?C.blueBg:C.amberBg
                      )}
                      {a.status==='ready'&&!a.customer_notified&&a.buyer_phone&&(
                        <button
                          onClick={()=>sendReadySMS(a.id,a.buyer_name,a.buyer_phone,a.pickup_location)}
                          style={{padding:'4px 10px',background:C.green,border:'none',
                                  borderRadius:6,color:'#fff',fontSize:11,
                                  cursor:'pointer',fontWeight:600}}>
                          Send SMS
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Print queue */}
            {sectionLabel('Print queue')}
            {printQueue.length===0?(
              <div style={{background:C.greenBg,border:`1px solid ${C.greenBdr}`,
                           borderRadius:10,padding:'14px',textAlign:'center',
                           marginBottom:24,fontSize:13,color:C.green}}>
                ✓ Print queue empty
              </div>
            ):(
              <div style={{marginBottom:24}}>
                {printQueue.map(p=>(
                  <div key={p.id} style={{background:C.surface,
                                          border:`1px solid ${C.border}`,
                                          borderRadius:10,padding:'10px 14px',
                                          marginBottom:6,display:'flex',
                                          justifyContent:'space-between',
                                          alignItems:'center',gap:10}}>
                    <div>
                      <p style={{fontWeight:600,fontSize:12,margin:'0 0 2px',color:C.text}}>
                        {p.buyer_name||p.customer_name}
                      </p>
                      <p style={{fontSize:11,color:C.muted,margin:0}}>
                        {p.print_type?.replace(/_/g,' ')}
                        {p.device_name?` · ${p.device_name}`:''}
                        {p.asset_tag?` (${p.asset_tag})`:''}
                      </p>
                    </div>
                    {badge(
                      p.status,
                      p.status==='printing'?C.blue:p.status==='queued'?C.amber:C.green,
                      p.status==='printing'?C.blueBg:p.status==='queued'?C.amberBg:C.greenBg
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Staff roster */}
            {sectionLabel('Staff roster')}
            {staffRoster.length===0?(
              <div style={{background:C.surface,border:`1px solid ${C.border}`,
                           borderRadius:10,padding:'20px',textAlign:'center',
                           marginBottom:24}}>
                <p style={{color:C.faint,fontSize:13,margin:'0 0 6px'}}>No staff assigned yet.</p>
                <p style={{color:C.faint,fontSize:12,margin:0}}>
                  Add contractors in Supabase → contractors table,
                  then assign to events in event_staff table.
                </p>
              </div>
            ):(
              <div style={{marginBottom:24}}>
                {staffRoster.map(s=>(
                  <div key={s.id} style={{background:C.surface,
                                          border:`1px solid ${C.border}`,
                                          borderRadius:10,padding:'12px 14px',
                                          marginBottom:6,display:'flex',
                                          justifyContent:'space-between',
                                          alignItems:'center',gap:10,flexWrap:'wrap'}}>
                    <div style={{display:'flex',gap:10,alignItems:'center'}}>
                      <div style={{width:10,height:10,borderRadius:'50%',
                                   background:s.role_color||C.green,flexShrink:0}}/>
                      <div>
                        <p style={{fontWeight:600,fontSize:13,margin:'0 0 2px',color:C.text}}>
                          {s.first_name} {s.last_name}
                        </p>
                        <p style={{fontSize:12,color:C.muted,margin:0}}>
                          {s.role_name}
                          {s.call_time?` · call ${s.call_time}`:''}
                          {s.start_time?` · ${s.start_time}–${s.end_time}`:''}
                          {s.hourly_rate?` · $${s.hourly_rate}/hr`:''}
                        </p>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:6,alignItems:'center'}}>
                      {s.confirmed&&badge('confirmed',C.green,C.greenBg)}
                      {s.checked_in&&badge('checked in',C.blue,C.blueBg)}
                      {!s.confirmed&&badge('unconfirmed',C.amber,C.amberBg)}
                      <a href={`tel:${s.phone}`} style={{
                        padding:'4px 10px',background:C.surface,
                        border:`1px solid ${C.border}`,borderRadius:6,
                        color:C.text,fontSize:11,textDecoration:'none',fontWeight:500,
                      }}>📞 Call</a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Contractor directory */}
            <div style={{ display:'flex', justifyContent:'space-between',
                          alignItems:'center', marginBottom:10 }}>
              <p style={{ fontSize:11, fontWeight:600, color:C.muted,
                          letterSpacing:1, textTransform:'uppercase',
                          margin:0 }}>Contractor directory</p>
              <a href="/admin/contractors" style={{
                padding:'6px 14px', background:C.green, color:'#fff',
                borderRadius:7, textDecoration:'none',
                fontSize:12, fontWeight:600,
              }}>+ Add contractor</a>
            </div>
            {contractors.length===0?(
              <p style={{color:C.faint,fontSize:13}}>
                No contractors on file yet. Add them in Supabase → contractors table.
              </p>
            ):(
              <div style={{display:'grid',
                           gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',
                           gap:8}}>
                {contractors.filter(c=>c.is_active).map(c=>(
                  <div key={c.id} style={{background:C.surface,
                                          border:`1px solid ${C.border}`,
                                          borderRadius:10,padding:'12px'}}>
                    <p style={{fontWeight:600,fontSize:13,margin:'0 0 2px',color:C.text}}>
                      {c.first_name} {c.last_name}
                    </p>
                    <p style={{fontSize:11,color:C.muted,margin:'0 0 4px'}}>
                      {c.preferred_role||'No preferred role'}
                    </p>
                    <a href={`tel:${c.phone}`}
                      style={{fontSize:11,color:C.blue,textDecoration:'none'}}>
                      {c.phone}
                    </a>
                    <p style={{fontSize:10,color:C.faint,margin:'4px 0 0'}}>
                      ⭐ {c.rating} · {c.total_events} events
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── INVENTORY ── */}
        {tab==='inventory'&&(
          <div>
            {reorderAlerts.length===0?(
              <div style={{textAlign:'center',padding:'48px',background:C.greenBg,
                           borderRadius:12,border:`1px solid ${C.greenBdr}`}}>
                <p style={{fontSize:18,margin:'0 0 6px'}}>✓</p>
                <p style={{fontSize:14,color:C.green,fontWeight:500,margin:0}}>
                  All inventory levels are healthy
                </p>
              </div>
            ):(
              <div>
                <p style={{fontSize:13,color:C.muted,margin:'0 0 16px'}}>
                  {reorderAlerts.length} item{reorderAlerts.length!==1?'s':''} need attention
                </p>
                {reorderAlerts.map(a=>(
                  <div key={a.sku} style={{
                    background:a.alert_level==='OUT OF STOCK'?C.redBg:C.amberBg,
                    borderRadius:12,padding:'14px 16px',marginBottom:8,
                    border:`1px solid ${a.alert_level==='OUT OF STOCK'?C.redBdr:C.amberBdr}`,
                  }}>
                    <p style={{fontWeight:600,fontSize:13,margin:'0 0 3px',
                               color:a.alert_level==='OUT OF STOCK'?C.red:C.amber,
                               display:'flex',alignItems:'center',gap:8}}>
                      {a.name}
                      {badge(a.alert_level,
                        a.alert_level==='OUT OF STOCK'?C.red:C.amber,
                        a.alert_level==='OUT OF STOCK'?C.redBg:C.amberBg
                      )}
                    </p>
                    <p style={{fontSize:12,color:C.muted,margin:'0 0 2px'}}>
                      SKU: {a.sku} · {a.category}
                    </p>
                    <p style={{fontSize:11,color:C.muted,margin:0}}>
                      {a.on_hand} on hand · reorder at {a.reorder_at} ·
                      suggest ordering {a.suggest_order}
                      {a.supplier_name?` from ${a.supplier_name}`:''}
                    </p>
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