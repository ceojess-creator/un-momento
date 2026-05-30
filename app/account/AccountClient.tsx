'use client';
import { useState } from 'react';
import { UserButton } from '@clerk/nextjs';

interface Order {
  id:                 string;
  created_at:         string;
  product_type:       string;
  fulfillment_status: string;
  fulfillment_source: string;
  tokens_spent:       number;
  tracking_number:    string | null;
  referral_code:      string | null;
  buyer_name:         string;
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
};

export default function AccountClient({
  account, orders, referralCredits, userImage,
}: {
  account:         Account;
  orders:          Order[];
  referralCredits: ReferralCredit[];
  userImage:       string;
}) {
  const [copied, setCopied] = useState(false);
  const [tab,    setTab]    = useState<'orders'|'earnings'|'referral'>('orders');

  const balance      = account.token_wallets?.balance || 0;
  const handle       = account.creator_profiles?.handle;
  const earnings     = account.creator_profiles?.earnings_balance || 0;
  const totalEarned  = account.creator_profiles?.total_earned     || 0;
  const donated      = account.creator_profiles?.total_donated    || 0;
  const isVerified   = account.creator_profiles?.is_verified      || false;
  const isCreator    = account.is_creator || !!handle;

  const referralUrl  = handle
    ? `https://unmomentoprints.com/${handle}`
    : `https://unmomentoprints.com/event/grad-2026?ref=${account.referral_code}`;

  const totalSpent   = orders.reduce((s, o) => s + (o.tokens_spent || 0), 0);
  const totalCredits = referralCredits.reduce((s, c) => s + (c.amount || 0), 0);

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(n);

  function copyLink() {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const statusColor = (s: string) =>
    s === 'delivered'    ? C.green  :
    s === 'shipped'      ? '#60a5fa':
    s === 'fulfilled'    ? '#60a5fa':
    s === 'ready_for_pickup' ? C.green :
    C.amber;

  const tabBtn = (id: typeof tab, label: string) => (
    <button key={id} onClick={() => setTab(id)} style={{
      flex: 1, padding: '8px',
      background: tab === id ? C.surface : 'transparent',
      border:     tab === id ? `1px solid #333` : '1px solid transparent',
      borderRadius: 8, color: tab === id ? '#fff' : C.muted,
      fontSize: 12, cursor: 'pointer', fontWeight: tab === id ? 500 : 400,
    }}>{label}</button>
  );

  return (
    <main style={{
      minHeight: '100vh', background: C.bg, color: C.text,
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      paddingBottom: 48,
    }}>

      {/* Header */}
      <div style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: '16px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <p style={{ fontSize: 11, color: C.faint, letterSpacing: 3,
                      textTransform: 'uppercase', margin: '0 0 3px' }}>
            Un Momento Prints
          </p>
          <h1 style={{ fontSize: 17, fontWeight: 500, margin: 0 }}>
            {account.name || account.email}
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a href="/" style={{ fontSize: 12, color: C.muted,
                               textDecoration: 'none' }}>← Home</a>
          <UserButton />
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 16px' }}>

        {/* Creator status banner */}
        {isCreator && handle && (
          <div style={{
            background: C.greenBg, border: `1px solid ${C.greenBdr}`,
            borderRadius: 12, padding: '14px 16px', marginBottom: 16,
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', gap: 10,
          }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: C.green,
                          margin: '0 0 2px' }}>
                ✓ Creator — {handle}
                {isVerified && (
                  <span style={{ marginLeft: 8, fontSize: 10,
                                 background: C.green, color: '#000',
                                 padding: '1px 6px', borderRadius: 4,
                                 fontWeight: 700 }}>
                    VERIFIED
                  </span>
                )}
              </p>
              <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
                Spring 2026 campaign · ends June 30
              </p>
            </div>
            <a href="/creator/dashboard" style={{
              padding: '6px 12px', background: C.green, color: '#000',
              borderRadius: 7, textDecoration: 'none',
              fontSize: 12, fontWeight: 700, flexShrink: 0,
            }}>Dashboard →</a>
          </div>
        )}

        {/* Not a creator prompt */}
        {!isCreator && (
          <div style={{
            background: C.amberBg, border: `1px solid ${C.amber}33`,
            borderRadius: 12, padding: '14px 16px', marginBottom: 16,
          }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: C.amber,
                        margin: '0 0 4px' }}>
              Graduating Spring 2026?
            </p>
            <p style={{ fontSize: 12, color: C.muted, margin: '0 0 10px',
                        lineHeight: 1.6 }}>
              Earn 10% on every order placed through your link — and 10%
              goes to your school's PTSO.
            </p>
            <a href="/creator/signup" style={{
              display: 'inline-block', padding: '7px 14px',
              background: C.amber, color: '#000', borderRadius: 7,
              textDecoration: 'none', fontSize: 12, fontWeight: 700,
            }}>
              Become a creator →
            </a>
          </div>
        )}

        {/* Stats grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2,1fr)',
          gap: 8, marginBottom: 16,
        }}>
          {[
            { label: 'Total spent',       value: fmt(totalSpent),       accent: false },
            { label: 'Orders placed',     value: String(orders.length), accent: false },
            { label: 'Creator earnings',  value: fmt(earnings),         accent: true  },
            { label: 'Donated to school', value: fmt(donated),          accent: true  },
          ].map(s => (
            <div key={s.label} style={{
              background: s.accent ? C.greenBg : C.surface,
              border: `1px solid ${s.accent ? C.greenBdr : C.border}`,
              borderRadius: 10, padding: '14px',
            }}>
              <p style={{ fontSize: 11, color: C.faint,
                          margin: '0 0 5px' }}>{s.label}</p>
              <p style={{ fontSize: 20, fontWeight: 700,
                          color: s.accent ? C.green : '#fff',
                          margin: 0, letterSpacing: '-0.02em' }}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Referral link */}
        <div style={{
          background: C.surface, borderRadius: 12, padding: '14px 16px',
          border: `1px solid ${C.border}`, marginBottom: 16,
        }}>
          <p style={{ fontWeight: 600, fontSize: 13, margin: '0 0 4px' }}>
            {isCreator ? 'Your creator link' : 'Your referral link'}
          </p>
          <p style={{ fontSize: 12, color: C.muted, margin: '0 0 10px',
                      lineHeight: 1.5 }}>
            Share this link — every order through it earns{' '}
            {isCreator ? 'you 10% and your school 10%' : 'a donation for your school'}.
          </p>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#1a1a1a', borderRadius: 8, padding: '9px 12px',
          }}>
            <span style={{ fontSize: 12, color: C.green, flex: 1,
                           overflow: 'hidden', textOverflow: 'ellipsis',
                           whiteSpace: 'nowrap' }}>
              {handle ? `unmomentoprints.com/${handle}` : referralUrl}
            </span>
            <button onClick={copyLink} style={{
              padding: '5px 12px', background: copied ? '#1a3a1a' : C.green,
              color: copied ? C.green : '#000', border: copied ? `1px solid ${C.green}` : 'none',
              borderRadius: 6, fontSize: 11, fontWeight: 700,
              cursor: 'pointer', flexShrink: 0, transition: 'all .2s',
            }}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Quick actions */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: handle ? 'repeat(2,1fr)' : '1fr',
          gap: 8, marginBottom: 20,
        }}>
          <a href="/event/grad-2026" style={{
            padding: '12px', background: C.green, color: '#000',
            borderRadius: 10, textDecoration: 'none',
            fontSize: 13, fontWeight: 700, textAlign: 'center',
            display: 'block',
          }}>
            Order prints →
          </a>
          {handle && (
            <a href={`/${handle}`} style={{
              padding: '12px', border: `1px solid ${C.border}`, color: '#fff',
              borderRadius: 10, textDecoration: 'none',
              fontSize: 13, textAlign: 'center', display: 'block',
            }}>
              View storefront →
            </a>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
          {tabBtn('orders',   `📦 Orders (${orders.length})`)}
          {tabBtn('earnings', `💰 Earnings (${fmt(totalCredits)})`)}
          {tabBtn('referral', '🔗 Referral')}
        </div>

        {/* Orders tab */}
        {tab === 'orders' && (
          <div>
            {orders.length === 0 ? (
              <div style={{
                background: C.surface, borderRadius: 10, padding: '28px',
                textAlign: 'center', border: `1px solid ${C.border}`,
              }}>
                <p style={{ color: C.faint, fontSize: 13, margin: '0 0 12px' }}>
                  No orders yet.
                </p>
                <a href="/event/grad-2026" style={{
                  padding: '9px 18px', background: C.green, color: '#000',
                  borderRadius: 8, textDecoration: 'none',
                  fontSize: 13, fontWeight: 700, display: 'inline-block',
                }}>
                  Order your first print →
                </a>
              </div>
            ) : orders.map(order => (
              <div key={order.id} style={{
                background: C.surface, borderRadius: 10,
                padding: '12px 14px', marginBottom: 6,
                border: `1px solid ${C.border}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                              alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 500, fontSize: 13,
                                margin: '0 0 3px' }}>
                      {order.product_type?.replace(/_/g,' ')}
                    </p>
                    <p style={{ fontSize: 11, color: C.faint, margin: '0 0 4px' }}>
                      {new Date(order.created_at).toLocaleDateString('en-US',{
                        month:'short', day:'numeric', year:'numeric'
                      })}
                      {order.tokens_spent
                        ? ` · ${fmt(order.tokens_spent)}`
                        : ''}
                      {order.fulfillment_source === 'local'
                        ? ' · 🎪 onsite'
                        : ' · 📦 online'}
                    </p>
                    {order.tracking_number && (
                      <p style={{ fontSize: 11, color: '#60a5fa', margin: 0 }}>
                        Tracking: {order.tracking_number}
                      </p>
                    )}
                  </div>
                  <span style={{
                    fontSize: 11, padding: '3px 8px', borderRadius: 10,
                    color: statusColor(order.fulfillment_status),
                    background: statusColor(order.fulfillment_status) + '22',
                    border: `1px solid ${statusColor(order.fulfillment_status)}44`,
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    {order.fulfillment_status?.replace(/_/g,' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Earnings tab */}
        {tab === 'earnings' && (
          <div>
            {!isCreator ? (
              <div style={{
                background: C.surface, borderRadius: 10, padding: '24px',
                textAlign: 'center', border: `1px solid ${C.border}`,
              }}>
                <p style={{ color: C.muted, fontSize: 13, margin: '0 0 12px' }}>
                  Become a creator to earn on referrals.
                </p>
                <a href="/creator/signup" style={{
                  padding: '9px 18px', background: C.amber, color: '#000',
                  borderRadius: 8, textDecoration: 'none',
                  fontSize: 13, fontWeight: 700, display: 'inline-block',
                }}>
                  Apply now →
                </a>
              </div>
            ) : (
              <div>
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
                  gap: 8, marginBottom: 16,
                }}>
                  {[
                    { label: 'Available',     value: fmt(earnings)    },
                    { label: 'Total earned',  value: fmt(totalEarned) },
                    { label: 'Donated',       value: fmt(donated)     },
                  ].map(s => (
                    <div key={s.label} style={{
                      background: C.greenBg, border: `1px solid ${C.greenBdr}`,
                      borderRadius: 10, padding: '12px', textAlign: 'center',
                    }}>
                      <p style={{ fontSize: 10, color: C.faint,
                                  margin: '0 0 4px' }}>{s.label}</p>
                      <p style={{ fontSize: 16, fontWeight: 700,
                                  color: C.green, margin: 0 }}>
                        {s.value}
                      </p>
                    </div>
                  ))}
                </div>

                {referralCredits.length === 0 ? (
                  <div style={{
                    background: C.surface, borderRadius: 10, padding: '20px',
                    textAlign: 'center', border: `1px solid ${C.border}`,
                  }}>
                    <p style={{ color: C.faint, fontSize: 13, margin: 0 }}>
                      No earnings yet. Share your link to start earning.
                    </p>
                  </div>
                ) : (
                  referralCredits.map(credit => (
                    <div key={credit.id} style={{
                      background: C.surface, borderRadius: 10,
                      padding: '10px 14px', marginBottom: 6,
                      border: `1px solid ${C.border}`,
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500,
                                    margin: '0 0 2px' }}>
                          Referral credit
                        </p>
                        <p style={{ fontSize: 11, color: C.faint, margin: 0 }}>
                          {new Date(credit.created_at).toLocaleDateString('en-US',{
                            month:'short', day:'numeric', year:'numeric'
                          })}
                        </p>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 700,
                                     color: C.green }}>
                        +{fmt(credit.amount)}
                      </span>
                    </div>
                  ))
                )}

                {earnings > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <a href="/creator/dashboard" style={{
                      display: 'block', padding: '12px', textAlign: 'center',
                      background: C.green, color: '#000', borderRadius: 10,
                      textDecoration: 'none', fontSize: 13, fontWeight: 700,
                    }}>
                      Request payout → {fmt(earnings)} available
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Referral tab */}
        {tab === 'referral' && (
          <div style={{
            background: C.surface, borderRadius: 12, padding: '16px',
            border: `1px solid ${C.border}`,
          }}>
            <p style={{ fontWeight: 600, fontSize: 14, margin: '0 0 8px' }}>
              How your link works
            </p>
            {[
              { step:'1', text:'Share your link with family, friends, and classmates' },
              { step:'2', text:'They visit the page and place an order' },
              { step:'3', text:`${isCreator ? 'You earn 10% of their order total' : 'They select you as the grad they\'re supporting'}` },
              { step:'4', text:'10% goes to your school\'s PTSO automatically' },
              { step:'5', text:'Campaign ends June 30, 2026 — earnings paid after' },
            ].map(s => (
              <div key={s.step} style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                padding: '8px 0',
                borderBottom: s.step !== '5' ? `1px solid ${C.border}` : 'none',
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: C.green, color: '#000',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>
                  {s.step}
                </div>
                <p style={{ fontSize: 13, color: C.muted, margin: 0,
                            lineHeight: 1.6 }}>
                  {s.text}
                </p>
              </div>
            ))}

            <div style={{ marginTop: 14 }}>
              <p style={{ fontSize: 12, color: C.faint,
                          margin: '0 0 8px' }}>Your link</p>
              <div style={{
                background: '#1a1a1a', borderRadius: 8, padding: '10px 12px',
                display: 'flex', gap: 8, alignItems: 'center',
              }}>
                <span style={{ fontSize: 12, color: C.green, flex: 1,
                               overflow: 'hidden', textOverflow: 'ellipsis',
                               whiteSpace: 'nowrap' }}>
                  {referralUrl}
                </span>
                <button onClick={copyLink} style={{
                  padding: '5px 12px', background: copied ? '#1a3a1a' : C.green,
                  color: copied ? C.green : '#000',
                  border: copied ? `1px solid ${C.green}` : 'none',
                  borderRadius: 6, fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', flexShrink: 0,
                }}>
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}