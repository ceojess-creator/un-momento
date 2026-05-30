'use client';
import { useState } from 'react';

const EVENT_TYPES = [
  {
    id:       'wedding',
    emoji:    '💍',
    name:     'Wedding',
    desc:     'Photo prints, guest memory clips, and custom keepsakes for your big day.',
    popular:  true,
    items:    ['Photo prints for each table','Guest QR memory messages to the couple','Die-cut sticker favors','Custom buttons with wedding photo','Instant prints at the reception'],
  },
  {
    id:       'quinceanera',
    emoji:    '👑',
    name:     'Quinceañera',
    desc:     'Capture every moment of this milestone celebration with instant keepsakes.',
    popular:  false,
    items:    ['Instant 4×6 photo prints','Die-cut sticker sheets','Custom buttons with court photos','QR memory clips from guests','Photo collage prints'],
  },
  {
    id:       'birthday',
    emoji:    '🎂',
    name:     'Birthday Party',
    desc:     'Photo prints, sticker favors, and memory clips for any milestone birthday.',
    popular:  false,
    items:    ['Instant photo prints','Die-cut sticker sheets','Custom buttons','Guest QR memory messages','Sweet 16, 18th, 21st, 30th, 50th+'],
  },
  {
    id:       'baby_shower',
    emoji:    '🍼',
    name:     'Baby Shower',
    desc:     'Keepsake prints and memory clips to welcome the newest addition.',
    popular:  false,
    items:    ['Photo prints for guests','Custom sticker sheets','Guest QR video messages to baby','Announcement prints','Milestone memory books'],
  },
  {
    id:       'corporate',
    emoji:    '🏢',
    name:     'Corporate Event',
    desc:     'Headshots, team photos, and branded keepsakes for your next company event.',
    popular:  false,
    items:    ['Professional headshot prints','Team photo collages','Branded sticker sheets','Event keepsake prints','LinkedIn-ready photo station'],
  },
  {
    id:       'reunion',
    emoji:    '🤝',
    name:     'Family Reunion',
    desc:     'Capture family moments and send everyone home with a keepsake.',
    popular:  false,
    items:    ['Family photo prints','Group collage prints','Custom buttons with family crest','QR memory clips from relatives','Reunion sticker sheets'],
  },
];

const PACKAGES = [
  {
    id:     'essentials',
    name:   'Essentials',
    price:  '$299',
    desc:   'Perfect for intimate gatherings up to 50 guests',
    items:  ['2-hour booth setup','Up to 50 photo prints','1 sticker sheet design','Setup + breakdown included','Digital files via QR'],
  },
  {
    id:     'signature',
    name:   'Signature',
    price:  '$549',
    desc:   'Our most popular package for events up to 150 guests',
    items:  ['4-hour booth setup','Up to 150 photo prints','3 sticker sheet designs','Custom button station','Guest QR memory clips','Setup + breakdown included'],
    popular: true,
  },
  {
    id:     'grand',
    name:   'Grand',
    price:  '$999',
    desc:   'Full experience for events up to 300 guests',
    items:  ['6-hour booth setup','Unlimited photo prints','5 sticker sheet designs','Custom button + magnet station','Guest QR memory clips','1 Design Assistant on-site','Setup + breakdown included','Same-day digital gallery'],
  },
  {
    id:     'custom',
    name:   'Custom',
    price:  'Contact us',
    desc:   'For large events, multi-day bookings, or special requirements',
    items:  ['Tailored to your needs','Multiple booth stations','Corporate branding available','Multi-day events welcome','International available'],
  },
];

export default function EventsPage() {
  const [selectedType,    setSelectedType]    = useState<string|null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string|null>(null);
  const [step,            setStep]            = useState<'type'|'package'|'form'|'done'>('type');
  const [loading,         setLoading]         = useState(false);
  const [form,            setForm]            = useState({
    name:        '',
    email:       '',
    phone:       '',
    event_date:  '',
    venue_name:  '',
    venue_city:  '',
    venue_state: '',
    guest_count: '',
    notes:       '',
  });

  function setField(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      const res = await fetch('/api/booking', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          event_type:    selectedType,
          package_id:    selectedPackage,
          campaign_slug: 'events-2026',
        }),
      });
      if (res.ok) setStep('done');
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  const inp = {
    width: '100%', padding: '10px 12px',
    background: '#1a1a1a', border: '1px solid #333',
    borderRadius: 8, color: '#fff', fontSize: 14,
    outline: 'none', boxSizing: 'border-box' as const,
  };

  const selectedEventType    = EVENT_TYPES.find(e => e.id === selectedType);
  const selectedPackageData  = PACKAGES.find(p => p.id === selectedPackage);

  if (step === 'done') {
    return (
      <main style={{
        minHeight: '100vh', background: '#0a0a0a', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      }}>
        <div style={{ maxWidth: 480, textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: '#0d1f0d', border: '2px solid #4ADE80',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', fontSize: 28,
          }}>✓</div>
          <h1 style={{ fontSize: 24, fontWeight: 500, margin: '0 0 12px' }}>
            Request received!
          </h1>
          <p style={{ color: '#888', fontSize: 14, lineHeight: 1.7,
                      margin: '0 0 24px' }}>
            Thank you for your interest in Un Momento Prints for your{' '}
            {selectedEventType?.name.toLowerCase()}. We'll reach out within
            24 hours to confirm availability and details.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <a href="/" style={{
              padding: '12px 20px', background: '#4ADE80', color: '#000',
              borderRadius: 8, textDecoration: 'none',
              fontWeight: 700, fontSize: 14,
            }}>← Home</a>
            <a href="/event/grad-2026" style={{
              padding: '12px 20px', border: '1px solid #333', color: '#fff',
              borderRadius: 8, textDecoration: 'none', fontSize: 14,
            }}>Order prints online →</a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{
      minHeight: '100vh', background: '#0a0a0a', color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      padding: '0 0 48px',
    }}>

      {/* Hero */}
      <section style={{
        padding: '64px 24px 48px', textAlign: 'center',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(74,222,128,0.07) 0%, transparent 70%)',
        borderBottom: '1px solid #1a1a1a',
      }}>
        <p style={{ fontSize: 11, color: '#4ADE80', letterSpacing: 5,
                    textTransform: 'uppercase', margin: '0 0 16px',
                    fontWeight: 500 }}>
          Un Momento Prints
        </p>
        <h1 style={{
          fontSize: 'clamp(28px, 6vw, 52px)', fontWeight: 500,
          lineHeight: 1.1, maxWidth: 640, margin: '0 auto 20px',
          letterSpacing: '-0.02em',
        }}>
          Every moment deserves to exist in the real world.
        </h1>
        <p style={{
          fontSize: 'clamp(15px, 2vw, 18px)', color: '#888',
          maxWidth: 500, margin: '0 auto 32px', lineHeight: 1.7,
        }}>
          Instant photo prints, die-cut stickers, custom buttons, and
          QR memory clips — brought to your event, anywhere.
        </p>
        <a href="#book" style={{
          display: 'inline-block', padding: '13px 28px',
          background: '#fff', color: '#000', borderRadius: 10,
          textDecoration: 'none', fontWeight: 700, fontSize: 15,
        }}>
          Book your event →
        </a>
      </section>

      {/* Progress steps */}
      <div style={{
        display: 'flex', gap: 4, padding: '16px 20px',
        maxWidth: 640, margin: '0 auto',
      }}>
        {[
          { id:'type',    label:'Event type' },
          { id:'package', label:'Package'    },
          { id:'form',    label:'Details'    },
        ].map((s, i) => {
          const steps  = ['type','package','form'];
          const active = steps.indexOf(step);
          const mine   = steps.indexOf(s.id);
          return (
            <div key={s.id} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                height: 3, borderRadius: 2, marginBottom: 4,
                background: mine <= active ? '#4ADE80' : '#222',
              }}/>
              <span style={{
                fontSize: 10,
                color: mine === active ? '#fff' : mine < active ? '#4ADE80' : '#444',
              }}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 16px' }}
        id="book">

        {/* STEP 1 — Event type */}
        {step === 'type' && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 6px' }}>
              What type of event?
            </h2>
            <p style={{ fontSize: 13, color: '#888', margin: '0 0 20px' }}>
              We bring the booth to you — anywhere in the US.
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))',
              gap: 10, marginBottom: 20,
            }}>
              {EVENT_TYPES.map(e => (
                <div key={e.id}
                  onClick={() => setSelectedType(e.id)}
                  style={{
                    background: selectedType === e.id ? '#0d1f0d' : '#111',
                    border: `${selectedType === e.id ? '2px' : '1px'} solid ${selectedType === e.id ? '#4ADE80' : '#222'}`,
                    borderRadius: 12, padding: '16px',
                    cursor: 'pointer', position: 'relative',
                  }}>
                  {e.popular && (
                    <span style={{
                      position: 'absolute', top: -10, left: 12,
                      background: '#4ADE80', color: '#000',
                      fontSize: 10, fontWeight: 700,
                      padding: '2px 8px', borderRadius: 10,
                    }}>POPULAR</span>
                  )}
                  <p style={{ fontSize: 24, margin: '0 0 8px' }}>{e.emoji}</p>
                  <p style={{ fontWeight: 600, fontSize: 14, margin: '0 0 4px' }}>
                    {e.name}
                  </p>
                  <p style={{ fontSize: 12, color: '#666', margin: '0 0 10px',
                              lineHeight: 1.5 }}>
                    {e.desc}
                  </p>
                  <ul style={{ paddingLeft: 16, margin: 0 }}>
                    {e.items.slice(0,3).map(item => (
                      <li key={item} style={{ fontSize: 11, color: '#555',
                                             marginBottom: 2 }}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <button
              onClick={() => selectedType && setStep('package')}
              disabled={!selectedType}
              style={{
                width: '100%', padding: 14,
                background: selectedType ? '#4ADE80' : '#333',
                color:      selectedType ? '#000'    : '#888',
                border: 'none', borderRadius: 10,
                fontSize: 15, fontWeight: 700,
                cursor: selectedType ? 'pointer' : 'not-allowed',
              }}>
              {selectedType
                ? `Continue with ${selectedEventType?.name} →`
                : 'Select an event type to continue'}
            </button>
          </div>
        )}

        {/* STEP 2 — Package */}
        {step === 'package' && (
          <div>
            <button onClick={() => setStep('type')} style={{
              background: 'transparent', border: 'none', color: '#666',
              fontSize: 13, cursor: 'pointer', padding: '0 0 16px',
            }}>
              ← Back
            </button>
            <h2 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 6px' }}>
              Choose your package
            </h2>
            <p style={{ fontSize: 13, color: '#888', margin: '0 0 20px' }}>
              All packages include setup, breakdown, and onsite printing.
            </p>

            {PACKAGES.map(pkg => (
              <div key={pkg.id}
                onClick={() => setSelectedPackage(pkg.id)}
                style={{
                  background: selectedPackage === pkg.id ? '#0d1f0d' : '#111',
                  border: `${selectedPackage === pkg.id ? '2px' : '1px'} solid ${selectedPackage === pkg.id ? '#4ADE80' : '#222'}`,
                  borderRadius: 12, padding: '16px', marginBottom: 10,
                  cursor: 'pointer', position: 'relative',
                }}>
                {pkg.popular && (
                  <span style={{
                    position: 'absolute', top: -10, left: 12,
                    background: '#4ADE80', color: '#000',
                    fontSize: 10, fontWeight: 700,
                    padding: '2px 8px', borderRadius: 10,
                  }}>MOST POPULAR</span>
                )}
                <div style={{ display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: 15,
                                margin: '0 0 3px' }}>{pkg.name}</p>
                    <p style={{ fontSize: 12, color: '#888',
                                margin: '0 0 10px' }}>{pkg.desc}</p>
                    <ul style={{ paddingLeft: 16, margin: 0 }}>
                      {pkg.items.map(item => (
                        <li key={item} style={{ fontSize: 12, color: '#666',
                                               marginBottom: 2 }}>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p style={{ fontSize: 22, fontWeight: 700,
                              margin: 0, flexShrink: 0,
                              color: selectedPackage === pkg.id ? '#4ADE80' : '#fff' }}>
                    {pkg.price}
                  </p>
                </div>
              </div>
            ))}

            <button
              onClick={() => selectedPackage && setStep('form')}
              disabled={!selectedPackage}
              style={{
                width: '100%', padding: 14, marginTop: 8,
                background: selectedPackage ? '#4ADE80' : '#333',
                color:      selectedPackage ? '#000'    : '#888',
                border: 'none', borderRadius: 10,
                fontSize: 15, fontWeight: 700,
                cursor: selectedPackage ? 'pointer' : 'not-allowed',
              }}>
              {selectedPackage
                ? `Continue with ${selectedPackageData?.name} →`
                : 'Select a package to continue'}
            </button>
          </div>
        )}

        {/* STEP 3 — Form */}
        {step === 'form' && (
          <div>
            <button onClick={() => setStep('package')} style={{
              background: 'transparent', border: 'none', color: '#666',
              fontSize: 13, cursor: 'pointer', padding: '0 0 16px',
            }}>
              ← Back
            </button>
            <h2 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 4px' }}>
              Tell us about your event
            </h2>
            <p style={{ fontSize: 13, color: '#888', margin: '0 0 20px' }}>
              {selectedEventType?.emoji} {selectedEventType?.name} ·{' '}
              {selectedPackageData?.name} ({selectedPackageData?.price})
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              <div style={{ display: 'grid',
                            gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <p style={{ fontSize: 11, color: '#666',
                              margin: '0 0 5px' }}>Your name *</p>
                  <input style={inp} placeholder="Full name"
                    value={form.name}
                    onChange={e => setField('name', e.target.value)} />
                </div>
                <div>
                  <p style={{ fontSize: 11, color: '#666',
                              margin: '0 0 5px' }}>Phone *</p>
                  <input style={inp} placeholder="+1 (555) 000-0000" type="tel"
                    value={form.phone}
                    onChange={e => setField('phone', e.target.value)} />
                </div>
              </div>

              <div>
                <p style={{ fontSize: 11, color: '#666',
                            margin: '0 0 5px' }}>Email address *</p>
                <input style={inp} placeholder="your@email.com" type="email"
                  value={form.email}
                  onChange={e => setField('email', e.target.value)} />
              </div>

              <div>
                <p style={{ fontSize: 11, color: '#666',
                            margin: '0 0 5px' }}>Event date *</p>
                <input style={inp} type="date"
                  value={form.event_date}
                  onChange={e => setField('event_date', e.target.value)} />
              </div>

              <div>
                <p style={{ fontSize: 11, color: '#666',
                            margin: '0 0 5px' }}>Venue name *</p>
                <input style={inp} placeholder="The Grand Ballroom"
                  value={form.venue_name}
                  onChange={e => setField('venue_name', e.target.value)} />
              </div>

              <div style={{ display: 'grid',
                            gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                <div>
                  <p style={{ fontSize: 11, color: '#666',
                              margin: '0 0 5px' }}>City *</p>
                  <input style={inp} placeholder="Los Angeles"
                    value={form.venue_city}
                    onChange={e => setField('venue_city', e.target.value)} />
                </div>
                <div>
                  <p style={{ fontSize: 11, color: '#666',
                              margin: '0 0 5px' }}>State *</p>
                  <input style={inp} placeholder="CA"
                    value={form.venue_state}
                    onChange={e => setField('venue_state', e.target.value)} />
                </div>
              </div>

              <div>
                <p style={{ fontSize: 11, color: '#666',
                            margin: '0 0 5px' }}>Expected guest count</p>
                <input style={inp} placeholder="e.g. 150" type="number"
                  value={form.guest_count}
                  onChange={e => setField('guest_count', e.target.value)} />
              </div>

              <div>
                <p style={{ fontSize: 11, color: '#666',
                            margin: '0 0 5px' }}>
                  Additional notes (optional)
                </p>
                <textarea
                  style={{ ...inp, height: 80, resize: 'vertical' } as any}
                  placeholder="Theme, special requests, questions…"
                  value={form.notes}
                  onChange={e => setField('notes', e.target.value)}
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || !form.name || !form.email ||
                          !form.phone || !form.event_date ||
                          !form.venue_name || !form.venue_city}
                style={{
                  width: '100%', padding: 14,
                  background: (!form.name || !form.email || !form.phone ||
                    !form.event_date || !form.venue_name || !form.venue_city || loading)
                    ? '#333' : '#4ADE80',
                  color: (!form.name || !form.email || !form.phone ||
                    !form.event_date || !form.venue_name || !form.venue_city || loading)
                    ? '#888' : '#000',
                  border: 'none', borderRadius: 10,
                  fontSize: 15, fontWeight: 700,
                  cursor: loading ? 'wait' : 'pointer',
                }}>
                {loading ? 'Submitting…' : 'Request booking →'}
              </button>

              <p style={{ fontSize: 11, color: '#444', textAlign: 'center',
                          lineHeight: 1.6, margin: 0 }}>
                No payment required to request. We'll confirm availability
                and send a deposit invoice within 24 hours.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* How it works */}
      {step === 'type' && (
        <section style={{
          padding: '64px 24px', maxWidth: 700, margin: '0 auto',
        }}>
          <h2 style={{ fontSize: 'clamp(20px,3vw,28px)', fontWeight: 500,
                       textAlign: 'center', margin: '0 0 40px',
                       letterSpacing: '-0.01em' }}>
            How it works
          </h2>
          <div style={{ display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))',
                        gap: 12 }}>
            {[
              { n:'01', t:'Book online',     d:'Choose your event type and package. No deposit until confirmed.' },
              { n:'02', t:'We set up',       d:'Our team arrives early to set up the booth before your guests arrive.' },
              { n:'03', t:'Guests create',   d:'Guests use our design studio to create custom prints and record memory clips.' },
              { n:'04', t:'Instant prints',  d:'Photos, stickers, and buttons printed on-site in under 2 minutes.' },
              { n:'05', t:'QR memories',     d:'Every print gets a QR code. Guests record a message — it lives forever.' },
              { n:'06', t:'We break down',   d:'We pack up and leave your venue spotless. You keep the memories.' },
            ].map(s => (
              <div key={s.n} style={{
                background: '#111', borderRadius: 10, padding: '16px',
                border: '1px solid #1a1a1a',
              }}>
                <p style={{ fontSize: 10, color: '#555', margin: '0 0 6px',
                            letterSpacing: 2 }}>{s.n}</p>
                <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 6px' }}>
                  {s.t}
                </p>
                <p style={{ fontSize: 12, color: '#666', margin: 0,
                            lineHeight: 1.6 }}>
                  {s.d}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

    </main>
  );
}