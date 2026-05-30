'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Creator {
  handle:          string;
  display_name:    string;
  school_name:     string;
  graduation_year: number;
  total_donated:   number;
  is_verified:     boolean;
}

export default function Home() {
  const router = useRouter();
  const [query,      setQuery]      = useState('');
  const [school,     setSchool]     = useState('');
  const [results,    setResults]    = useState<Creator[]>([]);
  const [searching,  setSearching]  = useState(false);
  const [searched,   setSearched]   = useState(false);
  const [totalRaised, setTotalRaised] = useState(0);

  useEffect(() => {
    // Fetch total raised for homepage counter
    fetch('/api/fundraiser/totals')
      .then(r => r.json())
      .then(d => setTotalRaised(d.total || 0))
      .catch(() => {});
  }, []);

  async function searchCreators() {
    if (!query.trim()) return;
    setSearching(true);
    setSearched(true);
    try {
      const params = new URLSearchParams({ q: query, year: '2026' });
      if (school) params.set('school', school);
      const res  = await fetch(`/api/creator/search?${params}`);
      const data = await res.json();
      setResults(data.creators || []);
    } catch (err) { console.error(err); }
    setSearching(false);
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  const inp = {
    width: '100%', padding: '12px 14px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10, color: '#fff', fontSize: 14,
    outline: 'none',
  } as React.CSSProperties;

  return (
    <main style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section style={{
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '80px 24px 48px',
        textAlign: 'center',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(74,222,128,0.08) 0%, transparent 70%)',
      }}>
        <p style={{ fontSize: 11, color: '#4ADE80', letterSpacing: 5,
                    textTransform: 'uppercase', margin: '0 0 20px',
                    fontWeight: 500 }}>
          Un Momento Prints
        </p>

        <h1 style={{
          fontSize: 'clamp(32px, 7vw, 64px)',
          fontWeight: 500, lineHeight: 1.1,
          maxWidth: 720, margin: '0 0 24px',
          letterSpacing: '-0.02em',
        }}>
          The moments that matter most deserve to exist in the real world.
        </h1>

        <p style={{
          fontSize: 'clamp(16px, 2.5vw, 20px)',
          color: '#aaa', maxWidth: 560,
          lineHeight: 1.75, margin: '0 0 16px',
        }}>
          Instant photo prints, die-cut stickers, custom buttons,
          and QR memory clips — designed by you, shipped anywhere
          in the US in 4–5 days.
        </p>

        {totalRaised > 0 && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(74,222,128,0.1)',
            border: '1px solid rgba(74,222,128,0.2)',
            borderRadius: 20, padding: '6px 16px',
            fontSize: 13, color: '#4ADE80', margin: '0 0 32px',
          }}>
            🎓 {fmt(totalRaised)} raised for schools this season
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap',
                      justifyContent: 'center', marginBottom: 64 }}>
          <a href="/event/grad-2026" style={{
            padding: '14px 28px', background: '#fff', color: '#000',
            borderRadius: 10, textDecoration: 'none',
            fontWeight: 700, fontSize: 15,
          }}>
            Order now →
          </a>
          <a href="/creator/signup" style={{
            padding: '14px 28px', border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff', borderRadius: 10, textDecoration: 'none',
            fontSize: 15,
          }}>
            Become a creator
          </a>
        </div>

        {/* Scroll hint */}
        <div style={{ position: 'absolute', bottom: 32,
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: 6 }}>
          <p style={{ fontSize: 11, color: '#444', margin: 0,
                      letterSpacing: 2, textTransform: 'uppercase' }}>
            Scroll to explore
          </p>
          <div style={{ width: 1, height: 40,
                        background: 'linear-gradient(to bottom, #444, transparent)' }}/>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────── */}
      <section style={{ padding: '80px 24px', maxWidth: 800, margin: '0 auto' }}>
        <p style={{ fontSize: 11, color: '#4ADE80', letterSpacing: 4,
                    textTransform: 'uppercase', margin: '0 0 16px',
                    textAlign: 'center', fontWeight: 500 }}>
          How it works
        </p>
        <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 500,
                     textAlign: 'center', margin: '0 0 48px',
                     letterSpacing: '-0.01em' }}>
          Three ways to be part of Un Momento
        </h2>

        {/* Journey 1 — Buyer */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12,
                        marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%',
                          background: '#4ADE80', color: '#000',
                          display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: 14,
                          fontWeight: 700, flexShrink: 0 }}>1</div>
            <h3 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>
              Order a keepsake — ships to your door
            </h3>
          </div>
          <div style={{ paddingLeft: 44 }}>
            <p style={{ fontSize: 14, color: '#888', lineHeight: 1.8,
                        margin: '0 0 16px' }}>
              Visit the order page, pick a bundle, upload your graduation
              photo, record a voice or video message, and design your print.
              We ship anywhere in the US in 4–5 business days.
            </p>
            <div style={{ display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                          gap: 8 }}>
              {[
                { n:'01', t:'Pick a bundle',       d:'From $18' },
                { n:'02', t:'Record your message', d:'QR links forever' },
                { n:'03', t:'Design your print',   d:'Up to 6 photos' },
                { n:'04', t:'We ship it',          d:'4–5 business days' },
              ].map(s => (
                <div key={s.n} style={{ background: '#111', borderRadius: 10,
                                        padding: '14px', border: '1px solid #1a1a1a' }}>
                  <p style={{ fontSize: 10, color: '#555', margin: '0 0 6px',
                              letterSpacing: 2 }}>{s.n}</p>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 3px' }}>{s.t}</p>
                  <p style={{ fontSize: 12, color: '#666', margin: 0 }}>{s.d}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16 }}>
              <a href="/event/grad-2026" style={{
                display: 'inline-block', padding: '10px 20px',
                background: '#4ADE80', color: '#000', borderRadius: 8,
                textDecoration: 'none', fontSize: 13, fontWeight: 700,
              }}>
                Order now →
              </a>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid #1a1a1a', marginBottom: 48 }}/>

        {/* Journey 2 — Creator */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12,
                        marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%',
                          background: '#4ADE80', color: '#000',
                          display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: 14,
                          fontWeight: 700, flexShrink: 0 }}>2</div>
            <h3 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>
              Become a creator — earn 10% for you and your school
            </h3>
          </div>
          <div style={{ paddingLeft: 44 }}>
            <p style={{ fontSize: 14, color: '#888', lineHeight: 1.8,
                        margin: '0 0 16px' }}>
              Graduating in Spring 2026? Sign up as a creator, get your
              unique storefront link, and share it with everyone who loves you.
              Every order placed through your link earns you 10% — and
              10% goes straight to your school's PTSO.
            </p>
            <div style={{ background: '#0d1f0d',
                          border: '1px solid rgba(74,222,128,0.2)',
                          borderRadius: 10, padding: '16px',
                          marginBottom: 16 }}>
              <div style={{ display: 'grid',
                            gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                {[
                  { label: 'You earn',       value: '10%', sub: 'of every order' },
                  { label: 'School gets',    value: '10%', sub: 'PTSO donation'  },
                  { label: 'Campaign runs',  value: 'Apr–Jun', sub: 'Spring 2026' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 22, fontWeight: 600,
                                color: '#4ADE80', margin: '0 0 2px' }}>{s.value}</p>
                    <p style={{ fontSize: 11, color: '#888', margin: '0 0 1px' }}>{s.label}</p>
                    <p style={{ fontSize: 10, color: '#555', margin: 0 }}>{s.sub}</p>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                          gap: 8, marginBottom: 16 }}>
              {[
                { n:'01', t:'Apply in 2 min',     d:'Spring 2026 grads only' },
                { n:'02', t:'Get your link',      d:'unmomentoprints.com/you' },
                { n:'03', t:'Share everywhere',   d:'Bio, group chat, posts' },
                { n:'04', t:'Earn + give back',   d:'10% you · 10% school' },
              ].map(s => (
                <div key={s.n} style={{ background: '#111', borderRadius: 10,
                                        padding: '14px', border: '1px solid #1a1a1a' }}>
                  <p style={{ fontSize: 10, color: '#555', margin: '0 0 6px',
                              letterSpacing: 2 }}>{s.n}</p>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 3px' }}>{s.t}</p>
                  <p style={{ fontSize: 12, color: '#666', margin: 0 }}>{s.d}</p>
                </div>
              ))}
            </div>
            <a href="/creator/signup" style={{
              display: 'inline-block', padding: '10px 20px',
              background: '#4ADE80', color: '#000', borderRadius: 8,
              textDecoration: 'none', fontSize: 13, fontWeight: 700,
            }}>
              Apply to be a creator →
            </a>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid #1a1a1a', marginBottom: 48 }}/>

        {/* Journey 3 — Family/Friend */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12,
                        marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%',
                          background: '#4ADE80', color: '#000',
                          display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: 14,
                          fontWeight: 700, flexShrink: 0 }}>3</div>
            <h3 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>
              Support your grad — every purchase gives back
            </h3>
          </div>
          <div style={{ paddingLeft: 44 }}>
            <p style={{ fontSize: 14, color: '#888', lineHeight: 1.8,
                        margin: '0 0 16px' }}>
              Look up your graduate below, order through their link,
              and 10% of your purchase goes directly to their school's PTSO.
              Each family member orders separately — each purchase
              credits the grad of your choice.
            </p>
            <div style={{ display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                          gap: 8, marginBottom: 16 }}>
              {[
                { icon:'🔍', t:'Find your grad',    d:'Search by name + school below' },
                { icon:'📦', t:'Order your prints',  d:'Your photos, your design'      },
                { icon:'💚', t:'School gets 10%',    d:'Automatic, every purchase'     },
                { icon:'🎓', t:'Grad earns 10%',     d:'Their scholarship fund'        },
              ].map(s => (
                <div key={s.t} style={{ background: '#111', borderRadius: 10,
                                        padding: '14px', border: '1px solid #1a1a1a',
                                        display: 'flex', gap: 10 }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{s.icon}</span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 3px' }}>{s.t}</p>
                    <p style={{ fontSize: 12, color: '#666', margin: 0 }}>{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── QR MEMORY FEATURE ───────────────────────────────── */}
      <section style={{
        padding: '80px 24px',
        background: 'rgba(74,222,128,0.04)',
        borderTop: '1px solid #1a1a1a',
        borderBottom: '1px solid #1a1a1a',
      }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: '#4ADE80', letterSpacing: 4,
                      textTransform: 'uppercase', margin: '0 0 16px',
                      fontWeight: 500 }}>
            The QR memory clip
          </p>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 500,
                       margin: '0 0 20px', letterSpacing: '-0.01em' }}>
            What if your graduation photo could talk?
          </h2>
          <p style={{ fontSize: 16, color: '#888', lineHeight: 1.8,
                      margin: '0 0 40px', maxWidth: 560,
                      marginLeft: 'auto', marginRight: 'auto' }}>
            Every print includes a QR code on the face — scannable
            from inside a frame, forever. Record a message to your
            future self. Hear it at your 1-year, 5-year, 10-year
            anniversary. It never expires.
          </p>
          <div style={{ display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))',
                        gap: 12, marginBottom: 40 }}>
            {[
              { year: '1 year',  text: 'The year after graduation — what changed?'     },
              { year: '5 years', text: 'Half a decade later — did you keep your word?'  },
              { year: '10 years',text: 'A decade on — your past self speaks.'           },
              { year: 'Forever', text: 'Your family scans it long after you\'re gone.'  },
            ].map(s => (
              <div key={s.year} style={{ background: '#111', borderRadius: 10,
                                         padding: '16px', border: '1px solid #1a1a1a',
                                         textAlign: 'left' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#4ADE80',
                            margin: '0 0 6px' }}>{s.year}</p>
                <p style={{ fontSize: 12, color: '#666', margin: 0,
                            lineHeight: 1.6 }}>{s.text}</p>
              </div>
            ))}
          </div>
          <a href="/event/grad-2026" style={{
            display: 'inline-block', padding: '14px 28px',
            background: '#fff', color: '#000', borderRadius: 10,
            textDecoration: 'none', fontWeight: 700, fontSize: 15,
          }}>
            Add a QR memory clip →
          </a>
        </div>
      </section>

      {/* ── CREATOR SEARCH ──────────────────────────────────── */}
      <section style={{ padding: '80px 24px', maxWidth: 600, margin: '0 auto' }}
        id="find-your-grad">
        <p style={{ fontSize: 11, color: '#4ADE80', letterSpacing: 4,
                    textTransform: 'uppercase', margin: '0 0 16px',
                    textAlign: 'center', fontWeight: 500 }}>
          Find your grad
        </p>
        <h2 style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 500,
                     textAlign: 'center', margin: '0 0 8px',
                     letterSpacing: '-0.01em' }}>
          Search by name and school
        </h2>
        <p style={{ fontSize: 14, color: '#888', textAlign: 'center',
                    margin: '0 0 28px', lineHeight: 1.7 }}>
          Order through their link and 10% goes to their school automatically.
          Each family member searches and orders separately.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8,
                      marginBottom: 12 }}>
          <input style={inp}
            placeholder="Grad's name or handle…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchCreators()}
          />
          <input style={inp}
            placeholder="School name (optional — helps narrow results)"
            value={school}
            onChange={e => setSchool(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchCreators()}
          />
          <button onClick={searchCreators} disabled={!query || searching} style={{
            width: '100%', padding: 13,
            background: !query || searching ? '#1a1a1a' : '#4ADE80',
            color:      !query || searching ? '#555'    : '#000',
            border: '1px solid ' + (!query || searching ? '#333' : '#4ADE80'),
            borderRadius: 10, fontSize: 14, fontWeight: 700,
            cursor: !query || searching ? 'not-allowed' : 'pointer',
          }}>
            {searching ? 'Searching…' : 'Search'}
          </button>
        </div>

        {searched && !searching && results.length === 0 && (
          <div style={{ background: '#111', borderRadius: 10, padding: '20px',
                        textAlign: 'center', border: '1px solid #1a1a1a',
                        marginBottom: 16 }}>
            <p style={{ color: '#555', fontSize: 13, margin: '0 0 8px' }}>
              No creators found for "{query}"{school ? ` at ${school}` : ''}.
            </p>
            <p style={{ color: '#444', fontSize: 12, margin: '0 0 12px' }}>
              Ask them to sign up at unmomentoprints.com/creator/signup
            </p>
            <a href={`/event/grad-2026`} style={{
              display: 'inline-block', padding: '8px 16px',
              background: '#4ADE80', color: '#000', borderRadius: 7,
              textDecoration: 'none', fontSize: 12, fontWeight: 700,
            }}>
              Order anyway → donation goes to general fund
            </a>
          </div>
        )}

        {results.length > 0 && (
          <div>
            <p style={{ fontSize: 11, color: '#666', margin: '0 0 8px' }}>
              {results.length} result{results.length !== 1 ? 's' : ''} — tap to order through their link
            </p>
            {results.map(c => (
              <a key={c.handle}
                href={`/${c.handle}`}
                style={{ textDecoration: 'none' }}>
                <div style={{
                  background: '#111', borderRadius: 10,
                  padding: '14px 16px', marginBottom: 6,
                  border: '1px solid #1a1a1a', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', gap: 10,
                  transition: 'border-color .15s',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 14,
                                margin: '0 0 3px', color: '#fff',
                                display: 'flex', alignItems: 'center', gap: 6 }}>
                      {c.display_name}
                      {c.is_verified && (
                        <span style={{ fontSize: 10, background: '#4ADE80',
                                       color: '#000', padding: '1px 5px',
                                       borderRadius: 4, fontWeight: 700 }}>✓</span>
                      )}
                    </p>
                    <p style={{ fontSize: 12, color: '#888', margin: '0 0 2px',
                                overflow: 'hidden', textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap' }}>
                      {c.school_name}
                      {c.graduation_year ? ` · Class of ${c.graduation_year}` : ''}
                    </p>
                    <p style={{ fontSize: 11, color: '#444', margin: 0,
                                fontFamily: 'monospace' }}>
                      {c.handle}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {c.total_donated > 0 && (
                      <p style={{ fontSize: 12, color: '#4ADE80', margin: '0 0 2px' }}>
                        {new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(c.total_donated)} raised
                      </p>
                    )}
                    <p style={{ fontSize: 12, color: '#555', margin: 0 }}>
                      Order through link →
                    </p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <p style={{ fontSize: 12, color: '#444', margin: '0 0 8px' }}>
            Supporting multiple grads? Search and order separately for each one.
          </p>
          <a href="/event/grad-2026" style={{
            fontSize: 13, color: '#666',
            textDecoration: 'none', borderBottom: '1px solid #333',
          }}>
            Or order without a creator link →
          </a>
        </div>
      </section>

      {/* ── BUNDLES PREVIEW ─────────────────────────────────── */}
      <section style={{
        padding: '80px 24px',
        background: '#050505',
        borderTop: '1px solid #1a1a1a',
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <p style={{ fontSize: 11, color: '#4ADE80', letterSpacing: 4,
                      textTransform: 'uppercase', margin: '0 0 16px',
                      textAlign: 'center', fontWeight: 500 }}>
            What you get
          </p>
          <h2 style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 500,
                       textAlign: 'center', margin: '0 0 40px',
                       letterSpacing: '-0.01em' }}>
            Four bundles. One unforgettable moment.
          </h2>
          <div style={{ display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))',
                        gap: 10 }}>
            {[
              { name:'Momento Essential', price:'$18', items:'Photo print + QR code',             popular:false },
              { name:'Momento Classic',   price:'$28', items:'Print + sticker sheet + QR',        popular:true  },
              { name:'Momento Bundle',    price:'$45', items:'Print + stickers + button + jacket', popular:false },
              { name:'Momento Signature', price:'$58', items:'Everything + marker + QR video',    popular:false },
            ].map(b => (
              <div key={b.name} style={{
                background: b.popular ? '#0d1f0d' : '#111',
                borderRadius: 12, padding: '20px 16px',
                border: b.popular ? '1px solid rgba(74,222,128,0.3)' : '1px solid #1a1a1a',
                position: 'relative',
              }}>
                {b.popular && (
                  <span style={{ position: 'absolute', top: -10, left: 12,
                                 background: '#4ADE80', color: '#000',
                                 fontSize: 10, fontWeight: 700,
                                 padding: '2px 8px', borderRadius: 10 }}>
                    MOST POPULAR
                  </span>
                )}
                <p style={{ fontSize: 22, fontWeight: 600,
                            color: b.popular ? '#4ADE80' : '#fff',
                            margin: '0 0 6px' }}>{b.price}</p>
                <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 6px' }}>{b.name}</p>
                <p style={{ fontSize: 12, color: '#666', margin: '0 0 14px',
                            lineHeight: 1.5 }}>{b.items}</p>
                <a href="/event/grad-2026" style={{
                  display: 'block', padding: '8px',
                  background: b.popular ? '#4ADE80' : 'transparent',
                  color: b.popular ? '#000' : '#888',
                  border: b.popular ? 'none' : '1px solid #333',
                  borderRadius: 7, textDecoration: 'none',
                  fontSize: 12, fontWeight: 600, textAlign: 'center',
                }}>
                  Order →
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer style={{
        padding: '48px 24px',
        borderTop: '1px solid #1a1a1a',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 13, color: '#555', margin: '0 0 12px' }}>
          Un Momento Prints · California · Wisconsin · Ships nationwide
        </p>
        <p style={{ fontSize: 12, color: '#444', margin: '0 0 16px' }}>
          <a href="/event/grad-2026"    style={{ color:'#666', textDecoration:'none', marginRight:16 }}>Order</a>
          <a href="/creator/signup"     style={{ color:'#666', textDecoration:'none', marginRight:16 }}>Become a creator</a>
          <a href="/creator/dashboard"  style={{ color:'#666', textDecoration:'none', marginRight:16 }}>Creator dashboard</a>
          <a href="mailto:ceojess@unmomentoprints.com" style={{ color:'#666', textDecoration:'none' }}>Contact</a>
        </p>
        <p style={{ fontSize: 11, color: '#333', margin: 0 }}>
          © 2026 Un Momento Prints · The moments that matter most deserve to exist in the real world.
        </p>
      </footer>

    </main>
  );
}