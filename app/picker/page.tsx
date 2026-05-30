'use client';
import { useState, useEffect } from 'react';

interface AssemblyItem {
  id:                string;
  status:            string;
  items_expected:    number;
  items_ready:       number;
  pickup_location:   string;
  ready_at:          string;
  customer_notified: boolean;
  buyer_name:        string;
  buyer_phone:       string;
  buyer_email:       string;
  product_type:      string;
  event_name:        string;
  order_number:      number | null;
}

interface PrintItem {
  id:            string;
  queued_at:     string;
  print_type:    string;
  status:        string;
  customer_name: string;
  asset_tag:     string;
  device_name:   string;
  file_url:      string;
  buyer_name:    string;
  order_number:  number | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending:    '#BA7517',
  printing:   '#60a5fa',
  assembling: '#a855f7',
  ready:      '#4ADE80',
  handed_off: '#555',
};

export default function PickerPage() {
  const [pin,         setPin]         = useState('');
  const [authed,      setAuthed]      = useState(false);
  const [assembly,    setAssembly]    = useState<AssemblyItem[]>([]);
  const [printQueue,  setPrintQueue]  = useState<PrintItem[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [message,     setMessage]     = useState<string|null>(null);
  const [activeTab,   setActiveTab]   = useState<'queue'|'print'>('queue');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const EVENT_PIN = '2026';

  async function fetchData() {
    setLoading(true);
    try {
      const [aRes, pRes] = await Promise.all([
        fetch('/api/picker/queue'),
        fetch('/api/picker/print-queue'),
      ]);
      const aData = await aRes.json();
      const pData = await pRes.json();
      setAssembly(aData.items   || []);
      setPrintQueue(pData.items || []);
      setLastRefresh(new Date());
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!authed) return;
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [authed]);

  async function markReady(assemblyId: string, buyerName: string, buyerPhone: string) {
    try {
      const res  = await fetch('/api/picker/mark-ready', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          assembly_id:     assemblyId,
          pickup_location: 'Un Momento booth — Hand-off table',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`✓ ${buyerName} notified by SMS`);
        fetchData();
      }
    } catch (err) { console.error(err); }
    setTimeout(() => setMessage(null), 3000);
  }

  async function markHandedOff(assemblyId: string, buyerName: string) {
    try {
      await fetch('/api/picker/handoff', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ assembly_id: assemblyId }),
      });
      setMessage(`✓ ${buyerName} order handed off`);
      fetchData();
    } catch (err) { console.error(err); }
    setTimeout(() => setMessage(null), 3000);
  }

  async function markPrintComplete(printId: string) {
    try {
      await fetch('/api/picker/print-done', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ print_id: printId }),
      });
      setMessage('✓ Print marked complete');
      fetchData();
    } catch (err) { console.error(err); }
    setTimeout(() => setMessage(null), 2000);
  }

  // PIN screen
  if (!authed) {
    return (
      <main style={{
        minHeight: '100vh', background: '#0a0a0a', color: '#fff',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 24,
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      }}>
        <div style={{ textAlign: 'center', width: '100%', maxWidth: 300 }}>
          <p style={{ fontSize: 11, color: '#555', letterSpacing: 4,
                      textTransform: 'uppercase', margin: '0 0 12px' }}>
            Un Momento
          </p>
          <h1 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 6px' }}>
            Order Picker
          </h1>
          <p style={{ fontSize: 13, color: '#888', margin: '0 0 28px' }}>
            Enter your event PIN to continue
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center',
                        marginBottom: 24 }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{
                width: 14, height: 14, borderRadius: '50%',
                background: pin.length > i ? '#4ADE80' : '#333',
                transition: 'background .15s',
              }}/>
            ))}
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8,
          }}>
            {['1','2','3','4','5','6','7','8','9','','0','⌫'].map(k => (
              <button key={k} onClick={() => {
                if (k === '⌫') {
                  setPin(p => p.slice(0,-1));
                } else if (k === '') {
                  // empty cell
                } else if (pin.length < 4) {
                  const newPin = pin + k;
                  setPin(newPin);
                  if (newPin.length === 4) {
                    if (newPin === EVENT_PIN) {
                      setAuthed(true);
                    } else {
                      setTimeout(() => setPin(''), 500);
                    }
                  }
                }
              }} style={{
                padding: '18px', borderRadius: 10, fontSize: 20,
                fontWeight: 500,
                background: k === '' ? 'transparent' : '#1a1a1a',
                border:     k === '' ? 'none' : '1px solid #333',
                color: '#fff', cursor: k === '' ? 'default' : 'pointer',
              }}>
                {k}
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  const pendingCount = assembly.filter(a => a.status !== 'handed_off').length;
  const printPending = printQueue.filter(p =>
    p.status === 'queued' || p.status === 'printing'
  ).length;

  return (
    <main style={{
      minHeight: '100vh', background: '#0a0a0a', color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      paddingBottom: 80,
    }}>

      {/* Header */}
      <div style={{
        background: '#111', borderBottom: '1px solid #222',
        padding: '12px 16px', position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <p style={{ fontSize: 11, color: '#555', margin: '0 0 1px',
                      letterSpacing: 2, textTransform: 'uppercase' }}>
            Un Momento
          </p>
          <p style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>
            Order Picker
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {message && (
            <span style={{ fontSize: 12, color: '#4ADE80',
                           background: '#0d1f0d', padding: '4px 10px',
                           borderRadius: 6 }}>
              {message}
            </span>
          )}
          <button onClick={fetchData} style={{
            padding: '6px 12px', background: '#1a1a1a',
            border: '1px solid #333', borderRadius: 6,
            color: loading ? '#555' : '#fff', fontSize: 12, cursor: 'pointer',
          }}>
            {loading ? '⏳' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Last refresh */}
      <div style={{ padding: '6px 16px', background: '#0d0d0d',
                    fontSize: 10, color: '#444', textAlign: 'center' }}>
        Last updated: {lastRefresh.toLocaleTimeString()} · auto-refreshes every 30s
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 4, padding: '10px 16px',
        borderBottom: '1px solid #1a1a1a',
      }}>
        <button onClick={() => setActiveTab('queue')} style={{
          flex: 1, padding: '10px',
          background: activeTab === 'queue' ? '#1a1a1a' : 'transparent',
          border:     activeTab === 'queue' ? '1px solid #333' : '1px solid transparent',
          borderRadius: 8, color: activeTab === 'queue' ? '#fff' : '#666',
          fontSize: 13, cursor: 'pointer', fontWeight: 500,
        }}>
          📦 Assembly ({pendingCount})
        </button>
        <button onClick={() => setActiveTab('print')} style={{
          flex: 1, padding: '10px',
          background: activeTab === 'print' ? '#1a1a1a' : 'transparent',
          border:     activeTab === 'print' ? '1px solid #333' : '1px solid transparent',
          borderRadius: 8, color: activeTab === 'print' ? '#fff' : '#666',
          fontSize: 13, cursor: 'pointer', fontWeight: 500,
        }}>
          🖨️ Printing ({printPending})
        </button>
      </div>

      <div style={{ padding: '12px 16px' }}>

        {/* Assembly queue */}
        {activeTab === 'queue' && (
          <div>
            {assembly.length === 0 ? (
              <div style={{
                background: '#0d1f0d', border: '1px solid #1a3a1a',
                borderRadius: 12, padding: '32px', textAlign: 'center',
                marginTop: 20,
              }}>
                <p style={{ fontSize: 24, margin: '0 0 8px' }}>✓</p>
                <p style={{ fontSize: 14, color: '#4ADE80', margin: 0 }}>
                  Queue empty — all caught up!
                </p>
              </div>
            ) : assembly.map(item => (
              <div key={item.id} style={{
                background: '#111', borderRadius: 12, padding: '14px',
                marginBottom: 10,
                border: `1px solid ${item.status === 'ready' ? '#4ADE8033' : '#222'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                              alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 16, margin: '0 0 3px' }}>
                      {item.buyer_name}
                      {item.order_number && (
                        <span style={{ marginLeft: 8, fontSize: 12,
                                       color: '#4ADE80', fontWeight: 500,
                                       fontFamily: 'monospace' }}>
                          #{item.order_number}
                        </span>
                      )}
                    </p>
                    <p style={{ fontSize: 12, color: '#888', margin: '0 0 4px' }}>
                      {item.product_type?.replace(/_/g,' ')}
                    </p>
                    {item.pickup_location && (
                      <p style={{ fontSize: 11, color: '#4ADE80', margin: 0 }}>
                        📍 {item.pickup_location}
                      </p>
                    )}
                  </div>
                  <span style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 10,
                    background: (STATUS_COLORS[item.status] || '#555') + '22',
                    color:       STATUS_COLORS[item.status] || '#555',
                    fontWeight:  600, flexShrink: 0,
                  }}>
                    {item.status}
                  </span>
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between',
                                fontSize: 12, color: '#888', marginBottom: 4 }}>
                    <span>Items ready</span>
                    <span style={{
                      fontWeight: 600,
                      color: item.items_ready >= item.items_expected
                        ? '#4ADE80' : '#fff',
                    }}>
                      {item.items_ready}/{item.items_expected}
                    </span>
                  </div>
                  <div style={{ height: 6, background: '#222',
                                borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 3,
                      background: item.items_ready >= item.items_expected
                        ? '#4ADE80' : '#BA7517',
                      width: `${Math.min(100,
                        (item.items_ready / Math.max(1, item.items_expected)) * 100
                      )}%`,
                      transition: 'width .3s',
                    }}/>
                  </div>
                </div>

                {item.customer_notified && (
                  <p style={{ fontSize: 11, color: '#4ADE80', margin: '0 0 10px' }}>
                    ✓ Customer notified by SMS
                    {item.ready_at
                      ? ` at ${new Date(item.ready_at).toLocaleTimeString()}`
                      : ''}
                  </p>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  {item.status !== 'ready' && item.status !== 'handed_off' && (
                    <button
                      onClick={() => markReady(item.id, item.buyer_name, item.buyer_phone)}
                      style={{
                        flex: 1, padding: '12px',
                        background: '#4ADE80', color: '#000',
                        border: 'none', borderRadius: 8,
                        fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      }}>
                      ✓ Mark ready + SMS
                    </button>
                  )}
                  {item.status === 'ready' && !item.customer_notified && item.buyer_phone && (
                    <button
                      onClick={() => markReady(item.id, item.buyer_name, item.buyer_phone)}
                      style={{
                        flex: 1, padding: '12px',
                        background: '#0d1f0d', color: '#4ADE80',
                        border: '1px solid #4ADE80', borderRadius: 8,
                        fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      }}>
                      📱 Resend SMS
                    </button>
                  )}
                  {item.status === 'ready' && (
                    <button
                      onClick={() => markHandedOff(item.id, item.buyer_name)}
                      style={{
                        flex: 1, padding: '12px',
                        background: '#1a1a1a', color: '#fff',
                        border: '1px solid #333', borderRadius: 8,
                        fontSize: 13, fontWeight: 500, cursor: 'pointer',
                      }}>
                      🤝 Handed off
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Print queue */}
        {activeTab === 'print' && (
          <div>
            {printQueue.length === 0 ? (
              <div style={{
                background: '#0d1f0d', border: '1px solid #1a3a1a',
                borderRadius: 12, padding: '32px', textAlign: 'center',
                marginTop: 20,
              }}>
                <p style={{ fontSize: 24, margin: '0 0 8px' }}>✓</p>
                <p style={{ fontSize: 14, color: '#4ADE80', margin: 0 }}>
                  Print queue empty!
                </p>
              </div>
            ) : printQueue.map(item => (
              <div key={item.id} style={{
                background: '#111', borderRadius: 12, padding: '14px',
                marginBottom: 10, border: '1px solid #222',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                              alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 15, margin: '0 0 3px' }}>
                      {item.buyer_name || item.customer_name}
                      {item.order_number && (
                        <span style={{ marginLeft: 8, fontSize: 12,
                                       color: '#4ADE80', fontWeight: 500,
                                       fontFamily: 'monospace' }}>
                          #{item.order_number}
                        </span>
                      )}
                    </p>
                    <p style={{ fontSize: 12, color: '#888', margin: '0 0 3px' }}>
                      {item.print_type?.replace(/_/g,' ')}
                    </p>
                    {item.device_name && (
                      <p style={{ fontSize: 11, color: '#555', margin: 0 }}>
                        🖨️ {item.device_name}
                        {item.asset_tag ? ` (${item.asset_tag})` : ''}
                      </p>
                    )}
                  </div>
                  <span style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 10,
                    background: item.status === 'printing'
                      ? '#60a5fa22' : '#BA751722',
                    color: item.status === 'printing' ? '#60a5fa' : '#BA7517',
                    fontWeight: 600, flexShrink: 0,
                  }}>
                    {item.status}
                  </span>
                </div>

                {item.file_url && (
                  <a href={item.file_url} target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'block', padding: '8px 12px',
                      background: '#1a1a1a', border: '1px solid #333',
                      borderRadius: 7, color: '#888', fontSize: 12,
                      textDecoration: 'none', marginBottom: 10,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                    📄 View print file →
                  </a>
                )}

                <button
                  onClick={() => markPrintComplete(item.id)}
                  style={{
                    width: '100%', padding: '12px',
                    background: '#4ADE80', color: '#000',
                    border: 'none', borderRadius: 8,
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  }}>
                  ✓ Print complete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#111', borderTop: '1px solid #222',
        padding: '10px 16px', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center',
      }}>
        <p style={{ fontSize: 11, color: '#555', margin: 0 }}>
          Order Picker · PIN {EVENT_PIN}
        </p>
        <button onClick={() => setAuthed(false)} style={{
          padding: '6px 12px', background: 'transparent',
          border: '1px solid #333', borderRadius: 6,
          color: '#666', fontSize: 11, cursor: 'pointer',
        }}>
          Lock screen
        </button>
      </div>
    </main>
  );
}