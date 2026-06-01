'use client';
import { useState } from 'react';

interface Creator {
  handle:           string;
  display_name:     string;
  avatar_url:       string | null;
  graduation_year:  number | null;
  bio:              string | null;
  total_earned:     number;
  total_donated:    number;
  is_verified:      boolean;
  school_id:        string;
}

interface School {
  name:       string;
  city:       string;
  state_abbr: string;
  type:       string;
}

interface CampaignStats {
  order_count:        number;
  revenue_attributed: number;
  creator_earnings:   number;
  online_orders:      number;
  booth_orders:       number;
  first_order_at:     string;
  last_order_at:      string;
}

interface SchoolStats {
  total_donated:  number;
  creator_count:  number;
  school_name:    string;
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

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const BUNDLES = [
  {
    id: 'essential', name: 'Momento Essential', price: 18,
    desc: 'Instant 4×6 photo print + QR memory code',
    emoji: '🖼️', popular: false,
  },
  {
    id: 'classic', name: 'Momento Classic', price: 28,
    desc: 'Photo print + die-cut sticker sheet + QR memory code',
    emoji: '🎨', popular: true,
  },
  {
    id: 'bundle', name: 'Momento Bundle', price: 45,
    desc: 'Photo + stickers + button or magnet + card jacket',
    emoji: '🎁', popular: false,
  },
  {
    id: 'signature', name: 'Momento Signature', price: 58,
    desc: 'The complete graduation keepsake experience',
    emoji: '✨', popular: false,
  },
];

export default function CreatorStorefront({
  creator, school, campaignStats, schoolStats, rank,
}: {
  creator:       Creator;
  school:        School | null;
  campaignStats: CampaignStats | null;
  schoolStats:   SchoolStats | null;
  rank:          number;
}) {
  const [copied, setCopied] = useState(false);

  const orderUrl   = `https://unmomentoprints.com/event/grad-2026?ref=${creator.handle}`;
  const donatedPct = schoolStats?.total_donated
    ? Math.min(100, Math.round((creator.total_donated / schoolStats.total_donated) * 100))
    : 0;

  function copyLink() {
    try {
      navigator.clipboard.writeText(orderUrl);
    } catch {
      const el       = document.createElement('textarea');
      el.value       = orderUrl;
      el.style.position = 'fixed';
      el.style.opacity  = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main style={{
      minHeight: '100vh', background: C.bg, color: C.text,
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      paddingBottom: 64,
    }}>

      {/* Header */}
      <div style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: '14px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <a href="/" style={{ fontSize: 11, color: C.faint,
                             letterSpacing: 3, textTransform: 'uppercase',
                             textDecoration: 'none' }}>
          Un Momento
        </a>
        <a href={`/event/grad-2026?ref=${creator.handle}`} style={{
          padding: '7px 14px', background: C.green, color: '#000',
          borderRadius: 8, textDecoration: 'none',
          fontSize: 12, fontWeight: 700,
        }}>Order now →</a>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px' }}>

        {/* Creator hero */}
        <div style={{
          background: C.surface, borderRadius: 16,
          border: `1px solid ${C.border}`,
          padding: '28px 20px', marginBottom: 16, textAlign: 'center',
        }}>
          {/* Avatar */}
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: C.greenBg, border: `2px solid ${C.green}`,
            margin: '0 auto 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, overflow: 'hidden',
          }}>
            {creator.avatar_url ? (
              <img src={creator.avatar_url} alt={creator.display_name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
            ) : (
              '🎓'
            )}
          </div>

          {/* Name + verified */}
          <div style={{ display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: 8, marginBottom: 4 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
              {creator.display_name}
            </h1>
            {creator.is_verified && (
              <span style={{
                fontSize: 10, background: C.green, color: '#000',
                padding: '2px 7px', borderRadius: 4, fontWeight: 700,
              }}>VERIFIED</span>
            )}
          </div>

          {/* School */}
          {school && (
            <p style={{ fontSize: 13, color: C.muted, margin: '0 0 4px' }}>
              {school.name} · {school.city}, {school.state_abbr}
            </p>
          )}

          {/* Grad year */}
          {creator.graduation_year && (
            <p style={{ fontSize: 12, color: C.faint, margin: '0 0 12px' }}>
              Class of {creator.graduation_year}
            </p>
          )}

          {/* Bio */}
          {creator.bio && (
            <p style={{
              fontSize: 13, color: C.muted, margin: '0 0 16px',
              lineHeight: 1.6, maxWidth: 400, marginLeft: 'auto',
              marginRight: 'auto',
            }}>
              {creator.bio}
            </p>
          )}

          {/* School rank badge */}
          {rank > 0 && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: C.greenBg, border: `1px solid ${C.greenBdr}`,
              borderRadius: 20, padding: '4px 12px', marginBottom: 16,
            }}>
              <span style={{ fontSize: 14 }}>
                {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🎓'}
              </span>
              <span style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>
                #{rank} at {school?.name || 'their school'}
              </span>
            </div>
          )}

          {/* CTA */}
          <a href={`/event/grad-2026?ref=${creator.handle}`} style={{
            display: 'block', padding: '14px',
            background: C.green, color: '#000',
            borderRadius: 12, textDecoration: 'none',
            fontSize: 15, fontWeight: 700,
          }}>
            Order graduation prints — support {creator.display_name.split(' ')[0]} →
          </a>
        </div>

        {/* How it works */}
        <div style={{
          background: C.surface, borderRadius: 12,
          border: `1px solid ${C.border}`,
          padding: '16px', marginBottom: 16,
        }}>
          <p style={{
            fontSize: 11, fontWeight: 600, color: C.muted,
            letterSpacing: 1, textTransform: 'uppercase',
            margin: '0 0 12px',
          }}>How it works</p>
          {[
            { emoji: '🖼️', text: 'Order custom graduation prints, stickers, and buttons' },
            { emoji: '💸', text: `10% of your order goes directly to ${school?.name || 'their school'}` },
            { emoji: '💰', text: `${creator.display_name.split(' ')[0]} earns 10% to support their next chapter` },
            { emoji: '📦', text: 'Ships anywhere in the US in 4-5 days' },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', gap: 12, alignItems: 'flex-start',
              padding: '8px 0',
              borderBottom: i < 3 ? `1px solid ${C.border}` : 'none',
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{item.emoji}</span>
              <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.6 }}>
                {item.text}
              </p>
            </div>
          ))}
        </div>

        {/* Stats */}
        {(creator.total_donated > 0 || campaignStats?.order_count > 0) && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
            gap: 8, marginBottom: 16,
          }}>
            {[
              {
                label: 'Raised for school',
                value: fmt(creator.total_donated),
                color: C.green,
              },
              {
                label: 'Orders supported',
                value: String(campaignStats?.order_count || 0),
                color: C.text,
              },
              {
                label: 'School total',
                value: fmt(schoolStats?.total_donated || 0),
                color: C.amber,
              },
            ].map(s => (
              <div key={s.label} style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 10, padding: '12px 8px', textAlign: 'center',
              }}>
                <p style={{ fontSize: 16, fontWeight: 700,
                            color: s.color, margin: '0 0 3px' }}>
                  {s.value}
                </p>
                <p style={{ fontSize: 10, color: C.faint, margin: 0 }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Bundle picker */}
        <div style={{ marginBottom: 16 }}>
          <p style={{
            fontSize: 11, fontWeight: 600, color: C.muted,
            letterSpacing: 1, textTransform: 'uppercase',
            margin: '0 0 10px',
          }}>Choose a bundle</p>
          {BUNDLES.map(b => (
            <a key={b.id}
              href={`/event/grad-2026?ref=${creator.handle}&bundle=${b.id}`}
              style={{
                display: 'block', textDecoration: 'none',
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 12, padding: '14px 16px', marginBottom: 8,
                position: 'relative',
              }}>
              {b.popular && (
                <span style={{
                  position: 'absolute', top: -10, left: 12,
                  background: C.green, color: '#000',
                  fontSize: 10, fontWeight: 700,
                  padding: '2px 8px', borderRadius: 10,
                }}>MOST POPULAR</span>
              )}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', gap: 12,
              }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontSize: 24 }}>{b.emoji}</span>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14,
                                color: C.text, margin: '0 0 2px' }}>
                      {b.name}
                    </p>
                    <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
                      {b.desc}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 18, fontWeight: 700,
                              color: C.green, margin: '0 0 2px' }}>
                    ${b.price}
                  </p>
                  <p style={{ fontSize: 10, color: C.faint, margin: 0 }}>
                    + 10% to school
                  </p>
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Share this page */}
        <div style={{
          background: C.surface, borderRadius: 12,
          border: `1px solid ${C.border}`, padding: '16px',
        }}>
          <p style={{ fontWeight: 600, fontSize: 13, margin: '0 0 4px' }}>
            Share {creator.display_name.split(' ')[0]}'s page
          </p>
          <p style={{ fontSize: 12, color: C.muted,
                      margin: '0 0 10px', lineHeight: 1.5 }}>
            Every order through this link supports {creator.display_name.split(' ')[0]}{' '}
            and {school?.name || 'their school'}.
          </p>
          <div style={{
            display: 'flex', gap: 8, alignItems: 'center',
            background: '#1a1a1a', borderRadius: 8, padding: '9px 12px',
            marginBottom: 10,
          }}>
            <span style={{
              fontSize: 12, color: C.green, flex: 1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              unmomentoprints.com/{creator.handle}
            </span>
            <button onClick={copyLink} style={{
              padding: '5px 12px',
              background: copied ? '#1a3a1a' : C.green,
              color: copied ? C.green : '#000',
              border: copied ? `1px solid ${C.green}` : 'none',
              borderRadius: 6, fontSize: 11, fontWeight: 700,
              cursor: 'pointer', flexShrink: 0,
            }}>
              {copied ? '✓ Copied' : 'Copy link'}
            </button>
          </div>

          {/* Social share buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <a href={`https://twitter.com/intent/tweet?text=Support+${encodeURIComponent(creator.display_name)}+for+graduation+%F0%9F%8E%93+%E2%80%94+10%25+goes+to+${encodeURIComponent(school?.name||'their school')}&url=${encodeURIComponent(orderUrl)}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                flex: 1, padding: '9px', background: '#1a1a1a',
                border: `1px solid ${C.border}`, borderRadius: 8,
                color: C.text, textDecoration: 'none',
                fontSize: 12, textAlign: 'center', display: 'block',
              }}>
              𝕏 Tweet
            </a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(orderUrl)}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                flex: 1, padding: '9px', background: '#1a1a1a',
                border: `1px solid ${C.border}`, borderRadius: 8,
                color: C.text, textDecoration: 'none',
                fontSize: 12, textAlign: 'center', display: 'block',
              }}>
              Facebook
            </a>
            <a href={`sms:?body=Support+${encodeURIComponent(creator.display_name)}+for+graduation+%F0%9F%8E%93+${encodeURIComponent(orderUrl)}`}
              style={{
                flex: 1, padding: '9px', background: '#1a1a1a',
                border: `1px solid ${C.border}`, borderRadius: 8,
                color: C.text, textDecoration: 'none',
                fontSize: 12, textAlign: 'center', display: 'block',
              }}>
              💬 Text
            </a>
          </div>
        </div>

        {/* Footer */}
        <p style={{
          textAlign: 'center', fontSize: 11, color: C.faint,
          marginTop: 24, lineHeight: 1.6,
        }}>
          Un Momento LLC · Graduation Season 2026<br/>
          Ships anywhere in the US · 10% to school · 10% to creator
        </p>

      </div>
    </main>
  );
}