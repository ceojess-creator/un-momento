'use client';
import { useEffect, useState } from 'react';

interface Earnings {
  total_earned: number;
  earnings_balance: number;
  total_donated: number;
  total_orders: number;
}

interface Order {
  id: string;
  created_at: string;
  buyer_name: string;
  order_total: number;
  creator_earnings: number;
  ptso_amount: number;
  fulfillment_status: string;
}

export default function CreatorDashboard() {
  const [handle,   setHandle]   = useState('');
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [orders,   setOrders]   = useState<Order[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [found,    setFound]    = useState(false);
  const [copied,   setCopied]   = useState(false);

  async function lookup() {
    if (!handle) return;
    setLoading(true);

    const res  = await fetch(`/api/creator/earnings?handle=${handle}`);
    const data = await res.json();

    if (data.earnings) {
      setEarnings(data.earnings);
      setOrders(data.orders || []);
      setFound(true);
    }
    setLoading(false);
  }

  function copyLink() {
    navigator.clipboard.writeText(
      `https://unmomentoprints.com/${handle}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD'
    }).format(n);

  if (!found) {
    return (
      <main style={{
        minHeight: '100vh', background: '#0a0a0a', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      }}>
        <div style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: '#666', letterSpacing: 4,
                      textTransform: 'uppercase', margin: '0 0 16px' }}>
            Un Momento Prints
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 8px' }}>
            Creator dashboard
          </h1>
          <p style={{ color: '#888', fontSize: 13, margin: '0 0 24px' }}>
            Enter your handle to see your earnings and orders.
          </p>
          <input
            value={handle}
            onChange={e => setHandle(
              e.target.value.toLowerCase().replace(/\s+/g, '-')
            )}
            placeholder="Your handle (e.g. jessica-ealy)"
            style={{
              width: '100%', padding: '12px 14px',
              background: '#1a1a1a', border: '1px solid #333',
              borderRadius: 8, color: '#fff', fontSize: 14,
              outline: 'none', marginBottom: 12,
            }}
          />
          <button
            onClick={lookup}
            disabled={!handle || loading}
            style={{
              width: '100%', padding: 14,
              background: handle ? '#4ADE80' : '#333',
              color: handle ? '#000' : '#888',
              border: 'none', borderRadius: 10,
              fontSize: 14, fontWeight: 700,
              cursor: handle ? 'pointer' : 'not-allowed',
            }}
          >
            {loading ? 'Loading…' : 'View my dashboard →'}
          </button>
          <p style={{ marginTop: 16, fontSize: 13, color: '#555' }}>
            Don't have a storefront yet?{' '}
            <a href="/creator/studio"
               style={{ color: '#4ADE80' }}>
              Create one →
            </a>
          </p>
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
      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 12, color: '#666', letterSpacing: 4,
                      textTransform: 'uppercase', margin: '0 0 4px' }}>
            Creator dashboard
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>
              {handle}
            </h1>
            <button onClick={copyLink}
              style={{
                padding: '8px 14px',
                background: copied ? '#4ADE80' : '#1a1a1a',
                color: copied ? '#000' : '#fff',
                border: '1px solid #333', borderRadius: 8,
                fontSize: 12, cursor: 'pointer', fontWeight: 500,
              }}>
              {copied ? '✓ Copied!' : 'Copy storefront link'}
            </button>
          </div>
        </div>

        {/* Stats */}
        {earnings && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 10, marginBottom: 24,
          }}>
            {[
              { label: 'Available balance', value: fmt(earnings.earnings_balance),
                color: '#4ADE80' },
              { label: 'Total earned', value: fmt(earnings.total_earned),
                color: '#fff' },
              { label: 'Donated to school', value: fmt(earnings.total_donated),
                color: '#4ADE80' },
              { label: 'Total orders', value: String(earnings.total_orders),
                color: '#fff' },
            ].map(stat => (
              <div key={stat.label} style={{
                background: '#111', borderRadius: 10,
                padding: '16px', border: '1px solid #222',
              }}>
                <p style={{ fontSize: 11, color: '#555',
                            margin: '0 0 6px' }}>
                  {stat.label}
                </p>
                <p style={{ fontSize: 22, fontWeight: 600,
                            color: stat.color, margin: 0 }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Payout request */}
        {earnings && earnings.earnings_balance >= 25 && (
          <div style={{
            background: '#0d1f0d', border: '1px solid #4ADE80',
            borderRadius: 10, padding: '14px 16px', marginBottom: 20,
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', gap: 10, flexWrap: 'wrap',
          }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: 14, margin: '0 0 3px' }}>
                Ready to cash out
              </p>
              <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
                {fmt(earnings.earnings_balance)} available
              </p>
            </div>
            <a href={`mailto:ceojess@unmomentoprints.com?subject=Payout request — ${handle}&body=Hi, I'd like to request a payout of my creator earnings. My handle is ${handle}.`}
               style={{
                 padding: '10px 16px', background: '#4ADE80',
                 color: '#000', borderRadius: 8, textDecoration: 'none',
                 fontSize: 13, fontWeight: 700,
               }}>
              Request payout →
            </a>
          </div>
        )}

        {/* Orders */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 500,
                      margin: '0 0 12px', color: '#888' }}>
            Recent orders
          </p>
          {orders.length === 0 ? (
            <div style={{
              background: '#111', borderRadius: 10, padding: '24px',
              textAlign: 'center', border: '1px solid #222',
            }}>
              <p style={{ color: '#555', fontSize: 13, margin: 0 }}>
                No orders yet — share your storefront link to get started.
              </p>
              <a href="/creator/studio"
                 style={{ color: '#4ADE80', fontSize: 13,
                          display: 'block', marginTop: 8 }}>
                Build another product →
              </a>
            </div>
          ) : (
            orders.map(order => (
              <div key={order.id} style={{
                background: '#111', borderRadius: 10, padding: '14px 16px',
                marginBottom: 8, border: '1px solid #222',
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', gap: 10, flexWrap: 'wrap',
              }}>
                <div>
                  <p style={{ fontWeight: 500, fontSize: 13,
                              margin: '0 0 3px' }}>
                    {order.buyer_name}
                  </p>
                  <p style={{ fontSize: 11, color: '#555', margin: 0 }}>
                    {new Date(order.created_at).toLocaleDateString()} ·{' '}
                    <span style={{
                      color: order.fulfillment_status === 'delivered'
                        ? '#4ADE80' : '#888'
                    }}>
                      {order.fulfillment_status}
                    </span>
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 13, fontWeight: 600,
                              color: '#4ADE80', margin: '0 0 2px' }}>
                    +{fmt(order.creator_earnings)}
                  </p>
                  <p style={{ fontSize: 11, color: '#555', margin: 0 }}>
                    {fmt(order.ptso_amount)} to school
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
          <a href="/creator/studio"
             style={{
               flex: 1, padding: 12, background: '#4ADE80',
               color: '#000', borderRadius: 10, textDecoration: 'none',
               fontSize: 13, fontWeight: 700, textAlign: 'center',
             }}>
            Build another product
          </a>
          <a href={`/unmomentoprints.com/${handle}`}
             style={{
               flex: 1, padding: 12, border: '1px solid #333',
               color: '#fff', borderRadius: 10, textDecoration: 'none',
               fontSize: 13, textAlign: 'center',
             }}>
            View storefront →
          </a>
        </div>
      </div>
    </main>
  );
}