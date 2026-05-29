'use client';
import { useState } from 'react';

const BUNDLES = [
  {
    id: 'essential',
    name: 'Momento Essential',
    price: 18,
    description: 'Instant 4×6 photo print + QR memory code',
    includes: ['4×6 photo print', 'QR code on print face', 'Ships in 4–5 days'],
    popular: false,
  },
  {
    id: 'classic',
    name: 'Momento Classic',
    price: 28,
    description: 'Photo print + die-cut sticker sheet + QR memory code',
    includes: ['4×6 photo print', 'Die-cut 4×7 sticker sheet', 'QR code on print face', 'Ships in 4–5 days'],
    popular: true,
  },
  {
    id: 'bundle',
    name: 'Momento Bundle',
    price: 45,
    description: 'Everything in Classic plus a custom button or magnet',
    includes: ['4×6 photo print', 'Die-cut 4×7 sticker sheet', 'Custom button or magnet', 'Black card jacket', 'QR code on print face', 'Ships in 4–5 days'],
    popular: false,
  },
  {
    id: 'signature',
    name: 'Momento Signature',
    price: 58,
    description: 'The complete graduation keepsake experience',
    includes: ['4×6 photo print', 'Die-cut 4×7 sticker sheet', 'Custom button or magnet', 'Black card jacket', 'Metallic marker', 'QR video memory upgrade', 'Ships in 4–5 days'],
    popular: false,
  },
];

const ADDONS = [
  { id: 'qr_video', name: 'QR Video Memory Upgrade', price: 10 },
  { id: 'card_jacket', name: 'Black Card Jacket', price: 5 },
  { id: 'metallic_marker', name: 'Metallic Marker', price: 4 },
  { id: 'oil_marker', name: 'Oil-Based Marker', price: 4 },
  { id: 'extra_print', name: 'Extra Photo Print', price: 10 },
  { id: 'extra_sticker', name: 'Extra Sticker Sheet', price: 12 },
];

export default function GradEventPage() {
  const [selected, setSelected]   = useState<string | null>(null);
  const [addons, setAddons]       = useState<string[]>([]);
  const [step, setStep]           = useState(1);
  const [loading, setLoading]     = useState(false);
  const [form, setForm]           = useState({
    name: '', email: '', phone: '',
    address: '', city: '', state: '', zip: '',
    grad_name: '', school: '', grad_date: '',
    notes: '',
  });

  const set = (k: string, v: string) =>
    setForm(f => ({ ...f, [k]: v }));

  const bundle = BUNDLES.find(b => b.id === selected);

  const addonTotal = addons.reduce((sum, id) => {
    const a = ADDONS.find(x => x.id === id);
    return sum + (a?.price || 0);
  }, 0);

  const total = (bundle?.price || 0) + addonTotal;

  function toggleAddon(id: string) {
    setAddons(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  async function handleCheckout() {
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bundle_id: selected,
          addons,
          form,
          total,
          event_slug: 'grad-2026',
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
    width: '100%',
    padding: '10px 12px',
    background: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: 8,
    color: '#fff',
    fontSize: 14,
    outline: 'none',
  };

  return (
    <main style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      padding: '24px 16px',
    }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <p style={{ fontSize: 12, color: '#666', letterSpacing: 4,
                      textTransform: 'uppercase', margin: '0 0 12px' }}>
            Un Momento Prints
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 500, margin: '0 0 8px' }}>
            Graduation Season 2026
          </h1>
          <p style={{ fontSize: 14, color: '#888', margin: 0, lineHeight: 1.6 }}>
            Order your keepsake. We ship anywhere in the US in 4–5 days.
            The moments that matter most deserve to exist in the real world.
          </p>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          {['Choose bundle', 'Your details', 'Checkout'].map((s, i) => (
            <div key={s} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                height: 4, borderRadius: 2, marginBottom: 6,
                background: step > i + 1
                  ? '#4ADE80'
                  : step === i + 1
                    ? '#fff'
                    : '#333',
              }}/>
              <span style={{
                fontSize: 11,
                color: step === i + 1 ? '#fff' : '#555'
              }}>
                {s}
              </span>
            </div>
          ))}
        </div>

        {/* Step 1 - Choose bundle */}
        {step === 1 && (
          <div>
            {BUNDLES.map(b => (
              <div
                key={b.id}
                onClick={() => setSelected(b.id)}
                style={{
                  border: selected === b.id
                    ? '2px solid #4ADE80'
                    : '1px solid #222',
                  borderRadius: 12,
                  padding: '1rem',
                  marginBottom: 10,
                  cursor: 'pointer',
                  background: selected === b.id ? '#0d1f0d' : '#111',
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
                                margin: '0 0 10px' }}>{b.description}</p>
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
                  <div style={{ textAlign: 'right',
                                flexShrink: 0, marginLeft: 16 }}>
                    <p style={{ fontSize: 22, fontWeight: 600,
                                margin: 0 }}>${b.price}</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Add-ons */}
            {selected && (
              <div style={{ marginTop: 20 }}>
                <p style={{ fontSize: 13, color: '#888',
                            marginBottom: 10 }}>
                  Add-ons (optional)
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {ADDONS.map(a => (
                    <button
                      key={a.id}
                      onClick={() => toggleAddon(a.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 20,
                        border: addons.includes(a.id)
                          ? '1px solid #4ADE80'
                          : '1px solid #333',
                        background: addons.includes(a.id)
                          ? '#0d1f0d' : 'transparent',
                        color: addons.includes(a.id)
                          ? '#4ADE80' : '#888',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      {a.name} +${a.price}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selected && (
              <button
                onClick={() => setStep(2)}
                style={{
                  width: '100%', marginTop: 20,
                  padding: '14px',
                  background: '#4ADE80', color: '#000',
                  border: 'none', borderRadius: 10,
                  fontSize: 15, fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Continue — ${total}
              </button>
            )}
          </div>
        )}

        {/* Step 2 - Details */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontWeight: 500, fontSize: 14,
                        margin: '0 0 4px' }}>
              Your information
            </p>
            <input style={inputStyle} placeholder="Full name *"
              value={form.name}
              onChange={e => set('name', e.target.value)}/>
            <input style={inputStyle} placeholder="Email address *"
              type="email" value={form.email}
              onChange={e => set('email', e.target.value)}/>
            <input style={inputStyle} placeholder="Phone number"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}/>

            <p style={{ fontWeight: 500, fontSize: 14,
                        margin: '8px 0 4px' }}>
              Shipping address
            </p>
            <input style={inputStyle} placeholder="Street address *"
              value={form.address}
              onChange={e => set('address', e.target.value)}/>
            <div style={{ display: 'grid',
                          gridTemplateColumns: '2fr 1fr',
                          gap: 8 }}>
              <input style={inputStyle} placeholder="City *"
                value={form.city}
                onChange={e => set('city', e.target.value)}/>
              <input style={inputStyle} placeholder="State *"
                value={form.state}
                onChange={e => set('state', e.target.value)}/>
            </div>
            <input style={inputStyle} placeholder="ZIP code *"
              value={form.zip}
              onChange={e => set('zip', e.target.value)}/>

            <p style={{ fontWeight: 500, fontSize: 14,
                        margin: '8px 0 4px' }}>
              About your graduation
            </p>
            <input style={inputStyle}
              placeholder="Graduate's name (for print border)"
              value={form.grad_name}
              onChange={e => set('grad_name', e.target.value)}/>
            <input style={inputStyle}
              placeholder="School name (optional)"
              value={form.school}
              onChange={e => set('school', e.target.value)}/>
            <input style={inputStyle}
              placeholder="Graduation date (optional)"
              value={form.grad_date}
              onChange={e => set('grad_date', e.target.value)}/>
            <textarea
              style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
              placeholder="Anything else? (special requests, etc.)"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}/>

            <p style={{ fontSize: 11, color: '#555',
                        margin: '4px 0', lineHeight: 1.6 }}>
              You will upload your photo and video message
              after checkout on the confirmation page.
            </p>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  flex: 1, padding: 12,
                  border: '1px solid #333',
                  borderRadius: 10, background: 'transparent',
                  color: '#fff', fontSize: 14, cursor: 'pointer',
                }}
              >
                ← Back
              </button>
              <button
                onClick={() => {
                  if (form.name && form.email &&
                      form.address && form.city &&
                      form.state && form.zip) {
                    setStep(3);
                  }
                }}
                style={{
                  flex: 2, padding: 12,
                  background: '#4ADE80', color: '#000',
                  border: 'none', borderRadius: 10,
                  fontSize: 14, fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Review order →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 - Review and pay */}
        {step === 3 && bundle && (
          <div>
            <div style={{
              background: '#111', borderRadius: 12,
              padding: '1rem', marginBottom: 16,
            }}>
              <p style={{ fontWeight: 600, fontSize: 15,
                          margin: '0 0 12px' }}>
                Order summary
              </p>
              {[
                ['Bundle', `${bundle.name} — $${bundle.price}`],
                ...addons.map(id => {
                  const a = ADDONS.find(x => x.id === id);
                  return [a?.name || '', `+$${a?.price}`];
                }),
                ['Ship to', `${form.name}, ${form.city} ${form.state}`],
                ['Graduate', form.grad_name || '—'],
              ].map(([k, v]) => (
                <div key={k} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '5px 0',
                  borderBottom: '1px solid #222',
                  fontSize: 13,
                }}>
                  <span style={{ color: '#888' }}>{k}</span>
                  <span>{v}</span>
                </div>
              ))}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 0 0',
                fontSize: 16, fontWeight: 700,
              }}>
                <span>Total</span>
                <span style={{ color: '#4ADE80' }}>${total}</span>
              </div>
            </div>

            <p style={{ fontSize: 11, color: '#555',
                        lineHeight: 1.6, margin: '0 0 16px' }}>
              Secure checkout via Stripe. You will upload your
              photo and video message on the confirmation page.
              Ships anywhere in the US in 4–5 business days.
            </p>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setStep(2)}
                style={{
                  flex: 1, padding: 12,
                  border: '1px solid #333',
                  borderRadius: 10, background: 'transparent',
                  color: '#fff', fontSize: 14, cursor: 'pointer',
                }}
              >
                ← Back
              </button>
              <button
                onClick={handleCheckout}
                disabled={loading}
                style={{
                  flex: 2, padding: 12,
                  background: loading ? '#333' : '#4ADE80',
                  color: loading ? '#888' : '#000',
                  border: 'none', borderRadius: 10,
                  fontSize: 14, fontWeight: 700,
                  cursor: loading ? 'wait' : 'pointer',
                }}
              >
                {loading ? 'Opening checkout…' : `Pay $${total} →`}
              </button>
            </div>
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: 11,
                    color: '#333', marginTop: 32 }}>
          © 2026 Un Momento Prints · Ships anywhere in the US
        </p>
      </div>
    </main>
  );
}