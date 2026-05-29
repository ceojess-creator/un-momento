'use client';
import { useState } from 'react';

const PRODUCT_TYPES = [
  {
    id: 'portrait_print',
    name: 'Portrait print',
    desc: 'One preferred photo — frame-ready 4×6 print',
    base_cost: 18,
  },
  {
    id: 'collage_print',
    name: 'Photo collage',
    desc: '2–9 photos arranged in a layout — 4×6 print',
    base_cost: 22,
  },
  {
    id: 'print_bundle',
    name: 'Print + sticker bundle',
    desc: '4×6 photo print + 4×7 die-cut sticker sheet',
    base_cost: 28,
  },
  {
    id: 'grad_bundle',
    name: 'Grad bundle',
    desc: 'Photo + stickers + button + card jacket + QR clip',
    base_cost: 45,
  },
];

const LAYOUTS = ['Spotlight', 'Grid', 'Strip', 'Mosaic', 'Polaroid'];

export default function CreatorStudio() {
  const [step, setStep]             = useState(1);
  const [productType, setProductType] = useState<string | null>(null);
  const [layout, setLayout]         = useState('Spotlight');
  const [photos, setPhotos]         = useState<File[]>([]);
  const [previews, setPreviews]     = useState<string[]>([]);
  const [price, setPrice]           = useState(28);
  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [handle, setHandle]         = useState('');
  const [loading, setLoading]       = useState(false);
  const [published, setPublished]   = useState(false);
  const [storefrontUrl, setStorefrontUrl] = useState('');

  const product = PRODUCT_TYPES.find(p => p.id === productType);
  const creatorEarnings = (price * 0.10).toFixed(2);
  const schoolDonation  = (price * 0.10).toFixed(2);
  const maxPhotos = productType === 'portrait_print' ? 1 : 9;

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const remaining = maxPhotos - photos.length;
    const toAdd = files.slice(0, remaining);
    setPhotos(prev => [...prev, ...toAdd]);
    toAdd.forEach(file => {
      const url = URL.createObjectURL(file);
      setPreviews(prev => [...prev, url]);
    });
  }

  function removePhoto(index: number) {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  }

  async function handlePublish() {
    if (!productType || !handle || photos.length === 0) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('product_type', productType);
      formData.append('title', title || `${handle}'s ${product?.name}`);
      formData.append('description', description);
      formData.append('price', String(price));
      formData.append('handle', handle.toLowerCase().replace(/\s+/g, '-'));
      formData.append('layout', layout);
      photos.forEach((photo, i) => formData.append(`photo_${i}`, photo));

      const res = await fetch('/api/creator/publish', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.url) {
        setStorefrontUrl(data.url);
        setPublished(true);
      }
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

  if (published) {
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
            Your storefront is live!
          </h1>
          <p style={{ color: '#888', fontSize: 14, lineHeight: 1.7,
                      margin: '0 0 24px' }}>
            Share your link with family and friends.
            You earn 10% of every order. 10% goes to your school.
          </p>
          <div style={{
            background: '#111', borderRadius: 10, padding: '14px 16px',
            marginBottom: 20, display: 'flex', alignItems: 'center',
            gap: 10, justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 13, color: '#4ADE80' }}>
              {storefrontUrl}
            </span>
            <button
              onClick={() => navigator.clipboard.writeText(storefrontUrl)}
              style={{
                padding: '6px 12px', background: '#4ADE80', color: '#000',
                border: 'none', borderRadius: 6, fontSize: 12,
                fontWeight: 700, cursor: 'pointer', flexShrink: 0,
              }}
            >
              Copy
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <a href={storefrontUrl}
               style={{
                 padding: '12px 20px', background: '#fff', color: '#000',
                 borderRadius: 8, textDecoration: 'none', fontWeight: 600,
                 fontSize: 14,
               }}>
              View storefront →
            </a>
            <a href="/creator/dashboard"
               style={{
                 padding: '12px 20px', border: '1px solid #333', color: '#fff',
                 borderRadius: 8, textDecoration: 'none', fontSize: 14,
               }}>
              My dashboard
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{
      minHeight: '100vh', background: '#0a0a0a', color: '#fff',
      padding: '32px 16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <p style={{ fontSize: 12, color: '#666', letterSpacing: 4,
                      textTransform: 'uppercase', margin: '0 0 8px' }}>
            Un Momento Prints
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 6px' }}>
            Creator Studio
          </h1>
          <p style={{ color: '#888', fontSize: 13, margin: 0 }}>
            Build your product. Share your storefront. Earn 10% of every sale.
          </p>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          {['Product', 'Photos', 'Price', 'Publish'].map((s, i) => (
            <div key={s} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                height: 4, borderRadius: 2, marginBottom: 6,
                background: step > i + 1
                  ? '#4ADE80' : step === i + 1 ? '#fff' : '#333',
              }}/>
              <span style={{ fontSize: 10, color: step === i + 1 ? '#fff' : '#555' }}>
                {s}
              </span>
            </div>
          ))}
        </div>

        {/* Step 1 — Product type */}
        {step === 1 && (
          <div>
            {PRODUCT_TYPES.map(p => (
              <div
                key={p.id}
                onClick={() => setProductType(p.id)}
                style={{
                  border: productType === p.id
                    ? '2px solid #4ADE80' : '1px solid #222',
                  borderRadius: 12, padding: '1rem', marginBottom: 10,
                  cursor: 'pointer',
                  background: productType === p.id ? '#0d1f0d' : '#111',
                }}
              >
                <div style={{ display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center' }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14,
                                margin: '0 0 4px' }}>{p.name}</p>
                    <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
                      {p.desc}
                    </p>
                  </div>
                  <p style={{ fontSize: 13, color: '#555',
                              margin: 0, flexShrink: 0, marginLeft: 12 }}>
                    from ${p.base_cost}
                  </p>
                </div>
              </div>
            ))}

            <button
              onClick={() => productType && setStep(2)}
              disabled={!productType}
              style={{
                width: '100%', marginTop: 8, padding: 14,
                background: productType ? '#4ADE80' : '#333',
                color: productType ? '#000' : '#888',
                border: 'none', borderRadius: 10,
                fontSize: 15, fontWeight: 700,
                cursor: productType ? 'pointer' : 'not-allowed',
              }}
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 2 — Photos */}
        {step === 2 && (
          <div>
            <p style={{ fontSize: 13, color: '#888', margin: '0 0 12px' }}>
              Upload up to {maxPhotos} photo{maxPhotos > 1 ? 's' : ''}.
              Minimum 600×600px for print quality.
            </p>

            {/* Photo grid */}
            {previews.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8, marginBottom: 12,
              }}>
                {previews.map((url, i) => (
                  <div key={i} style={{ position: 'relative', aspectRatio: '1' }}>
                    <img src={url} alt={`Photo ${i + 1}`}
                      style={{ width: '100%', height: '100%',
                               objectFit: 'cover', borderRadius: 8 }}/>
                    <button
                      onClick={() => removePhoto(i)}
                      style={{
                        position: 'absolute', top: 4, right: 4,
                        width: 22, height: 22, borderRadius: '50%',
                        background: 'rgba(0,0,0,0.7)', border: 'none',
                        color: '#fff', cursor: 'pointer', fontSize: 12,
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}

            {photos.length < maxPhotos && (
              <label style={{
                display: 'block', padding: '24px',
                border: '1px dashed #333', borderRadius: 10,
                textAlign: 'center', cursor: 'pointer',
                background: '#111', marginBottom: 16,
              }}>
                <input type="file" accept="image/*"
                  multiple style={{ display: 'none' }}
                  onChange={handlePhotoUpload}/>
                <p style={{ color: '#555', margin: 0, fontSize: 13 }}>
                  Tap to add photos
                  ({maxPhotos - photos.length} remaining)
                </p>
              </label>
            )}

            {/* Layout picker — only for multi-photo */}
            {maxPhotos > 1 && photos.length > 1 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: '#888', margin: '0 0 8px' }}>
                  Layout
                </p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {LAYOUTS.map(l => (
                    <button key={l} onClick={() => setLayout(l)}
                      style={{
                        padding: '6px 12px', borderRadius: 20,
                        border: layout === l
                          ? '1px solid #4ADE80' : '1px solid #333',
                        background: layout === l ? '#0d1f0d' : 'transparent',
                        color: layout === l ? '#4ADE80' : '#888',
                        fontSize: 12, cursor: 'pointer',
                      }}
                    >{l}</button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setStep(1)}
                style={{
                  flex: 1, padding: 12, border: '1px solid #333',
                  borderRadius: 10, background: 'transparent',
                  color: '#fff', fontSize: 14, cursor: 'pointer',
                }}>
                ← Back
              </button>
              <button
                onClick={() => photos.length > 0 && setStep(3)}
                disabled={photos.length === 0}
                style={{
                  flex: 2, padding: 12,
                  background: photos.length > 0 ? '#4ADE80' : '#333',
                  color: photos.length > 0 ? '#000' : '#888',
                  border: 'none', borderRadius: 10,
                  fontSize: 14, fontWeight: 700,
                  cursor: photos.length > 0 ? 'pointer' : 'not-allowed',
                }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Price */}
        {step === 3 && product && (
          <div>
            <p style={{ fontSize: 13, color: '#888', margin: '0 0 16px' }}>
              Set your price. Minimum ${product.base_cost}.
            </p>

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center',
                            gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 28, color: '#555' }}>$</span>
                <input
                  type="range"
                  min={product.base_cost}
                  max={product.base_cost + 30}
                  value={price}
                  onChange={e => setPrice(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: 28, fontWeight: 600,
                               minWidth: 50 }}>${price}</span>
              </div>

              <div style={{
                background: '#111', borderRadius: 10,
                padding: '14px 16px',
              }}>
                {[
                  ['Your earnings (10%)', `$${creatorEarnings} per order`],
                  ['School donation (10%)', `$${schoolDonation} per order`],
                  ['Un Momento fulfills', `$${(price * 0.80).toFixed(2)}`],
                ].map(([k, v]) => (
                  <div key={k} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '5px 0',
                    borderBottom: '1px solid #222',
                    fontSize: 13,
                  }}>
                    <span style={{ color: '#888' }}>{k}</span>
                    <span style={{
                      color: k.includes('earnings') || k.includes('donation')
                        ? '#4ADE80' : '#666'
                    }}>{v}</span>
                  </div>
                ))}
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '10px 0 0', fontSize: 13,
                }}>
                  <span style={{ color: '#888' }}>If 10 friends buy</span>
                  <span style={{ color: '#4ADE80', fontWeight: 600 }}>
                    ${(Number(creatorEarnings) * 10).toFixed(0)} to you ·
                    ${(Number(schoolDonation) * 10).toFixed(0)} to school
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setStep(2)}
                style={{
                  flex: 1, padding: 12, border: '1px solid #333',
                  borderRadius: 10, background: 'transparent',
                  color: '#fff', fontSize: 14, cursor: 'pointer',
                }}>
                ← Back
              </button>
              <button onClick={() => setStep(4)}
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

        {/* Step 4 — Publish */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 13, color: '#888', margin: '0 0 4px' }}>
              Almost done — set up your storefront
            </p>

            <input style={inputStyle}
              placeholder="Your storefront handle (e.g. jessica-ealy)"
              value={handle}
              onChange={e => setHandle(
                e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
              )}
            />
            {handle && (
              <p style={{ fontSize: 11, color: '#4ADE80', margin: '-6px 0 0' }}>
                unmomentoprints.com/{handle}
              </p>
            )}

            <input style={inputStyle}
              placeholder="Product title (optional)"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />

            <textarea
              style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
              placeholder="Description (optional)"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />

            <div style={{
              background: '#111', borderRadius: 10, padding: '14px 16px',
            }}>
              {[
                ['Product', product?.name || ''],
                ['Photos', `${photos.length} uploaded`],
                ['Your price', `$${price}`],
                ['Your earnings', `$${creatorEarnings} per order (10%)`],
                ['School donation', `$${schoolDonation} per order (10%)`],
                ['Storefront', handle ? `unmomentoprints.com/${handle}` : '—'],
              ].map(([k, v]) => (
                <div key={k} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '5px 0', borderBottom: '1px solid #222',
                  fontSize: 13,
                }}>
                  <span style={{ color: '#888' }}>{k}</span>
                  <span style={{
                    color: k.includes('earnings') || k.includes('donation')
                      ? '#4ADE80' : '#fff'
                  }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setStep(3)}
                style={{
                  flex: 1, padding: 12, border: '1px solid #333',
                  borderRadius: 10, background: 'transparent',
                  color: '#fff', fontSize: 14, cursor: 'pointer',
                }}>
                ← Back
              </button>
              <button
                onClick={handlePublish}
                disabled={!handle || photos.length === 0 || loading}
                style={{
                  flex: 2, padding: 12,
                  background: !handle || loading ? '#333' : '#4ADE80',
                  color: !handle || loading ? '#888' : '#000',
                  border: 'none', borderRadius: 10,
                  fontSize: 14, fontWeight: 700,
                  cursor: !handle || loading ? 'not-allowed' : 'pointer',
                }}>
                {loading ? 'Publishing…' : 'Publish my storefront →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}