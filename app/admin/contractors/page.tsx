'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const ROLES = [
  'Site Manager',
  'Tent Manager',
  'Rover',
  'Design Assistant',
  'Tech Support',
  'Order Picker',
  'Hand-off Associate',
];

const SIZES = ['XS','S','M','L','XL','2XL','3XL'];

const C = {
  bg:      '#f4f6f8',
  surface: '#ffffff',
  border:  '#e2e8f0',
  text:    '#0f172a',
  muted:   '#64748b',
  faint:   '#94a3b8',
  green:   '#16a34a',
  greenBg: '#f0fdf4',
  greenBdr:'#bbf7d0',
  red:     '#b91c1c',
  redBg:   '#fef2f2',
  redBdr:  '#fecaca',
};

export default function AddContractorPage() {
  const router = useRouter();

  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [error,    setError]    = useState<string|null>(null);

  const [form, setForm] = useState({
    first_name:      '',
    last_name:       '',
    phone:           '',
    email:           '',
    preferred_role:  '',
    can_drive:       false,
    has_vehicle:     false,
    t_shirt_size:    '',
    emergency_name:  '',
    emergency_phone: '',
    notes:           '',
  });

  function set(k: string, v: any) {
    setForm(f => ({ ...f, [k]: v }));
    setError(null);
  }

  async function handleSubmit() {
    if (!form.first_name || !form.last_name || !form.phone) {
      setError('First name, last name, and phone are required.');
      return;
    }
    setLoading(true);
    try {
      const res  = await fetch('/api/admin/add-contractor', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  }

  const inp = {
    width: '100%', padding: '10px 12px',
    background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 8, color: C.text, fontSize: 14,
    outline: 'none', boxSizing: 'border-box' as const,
  };

  const label = (text: string, required = false) => (
    <p style={{ fontSize: 12, fontWeight: 500, color: C.muted,
                margin: '0 0 5px' }}>
      {text}{required && <span style={{ color: C.red }}> *</span>}
    </p>
  );

  if (success) {
    return (
      <main style={{ minHeight: '100vh', background: C.bg,
                     display: 'flex', alignItems: 'center',
                     justifyContent: 'center', padding: 24,
                     fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
        <div style={{ maxWidth: 400, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%',
                        background: C.greenBg, border: `2px solid ${C.green}`,
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'center', margin: '0 auto 16px',
                        fontSize: 28 }}>
            ✓
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: C.text,
                       margin: '0 0 8px' }}>
            Contractor added!
          </h2>
          <p style={{ color: C.muted, fontSize: 14, margin: '0 0 24px' }}>
            {form.first_name} {form.last_name} is now in the contractor directory.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={() => {
              setSuccess(false);
              setForm({
                first_name:'', last_name:'', phone:'', email:'',
                preferred_role:'', can_drive:false, has_vehicle:false,
                t_shirt_size:'', emergency_name:'', emergency_phone:'', notes:'',
              });
            }} style={{
              padding: '10px 20px', background: C.green, color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 13,
              fontWeight: 600, cursor: 'pointer',
            }}>
              Add another
            </button>
            <button onClick={() => router.push('/admin')} style={{
              padding: '10px 20px', background: C.surface, color: C.text,
              border: `1px solid ${C.border}`, borderRadius: 8,
              fontSize: 13, cursor: 'pointer',
            }}>
              Back to admin
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', background: C.bg, color: C.text,
                   fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                   padding: '32px 16px 48px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12,
                      marginBottom: 28 }}>
          <button onClick={() => router.push('/admin')} style={{
            padding: '6px 12px', background: C.surface,
            border: `1px solid ${C.border}`, borderRadius: 6,
            color: C.muted, fontSize: 12, cursor: 'pointer',
          }}>← Admin</button>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>
              Add contractor
            </h1>
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
              Un Momento field staff directory
            </p>
          </div>
        </div>

        {error && (
          <div style={{ background: C.redBg, border: `1px solid ${C.redBdr}`,
                        borderRadius: 8, padding: '10px 14px',
                        fontSize: 13, color: C.red, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ background: C.surface, borderRadius: 12,
                      border: `1px solid ${C.border}`, padding: '20px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Name */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              {label('First name', true)}
              <input style={inp} placeholder="Jessica"
                value={form.first_name}
                onChange={e => set('first_name', e.target.value)} />
            </div>
            <div>
              {label('Last name', true)}
              <input style={inp} placeholder="Smith"
                value={form.last_name}
                onChange={e => set('last_name', e.target.value)} />
            </div>
          </div>

          {/* Contact */}
          <div>
            {label('Phone number', true)}
            <input style={inp} placeholder="+1 (555) 000-0000" type="tel"
              value={form.phone}
              onChange={e => set('phone', e.target.value)} />
          </div>
          <div>
            {label('Email address')}
            <input style={inp} placeholder="jessica@email.com" type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)} />
          </div>

          {/* Role */}
          <div>
            {label('Preferred role')}
            <select style={{ ...inp, appearance: 'none' } as any}
              value={form.preferred_role}
              onChange={e => set('preferred_role', e.target.value)}>
              <option value="">Select a role…</option>
              {ROLES.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* T-shirt size */}
          <div>
            {label('T-shirt size')}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SIZES.map(s => (
                <button key={s} onClick={() => set('t_shirt_size', s)}
                  style={{
                    padding: '6px 12px', borderRadius: 6,
                    border: form.t_shirt_size === s
                      ? `1px solid ${C.green}` : `1px solid ${C.border}`,
                    background: form.t_shirt_size === s ? C.greenBg : C.surface,
                    color: form.t_shirt_size === s ? C.green : C.muted,
                    fontSize: 12, cursor: 'pointer', fontWeight: 500,
                  }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Checkboxes */}
          <div style={{ display: 'flex', gap: 16 }}>
            {[
              { key: 'can_drive',   label: '🚗 Can drive to events' },
              { key: 'has_vehicle', label: '🚙 Has own vehicle'     },
            ].map(c => (
              <div key={c.key}
                onClick={() => set(c.key, !(form as any)[c.key])}
                style={{ display: 'flex', alignItems: 'center', gap: 8,
                         cursor: 'pointer' }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                  border: `1.5px solid ${(form as any)[c.key] ? C.green : C.border}`,
                  background: (form as any)[c.key] ? C.green : C.surface,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {(form as any)[c.key] && (
                    <span style={{ color: '#fff', fontSize: 11 }}>✓</span>
                  )}
                </div>
                <span style={{ fontSize: 13, color: C.text }}>{c.label}</span>
              </div>
            ))}
          </div>

          {/* Emergency contact */}
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: C.muted,
                        margin: '0 0 10px', letterSpacing: 1,
                        textTransform: 'uppercase' }}>
              Emergency contact
            </p>
            <div style={{ display: 'grid',
                          gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                {label('Name')}
                <input style={inp} placeholder="Contact name"
                  value={form.emergency_name}
                  onChange={e => set('emergency_name', e.target.value)} />
              </div>
              <div>
                {label('Phone')}
                <input style={inp} placeholder="+1 (555) 000-0000" type="tel"
                  value={form.emergency_phone}
                  onChange={e => set('emergency_phone', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            {label('Notes')}
            <textarea style={{ ...inp, height: 80, resize: 'vertical' } as any}
              placeholder="Any relevant notes — certifications, availability, skills…"
              value={form.notes}
              onChange={e => set('notes', e.target.value)} />
          </div>

          {/* Submit */}
          <button onClick={handleSubmit} disabled={loading} style={{
            width: '100%', padding: 13,
            background: loading ? C.border : C.green,
            color:      loading ? C.faint  : '#fff',
            border: 'none', borderRadius: 8,
            fontSize: 14, fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer',
          }}>
            {loading ? 'Adding contractor…' : 'Add to directory →'}
          </button>
        </div>
      </div>
    </main>
  );
}