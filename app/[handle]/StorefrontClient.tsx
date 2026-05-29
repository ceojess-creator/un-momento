'use client';
import { useState } from 'react';

interface Product {
  id: string;
  title: string;
  description: string;
  image_url: string;
  photo_urls: string[];
  price: number;
  product_type: string;
  creator_pct: number;
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
  const [loading, setLoading] = useState<string | null>(null);

  async function handleOrder(product: Product) {
    setLoading(product.id);
    try {
      const res = await fetch('/api/creator/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id:  product.id,
          creator_id:  profile.handle,
          price:       product.price,
          title:       product.title,
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

        <h1 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 6px' }}>
          {profile.display_name}
        </h1>

        {profile.school_id && (
          <p style={{ fontSize: 13, color: '#888', margin: '0 0 6px' }}>
            {profile.school_id}
            {profile.graduation_year ? ` · Class of ${profile.graduation_year}` : ''}
          </p>
        )}

        {profile.bio && (
          <p style={{ fontSize: 13, color: '#888', maxWidth: 400,
                      margin: '0 auto 12px', lineHeight: 1.6 }}>
            {profile.bio}
          </p>
        )}

        {/* Donation stats */}
        {profile.total_donated > 0 && (
          <div style={{
            display: 'inline-flex', gap: 16,
            background: '#0d1f0d', borderRadius: 10,
            padding: '8px 16px', margin: '8px 0 0',
            border: '1px solid #1a3a1a',
          }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 600,
                          color: '#4ADE80', margin: 0 }}>
                {fmt(profile.total_donated)}
              </p>
              <p style={{ fontSize: 10, color: '#888', margin: 0 }}>
                donated to school
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Products */}
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 16px' }}>

        {products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ color: '#555', fontSize: 14 }}>
              No products yet.
            </p>
          </div>
        ) : (
          products.map(product => (
            <div key={product.id} style={{
              background: '#111', borderRadius: 14,
              border: '1px solid #222', marginBottom: 16,
              overflow: 'hidden',
            }}>
              {/* Product image */}
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
                    <h2 style={{ fontSize: 16, fontWeight: 600,
                                 margin: '0 0 4px' }}>
                      {product.title}
                    </h2>
                    {product.description && (
                      <p style={{ fontSize: 13, color: '#888',
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

                {/* Order count */}
                {product.order_count > 0 && (
                  <p style={{ fontSize: 11, color: '#555',
                              margin: '0 0 12px' }}>
                    {product.order_count} order{product.order_count !== 1 ? 's' : ''}
                  </p>
                )}

                {/* Donation callout */}
                <div style={{
                  background: '#0d1f0d', borderRadius: 8,
                  padding: '8px 12px', marginBottom: 12,
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: 12,
                }}>
                  <span style={{ color: '#888' }}>School donation</span>
                  <span style={{ color: '#4ADE80', fontWeight: 600 }}>
                    {fmt(product.price * 0.10)} per order
                  </span>
                </div>

                <button
                  onClick={() => handleOrder(product)}
                  disabled={loading === product.id}
                  style={{
                    width: '100%', padding: '13px',
                    background: loading === product.id ? '#333' : '#ffffff',
                    color: loading === product.id ? '#888' : '#000',
                    border: 'none', borderRadius: 10,
                    fontSize: 14, fontWeight: 700,
                    cursor: loading === product.id ? 'wait' : 'pointer',
                  }}
                >
                  {loading === product.id ? 'Opening checkout…' : 'Order now →'}
                </button>
              </div>
            </div>
          ))
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <p style={{ fontSize: 12, color: '#444', margin: '0 0 8px' }}>
            Powered by
          </p>
          <a href="https://unmomentoprints.com"
             style={{ color: '#666', fontSize: 13,
                      textDecoration: 'none' }}>
            Un Momento Prints
          </a>
          <p style={{ fontSize: 11, color: '#333', margin: '8px 0 0' }}>
            10% of every order goes to the school ·
            Ships anywhere in the US
          </p>
        </div>
      </div>
    </main>
  );
}