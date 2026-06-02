'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/app/context/CartContext';

export default function SuccessContent() {
  const params    = useSearchParams();
  const sessionId = params.get('session_id');
  const { clearCart } = useCart();

  // Clear cart on successful payment
  useEffect(() => {
    clearCart();
  }, []);
  const [uploaded, setUploaded]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photo, setPhoto]         = useState<File | null>(null);
  const [video, setVideo]         = useState<File | null>(null);
  const [gradName, setGradName]   = useState('');
  const [message, setMessage]     = useState('');

  async function handleUpload() {
    if (!photo) return;
    setUploading(true);

    const form = new FormData();
    form.append('photo', photo);
    form.append('session_id', sessionId || '');
    form.append('grad_name', gradName);
    if (video) form.append('video', video);

    try {
      await fetch('/api/upload-order', {
        method: 'POST',
        body: form,
      });
      setUploaded(true);
      setMessage('');
    } catch (err) {
      setMessage('Upload failed — please email your photo to ceojess@unmomentoprints.com');
    }
    setUploading(false);
  }

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
          ].map(item => (
            <div key={item.text} style={{
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

  return (
    <main style={{
      minHeight: '100vh', background: '#0a0a0a',
      color: '#fff', padding: '32px 16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <p style={{ fontSize: 12, color: '#666', letterSpacing: 4,
                      textTransform: 'uppercase', margin: '0 0 12px' }}>
            Un Momento
          </p>
          <h1 style={{ fontSize: 24, fontWeight: 500, margin: '0 0 8px' }}>
            Payment confirmed 🎉
          </h1>
          <p style={{ color: '#888', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            Your order is confirmed and being processed.
            You'll receive a confirmation email shortly with tracking information.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div>
            <p style={{ fontSize: 13, color: '#888', margin: '0 0 6px' }}>
              Graduate's name (for print border)
            </p>
            <input
              value={gradName}
              onChange={e => setGradName(e.target.value)}
              placeholder="e.g. Jessica Ealy · Class of 2026"
              style={{
                width: '100%', padding: '10px 12px',
                background: '#1a1a1a', border: '1px solid #333',
                borderRadius: 8, color: '#fff', fontSize: 14,
                outline: 'none',
              }}
            />
          </div>

          <div>
            <p style={{ fontSize: 13, color: '#888', margin: '0 0 6px' }}>
              Your graduation photo *
            </p>
            <p style={{ fontSize: 11, color: '#555', margin: '0 0 8px' }}>
              Minimum 600×600px for print quality. JPG or PNG recommended.
            </p>
            <label style={{
              display: 'block', padding: '20px',
              border: photo ? '1px solid #4ADE80' : '1px dashed #333',
              borderRadius: 10, textAlign: 'center',
              cursor: 'pointer', background: photo ? '#0d1f0d' : '#111',
            }}>
              <input
                type="file" accept="image/*"
                style={{ display: 'none' }}
                onChange={e => setPhoto(e.target.files?.[0] || null)}
              />
              {photo ? (
                <p style={{ color: '#4ADE80', margin: 0, fontSize: 13 }}>
                  ✓ {photo.name}
                </p>
              ) : (
                <p style={{ color: '#555', margin: 0, fontSize: 13 }}>
                  Tap to select your photo
                </p>
              )}
            </label>
          </div>

          <div>
            <p style={{ fontSize: 13, color: '#888', margin: '0 0 6px' }}>
              Video message for QR code (optional)
            </p>
            <p style={{ fontSize: 11, color: '#555', margin: '0 0 8px' }}>
              Record a 15-second message to your future self.
              This plays when anyone scans the QR on your print.
            </p>
            <label style={{
              display: 'block', padding: '20px',
              border: video ? '1px solid #4ADE80' : '1px dashed #333',
              borderRadius: 10, textAlign: 'center',
              cursor: 'pointer', background: video ? '#0d1f0d' : '#111',
            }}>
              <input
                type="file" accept="video/*"
                style={{ display: 'none' }}
                onChange={e => setVideo(e.target.files?.[0] || null)}
              />
              {video ? (
                <p style={{ color: '#4ADE80', margin: 0, fontSize: 13 }}>
                  ✓ {video.name}
                </p>
              ) : (
                <p style={{ color: '#555', margin: 0, fontSize: 13 }}>
                  Tap to select your video (optional)
                </p>
              )}
            </label>
          </div>

          {message && (
            <p style={{ color: '#ff6b6b', fontSize: 13 }}>{message}</p>
          )}

          <button
            onClick={handleUpload}
            disabled={!photo || uploading}
            style={{
              width: '100%', padding: 14,
              background: !photo || uploading ? '#333' : '#4ADE80',
              color: !photo || uploading ? '#888' : '#000',
              border: 'none', borderRadius: 10,
              fontSize: 15, fontWeight: 700,
              cursor: !photo || uploading ? 'not-allowed' : 'pointer',
            }}
          >
            {uploading ? 'Uploading…' : 'Complete my order →'}
          </button>

          <p style={{ fontSize: 11, color: '#444',
                      textAlign: 'center', lineHeight: 1.6 }}>
            Can't upload right now? Email your photo to{' '}
            <a href="mailto:ceojess@unmomentoprints.com"
               style={{ color: '#666' }}>
              ceojess@unmomentoprints.com
            </a>{' '}
            with your order confirmation number.
          </p>
        </div>
      </div>
    </main>
  );
}