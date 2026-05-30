'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const COUNTRIES = [
  'United States', 'Canada', 'United Kingdom', 'Australia',
  'Germany', 'France', 'Japan', 'South Korea', 'India',
  'Brazil', 'Mexico', 'Nigeria', 'South Africa', 'Other',
];

const GRAD_MONTHS = [
  { value: 4,  label: 'April 2026'  },
  { value: 5,  label: 'May 2026'    },
  { value: 6,  label: 'June 2026'   },
];

type Step = 'info' | 'verify' | 'handle' | 'done';

export default function CreatorSignup() {
  const router = useRouter();

  const [step,       setStep]       = useState<Step>('info');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [handle,     setHandle]     = useState('');

  const [form, setForm] = useState({
    first_name:           '',
    last_name:            '',
    institution_name:     '',
    institution_country:  'United States',
    graduation_month:     5,
    program_or_grade:     '',
    edu_email:            '',
    parent_email:         '',
    social_link:          '',
    referred_by:          '',
    phone:                '',
    attestation:          false,
  });

  function set(k: string, v: any) {
    setForm(f => ({ ...f, [k]: v }));
    setError(null);
  }

  // Determine verification level client-side for UI feedback
  function getVerificationLevel() {
    if (form.edu_email && (
      form.edu_email.includes('.edu') ||
      form.edu_email.includes('.ac.') ||
      form.edu_email.includes('.school')
    )) return { level: 'edu_email', label: '✓ Instant approval — school email detected', color: '#4ADE80' };
    if (form.referred_by) return { level: 'referred', label: '✓ Fast approval — referred by a verified creator', color: '#4ADE80' };
    if (form.parent_email) return { level: 'parent_email', label: '⏱ 24–48hr review — parent email on file', color: '#BA7517' };
    if (form.attestation)  return { level: 'attestation',  label: '⏱ 24–48hr review — honor system attestation', color: '#BA7517' };
    return null;
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    try {
      const res  = await fetch('/api/creator/apply', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          ...form,
          graduation_date: `2026-${String(form.graduation_month).padStart(2,'0')}-15`,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        setLoading(false);
        return;
      }

      setHandle(data.handle);
      setStep('done');
    } catch (err) {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  }

  const vl  = getVerificationLevel();
  const inp = {
    width: '100%', padding: '10px 12px',
    background: '#1a1a1a', border: '1px solid #333',
    borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none',
  };

  // ── DONE ──────────────────────────────────────────────────
  if (step === 'done') {
    const isInstant = vl?.level === 'edu_email' || vl?.level === 'referred';
    return (
      <main style={{ minHeight:'100vh', background:'#0a0a0a', color:'#fff',
        fontFamily:'-apple-system, BlinkMacSystemFont, sans-serif',
        display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
        <div style={{ maxWidth:480, textAlign:'center' }}>
          <div style={{ width:64, height:64, borderRadius:'50%',
            background:'#0d1f0d', border:'2px solid #4ADE80',
            display:'flex', alignItems:'center', justifyContent:'center',
            margin:'0 auto 20px', fontSize:28 }}>
            {isInstant ? '✓' : '⏱'}
          </div>
          <h1 style={{ fontSize:24, fontWeight:500, margin:'0 0 12px' }}>
            {isInstant ? 'You\'re live!' : 'Application submitted!'}
          </h1>
          <p style={{ color:'#888', fontSize:14, lineHeight:1.7, margin:'0 0 20px' }}>
            {isInstant
              ? `Your storefront is ready. Share your link and start earning.`
              : `We'll review your application within 24–48 hours. You'll get an email when you're approved.`}
          </p>

          {isInstant && handle && (
            <div style={{ background:'#111', borderRadius:10, padding:'14px 16px',
              marginBottom:20, display:'flex', alignItems:'center',
              gap:10, justifyContent:'space-between' }}>
              <span style={{ fontSize:13, color:'#4ADE80' }}>
                unmomentoprints.com/{handle}
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(`https://unmomentoprints.com/${handle}`)}
                style={{ padding:'6px 12px', background:'#4ADE80', color:'#000',
                  border:'none', borderRadius:6, fontSize:12,
                  fontWeight:700, cursor:'pointer', flexShrink:0 }}>
                Copy
              </button>
            </div>
          )}

          <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
            {isInstant && (
              <a href={`/${handle}`} style={{ padding:'12px 20px',
                background:'#fff', color:'#000', borderRadius:8,
                textDecoration:'none', fontWeight:600, fontSize:14 }}>
                View my storefront →
              </a>
            )}
            <a href="/account" style={{ padding:'12px 20px',
              border:'1px solid #333', color:'#fff', borderRadius:8,
              textDecoration:'none', fontSize:14 }}>
              My account
            </a>
          </div>
        </div>
      </main>
    );
  }

  // ── MAIN FORM ─────────────────────────────────────────────
  return (
    <main style={{ minHeight:'100vh', background:'#0a0a0a', color:'#fff',
      fontFamily:'-apple-system, BlinkMacSystemFont, sans-serif',
      padding:'32px 16px 48px' }}>
      <div style={{ maxWidth:520, margin:'0 auto' }}>

        <div style={{ textAlign:'center', marginBottom:28 }}>
          <p style={{ fontSize:11, color:'#555', letterSpacing:4,
            textTransform:'uppercase', margin:'0 0 12px' }}>
            Un Momento Prints
          </p>
          <h1 style={{ fontSize:22, fontWeight:500, margin:'0 0 8px' }}>
            Become a creator
          </h1>
          <p style={{ color:'#888', fontSize:13, lineHeight:1.6, margin:0 }}>
            Spring 2026 graduation campaign · April 1 – June 30
          </p>
          <div style={{ background:'#0d1f0d', border:'1px solid #1a3a1a',
            borderRadius:8, padding:'8px 14px', margin:'12px 0 0',
            fontSize:12, color:'#4ADE80' }}>
            Earn 10% on every order through your link · 10% goes to your school
          </div>
        </div>

        {error && (
          <div style={{ background:'#2a0a0a', border:'1px solid #A32D2D',
            borderRadius:8, padding:'10px 14px', fontSize:13,
            color:'#ff6b6b', marginBottom:16 }}>
            {error}
          </div>
        )}

        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

          {/* Name */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <div>
              <p style={{ fontSize:11, color:'#666', margin:'0 0 5px' }}>First name *</p>
              <input style={inp} placeholder="Jessica"
                value={form.first_name}
                onChange={e => set('first_name', e.target.value)} />
            </div>
            <div>
              <p style={{ fontSize:11, color:'#666', margin:'0 0 5px' }}>Last name *</p>
              <input style={inp} placeholder="Ealy"
                value={form.last_name}
                onChange={e => set('last_name', e.target.value)} />
            </div>
          </div>

          {/* Institution */}
          <div>
            <p style={{ fontSize:11, color:'#666', margin:'0 0 5px' }}>School / institution name *</p>
            <input style={inp} placeholder="Mater Dei High School"
              value={form.institution_name}
              onChange={e => set('institution_name', e.target.value)} />
          </div>

          {/* Country */}
          <div>
            <p style={{ fontSize:11, color:'#666', margin:'0 0 5px' }}>Country *</p>
            <select style={{ ...inp, appearance:'none' } as any}
              value={form.institution_country}
              onChange={e => set('institution_country', e.target.value)}>
              {COUNTRIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Graduation month */}
          <div>
            <p style={{ fontSize:11, color:'#666', margin:'0 0 5px' }}>Graduation month *</p>
            <div style={{ display:'flex', gap:6 }}>
              {GRAD_MONTHS.map(m => (
                <button key={m.value}
                  onClick={() => set('graduation_month', m.value)}
                  style={{
                    flex:1, padding:'10px',
                    border: form.graduation_month === m.value
                      ? '1px solid #4ADE80' : '1px solid #333',
                    borderRadius:8,
                    background: form.graduation_month === m.value
                      ? '#0d1f0d' : 'transparent',
                    color: form.graduation_month === m.value
                      ? '#4ADE80' : '#888',
                    fontSize:12, cursor:'pointer',
                  }}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Program or grade */}
          <div>
            <p style={{ fontSize:11, color:'#666', margin:'0 0 5px' }}>
              Program or grade *
            </p>
            <p style={{ fontSize:11, color:'#555', margin:'0 0 5px' }}>
              College: major/program (e.g. "Computer Science") ·
              High school: grade (e.g. "12th grade / Senior")
            </p>
            <input style={inp} placeholder="e.g. Business Administration or 12th grade"
              value={form.program_or_grade}
              onChange={e => set('program_or_grade', e.target.value)} />
          </div>

          {/* Phone */}
          <div>
            <p style={{ fontSize:11, color:'#666', margin:'0 0 5px' }}>
              Phone number * (one creator account per number)
            </p>
            <input style={inp} placeholder="+1 (555) 000-0000" type="tel"
              value={form.phone}
              onChange={e => set('phone', e.target.value)} />
          </div>

          {/* Divider */}
          <div style={{ borderTop:'1px solid #222', paddingTop:12, marginTop:4 }}>
            <p style={{ fontSize:13, fontWeight:500, margin:'0 0 4px' }}>
              Verification — choose the fastest option available to you
            </p>
            <p style={{ fontSize:12, color:'#888', margin:'0 0 12px', lineHeight:1.6 }}>
              A school email or referral from a verified creator gets you approved instantly.
              Otherwise we'll review within 24–48 hours.
            </p>
          </div>

          {/* School / .edu email */}
          <div>
            <p style={{ fontSize:11, color:'#666', margin:'0 0 5px' }}>
              School or .edu email (preferred — instant approval)
            </p>
            <input style={inp} placeholder="jessica@materdei.edu or jessica@student.school.edu"
              type="email" value={form.edu_email}
              onChange={e => set('edu_email', e.target.value)} />
          </div>

          {/* Referred by */}
          <div>
            <p style={{ fontSize:11, color:'#666', margin:'0 0 5px' }}>
              Referred by a verified creator? (enter their handle)
            </p>
            <input style={inp} placeholder="e.g. jessica-ealy-4k9m"
              value={form.referred_by}
              onChange={e => set('referred_by', e.target.value)} />
          </div>

          {/* Parent email (high school / international) */}
          <div>
            <p style={{ fontSize:11, color:'#666', margin:'0 0 5px' }}>
              Parent or guardian email (required for high school students)
            </p>
            <input style={inp} placeholder="parent@email.com"
              type="email" value={form.parent_email}
              onChange={e => set('parent_email', e.target.value)} />
          </div>

          {/* Social link */}
          <div>
            <p style={{ fontSize:11, color:'#666', margin:'0 0 5px' }}>
              Social profile link (Instagram, TikTok, or LinkedIn)
            </p>
            <input style={inp} placeholder="https://instagram.com/yourhandle"
              value={form.social_link}
              onChange={e => set('social_link', e.target.value)} />
          </div>

          {/* Verification level indicator */}
          {vl && (
            <div style={{ background:'#111', border:`1px solid ${vl.color}40`,
              borderRadius:8, padding:'10px 14px',
              fontSize:12, color:vl.color }}>
              {vl.label}
            </div>
          )}

          {/* Attestation checkbox */}
          <div
            onClick={() => set('attestation', !form.attestation)}
            style={{ display:'flex', gap:10, alignItems:'flex-start',
              cursor:'pointer', padding:'10px 12px',
              background:'#111', borderRadius:8, border:'1px solid #222' }}>
            <div style={{ width:18, height:18, borderRadius:4, flexShrink:0,
              border:`1.5px solid ${form.attestation ? '#4ADE80' : '#444'}`,
              background: form.attestation ? '#4ADE80' : 'transparent',
              display:'flex', alignItems:'center', justifyContent:'center',
              marginTop:1 }}>
              {form.attestation && <span style={{ color:'#000', fontSize:12 }}>✓</span>}
            </div>
            <p style={{ fontSize:12, color:'#888', margin:0, lineHeight:1.6 }}>
              I confirm that I am a current student or Spring 2026 graduate of an
              educational institution, and that my graduation date falls between
              April 1 and June 30, 2026.
            </p>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading || !form.first_name || !form.last_name ||
              !form.institution_name || !form.program_or_grade ||
              !form.phone || !form.attestation}
            style={{
              width:'100%', padding:14,
              background: (!form.first_name || !form.last_name ||
                !form.institution_name || !form.program_or_grade ||
                !form.phone || !form.attestation || loading)
                ? '#333' : '#4ADE80',
              color: (!form.first_name || !form.last_name ||
                !form.institution_name || !form.program_or_grade ||
                !form.phone || !form.attestation || loading)
                ? '#888' : '#000',
              border:'none', borderRadius:10,
              fontSize:15, fontWeight:700,
              cursor: loading ? 'wait' : 'pointer',
            }}>
            {loading ? 'Submitting…' : 'Apply to be a creator →'}
          </button>

          <p style={{ fontSize:11, color:'#444', textAlign:'center',
            lineHeight:1.6, margin:0 }}>
            By applying you agree to Un Momento's creator terms.
            Earnings are paid as 1099 contractor income if $600+ in a year.
            Campaign runs April 1 – June 30, 2026.
          </p>
        </div>
      </div>
    </main>
  );
}