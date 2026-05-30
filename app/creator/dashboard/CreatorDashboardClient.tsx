'use client';
import { useState } from 'react';

interface Credit {
  id:         string;
  amount:     number;
  created_at: string;
  orders: {
    buyer_name:         string;
    buyer_email:        string;
    product_type:       string;
    tokens_spent:       number;
    fulfillment_status: string;
    created_at:         string;
  } | null;
}

interface School {
  name:       string;
  city:       string;
  state_abbr: string;
  type:       string;
}

interface ContestPeriod {
  name:        string;
  start_date:  string;
  end_date:    string;
  creator_pct: number;
  school_pct:  number;
}

interface CreatorDashboardClientProps {
  handle:            string;
  displayName:       string;
  isVerified:        boolean;
  verificationLevel: string;
  school:            School | null;
  balance:           number;
  totalEarned:       number;
  totalDonated:      number;
  totalOrders:       number;
  credits:           Credit[];
  contestPeriod:     ContestPeriod | null;
}

const C = {
  bg:      '#0a0a0a',
  surface: '#111111',
  border:  '#222222',
  text:    '#ffffff',
  muted:   '#888888',
  faint:   '#555555',
  green:   '#4ADE80',
  greenBg: '#0d1f0d',
  greenBdr:'#1a3a1a',
  amber:   '#BA7517',
  amberBg: '#2a1a00',
  amberBdr:'#3a2a00',
};

export default function CreatorDashboardClient({
  handle, displayName, isVerified, verificationLevel,
  school, balance, totalEarned, totalDonated, totalOrders,
  credits, contestPeriod,
}: CreatorDashboardClientProps) {
  const [copied,  setCopied]  = useState(false);
  const [tab,     setTab]     = useState<'orders'|'payout'|'share'>('orders');

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(n);

  const storeFrontUrl = `https://unmomentoprints.com/${handle}`;
  const orderUrl      = `https://unmomentoprints.com/event/grad-2026?ref=${handle}`;

  function copyLink(url: string) {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Days remaining in campaign
  const endDate    = contestPeriod ? new Date(contestPeriod.end_date) : new Date('2026-06-30');
  const daysLeft   = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 86400000));
  const creatorPct = contestPeriod ? Math.round(contestPeriod.creator_pct * 100) : 10;
  const schoolPct  = contestPeriod ? Math.round(contestPeriod.school_pct  * 100) : 10;

  const statusColor = (s: string) =>
    s==='delivered'?C.green:s==='shipped'||s==='fulfilled'?'#60a5fa':C.amber;

  const tabBtn = (id: typeof tab, label: string) => (
    <button key={id} onClick={() => setTab(id)} style={{
      flex:1, padding:'8px',
      background: tab===id ? C.surface : 'transparent',
      border:     tab===id ? `1px solid #333` : '1px solid transparent',
      borderRadius:8, color: tab===id ? '#fff' : C.muted,
      fontSize:12, cursor:'pointer', fontWeight: tab===id ? 500 : 400,
    }}>{label}</button>
  );

  return (
    <main style={{
      minHeight:'100vh', background:C.bg, color:C.text,
      fontFamily:'-apple-system, BlinkMacSystemFont, sans-serif',
      paddingBottom:48,
    }}>

      {/* Header */}
      <div style={{
        background:C.surface, borderBottom:`1px solid ${C.border}`,
        padding:'16px 20px', display:'flex',
        justifyContent:'space-between', alignItems:'center',
      }}>
        <div>
          <p style={{fontSize:11,color:C.faint,letterSpacing:3,
                     textTransform:'uppercase',margin:'0 0 3px'}}>
            Creator Dashboard
          </p>
          <h1 style={{fontSize:17,fontWeight:500,margin:0}}>
            {displayName}
            {isVerified && (
              <span style={{marginLeft:8,fontSize:10,background:C.green,
                            color:'#000',padding:'1px 6px',borderRadius:4,
                            fontWeight:700}}>
                VERIFIED
              </span>
            )}
          </h1>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <a href="/account" style={{fontSize:12,color:C.muted,textDecoration:'none'}}>
            ← Account
          </a>
          <a href={`/${handle}`} style={{
            padding:'6px 12px', background:C.green, color:'#000',
            borderRadius:7, textDecoration:'none', fontSize:12, fontWeight:700,
          }}>
            Storefront →
          </a>
        </div>
      </div>

      <div style={{maxWidth:600,margin:'0 auto',padding:'20px 16px'}}>

        {/* Campaign countdown */}
        <div style={{
          background: daysLeft <= 14 ? C.amberBg : C.greenBg,
          border:`1px solid ${daysLeft <= 14 ? C.amberBdr : C.greenBdr}`,
          borderRadius:12, padding:'12px 16px', marginBottom:16,
          display:'flex', justifyContent:'space-between', alignItems:'center',
        }}>
          <div>
            <p style={{fontSize:13,fontWeight:600,
                       color:daysLeft<=14?C.amber:C.green,margin:'0 0 2px'}}>
              {contestPeriod?.name || 'Spring 2026 Campaign'}
            </p>
            <p style={{fontSize:12,color:C.muted,margin:0}}>
              {creatorPct}% you · {schoolPct}% school · {daysLeft} days remaining
            </p>
          </div>
          <div style={{textAlign:'right'}}>
            <p style={{fontSize:18,fontWeight:700,
                       color:daysLeft<=14?C.amber:C.green,margin:0}}>
              {daysLeft}d
            </p>
            <p style={{fontSize:10,color:C.faint,margin:0}}>remaining</p>
          </div>
        </div>

        {/* School info */}
        {school && (
          <div style={{
            background:C.surface, border:`1px solid ${C.border}`,
            borderRadius:10, padding:'10px 14px', marginBottom:16,
            display:'flex', justifyContent:'space-between', alignItems:'center',
          }}>
            <div>
              <p style={{fontSize:12,fontWeight:500,margin:'0 0 2px',color:C.text}}>
                🏫 {school.name}
              </p>
              <p style={{fontSize:11,color:C.muted,margin:0}}>
                {school.city}, {school.state_abbr} · {school.type.replace(/_/g,' ')}
              </p>
            </div>
            <p style={{fontSize:13,fontWeight:700,color:C.green,margin:0}}>
              {fmt(totalDonated)} raised
            </p>
          </div>
        )}

        {/* Stats */}
        <div style={{
          display:'grid', gridTemplateColumns:'repeat(2,1fr)',
          gap:8, marginBottom:16,
        }}>
          {[
            {label:'Available to pay out', value:fmt(balance),      accent:true },
            {label:'Total earned',         value:fmt(totalEarned),  accent:false},
            {label:'Donated to school',    value:fmt(totalDonated), accent:true },
            {label:'Orders attributed',    value:String(totalOrders),accent:false},
          ].map(s=>(
            <div key={s.label} style={{
              background:s.accent?C.greenBg:C.surface,
              border:`1px solid ${s.accent?C.greenBdr:C.border}`,
              borderRadius:10, padding:'14px',
            }}>
              <p style={{fontSize:11,color:C.faint,margin:'0 0 5px'}}>{s.label}</p>
              <p style={{fontSize:20,fontWeight:700,
                         color:s.accent?C.green:'#fff',
                         margin:0,letterSpacing:'-0.02em'}}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Payout prompt */}
        {balance >= 25 && (
          <div style={{
            background:C.greenBg, border:`1px solid ${C.greenBdr}`,
            borderRadius:10, padding:'12px 16px', marginBottom:16,
            display:'flex', justifyContent:'space-between',
            alignItems:'center', gap:10, flexWrap:'wrap',
          }}>
            <div>
              <p style={{fontWeight:600,fontSize:13,color:C.green,margin:'0 0 2px'}}>
                💸 Ready to pay out
              </p>
              <p style={{fontSize:12,color:C.muted,margin:0}}>
                {fmt(balance)} available · paid after June 30
              </p>
            </div>
            <a href={`mailto:ceojess@unmomentoprints.com?subject=Payout request — ${handle}&body=Hi Jessica, I'd like to request a payout of ${fmt(balance)} for my creator earnings. My handle is ${handle}.`}
              style={{
                padding:'8px 14px', background:C.green, color:'#000',
                borderRadius:7, textDecoration:'none',
                fontSize:12, fontWeight:700, flexShrink:0,
              }}>
              Request payout →
            </a>
          </div>
        )}

        {/* Tabs */}
        <div style={{display:'flex',gap:4,marginBottom:12}}>
          {tabBtn('orders', `📦 Orders (${totalOrders})`)}
          {tabBtn('share',  '🔗 Share')}
          {tabBtn('payout', '💰 Payout')}
        </div>

        {/* Orders tab */}
        {tab==='orders'&&(
          <div>
            {credits.length===0?(
              <div style={{
                background:C.surface, borderRadius:10, padding:'28px',
                textAlign:'center', border:`1px solid ${C.border}`,
              }}>
                <p style={{color:C.faint,fontSize:13,margin:'0 0 12px'}}>
                  No orders yet. Share your link to start earning.
                </p>
                <button onClick={()=>copyLink(orderUrl)} style={{
                  padding:'9px 18px', background:C.green, color:'#000',
                  border:'none', borderRadius:8, fontSize:13,
                  fontWeight:700, cursor:'pointer',
                }}>
                  Copy order link →
                </button>
              </div>
            ):credits.map(credit=>(
              <div key={credit.id} style={{
                background:C.surface, borderRadius:10,
                padding:'12px 14px', marginBottom:6,
                border:`1px solid ${C.border}`,
                display:'flex', justifyContent:'space-between',
                alignItems:'flex-start', gap:10,
              }}>
                <div style={{flex:1}}>
                  <p style={{fontWeight:500,fontSize:13,margin:'0 0 2px'}}>
                    {credit.orders?.buyer_name || 'Customer'}
                  </p>
                  <p style={{fontSize:11,color:C.faint,margin:'0 0 3px'}}>
                    {credit.orders?.product_type?.replace(/_/g,' ')}
                    {' · '}
                    {new Date(credit.created_at).toLocaleDateString('en-US',{
                      month:'short', day:'numeric', year:'numeric'
                    })}
                  </p>
                  {credit.orders?.fulfillment_status && (
                    <span style={{
                      fontSize:10, padding:'2px 6px', borderRadius:8,
                      color:statusColor(credit.orders.fulfillment_status),
                      background:statusColor(credit.orders.fulfillment_status)+'22',
                    }}>
                      {credit.orders.fulfillment_status.replace(/_/g,' ')}
                    </span>
                  )}
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <p style={{fontSize:14,fontWeight:700,color:C.green,margin:'0 0 2px'}}>
                    +{fmt(credit.amount)}
                  </p>
                  {credit.orders?.tokens_spent && (
                    <p style={{fontSize:11,color:C.faint,margin:0}}>
                      {fmt(credit.orders.tokens_spent)} order
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Share tab */}
        {tab==='share'&&(
          <div style={{
            background:C.surface, borderRadius:12, padding:'16px',
            border:`1px solid ${C.border}`,
            display:'flex', flexDirection:'column', gap:12,
          }}>
            <div>
              <p style={{fontSize:12,fontWeight:500,color:C.muted,
                         margin:'0 0 6px',textTransform:'uppercase',
                         letterSpacing:1}}>
                Your storefront
              </p>
              <p style={{fontSize:12,color:C.muted,margin:'0 0 8px',lineHeight:1.5}}>
                Send people here to see your products and order through your link.
              </p>
              <div style={{
                background:'#1a1a1a', borderRadius:8, padding:'9px 12px',
                display:'flex', gap:8, alignItems:'center',
              }}>
                <span style={{fontSize:12,color:C.green,flex:1,
                              overflow:'hidden',textOverflow:'ellipsis',
                              whiteSpace:'nowrap'}}>
                  unmomentoprints.com/{handle}
                </span>
                <button onClick={()=>copyLink(storeFrontUrl)} style={{
                  padding:'5px 12px', background:copied?'#1a3a1a':C.green,
                  color:copied?C.green:'#000',
                  border:copied?`1px solid ${C.green}`:'none',
                  borderRadius:6, fontSize:11, fontWeight:700,
                  cursor:'pointer', flexShrink:0,
                }}>
                  {copied?'✓ Copied':'Copy'}
                </button>
              </div>
            </div>

            <div>
              <p style={{fontSize:12,fontWeight:500,color:C.muted,
                         margin:'0 0 6px',textTransform:'uppercase',
                         letterSpacing:1}}>
                Direct order link
              </p>
              <p style={{fontSize:12,color:C.muted,margin:'0 0 8px',lineHeight:1.5}}>
                Send people here to order directly with your credit pre-applied.
              </p>
              <div style={{
                background:'#1a1a1a', borderRadius:8, padding:'9px 12px',
                display:'flex', gap:8, alignItems:'center',
              }}>
                <span style={{fontSize:11,color:C.green,flex:1,
                              overflow:'hidden',textOverflow:'ellipsis',
                              whiteSpace:'nowrap'}}>
                  unmomentoprints.com/event/grad-2026?ref={handle}
                </span>
                <button onClick={()=>copyLink(orderUrl)} style={{
                  padding:'5px 12px', background:C.green, color:'#000',
                  border:'none', borderRadius:6, fontSize:11,
                  fontWeight:700, cursor:'pointer', flexShrink:0,
                }}>
                  Copy
                </button>
              </div>
            </div>

            <div style={{
              background:'#1a1a1a', borderRadius:8, padding:'12px',
              fontSize:12, color:C.muted, lineHeight:1.7,
            }}>
              <p style={{margin:'0 0 4px',fontWeight:500,color:C.text}}>
                Caption ideas for social
              </p>
              <p style={{margin:'0 0 6px'}}>
                "Support my graduation by ordering a keepsake print through my link 🎓
                10% goes to {school?.name || 'my school'}! unmomentoprints.com/{handle}"
              </p>
              <p style={{margin:0}}>
                "Want a photo print, die-cut stickers, or custom buttons for graduation?
                Order through my link and help fundraise for {school?.name || 'my school'} 📸"
              </p>
            </div>
          </div>
        )}

        {/* Payout tab */}
        {tab==='payout'&&(
          <div style={{
            background:C.surface, borderRadius:12, padding:'16px',
            border:`1px solid ${C.border}`,
            display:'flex', flexDirection:'column', gap:12,
          }}>
            <div style={{
              display:'grid', gridTemplateColumns:'1fr 1fr', gap:8,
            }}>
              <div style={{
                background:C.greenBg, border:`1px solid ${C.greenBdr}`,
                borderRadius:10, padding:'14px', textAlign:'center',
              }}>
                <p style={{fontSize:11,color:C.faint,margin:'0 0 4px'}}>
                  Available now
                </p>
                <p style={{fontSize:22,fontWeight:700,color:C.green,margin:0}}>
                  {fmt(balance)}
                </p>
              </div>
              <div style={{
                background:C.surface, border:`1px solid ${C.border}`,
                borderRadius:10, padding:'14px', textAlign:'center',
              }}>
                <p style={{fontSize:11,color:C.faint,margin:'0 0 4px'}}>
                  Total earned
                </p>
                <p style={{fontSize:22,fontWeight:700,color:'#fff',margin:0}}>
                  {fmt(totalEarned)}
                </p>
              </div>
            </div>

            <div style={{
              background:'#1a1a1a', borderRadius:8, padding:'12px',
              fontSize:12, color:C.muted, lineHeight:1.7,
            }}>
              <p style={{margin:'0 0 6px',fontWeight:500,color:C.text}}>
                Payout schedule
              </p>
              <p style={{margin:'0 0 4px'}}>
                • Campaign ends June 30, 2026
              </p>
              <p style={{margin:'0 0 4px'}}>
                • Earnings are locked after the campaign ends
              </p>
              <p style={{margin:'0 0 4px'}}>
                • Payouts processed in July 2026
              </p>
              <p style={{margin:'0 0 4px'}}>
                • Minimum payout: $25
              </p>
              <p style={{margin:0}}>
                • Paid via Venmo, Zelle, or check — your choice
              </p>
            </div>

            {balance >= 25 ? (
              <a href={`mailto:ceojess@unmomentoprints.com?subject=Payout request — ${handle}&body=Hi Jessica, I'd like to request a payout of ${fmt(balance)} for my Spring 2026 creator earnings. My handle is ${handle}.`}
                style={{
                  display:'block', padding:'13px', textAlign:'center',
                  background:C.green, color:'#000', borderRadius:10,
                  textDecoration:'none', fontSize:14, fontWeight:700,
                }}>
                Request payout — {fmt(balance)} →
              </a>
            ):(
              <div style={{
                background:C.amberBg, border:`1px solid ${C.amberBdr}`,
                borderRadius:8, padding:'10px 14px',
                fontSize:12, color:C.amber, textAlign:'center',
              }}>
                Minimum payout is $25 — keep sharing your link!
                <br/>
                <span style={{color:C.muted}}>
                  You need {fmt(Math.max(0, 25 - balance))} more to request a payout.
                </span>
              </div>
            )}

            <p style={{fontSize:11,color:C.faint,margin:0,textAlign:'center',lineHeight:1.6}}>
              Questions about your earnings?{' '}
              <a href="mailto:ceojess@unmomentoprints.com"
                style={{color:C.green,textDecoration:'none'}}>
                Contact us
              </a>
            </p>
          </div>
        )}

      </div>
    </main>
  );
}