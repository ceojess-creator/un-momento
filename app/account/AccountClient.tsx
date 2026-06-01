'use client';
import { useState } from 'react';
import { UserButton } from '@clerk/nextjs';

interface Order {
  id:                     string;
  created_at:             string;
  order_number:           number;
  product_type:           string;
  fulfillment_status:     string;
  fulfillment_source:     string;
  fulfillment_type:       string;
  tokens_spent:           number;
  tracking_number:        string | null;
  referral_code:          string | null;
  buyer_name:             string;
  sticker_status:         string | null;
  sticker_tracking:       string | null;
  button_status:          string | null;
  button_tracking:        string | null;
  button_size:            string | null;
  holo_upgrade:           boolean;
  holo_style_name:        string | null;
  addons:                 string | null;
  access_point:           string | null;
  is_reorder:             boolean;
  order_sequence:         number;
  days_since_first_order: number;
}

interface ReferralCredit {
  id:         string;
  amount:     number;
  created_at: string;
  order_id:   string;
}

interface Account {
  id:            string;
  name:          string;
  email:         string;
  is_creator:    boolean;
  referral_code: string;
  token_wallets: { balance: number } | null;
  creator_profiles: {
    handle:           string;
    display_name:     string;
    earnings_balance: number;
    total_earned:     number;
    total_donated:    number;
    is_verified:      boolean;
    school_name?:     string;
  } | null;
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
  blue:    '#60a5fa',
  blueBg:  '#0d1a2a',
  blueBdr: '#1a3a5a',
};

const BUNDLE_LABELS: Record<string,string> = {
  essential:  'Momento Essential',
  classic:    'Momento Classic',
  bundle:     'Momento Bundle',
  signature:  'Momento Signature',
};

const BUTTON_LABELS: Record<string,string> = {
  '56mm_circle':   '56mm Circle',
  '50mm_square':   '50mm Square',
  '32mm_circle':   '32mm Circle',
  '56mm_magnet':   '56mm Magnet',
  '32mm_magnet':   '32mm Magnet',
  'keychain_oval': 'Keychain Oval',
  'keychain_rect': 'Keychain Rect',
};

export default function AccountClient({
  account, orders, referralCredits, userImage,
}: {
  account:         Account;
  orders:          Order[];
  referralCredits: ReferralCredit[];
  userImage:       string;
}) {
  const [copied,     setCopied]     = useState(false);
  const [tab,        setTab]        = useState<'orders'|'earnings'|'referral'|'campaign'>('orders');
  const [slideOrder, setSlideOrder] = useState<Order|null>(null);

  const creatorProfile = Array.isArray(account.creator_profiles)
    ? account.creator_profiles[0]
    : account.creator_profiles;
  const handle      = creatorProfile?.handle;
  const earnings    = creatorProfile?.earnings_balance || 0;
  const totalEarned = creatorProfile?.total_earned     || 0;
  const donated     = creatorProfile?.total_donated    || 0;
  const isVerified  = creatorProfile?.is_verified      || false;
  const isCreator   = account.is_creator || !!handle;

  const referralUrl = handle
    ? `https://unmomentoprints.com/event/grad-2026?ref=${handle}`
    : `https://unmomentoprints.com/event/grad-2026?ref=${account.referral_code}`;

  const totalSpent   = orders.reduce((s,o) => s+(o.tokens_spent||0), 0);
  const totalCredits = referralCredits.reduce((s,c) => s+(c.amount||0), 0);

  const fmt = (n:number) =>
    new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);

  function copyLink() {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(()=>setCopied(false), 2000);
  }

  const statusColor = (s:string) =>
    s==='delivered'||s==='shipped'||s==='fulfilled' ? C.blue :
    s==='ready_for_pickup' ? C.green :
    s==='pending' ? C.amber : C.muted;

  const stickerColor = (s:string|null) =>
    !s||s==='none' ? C.faint :
    s==='shipped'  ? C.blue  :
    s==='batched'  ? C.amber :
    s==='queued'   ? C.amber : C.green;

  const tabBtn = (id:typeof tab, label:string) => (
    <button key={id} onClick={()=>setTab(id)} style={{
      flex:1, padding:'8px',
      background: tab===id ? C.surface : 'transparent',
      border:     tab===id ? '1px solid #333' : '1px solid transparent',
      borderRadius:8, color: tab===id?'#fff':C.muted,
      fontSize:12, cursor:'pointer', fontWeight:tab===id?500:400,
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
        padding:'16px 20px',
        display:'flex', justifyContent:'space-between', alignItems:'center',
      }}>
        <div>
          <p style={{fontSize:11,color:C.faint,letterSpacing:3,
                     textTransform:'uppercase',margin:'0 0 3px'}}>
            Un Momento
          </p>
          <h1 style={{fontSize:17,fontWeight:500,margin:0}}>
            {account.name||account.email}
          </h1>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <a href="/" style={{fontSize:12,color:C.muted,textDecoration:'none'}}>← Home</a>
          <UserButton />
        </div>
      </div>

      <div style={{maxWidth:600,margin:'0 auto',padding:'20px 16px'}}>

        {/* Creator banner */}
        {isCreator && handle && (
          <div style={{
            background:C.greenBg, border:`1px solid ${C.greenBdr}`,
            borderRadius:12, padding:'14px 16px', marginBottom:16,
            display:'flex', justifyContent:'space-between',
            alignItems:'center', gap:10,
          }}>
            <div>
              <p style={{fontSize:13,fontWeight:600,color:C.green,margin:'0 0 2px'}}>
                ✓ Creator — {handle}
                {isVerified&&(
                  <span style={{marginLeft:8,fontSize:10,background:C.green,
                                color:'#000',padding:'1px 6px',borderRadius:4,
                                fontWeight:700}}>VERIFIED</span>
                )}
              </p>
              <p style={{fontSize:12,color:C.muted,margin:0}}>
                Spring 2026 · {creatorProfile?.school_name||'No school linked'}
              </p>
            </div>
            <a href="/creator/dashboard" style={{
              padding:'6px 12px',background:C.green,color:'#000',
              borderRadius:7,textDecoration:'none',
              fontSize:12,fontWeight:700,flexShrink:0,
            }}>Dashboard →</a>
          </div>
        )}

        {/* Non-creator prompt */}
        {!isCreator&&(
          <div style={{
            background:C.amberBg,border:`1px solid ${C.amberBdr}`,
            borderRadius:12,padding:'14px 16px',marginBottom:16,
          }}>
            <p style={{fontSize:13,fontWeight:600,color:C.amber,margin:'0 0 4px'}}>
              Graduating Spring 2026?
            </p>
            <p style={{fontSize:12,color:C.muted,margin:'0 0 10px',lineHeight:1.6}}>
              Earn 10% on every order placed through your link — and 10% goes to your school.
            </p>
            <a href="/creator/signup" style={{
              display:'inline-block',padding:'7px 14px',
              background:C.amber,color:'#000',borderRadius:7,
              textDecoration:'none',fontSize:12,fontWeight:700,
            }}>Become a creator →</a>
          </div>
        )}

        {/* Stats */}
        <div style={{
          display:'grid',gridTemplateColumns:'repeat(2,1fr)',
          gap:8,marginBottom:16,
        }}>
          {[
            {label:'Total spent',      value:fmt(totalSpent),        accent:false},
            {label:'Orders placed',    value:String(orders.length),  accent:false},
            {label:'Creator earnings', value:fmt(earnings),          accent:true },
            {label:'Donated to school',value:fmt(donated),           accent:true },
          ].map(s=>(
            <div key={s.label} style={{
              background:s.accent?C.greenBg:C.surface,
              border:`1px solid ${s.accent?C.greenBdr:C.border}`,
              borderRadius:10,padding:'14px',
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

        {/* Referral link */}
        <div style={{
          background:C.surface,borderRadius:12,padding:'14px 16px',
          border:`1px solid ${C.border}`,marginBottom:16,
        }}>
          <p style={{fontWeight:600,fontSize:13,margin:'0 0 4px'}}>
            {isCreator?'Your creator link':'Your referral link'}
          </p>
          <p style={{fontSize:12,color:C.muted,margin:'0 0 10px',lineHeight:1.5}}>
            Share this — every order earns{' '}
            {isCreator?'you 10% and your school 10%':'a donation for your school'}.
          </p>
          <div style={{
            display:'flex',alignItems:'center',gap:8,
            background:'#1a1a1a',borderRadius:8,padding:'9px 12px',
          }}>
            <span style={{fontSize:12,color:C.green,flex:1,
                          overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {referralUrl}
            </span>
            <button onClick={copyLink} style={{
              padding:'5px 12px',
              background:copied?'#1a3a1a':C.green,
              color:copied?C.green:'#000',
              border:copied?`1px solid ${C.green}`:'none',
              borderRadius:6,fontSize:11,fontWeight:700,
              cursor:'pointer',flexShrink:0,transition:'all .2s',
            }}>{copied?'✓ Copied':'Copy'}</button>
          </div>
        </div>

        {/* Quick actions */}
        <div style={{
          display:'grid',
          gridTemplateColumns:handle?'repeat(2,1fr)':'1fr',
          gap:8,marginBottom:20,
        }}>
          <a href="/event/grad-2026" style={{
            padding:'12px',background:C.green,color:'#000',
            borderRadius:10,textDecoration:'none',
            fontSize:13,fontWeight:700,textAlign:'center',display:'block',
          }}>Order prints →</a>
          {handle&&(
            <a href={`/${handle}`} style={{
              padding:'12px',border:`1px solid ${C.border}`,color:'#fff',
              borderRadius:10,textDecoration:'none',
              fontSize:13,textAlign:'center',display:'block',
            }}>View storefront →</a>
          )}
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:4,marginBottom:12}}>
          {tabBtn('orders',   `📦 Orders (${orders.length})`)}
          {tabBtn('earnings', `💰 Earnings`)}
          {isCreator&&tabBtn('campaign','📊 Campaign')}
          {tabBtn('referral', '🔗 Referral')}
        </div>

        {/* ORDERS TAB */}
        {tab==='orders'&&(
          <div>
            {orders.length===0?(
              <div style={{
                background:C.surface,borderRadius:10,padding:'28px',
                textAlign:'center',border:`1px solid ${C.border}`,
              }}>
                <p style={{color:C.faint,fontSize:13,margin:'0 0 12px'}}>No orders yet.</p>
                <a href="/event/grad-2026" style={{
                  padding:'9px 18px',background:C.green,color:'#000',
                  borderRadius:8,textDecoration:'none',
                  fontSize:13,fontWeight:700,display:'inline-block',
                }}>Order your first print →</a>
              </div>
            ):orders.map(order=>{
              const addons = order.addons ? JSON.parse(order.addons) : [];
              const bundleLabel = BUNDLE_LABELS[order.product_type]||order.product_type;
              return (
                <div key={order.id}
                  onClick={()=>setSlideOrder(order)}
                  style={{
                    background:C.surface,borderRadius:10,
                    padding:'12px 14px',marginBottom:6,
                    border:`1px solid ${C.border}`,cursor:'pointer',
                  }}>
                  <div style={{display:'flex',justifyContent:'space-between',
                               alignItems:'flex-start',gap:10}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',
                                   gap:6,marginBottom:3}}>
                        <p style={{fontWeight:600,fontSize:13,margin:0}}>
                          {bundleLabel}
                        </p>
                        {order.order_number&&(
                          <span style={{fontSize:10,color:C.green,
                                        fontFamily:'monospace'}}>
                            #{order.order_number}
                          </span>
                        )}
                        {order.is_reorder&&(
                          <span style={{fontSize:9,padding:'1px 5px',
                                        borderRadius:8,background:C.blueBg,
                                        color:C.blue,border:`1px solid ${C.blueBdr}`}}>
                            reorder
                          </span>
                        )}
                      </div>
                      <p style={{fontSize:11,color:C.faint,margin:'0 0 4px'}}>
                        {new Date(order.created_at).toLocaleDateString('en-US',{
                          month:'short',day:'numeric',year:'numeric'
                        })}
                        {order.tokens_spent?` · ${fmt(order.tokens_spent)}`:''}
                        {order.fulfillment_type==='pickup'?' · 🎪 pickup':' · 📦 ship'}
                      </p>

                      {/* Item pills */}
                      <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                        <span style={{fontSize:10,padding:'2px 6px',borderRadius:6,
                                      background:'#1a1a1a',color:C.muted}}>🖼️ print</span>
                        {['classic','bundle','signature'].includes(order.product_type)&&(
                          <span style={{fontSize:10,padding:'2px 6px',borderRadius:6,
                                        background:order.sticker_status==='shipped'?C.blueBg:'#1a1a1a',
                                        color:stickerColor(order.sticker_status)}}>
                            🎨 sticker
                          </span>
                        )}
                        {['bundle','signature'].includes(order.product_type)&&(
                          <span style={{fontSize:10,padding:'2px 6px',borderRadius:6,
                                        background:order.button_status==='shipped'?C.blueBg:'#1a1a1a',
                                        color:stickerColor(order.button_status)}}>
                            🔵 {BUTTON_LABELS[order.button_size||'']||'button'}
                          </span>
                        )}
                        {order.holo_upgrade&&(
                          <span style={{fontSize:10,padding:'2px 6px',borderRadius:6,
                                        background:'#1a1a1a',color:'#c084fc'}}>
                            ✨ holo
                          </span>
                        )}
                        {addons.includes('metallic_marker')&&(
                          <span style={{fontSize:10,padding:'2px 6px',borderRadius:6,
                                        background:'#1a1a1a',color:C.muted}}>✏️ marker</span>
                        )}
                        {addons.includes('card_jacket')&&(
                          <span style={{fontSize:10,padding:'2px 6px',borderRadius:6,
                                        background:'#1a1a1a',color:C.muted}}>🗂️ jacket</span>
                        )}
                      </div>
                    </div>

                    <div style={{textAlign:'right',flexShrink:0}}>
                      <span style={{
                        fontSize:11,padding:'3px 8px',borderRadius:10,
                        color:statusColor(order.fulfillment_status),
                        background:statusColor(order.fulfillment_status)+'22',
                        border:`1px solid ${statusColor(order.fulfillment_status)}44`,
                        whiteSpace:'nowrap',display:'block',marginBottom:4,
                      }}>
                        {order.fulfillment_status?.replace(/_/g,' ')}
                      </span>
                      <span style={{fontSize:10,color:C.faint}}>tap for details</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* EARNINGS TAB */}
        {tab==='earnings'&&(
          <div>
            {!isCreator?(
              <div style={{
                background:C.surface,borderRadius:10,padding:'24px',
                textAlign:'center',border:`1px solid ${C.border}`,
              }}>
                <p style={{color:C.muted,fontSize:13,margin:'0 0 12px'}}>
                  Become a creator to earn on referrals.
                </p>
                <a href="/creator/signup" style={{
                  padding:'9px 18px',background:C.amber,color:'#000',
                  borderRadius:8,textDecoration:'none',
                  fontSize:13,fontWeight:700,display:'inline-block',
                }}>Apply now →</a>
              </div>
            ):(
              <div>
                <div style={{
                  display:'grid',gridTemplateColumns:'repeat(3,1fr)',
                  gap:8,marginBottom:16,
                }}>
                  {[
                    {label:'Available',    value:fmt(earnings)   },
                    {label:'Total earned', value:fmt(totalEarned)},
                    {label:'Donated',      value:fmt(donated)    },
                  ].map(s=>(
                    <div key={s.label} style={{
                      background:C.greenBg,border:`1px solid ${C.greenBdr}`,
                      borderRadius:10,padding:'12px',textAlign:'center',
                    }}>
                      <p style={{fontSize:10,color:C.faint,margin:'0 0 4px'}}>{s.label}</p>
                      <p style={{fontSize:16,fontWeight:700,color:C.green,margin:0}}>
                        {s.value}
                      </p>
                    </div>
                  ))}
                </div>

                {referralCredits.length===0?(
                  <div style={{
                    background:C.surface,borderRadius:10,padding:'20px',
                    textAlign:'center',border:`1px solid ${C.border}`,
                  }}>
                    <p style={{color:C.faint,fontSize:13,margin:0}}>
                      No earnings yet. Share your link to start earning.
                    </p>
                  </div>
                ):referralCredits.map(credit=>(
                  <div key={credit.id} style={{
                    background:C.surface,borderRadius:10,
                    padding:'10px 14px',marginBottom:6,
                    border:`1px solid ${C.border}`,
                    display:'flex',justifyContent:'space-between',alignItems:'center',
                  }}>
                    <div>
                      <p style={{fontSize:13,fontWeight:500,margin:'0 0 2px'}}>
                        Referral credit
                      </p>
                      <p style={{fontSize:11,color:C.faint,margin:0}}>
                        {new Date(credit.created_at).toLocaleDateString('en-US',{
                          month:'short',day:'numeric',year:'numeric'
                        })}
                      </p>
                    </div>
                    <span style={{fontSize:14,fontWeight:700,color:C.green}}>
                      +{fmt(credit.amount)}
                    </span>
                  </div>
                ))}

                {earnings>0&&(
                  <div style={{marginTop:12}}>
                    <a href="/creator/dashboard" style={{
                      display:'block',padding:'12px',textAlign:'center',
                      background:C.green,color:'#000',borderRadius:10,
                      textDecoration:'none',fontSize:13,fontWeight:700,
                    }}>
                      Request payout → {fmt(earnings)} available
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* CAMPAIGN TAB (creators only) */}
        {tab==='campaign'&&isCreator&&(
          <div>
            <div style={{
              background:C.greenBg,border:`1px solid ${C.greenBdr}`,
              borderRadius:12,padding:'16px',marginBottom:12,
            }}>
              <p style={{fontSize:11,color:C.faint,margin:'0 0 4px',
                         textTransform:'uppercase',letterSpacing:1}}>
                Spring 2026 campaign
              </p>
              <p style={{fontSize:13,color:C.muted,margin:'0 0 12px',lineHeight:1.6}}>
                April 1 – June 30, 2026 · {creatorProfile?.school_name||'No school'}
              </p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                {[
                  {label:'Orders',   value:referralCredits.length},
                  {label:'Earned',   value:fmt(totalEarned)      },
                  {label:'Donated',  value:fmt(donated)          },
                ].map(s=>(
                  <div key={s.label} style={{textAlign:'center'}}>
                    <p style={{fontSize:18,fontWeight:700,color:C.green,margin:'0 0 2px'}}>
                      {s.value}
                    </p>
                    <p style={{fontSize:10,color:C.faint,margin:0}}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {referralCredits.length===0?(
              <div style={{
                background:C.surface,borderRadius:10,padding:'20px',
                textAlign:'center',border:`1px solid ${C.border}`,
              }}>
                <p style={{color:C.faint,fontSize:13,margin:'0 0 8px'}}>
                  No orders through your link yet.
                </p>
                <p style={{color:C.faint,fontSize:12,margin:0}}>
                  Share your link to start earning for your school.
                </p>
              </div>
            ):referralCredits.map(credit=>(
              <div key={credit.id} style={{
                background:C.surface,borderRadius:10,
                padding:'10px 14px',marginBottom:6,
                border:`1px solid ${C.border}`,
                display:'flex',justifyContent:'space-between',alignItems:'center',
              }}>
                <div>
                  <p style={{fontSize:13,fontWeight:500,margin:'0 0 2px'}}>Order placed</p>
                  <p style={{fontSize:11,color:C.faint,margin:0}}>
                    {new Date(credit.created_at).toLocaleDateString('en-US',{
                      month:'short',day:'numeric',year:'numeric'
                    })}
                  </p>
                </div>
                <div style={{textAlign:'right'}}>
                  <p style={{fontSize:13,fontWeight:700,color:C.green,margin:'0 0 1px'}}>
                    +{fmt(credit.amount)}
                  </p>
                  <p style={{fontSize:10,color:C.faint,margin:0}}>your 10%</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* REFERRAL TAB */}
        {tab==='referral'&&(
          <div style={{
            background:C.surface,borderRadius:12,padding:'16px',
            border:`1px solid ${C.border}`,
          }}>
            <p style={{fontWeight:600,fontSize:14,margin:'0 0 8px'}}>
              How your link works
            </p>
            {[
              {step:'1',text:'Share your link with family, friends, and classmates'},
              {step:'2',text:'They visit the page and place an order'},
              {step:'3',text:isCreator?'You earn 10% of their order total':'They select you as the grad they\'re supporting'},
              {step:'4',text:'10% goes to your school\'s PTSO automatically'},
              {step:'5',text:'Campaign ends June 30, 2026 — earnings paid after'},
            ].map(s=>(
              <div key={s.step} style={{
                display:'flex',gap:12,alignItems:'flex-start',padding:'8px 0',
                borderBottom:s.step!=='5'?`1px solid ${C.border}`:'none',
              }}>
                <div style={{
                  width:22,height:22,borderRadius:'50%',
                  background:C.green,color:'#000',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:11,fontWeight:700,flexShrink:0,
                }}>{s.step}</div>
                <p style={{fontSize:13,color:C.muted,margin:0,lineHeight:1.6}}>
                  {s.text}
                </p>
              </div>
            ))}

            <div style={{marginTop:14}}>
              <p style={{fontSize:12,color:C.faint,margin:'0 0 8px'}}>Your link</p>
              <div style={{
                background:'#1a1a1a',borderRadius:8,padding:'10px 12px',
                display:'flex',gap:8,alignItems:'center',
              }}>
                <span style={{fontSize:12,color:C.green,flex:1,
                              overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {referralUrl}
                </span>
                <button onClick={copyLink} style={{
                  padding:'5px 12px',
                  background:copied?'#1a3a1a':C.green,
                  color:copied?C.green:'#000',
                  border:copied?`1px solid ${C.green}`:'none',
                  borderRadius:6,fontSize:11,fontWeight:700,
                  cursor:'pointer',flexShrink:0,
                }}>{copied?'✓ Copied':'Copy'}</button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Order slide-out panel */}
      {slideOrder&&(
        <>
          {/* Backdrop */}
          <div onClick={()=>setSlideOrder(null)} style={{
            position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:999,
          }}/>

          {/* Panel */}
          <div style={{
            position:'fixed',bottom:0,left:0,right:0,
            background:C.surface,borderTop:`1px solid ${C.border}`,
            zIndex:1000,maxHeight:'85vh',overflowY:'auto',
            borderRadius:'16px 16px 0 0',padding:'20px 16px',
          }}>
            {/* Handle */}
            <div style={{
              width:40,height:4,borderRadius:2,background:'#333',
              margin:'0 auto 16px',
            }}/>

            <div style={{display:'flex',justifyContent:'space-between',
                         alignItems:'center',marginBottom:16}}>
              <div>
                <p style={{fontSize:15,fontWeight:600,margin:'0 0 2px'}}>
                  {BUNDLE_LABELS[slideOrder.product_type]||slideOrder.product_type}
                </p>
                <p style={{fontSize:11,color:C.faint,margin:0}}>
                  {slideOrder.order_number?`#${slideOrder.order_number} · `:''}
                  {new Date(slideOrder.created_at).toLocaleDateString('en-US',{
                    month:'long',day:'numeric',year:'numeric'
                  })}
                </p>
              </div>
              <button onClick={()=>setSlideOrder(null)} style={{
                padding:'6px 12px',border:`1px solid ${C.border}`,
                borderRadius:8,background:'transparent',color:C.muted,
                cursor:'pointer',fontSize:13,
              }}>✕</button>
            </div>

            {/* Order details */}
            {[
              ['Total',       `$${slideOrder.tokens_spent||0}`                     ],
              ['Delivery',    slideOrder.fulfillment_type==='pickup'?'Booth pickup':'Ship to door'],
              ['Status',      slideOrder.fulfillment_status?.replace(/_/g,' ')||'—'],
              ['Access',      slideOrder.access_point?.replace(/_/g,' ')||'—'      ],
              slideOrder.order_sequence > 1
                ? ['Order history', `Your order #${slideOrder.order_sequence}${slideOrder.days_since_first_order?` · ${slideOrder.days_since_first_order} days after first order`:''}` ]
                : ['Order history', 'Your first order with Un Momento 🎉'],
              ['Tracking',    slideOrder.tracking_number||'Not yet shipped'        ],
            ].map(([k,v])=>(
              <div key={k} style={{
                display:'flex',justifyContent:'space-between',
                padding:'8px 0',borderBottom:`1px solid ${C.border}`,fontSize:13,
              }}>
                <span style={{color:C.muted}}>{k}</span>
                <span style={{color:C.text,textAlign:'right',maxWidth:220}}>{v}</span>
              </div>
            ))}

            {/* Items in order */}
            <p style={{fontSize:11,fontWeight:600,color:C.muted,
                       textTransform:'uppercase',letterSpacing:1,
                       margin:'16px 0 8px'}}>Items</p>

            {/* Photo print */}
            <div style={{
              display:'flex',justifyContent:'space-between',alignItems:'center',
              padding:'8px 10px',borderRadius:8,background:'#1a1a1a',marginBottom:4,
            }}>
              <span style={{fontSize:12,color:C.text}}>🖼️ 4×6 photo print</span>
              <span style={{fontSize:11,color:statusColor(slideOrder.fulfillment_status),
                            padding:'2px 8px',borderRadius:8,
                            background:statusColor(slideOrder.fulfillment_status)+'22'}}>
                {slideOrder.fulfillment_status?.replace(/_/g,' ')||'pending'}
              </span>
            </div>

            {/* Sticker */}
            {['classic','bundle','signature'].includes(slideOrder.product_type)&&(
              <div style={{
                display:'flex',justifyContent:'space-between',alignItems:'center',
                padding:'8px 10px',borderRadius:8,background:'#1a1a1a',marginBottom:4,
              }}>
                <span style={{fontSize:12,color:C.text}}>🎨 Die-cut sticker sheet</span>
                <span style={{fontSize:11,
                              color:stickerColor(slideOrder.sticker_status),
                              padding:'2px 8px',borderRadius:8,
                              background:stickerColor(slideOrder.sticker_status)+'22'}}>
                  {slideOrder.sticker_status||'pending'}
                  {slideOrder.sticker_tracking&&` · ${slideOrder.sticker_tracking}`}
                </span>
              </div>
            )}

            {/* Button */}
            {['bundle','signature'].includes(slideOrder.product_type)&&(
              <div style={{
                display:'flex',justifyContent:'space-between',alignItems:'center',
                padding:'8px 10px',borderRadius:8,background:'#1a1a1a',marginBottom:4,
              }}>
                <span style={{fontSize:12,color:C.text}}>
                  🔵 {BUTTON_LABELS[slideOrder.button_size||'']||'Button/magnet'}
                  {slideOrder.holo_upgrade&&` + ✨ ${slideOrder.holo_style_name||'Holo'}`}
                </span>
                <span style={{fontSize:11,
                              color:stickerColor(slideOrder.button_status),
                              padding:'2px 8px',borderRadius:8,
                              background:stickerColor(slideOrder.button_status)+'22'}}>
                  {slideOrder.button_status||'pending'}
                  {slideOrder.button_tracking&&` · ${slideOrder.button_tracking}`}
                </span>
              </div>
            )}

            {/* Addons */}
            {slideOrder.addons&&JSON.parse(slideOrder.addons||'[]').map((addon:string)=>(
              <div key={addon} style={{
                display:'flex',justifyContent:'space-between',alignItems:'center',
                padding:'8px 10px',borderRadius:8,background:'#1a1a1a',marginBottom:4,
              }}>
                <span style={{fontSize:12,color:C.text}}>
                  {addon==='metallic_marker'?'✏️ Metallic marker':
                   addon==='oil_marker'?'🖊️ Oil marker':
                   addon==='card_jacket'?'🗂️ Card jacket':
                   addon==='qr_video'?'📱 QR video upgrade':
                   addon==='extra_print'?'🖼️ Extra print':
                   addon==='extra_sticker'?'🎨 Extra sticker':
                   addon==='holo_upgrade'?'✨ Holo upgrade':addon}
                </span>
                <span style={{fontSize:11,color:C.muted}}>included</span>
              </div>
            ))}

            {/* Reorder button */}
            <a href={`/event/grad-2026?bundle=${slideOrder.product_type}`}
              style={{
                display:'block',marginTop:16,padding:'12px',
                background:C.green,color:'#000',borderRadius:10,
                textDecoration:'none',fontSize:13,fontWeight:700,
                textAlign:'center',
              }}>
              🔄 Reorder this bundle →
            </a>
          </div>
        </>
      )}

    </main>
  );
}