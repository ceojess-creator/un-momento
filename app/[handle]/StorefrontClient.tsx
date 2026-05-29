'use client';
import { useState } from 'react';

const BUNDLES = [
  {
    id: 'essential',
    name: 'Momento Essential',
    price: 18,
    desc: 'Instant 4×6 photo print + QR memory code',
    popular: false,
  },
  {
    id: 'classic',
    name: 'Momento Classic',
    price: 28,
    desc: 'Photo print + die-cut sticker sheet + QR memory code',
    popular: true,
  },
  {
    id: 'bundle',
    name: 'Momento Bundle',
    price: 45,
    desc: 'Photo + stickers + button + card jacket + QR clip',
    popular: false,
  },
  {
    id: 'signature',
    name: 'Momento Signature',
    price: 58,
    desc: 'The complete graduation keepsake experience',
    popular: false,
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

interface Product {
  id: string;
  title: string;
  description: string;
  image_url: string;
  price: number;
  product_type: string;
  order_count: number;
}

interface Profile {
  handle: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  school_id: string;
  graduation_year: number;
  total_earned: number;
  total_donated: number;
}

export default function StorefrontClient({
  profile,
  products,
}: {
  profile: Profile;
  products: Product[];
}) {
  const [tab,         setTab]         = useState<'creator' | 'own'>('creator');
  const [selected,    setSelected]    = useState<string | null>(null);
  const [addons,      setAddons]      = useState<string[]>([]);
  const [orderStep,   setOrderStep]   = useState(1);
  const [loading,     setLoading]     = useState<string | null>(null);
  const [form,        setForm]        = useState({
    name: '', email: '', phone: '',
    address: '', city: '', state: '', zip: '',
    grad_name: '', school: '', notes: '',
  });

  const set = (k: string, v: string) =>
    setForm(f => ({ ...f, [k]: v }));

  const bundle    = BUNDLES.find(b => b.id === selected);
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

  async function handleCreatorOrder(product: Product) {
    setLoading(product.id);
    try {
      const res = await fetch('/api/creator/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id:   product.id,
          creator_id:   profile.handle,
          referral_code: profile.handle,
          price:        product.price,
          title:        product.title,
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error(err);
    }
    setLoading(null);
  }

  async function handleOwnOrder() {
    if (!selected) return;
    setLoading('own');
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bundle_id:     selected,
          addons,
          form,
          total,
          event_slug:    'grad-2026',
          referral_code: profile.handle,
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error(err);
    }
    setLoading(null);
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD'
    }).format(n);

  const inputStyle = {
    width: '100%', padding: '10px 12px',
    background: '#1a1a1a', border: '1px solid #333',
    borderRadius: 8, color: '#fff', fontSize: 14,
    outline: 'none',
  };

  return (
    <main style={{
      minHeight: '100vh', background: '#0a0a0a', color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      padding: '0 0 48px',
    }}>

      {/* Header */}
      <div style={{
        background: '#111', borderBottom: '1px solid #222',
        padding: '28px 16px', textAlign: 'center',
      }}>
        <p style={{ fontSize: 11, color: '#555', letterSpacing: 4,
                    textTransform: 'uppercase', margin: '0 0 10px' }}>
          Un Momento Prints
        </p>

        {profile.avatar_url && (
          <img src={profile.avatar_url} alt={profile.display_name}
            style={{
              width: 64, height: 64, borderRadius: '50%',
              objectFit: 'cover', margin: '0 auto 12px',
              display: 'block', border: '2px solid #333',
            }}
          />
        )}

        <h1 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 4px' }}>
          {profile.display_name}
        </h1>

        {profile.school_id && (
          <p style={{ fontSize: 13, color: '#888', margin: '0 0 4px' }}>
            {profile.school_id}
            {profile.graduation_year
              ? ` · Class of ${profile.graduation_year}` : ''}
          </p>
        )}

        {profile.bio && (
          <p style={{ fontSize: 13, color: '#888', maxWidth: 400,
                      margin: '0 auto 10px', lineHeight: 1.6 }}>
            {profile.bio}
          </p>
        )}

        {/* Stats */}
        <div style={{
          display: 'inline-flex', gap: 20,
          background: '#0d1f0d', borderRadius: 10,
          padding: '8px 16px', marginTop: 8,
          border: '1px solid #1a3a1a',
        }}>
          {profile.total_donated > 0 && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 15, fontWeight: 600,
                          color: '#4ADE80', margin: 0 }}>
                {fmt(profile.total_donated)}
              </p>
              <p style={{ fontSize: 10, color: '#888', margin: 0 }}>
                donated to school
              </p>
            </div>
          )}
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#4ADE80', margin: 0 }}>
              10% of your order → school
            </p>
            <p style={{ fontSize: 10, color: '#888', margin: 0 }}>
              every purchase through this link
            </p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 16px' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          <button
            onClick={() => setTab('creator')}
            style={{
              flex: 1, padding: '10px',
              border: tab === 'creator'
                ? '1px solid #4ADE80' : '1px solid #333',
              borderRadius: 10,
              background: tab === 'creator' ? '#0d1f0d' : 'transparent',
              color: tab === 'creator' ? '#4ADE80' : '#888',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
          >
            {profile.display_name.split(' ')[0]}'s products
          </button>
          <button
            onClick={() => setTab('own')}
            style={{
              flex: 1, padding: '10px',
              border: tab === 'own'
                ? '1px solid #4ADE80' : '1px solid #333',
              borderRadius: 10,
              background: tab === 'own' ? '#0d1f0d' : 'transparent',
              color: tab === 'own' ? '#4ADE80' : '#888',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
          >
            Print my own photos
          </button>
        </div>

        {/* Creator's custom products */}
        {tab === 'creator' && (
          <div>
            {products.length === 0 ? (
              <div style={{
                background: '#111', borderRadius: 12,
                padding: '32px', textAlign: 'center',
                border: '1px solid #222',
              }}>
                <p style={{ color: '#555', fontSize: 13, margin: 0 }}>
                  {profile.display_name.split(' ')[0]} hasn't added
                  custom products yet.
                </p>
                <button
                  onClick={() => setTab('own')}
                  style={{
                    marginTop: 12, padding: '10px 20px',
                    background: '#4ADE80', color: '#000',
                    border: 'none', borderRadius: 8,
                    fontSize: 13, fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Print my own photos →
                </button>
              </div>
            ) : (
              products.map(product => (
                <div key={product.id} style={{
                  background: '#111', borderRadius: 14,
                  border: '1px solid #222', marginBottom: 16,
                  overflow: 'hidden',
                }}>
                  {product.image_url && (
                    <div style={{ aspectRatio: '4/3', overflow: 'hidden' }}>
                      <img src={product.image_url} alt={product.title}
                        style={{ width: '100%', height: '100%',
                                 objectFit: 'cover', display: 'block' }}
                      />
                    </div>
                  )}
                  <div style={{ padding: '16px' }}>
                    <div style={{ display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'flex-start',
                                  marginBottom: 8 }}>
                      <div>
                        <h2 style={{ fontSize: 15, fontWeight: 600,
                                     margin: '0 0 4px' }}>
                          {product.title}
                        </h2>
                        {product.description && (
                          <p style={{ fontSize: 12, color: '#888',
                                      margin: 0, lineHeight: 1.5 }}>
                            {product.description}
                          </p>
                        )}
                      </div>
                      <p style={{ fontSize: 20, fontWeight: 700,
                                  margin: '0 0 0 12px', flexShrink: 0 }}>
                        {fmt(product.price)}
                      </p>
                    </div>
                    <div style={{
                      background: '#0d1f0d', borderRadius: 8,
                      padding: '6px 10px', marginBottom: 12,
                      fontSize: 12, color: '#4ADE80',
                      display: 'flex', justifyContent: 'space-between',
                    }}>
                      <span>School donation</span>
                      <span>{fmt(product.price * 0.10)} per order</span>
                    </div>
                    <button
                      onClick={() => handleCreatorOrder(product)}
                      disabled={loading === product.id}
                      style={{
                        width: '100%', padding: '13px',
                        background: loading === product.id
                          ? '#333' : '#ffffff',
                        color: loading === product.id ? '#888' : '#000',
                        border: 'none', borderRadius: 10,
                        fontSize: 14, fontWeight: 700,
                        cursor: loading === product.id
                          ? 'wait' : 'pointer',
                      }}
                    >
                      {loading === product.id
                        ? 'Opening checkout…' : 'Order now →'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Print your own photos */}
        {tab === 'own' && (
          <div>
            <p style={{ fontSize: 13, color: '#888',
                        margin: '0 0 16px', lineHeight: 1.6 }}>
              Choose a bundle, upload your own graduation photo,
              and we ship it to your door in 4–5 days.
              10% of your order goes to{' '}
              {profile.school_id || 'the school'}.
            </p>

            {/* Step 1 — Bundle selection */}
            {orderStep === 1 && (
              <div>
                {BUNDLES.map(b => (
                  <div
                    key={b.id}
                    onClick={() => setSelected(b.id)}
                    style={{
                      border: selected === b.id
                        ? '2px solid #4ADE80' : '1px solid #222',
                      borderRadius: 12, padding: '1rem',
                      marginBottom: 10, cursor: 'pointer',
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
                                  justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: 14,
                                    margin: '0 0 3px' }}>{b.name}</p>
                        <p style={{ fontSize: 12, color: '#888',
                                    margin: 0 }}>{b.desc}</p>
                      </div>
                      <p style={{ fontSize: 20, fontWeight: 700,
                                  margin: 0, flexShrink: 0,
                                  marginLeft: 12 }}>
                        ${b.price}
                      </p>
                    </div>
                  </div>
                ))}

                {selected && (
                  <div style={{ marginTop: 16 }}>
                    <p style={{ fontSize: 13, color: '#888',
                                marginBottom: 10 }}>
                      Add-ons (optional)
                    </p>
                    <div style={{ display: 'flex',
                                  flexWrap: 'wrap', gap: 8 }}>
                      {ADDONS.map(a => (
                        <button key={a.id}
                          onClick={() => toggleAddon(a.id)}
                          style={{
                            padding: '6px 12px', borderRadius: 20,
                            border: addons.includes(a.id)
                              ? '1px solid #4ADE80' : '1px solid #333',
                            background: addons.includes(a.id)
                              ? '#0d1f0d' : 'transparent',
                            color: addons.includes(a.id)
                              ? '#4ADE80' : '#888',
                            fontSize: 12, cursor: 'pointer',
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
                    onClick={() => setOrderStep(2)}
                    style={{
                      width: '100%', marginTop: 16, padding: 14,
                      background: '#4ADE80', color: '#000',
                      border: 'none', borderRadius: 10,
                      fontSize: 15, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    Continue — ${total}
                  </button>
                )}
              </div>
            )}

            {/* Step 2 — Details */}
            {orderStep === 2 && (
              <div style={{ display: 'flex',
                            flexDirection: 'column', gap: 12 }}>
                <p style={{ fontWeight: 500, fontSize: 14,
                            margin: '0 0 4px' }}>
                  Your information
                </p>
                <input style={inputStyle} placeholder="Full name *"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}/>
                <input style={inputStyle} placeholder="Email *"
                  type="email" value={form.email}
                  onChange={e => set('email', e.target.value)}/>
                <input style={inputStyle} placeholder="Phone"
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}/>
                <p style={{ fontWeight: 500, fontSize: 14,
                            margin: '4px 0' }}>
                  Shipping address
                </p>
                <input style={inputStyle} placeholder="Street address *"
                  value={form.address}
                  onChange={e => set('address', e.target.value)}/>
                <div style={{ display: 'grid',
                              gridTemplateColumns: '2fr 1fr', gap: 8 }}>
                  <input style={inputStyle} placeholder="City *"
                    value={form.city}
                    onChange={e => set('city', e.target.value)}/>
                  <input style={inputStyle} placeholder="State *"
                    value={form.state}
                    onChange={e => set('state', e.target.value)}/>
                </div>
                <input style={inputStyle} placeholder="ZIP *"
                  value={form.zip}
                  onChange={e => set('zip', e.target.value)}/>
                <input style={inputStyle}
                  placeholder="Graduate's name (for print border)"
                  value={form.grad_name}
                  onChange={e => set('grad_name', e.target.value)}/>
                <input style={inputStyle}
                  placeholder="School name (optional)"
                  value={form.school}
                  onChange={e => set('school', e.target.value)}/>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setOrderStep(1)}
                    style={{
                      flex: 1, padding: 12, border: '1px solid #333',
                      borderRadius: 10, background: 'transparent',
                      color: '#fff', fontSize: 14, cursor: 'pointer',
                    }}>
                    ← Back
                  </button>
                  <button
                    onClick={() => {
                      if (form.name && form.email &&
                          form.address && form.city &&
                          form.state && form.zip) {
                        handleOwnOrder();
                      }
                    }}
                    disabled={loading === 'own'}
                    style={{
                      flex: 2, padding: 12,
                      background: loading === 'own'
                        ? '#333' : '#4ADE80',
                      color: loading === 'own' ? '#888' : '#000',
                      border: 'none', borderRadius: 10,
                      fontSize: 14, fontWeight: 700,
                      cursor: loading === 'own'
                        ? 'wait' : 'pointer',
                    }}
                  >
                    {loading === 'own'
                      ? 'Opening checkout…'
                      : `Pay $${total} →`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <p style={{ fontSize: 11, color: '#333', margin: 0 }}>
            Powered by{' '}
            <a href="https://unmomentoprints.com"
               style={{ color: '#555', textDecoration: 'none' }}>
              Un Momento Prints
            </a>
            {' '}· Ships anywhere in the US · 10% to school
          </p>
        </div>
      </div>
    </main>
  );
}