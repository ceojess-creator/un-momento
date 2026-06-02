'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/app/context/CartContext';

export default function SuccessContent() {
  const params    = useSearchParams();
  const sessionId = params.get('session_id');
  const { clearCart } = useCart();

  useEffect(() => {
    clearCart();
  }, []);

  return (
    <main style={{
      minHeight: '100vh', background: '#0a0a0a',
      color: '#fff', padding: '32px 16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>

        <div style={{ marginBottom: 32 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: '#0d1f0d', border: '2px solid #4ADE80',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 20px',
            fontSize: 32,
          }}>🎓</div>
          <p style={{ fontSize: 12, color: '#666', letterSpacing: 4,
                      textTransform: 'uppercase', margin: '0 0 12px' }}>
            Un Momento
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 500, margin: '0 0 12px' }}>
            Order confirmed! 🎉
          </h1>
          <p style={{ color: '#888', fontSize: 14, lineHeight: 1.7, margin: '0 0 8px' }}>
            Your order is being processed and you'll receive
            a confirmation email with tracking shortly.
          </p>
          <p style={{ color: '#555', fontSize: 13, margin: 0 }}>
            Order ID: {sessionId?.slice(-8).toUpperCase()}
          </p>
        </div>

        <div style={{
          background: '#111', borderRadius: 12,
          padding: '20px', marginBottom: 24,
          border: '1px solid #222', textAlign: 'left',
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: '0 0 12px' }}>
            What happens next
          </p>
          {[
            { emoji:'📧', text:'Confirmation email sent to your inbox' },
            { emoji:'🖨️', text:'Your print is being prepared and processed' },
            { emoji:'📦', text:'Ships in 4–5 business days via our print partner' },
            { emoji:'📱', text:'Scan the QR code on your print to play your memory clip — forever' },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', gap: 12, alignItems: 'flex-start',
              padding: '7px 0', borderBottom: '1px solid #1a1a1a',
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{item.emoji}</span>
              <p style={{ fontSize: 13, color: '#888', margin: 0, lineHeight: 1.6 }}>
                {item.text}
              </p>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <a href="/event/grad-2026" style={{
            display: 'block', padding: '12px',
            background: '#4ADE80', color: '#000',
            borderRadius: 10, textDecoration: 'none',
            fontSize: 14, fontWeight: 700,
          }}>
            Order another bundle →
          </a>
          <a href="/account" style={{
            display: 'block', padding: '12px',
            border: '1px solid #333', color: '#888',
            borderRadius: 10, textDecoration: 'none',
            fontSize: 14,
          }}>
            View my orders
          </a>
        </div>

        <p style={{ fontSize: 11, color: '#444', marginTop: 24, lineHeight: 1.6 }}>
          Questions? Email{' '}
          <a href="mailto:ceojess@unmomentoprints.com"
             style={{ color: '#666' }}>
            ceojess@unmomentoprints.com
          </a>
        </p>
      </div>
    </main>
  );
}