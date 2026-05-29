export default function Home() {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      textAlign: 'center',
    }}>

      {/* Logo / Brand */}
      <p style={{ fontSize: 13, letterSpacing: '4px', textTransform: 'uppercase',
                  color: '#888', margin: '0 0 24px' }}>
        Un Momento Prints
      </p>

      {/* Hero line */}
      <h1 style={{ fontSize: 'clamp(28px, 6vw, 56px)', fontWeight: 500,
                   lineHeight: 1.15, maxWidth: 700, margin: '0 0 20px' }}>
        The moments that matter most deserve to exist in the real world.
      </h1>

      {/* Subline */}
      <p style={{ fontSize: 'clamp(15px, 2.5vw, 20px)', color: '#aaa',
                  maxWidth: 520, lineHeight: 1.7, margin: '0 0 40px' }}>
        Instant photo prints, die-cut stickers, and custom keepsakes —
        produced on-site in under 2 minutes at graduations, weddings,
        and events across California and Wisconsin.
      </p>

      {/* CTA buttons */}
      {/* CTA buttons */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap',
                    justifyContent: 'center', marginBottom: 48 }}>
        <a href="/event/grad-2026"
           style={{ padding: '14px 28px', background: '#ffffff', color: '#0a0a0a',
                    borderRadius: 8, textDecoration: 'none', fontWeight: 600,
                    fontSize: 15 }}>
          Order now →
        </a>
        <a href="mailto:ceojess@unmomentoprints.com"
           style={{ padding: '14px 28px', border: '1px solid #444', color: '#ffffff',
                    borderRadius: 8, textDecoration: 'none', fontWeight: 500,
                    fontSize: 15 }}>
          Book an event
        </a>
      </div>

      {/* How it works */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 24, maxWidth: 800, width: '100%', marginBottom: 48 }}>
        {[
          { n: '01', t: 'Order on your phone', d: 'Visit our event page, pick a package, pay in under 90 seconds.' },
          { n: '02', t: 'We print in 2 minutes', d: 'Instant 4×6 photo, die-cut sticker sheet, custom button or magnet.' },
          { n: '03', t: 'Scan the QR forever', d: 'A video message saved to your print — scannable at your 1, 5, and 10-year anniversary.' },
          { n: '04', t: '10% goes to the school', d: 'Every order automatically contributes to the PTSO fundraiser.' },
        ].map(item => (
          <div key={item.n} style={{ background: '#141414', borderRadius: 12,
                                     padding: '24px', textAlign: 'left',
                                     border: '1px solid #222' }}>
            <p style={{ fontSize: 11, color: '#555', letterSpacing: 3,
                        margin: '0 0 10px' }}>{item.n}</p>
            <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 8px' }}>{item.t}</p>
            <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6, margin: 0 }}>{item.d}</p>
          </div>
        ))}
      </div>

      {/* Contact */}
      <div style={{ borderTop: '1px solid #222', paddingTop: 32, width: '100%',
                    maxWidth: 600 }}>
        <p style={{ fontSize: 13, color: '#555', margin: '0 0 8px' }}>
          Ready to bring Un Momento to your event?
        </p>
        <a href="mailto:ceojess@unmomentoprints.com"
           style={{ color: '#ffffff', fontSize: 15, textDecoration: 'none',
                    borderBottom: '1px solid #444', paddingBottom: 2 }}>
          ceojess@unmomentoprints.com
        </a>
        <p style={{ fontSize: 12, color: '#444', margin: '24px 0 0' }}>
          © 2026 Un Momento Prints · California · Wisconsin
        </p>
      </div>

    </main>
  );
}