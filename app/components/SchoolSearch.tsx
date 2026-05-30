'use client';
import { useState, useRef, useEffect } from 'react';

interface School {
  id:         string;
  nces_id:    string;
  name:       string;
  type:       string;
  city:       string;
  state_abbr: string;
  zip:        string;
}

interface SchoolSearchProps {
  value?:       School | null;
  onChange:     (school: School | null) => void;
  placeholder?: string;
  required?:    boolean;
  darkMode?:    boolean;
}

const TYPE_LABELS: Record<string, string> = {
  high_school:   '🎓 High School',
  middle_school: '📚 Middle School',
  elementary:    '🏫 Elementary',
  university:    '🎓 University',
  college:       '🎓 College',
  trade_school:  '🔧 Trade School',
  other:         '🏫 School',
};

export default function SchoolSearch({
  value, onChange, placeholder = 'Search for your school…',
  required = false, darkMode = false,
}: SchoolSearchProps) {
  const [query,   setQuery]   = useState(value?.name || '');
  const [results, setResults] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState(false);
  const [selected,setSelected]= useState<School | null>(value || null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const wrapRef     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (value) { setSelected(value); setQuery(value.name); }
  }, [value]);

  async function search(q: string) {
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res  = await fetch(`/api/schools/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.schools || []);
      setOpen(true);
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    setSelected(null);
    onChange(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 300);
  }

  function selectSchool(school: School) {
    setSelected(school);
    setQuery(school.name);
    setResults([]);
    setOpen(false);
    onChange(school);
  }

  function clear() {
    setSelected(null);
    setQuery('');
    setResults([]);
    onChange(null);
  }

  const bg      = darkMode ? '#1a1a1a' : '#ffffff';
  const border  = darkMode ? '#333'    : '#e2e8f0';
  const text     = darkMode ? '#fff'   : '#0f172a';
  const muted    = darkMode ? '#888'   : '#64748b';
  const dropBg  = darkMode ? '#1a1a1a' : '#ffffff';
  const hoverBg = darkMode ? '#222'    : '#f8fafc';

  return (
    <div ref={wrapRef} style={{ position:'relative', width:'100%' }}>
      <div style={{ position:'relative' }}>
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => query.length >= 2 && results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          required={required && !selected}
          style={{
            width:'100%', padding:'10px 36px 10px 12px',
            background: selected ? (darkMode?'#0d2a0d':'#f0fdf4') : bg,
            border:`1px solid ${selected?'#4ADE80':border}`,
            borderRadius:8, color:text, fontSize:14,
            outline:'none', boxSizing:'border-box' as const,
          }}
        />
        <div style={{
          position:'absolute', right:10, top:'50%',
          transform:'translateY(-50%)', fontSize:14, color:muted,
        }}>
          {loading
            ? '⏳'
            : selected
              ? <span onClick={clear} style={{cursor:'pointer',color:'#4ADE80'}}>✓</span>
              : query
                ? <span onClick={clear} style={{cursor:'pointer'}}>✕</span>
                : '🔍'}
        </div>
      </div>

      {selected && (
        <div style={{
          marginTop:6, padding:'6px 10px',
          background: darkMode?'#0d2a0d':'#f0fdf4',
          border:'1px solid #4ADE80', borderRadius:6, fontSize:12,
          display:'flex', justifyContent:'space-between', alignItems:'center',
        }}>
          <div>
            <span style={{fontWeight:600, color:'#16a34a'}}>{selected.name}</span>
            <span style={{color:muted, marginLeft:6}}>
              {TYPE_LABELS[selected.type]||selected.type}
              {selected.city ? ` · ${selected.city}, ${selected.state_abbr}` : ''}
            </span>
          </div>
          <button onClick={clear} style={{
            background:'transparent', border:'none',
            color:muted, cursor:'pointer', fontSize:12, padding:'0 4px',
          }}>Change</button>
        </div>
      )}

      {open && results.length > 0 && (
        <div style={{
          position:'absolute', top:'100%', left:0, right:0,
          background:dropBg, border:`1px solid ${border}`,
          borderRadius:8, boxShadow:'0 4px 16px rgba(0,0,0,0.12)',
          zIndex:1000, maxHeight:280, overflowY:'auto', marginTop:4,
        }}>
          {results.map(school => (
            <div key={school.id}
              onClick={() => selectSchool(school)}
              style={{
                padding:'10px 12px', cursor:'pointer',
                borderBottom:`1px solid ${border}`,
                background:'transparent',
              }}
              onMouseEnter={e=>(e.currentTarget.style.background=hoverBg)}
              onMouseLeave={e=>(e.currentTarget.style.background='transparent')}
            >
              <p style={{fontSize:13,fontWeight:600,color:text,margin:'0 0 2px'}}>
                {school.name}
              </p>
              <p style={{fontSize:11,color:muted,margin:0}}>
                {TYPE_LABELS[school.type]||school.type}
                {school.city ? ` · ${school.city}, ${school.state_abbr}` : ''}
                {school.zip  ? ` ${school.zip}` : ''}
              </p>
            </div>
          ))}
          {results.length === 20 && (
            <div style={{padding:'8px 12px',fontSize:11,color:muted,textAlign:'center'}}>
              Showing top 20 — type more to narrow results
            </div>
          )}
        </div>
      )}

      {open && results.length === 0 && query.length >= 2 && !loading && (
        <div style={{
          position:'absolute', top:'100%', left:0, right:0,
          background:dropBg, border:`1px solid ${border}`,
          borderRadius:8, padding:'12px', zIndex:1000, marginTop:4,
          fontSize:12, color:muted, boxShadow:'0 4px 16px rgba(0,0,0,0.12)',
        }}>
          No schools found for "{query}". Try a different spelling.
        </div>
      )}
    </div>
  );
}