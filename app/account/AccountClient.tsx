'use client';
import { UserButton } from '@clerk/nextjs';

interface Order {
  id: string;
  created_at: string;
  product_type: string;
  fulfillment_status: string;
  buyer_name: string;
}

interface Account {
  id: string;
  name: string;
  email: string;
  is_creator: boolean;
  referral_code: string;
  token_wallets: { balance: number } | null;
  creator_profiles: {
    handle: string;
    earnings_balance: number;
    total_donated: number;
  } | null;
}

export default function AccountClient({
  account,
  orders,
  userImage,
}: {
  account: Account;
  orders: Order[];
  userImage: string;
}) {
  const balance  = account.token_wallets?.balance || 0;
  const handle   = account.creator_profiles?.handle;
  const earnings = account.creator_profiles?.earnings_balance || 0;
  const donated  = account.creator_profiles?.total_donated || 0;

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD'
    }).format(n);

  function copyReferral() {
    const url = handle
      ? `https://unmomentoprints.com/${handle}`
      : `https://unmomentoprints.com/event/grad-2026?ref=${account.referral_code}`;
    navigator.clipboard.writeText(url);
  }

  return (
    <main style={{
      minHeight: '100vh', background: '#0a0a0a', color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      padding: '0 0 48px',
    }}>

      {/* Header */}
      <div style={{
        background: '#111', borderBottom: '1px solid #222',
        padding: '20px 16px',
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <p style={{ fontSize: 11, color: '#555', letterSpacing: 3,
                      textTransform: 'uppercase', margin: '0 0 4px' }}>
            Un Momento Prints
          </p>
          <h1 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>
            {account.name}
          </h1>
        </div>
        <UserButton />
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 16px' }}>

        {/* Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 10, marginBottom: 20,
        }}>
          {[
            { label: 'Token balance',    value: `${balance}T` },
            { label: 'Orders placed',    value: String(orders.length) },
            { label: 'Creator earnings', value: fmt(earnings) },
            { label: 'Donated to school', value: fmt(donated) },
          ].map(stat => (
            <div key={stat.label} style={{
              background: '#111', borderRadius: 10,
              padding: '16px', border: '1px solid #222',
            }}>
              <p style={{ fontSize: 11, color: '#555', margin: '0 0 6px' }}>
                {stat.label}
              </p>
              <p style={{ fontSize: 22, fontWeight: 600,
                          color: '#4ADE80', margin: 0 }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Referral link */}
        <div style={{
          background: '#111', borderRadius: 12,
          padding: '16px', marginBottom: 16,
          border: '1px solid #222',
        }}>
          <p style={{ fontWeight: 600, fontSize: 14, margin: '0 0 4px' }}>
            Your referral link
          </p>
          <p style={{ fontSize: 12, color: '#888', margin: '0 0 12px',
                      lineHeight: 1.5 }}>
            Share this link. Earn 10% on every order placed through it
            through June 30, 2026. 10% also goes to your school.
          </p>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#1a1a1a', borderRadius: 8,
            padding: '10px 12px',
          }}>
            <span style={{ fontSize: 13, color: '#4ADE80', flex: 1,
                           overflow: 'hidden', textOverflow: 'ellipsis',
                           whiteSpace: 'nowrap' }}>
              {handle
                ? `unmomentoprints.com/${handle}`
                : `unmomentoprints.com/event/grad-2026?ref=${account.referral_code}`}
            </span>
            <button onClick={copyReferral}
              style={{
                padding: '6px 12px', background: '#4ADE80',
                color: '#000', border: 'none', borderRadius: 6,
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                flexShrink: 0,
              }}>
              Copy
            </button>
          </div>
        </div>

        {/* Quick actions */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 8, marginBottom: 20,
        }}>
          <a href="/creator/studio"
             style={{
               padding: '14px', background: '#4ADE80', color: '#000',
               borderRadius: 10, textDecoration: 'none',
               fontSize: 13, fontWeight: 700, textAlign: 'center',
               display: 'block',
             }}>
            {handle ? 'Add a product' : 'Create storefront'}
          </a>
          <a href="/event/grad-2026"
             style={{
               padding: '14px', border: '1px solid #333', color: '#fff',
               borderRadius: 10, textDecoration: 'none',
               fontSize: 13, textAlign: 'center', display: 'block',
             }}>
            Order prints →
          </a>
          {handle && (
            <a href={`/${handle}`}
               style={{
                 padding: '14px', border: '1px solid #333', color: '#fff',
                 borderRadius: 10, textDecoration: 'none',
                 fontSize: 13, textAlign: 'center', display: 'block',
               }}>
              View storefront →
            </a>
          )}
          {handle && (
            <a href="/creator/dashboard"
               style={{
                 padding: '14px', border: '1px solid #333', color: '#fff',
                 borderRadius: 10, textDecoration: 'none',
                 fontSize: 13, textAlign: 'center', display: 'block',
               }}>
              Creator dashboard →
            </a>
          )}
        </div>

        {/* Recent orders */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 500,
                      color: '#888', margin: '0 0 12px' }}>
            Recent orders
          </p>
          {orders.length === 0 ? (
            <div style={{
              background: '#111', borderRadius: 10, padding: '24px',
              textAlign: 'center', border: '1px solid #222',
            }}>
              <p style={{ color: '#555', fontSize: 13, margin: '0 0 12px' }}>
                No orders yet.
              </p>
              <a href="/event/grad-2026"
                 style={{
                   padding: '10px 20px', background: '#4ADE80',
                   color: '#000', borderRadius: 8,
                   textDecoration: 'none', fontSize: 13,
                   fontWeight: 700, display: 'inline-block',
                 }}>
                Order your first print →
              </a>
            </div>
          ) : (
            orders.map(order => (
              <div key={order.id} style={{
                background: '#111', borderRadius: 10,
                padding: '14px 16px', marginBottom: 8,
                border: '1px solid #222',
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <p style={{ fontWeight: 500, fontSize: 13,
                              margin: '0 0 3px' }}>
                    {order.product_type?.replace(/_/g, ' ')}
                  </p>
                  <p style={{ fontSize: 11, color: '#555', margin: 0 }}>
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span style={{
                  fontSize: 12, padding: '3px 8px', borderRadius: 10,
                  background: order.fulfillment_status === 'delivered'
                    ? '#0d1f0d' : '#1a1a1a',
                  color: order.fulfillment_status === 'delivered'
                    ? '#4ADE80' : '#888',
                  border: '1px solid',
                  borderColor: order.fulfillment_status === 'delivered'
                    ? '#1a3a1a' : '#333',
                }}>
                  {order.fulfillment_status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}