'use client';
import { useState, useEffect } from 'react';
import CollageEditor from '@/app/components/CollageEditor';
import MemoryRecorder from '@/app/components/MediaRecorder';

const BUNDLES = [
  {
    id: 'essential', name: 'Momento Essential', price: 18,
    desc: 'Instant 4×6 photo print + QR memory code',
    includes: ['4×6 photo print', 'QR code on print face', 'Ships in 4–5 days'],
    popular: false, hasSticker: false,
  },
  {
    id: 'classic', name: 'Momento Classic', price: 28,
    desc: 'Photo print + die-cut sticker sheet + QR memory code',
    includes: ['4×6 photo print', 'Die-cut 4×7 sticker sheet',
               'QR code on print face', 'Ships in 4–5 days'],
    popular: true, hasSticker: true,
  },
  {
    id: 'bundle', name: 'Momento Bundle', price: 45,
    desc: 'Photo + stickers + button + card jacket + QR clip',
    includes: ['4×6 photo print', 'Die-cut 4×7 sticker sheet',
               'Custom button or magnet', 'Black card jacket',
               'QR code on print face', 'Ships in 4–5 days'],
    popular: false, hasSticker: true,
  },
  {
    id: 'signature', name: 'Momento Signature', price: 58,
    desc: 'The complete graduation keepsake experience',
    includes: ['4×6 photo print', 'Die-cut 4×7 sticker sheet',
               'Custom button or magnet', 'Black card jacket',
               'Metallic marker', 'QR video memory upgrade',
               'Ships in 4–5 days'],
    popular: false, hasSticker: true,
  },
];

const ADDONS = [
  { id: 'qr_video',        name: 'QR Video Memory Upgrade', price: 10 },
  { id: 'card_jacket',     name: 'Black Card Jacket',        price: 5  },
  { id: 'metallic_marker', name: 'Metallic Marker',          price: 4  },
  { id: 'oil_marker',      name: 'Oil-Based Marker',         price: 4  },
  { id: 'extra_print',     name: 'Extra Photo Print',        price: 10 },
  { id: 'extra_sticker',   name: 'Extra Sticker Sheet',      price: 12 },
];

type Step = 'bundle' | 'media' | 'design' | 'fulfillment' | 'details' | 'review';

export default function GradEventPage() {
  const [step,        setStep]        = useState<Step>('bundle');
  const [bundle,      setBundle]      = useState<string | null>(null);
  const [addons,      setAddons]      = useState<string[]>([]);
  const [mediaFile,   setMediaFile]   = useState<File | null>(null);
  const [mediaType,   setMediaType]   = useState<'video'|'audio'|null>(null);
  const [editorState, setEditorState] = useState<any>(null);
  const [fulfillment, setFulfillment] = useState<'ship'|'pickup'>('ship');
  const [boothActive, setBoothActive] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [form,        setForm]        = useState({
    name: '', email: '', phone: '',
    address: '', city: '', state: '', zip: '',
    grad_name: '', school: '',
  });

  const selectedBundle = BUNDLES.find(b => b.id === bundle);
  const addonTotal     = addons.reduce((sum, id) => {
    const a = ADDONS.find(x => x.id === id);
    return sum + (a?.price || 0);
  }, 0);
  const total = (selectedBundle?.price || 0) + addonTotal;

  useEffect(() => {
    fetch('/api/event/booth-check?slug=grad-2026')
      .then(r => r.json())
      .then(d => setBoothActive(d.booth_active || false))
      .catch(() => {});
  }, []);

  function toggleAddon(id: string) {
    setAddons(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  function setField(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function handleCheckout() {
    setLoading(true);
    try {
      let mediaUrl = null;
      if (mediaFile) {
        const fd = new FormData();
        fd.append('file', mediaFile);
        fd.append('folder', 'memory-clips');
        const res  = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = await res.json();
        mediaUrl   = data.url;
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bundle_id:        bundle,
          addons,
          form,
          total,
          event_slug:       'grad-2026',
          fulfillment_type: fulfillment,
          media_url:        mediaUrl,
          media_type:       mediaType,
          editor_state:     editorState,
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px',
    background: '#1a1a1a', border: '1px solid #333',
    borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none',
  };

  const STEPS: Step[] = ['bundle','media','design','fulfillment','details','review'];
  const stepIndex = STEPS.indexOf(step);
  const stepLabels = ['Bundle','Memory','Design','Delivery','Details','Review'];

  return (
    <main style={{
      minHeight: '100vh', background: '#0a0a0a', color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      padding: '24px 16px 48px',
    }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <p style={{ fontSize: 11, color: '#555', letterSpacing: 4,
                      textTransform: 'uppercase', margin: '0 0 8px' }}>
            Un Momento Prints
          </p>
          <h1 style={{ fontSize: 24, fontWeight: 500, margin: '0 0 4px' }}>
            Graduation Season 2026
          </h1>
          <p style={{ fontSize: 13, color: '#888', margin: 0 }}>
            Order online · ships anywhere in the US in 4–5 days
          </p>
        </div>

        {/* Step progress */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
          {stepLabels.map((s, i) => (
            <div key={s} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                height: 4, borderRadius: 2, marginBottom: 4,
                background: i < stepIndex
                  ? '#4ADE80' : i === stepIndex ? '#fff' : '#333',
              }}/>
              <span style={{ fontSize: 9,
                             color: i === stepIndex ? '#fff' : '#444' }}>
                {s}
              </span>
            </div>
          ))}
        </div>

        {/* STEP 1 — Bundle */}
        {step === 'bundle' && (
          <div>
            {BUNDLES.map(b => (
              <div key={b.id} onClick={() => setBundle(b.id)}
                style={{
                  border: bundle === b.id
                    ? '2px solid #4ADE80' : '1px solid #222',
                  borderRadius: 12, padding: '1rem', marginBottom: 10,
                  cursor: 'pointer',
                  background: bundle === b.id ? '#0d1f0d' : '#111',
                  position: 'relative',
                }}
              >
                {b.popular && (
                  <span style={{
                    position: 'absolute', top: -10, left: 12,
                    background: '#4ADE80', color: '#000',
                    fontSize: 10, fontWeight: 700,
                    padding: '2px 8px', borderRadius: 10,
                  }}>
                    MOST POPULAR
                  </span>
                )}
                <div style={{ display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 15,
                                margin: '0 0 4px' }}>{b.name}</p>
                    <p style={{ fontSize: 13, color: '#888',
                                margin: '0 0 8px' }}>{b.desc}</p>
                    <ul style={{ paddingLeft: 16, margin: 0 }}>
                      {b.includes.map(item => (
                        <li key={item} style={{ fontSize: 12,
                                                color: '#666',
                                                marginBottom: 2 }}>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p style={{ fontSize: 22, fontWeight: 700,
                              margin: 0, flexShrink: 0,
                              marginLeft: 16 }}>
                    ${b.price}
                  </p>
                </div>
              </div>
            ))}

            {bundle && (
              <div style={{ marginTop: 16 }}>
                <p style={{ fontSize: 13, color: '#888', marginBottom: 10 }}>
                  Add-ons (optional)
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {ADDONS.map(a => (
                    <button key={a.id} onClick={() => toggleAddon(a.id)}
                      style={{
                        padding: '6px 12px', borderRadius: 20,
                        border: addons.includes(a.id)
                          ? '1px solid #4ADE80' : '1px solid #333',
                        background: addons.includes(a.id)
                          ? '#0d1f0d' : 'transparent',
                        color: addons.includes(a.id) ? '#4ADE80' : '#888',
                        fontSize: 12, cursor: 'pointer',
                      }}>
                      {a.name} +${a.price}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {bundle && (
              <button onClick={() => setStep('media')}
                style={{
                  width: '100%', marginTop: 16, padding: 14,
                  background: '#4ADE80', color: '#000',
                  border: 'none', borderRadius: 10,
                  fontSize: 15, fontWeight: 700, cursor: 'pointer',
                }}>
                Continue — ${total} →
              </button>
            )}
          </div>
        )}

        {/* STEP 2 — Memory clip */}
        {step === 'media' && (
          <div>
            <MemoryRecorder
              onComplete={(file, type) => {
                setMediaFile(file);
                setMediaType(type);
                setStep('design');
              }}
              onSkip={() => setStep('design')}
            />
            <button onClick={() => setStep('bundle')}
              style={{
                marginTop: 8, width: '100%', padding: 10,
                border: '1px solid #333', borderRadius: 10,
                background: 'transparent', color: '#666',
                fontSize: 13, cursor: 'pointer',
              }}>
              ← Back
            </button>
          </div>
        )}

        {/* STEP 3 — Design */}
        {step === 'design' && (
          <div>
            <p style={{ fontSize: 13, color: '#888',
                        margin: '0 0 16px', lineHeight: 1.6 }}>
              Design your 4×6 photo print. Add up to 6 photos,
              text overlays, and choose your QR placement.
            </p>
            <CollageEditor
              defaultGradName={form.grad_name}
              defaultSchool={form.school}
              onComplete={(dataUrl, slots) => {
                setEditorState({ dataUrl, slots });
                setStep('fulfillment');
              }}
              onBack={() => setStep('media')}
            />
          </div>
        )}

        {/* STEP 4 — Fulfillment */}
        {step === 'fulfillment' && (
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 16px' }}>
              How would you like to receive your order?
            </p>

            <div onClick={() => setFulfillment('ship')}
              style={{
                border: fulfillment === 'ship'
                  ? '2px solid #4ADE80' : '1px solid #222',
                borderRadius: 12, padding: '1rem',
                marginBottom: 10, cursor: 'pointer',
                background: fulfillment === 'ship' ? '#0d1f0d' : '#111',
              }}>
              <p style={{ fontWeight: 600, fontSize: 15, margin: '0 0 4px' }}>
                📦 Ship to my door
              </p>
              <p style={{ fontSize: 13, color: '#888', margin: 0 }}>
                Ships anywhere in the US in 4–5 business days via Gelato.
              </p>
            </div>

            {boothActive && (
              <div onClick={() => setFulfillment('pickup')}
                style={{
                  border: fulfillment === 'pickup'
                    ? '2px solid #4ADE80' : '1px solid #222',
                  borderRadius: 12, padding: '1rem',
                  marginBottom: 10, cursor: 'pointer',
                  background: fulfillment === 'pickup' ? '#0d1f0d' : '#111',
                  position: 'relative',
                }}>
                <span style={{
                  position: 'absolute', top: -10, left: 12,
                  background: '#4ADE80', color: '#000',
                  fontSize: 10, fontWeight: 700,
                  padding: '2px 8px', borderRadius: 10,
                }}>
                  AVAILABLE TODAY
                </span>
                <p style={{ fontWeight: 600, fontSize: 15, margin: '0 0 4px' }}>
                  🎪 Pick up at the booth
                </p>
                <p style={{ fontSize: 13, color: '#888', margin: 0 }}>
                  We're set up nearby. Print ready in under 2 minutes.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => setStep('design')}
                style={{
                  flex: 1, padding: 12, border: '1px solid #333',
                  borderRadius: 10, background: 'transparent',
                  color: '#fff', fontSize: 14, cursor: 'pointer',
                }}>
                ← Back
              </button>
              <button onClick={() => setStep('details')}
                style={{
                  flex: 2, padding: 12, background: '#4ADE80',
                  color: '#000', border: 'none', borderRadius: 10,
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* STEP 5 — Details */}
        {step === 'details' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 4px' }}>
              Your information
            </p>
            <input style={inputStyle} placeholder="Full name *"
              value={form.name}
              onChange={e => setField('name', e.target.value)}/>
            <input style={inputStyle} placeholder="Email address *"
              type="email" value={form.email}
              onChange={e => setField('email', e.target.value)}/>
            <input style={inputStyle} placeholder="Phone number"
              value={form.phone}
              onChange={e => setField('phone', e.target.value)}/>
            <input style={inputStyle} placeholder="Graduate's name"
              value={form.grad_name}
              onChange={e => setField('grad_name', e.target.value)}/>
            <input style={inputStyle} placeholder="School name (optional)"
              value={form.school}
              onChange={e => setField('school', e.target.value)}/>

            {fulfillment === 'ship' && (
              <>
                <p style={{ fontWeight: 500, fontSize: 14, margin: '4px 0' }}>
                  Shipping address
                </p>
                <input style={inputStyle} placeholder="Street address *"
                  value={form.address}
                  onChange={e => setField('address', e.target.value)}/>
                <div style={{ display: 'grid',
                              gridTemplateColumns: '2fr 1fr', gap: 8 }}>
                  <input style={inputStyle} placeholder="City *"
                    value={form.city}
                    onChange={e => setField('city', e.target.value)}/>
                  <input style={inputStyle} placeholder="State *"
                    value={form.state}
                    onChange={e => setField('state', e.target.value)}/>
                </div>
                <input style={inputStyle} placeholder="ZIP code *"
                  value={form.zip}
                  onChange={e => setField('zip', e.target.value)}/>
              </>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setStep('fulfillment')}
                style={{
                  flex: 1, padding: 12, border: '1px solid #333',
                  borderRadius: 10, background: 'transparent',
                  color: '#fff', fontSize: 14, cursor: 'pointer',
                }}>
                ← Back
              </button>
              <button
                onClick={() => {
                  const valid = form.name && form.email &&
                    (fulfillment === 'pickup' || (
                      form.address && form.city &&
                      form.state && form.zip));
                  if (valid) setStep('review');
                }}
                style={{
                  flex: 2, padding: 12, background: '#4ADE80',
                  color: '#000', border: 'none', borderRadius: 10,
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}>
                Review order →
              </button>
            </div>
          </div>
        )}

        {/* STEP 6 — Review */}
        {step === 'review' && selectedBundle && (
          <div>
            <div style={{
              background: '#111', borderRadius: 12,
              padding: '1rem', marginBottom: 16,
            }}>
              <p style={{ fontWeight: 600, fontSize: 15, margin: '0 0 12px' }}>
                Order summary
              </p>
              {[
                ['Bundle',    `${selectedBundle.name} — $${selectedBundle.price}`],
                ...addons.map(id => {
                  const a = ADDONS.find(x => x.id === id);
                  return [a?.name || '', `+$${a?.price}`];
                }),
                ['Memory clip',  mediaFile ? `✓ ${mediaType} recorded` : 'Not recorded'],
                ['Design',       editorState ? '✓ Designed' : 'Not designed'],
                ['Delivery',     fulfillment === 'pickup'
                  ? 'Pick up at booth'
                  : `Ship to ${form.city}, ${form.state}`],
                ['Name',         form.name],
                ['Graduate',     form.grad_name || '—'],
                ['School',       form.school    || '—'],
                ['Email',        form.email],
              ].map(([k, v]) => (
                <div key={k} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '5px 0', borderBottom: '1px solid #222',
                  fontSize: 13,
                }}>
                  <span style={{ color: '#888' }}>{k}</span>
                  <span style={{ color: '#fff', maxWidth: 220,
                                 textAlign: 'right' }}>{v}</span>
                </div>
              ))}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '10px 0 0', fontSize: 16, fontWeight: 700,
              }}>
                <span>Total</span>
                <span style={{ color: '#4ADE80' }}>${total}</span>
              </div>
            </div>

            <p style={{ fontSize: 11, color: '#555',
                        lineHeight: 1.6, margin: '0 0 16px' }}>
              Secure checkout via Stripe. Sales tax calculated at checkout.
            </p>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setStep('details')}
                style={{
                  flex: 1, padding: 12, border: '1px solid #333',
                  borderRadius: 10, background: 'transparent',
                  color: '#fff', fontSize: 14, cursor: 'pointer',
                }}>
                ← Back
              </button>
              <button onClick={handleCheckout} disabled={loading}
                style={{
                  flex: 2, padding: 12,
                  background: loading ? '#333' : '#4ADE80',
                  color: loading ? '#888' : '#000',
                  border: 'none', borderRadius: 10,
                  fontSize: 14, fontWeight: 700,
                  cursor: loading ? 'wait' : 'pointer',
                }}>
                {loading ? 'Opening checkout…' : `Pay $${total} →`}
              </button>
            </div>
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: 11,
                    color: '#333', marginTop: 24 }}>
          © 2026 Un Momento Prints · Ships anywhere in the US
        </p>
      </div>
    </main>
  );
}