'use client';
import { useState, useEffect, useRef } from 'react';

interface Creator {
  handle:          string;
  display_name:    string;
  school_name:     string;
  graduation_year: number;
  total_donated:   number;
  avatar_url:      string | null;
  is_verified:     boolean;
}

interface CreatorSearchProps {
  onSelect:    (creator: Creator | null) => void;
  onSkip:      () => void;
  prefilledRef?: string;
}

export default function CreatorSearch({
  onSelect, onSkip, prefilledRef,
}: CreatorSearchProps) {
  const [query,    setQuery]    = useState('');
  const [school,   setSchool]   = useState('');
  const [results,  setResults]  = useState<Creator[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [selected, setSelected] = useState<Creator | null>(null);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(n);

  // Pre-fill from ?ref= param
  useEffect(() => {
    if (prefilledRef) {
      fetchByHandle(prefilledRef);
    }
  }, [prefilledRef]);

  async function fetchByHandle(handle: string) {
    setLoading(true);
    try {
      const res  = await fetch(`/api/creator/search?handle=${encodeURIComponent(handle)}`);
      const data = await res.json();
      if (data.creators?.length > 0) {
        setSelected(data.creators[0]);
        onSelect(data.creators[0]);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams({ q: query });
      if (school) params.set('school', school);
      params.set('year', '2026');
      const res  = await fetch(`/api/creator/search?${params}`);
      const data = await res.json();
      setResults(data.creators || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') search();
  }

  function selectCreator(c: Creator) {
    setSelected(c);
    onSelect(c);
  }

  function clearSelection() {
    setSelected(null);
    onSelect(null);
    setResults([]);
    setSearched(false);
    setQuery('');
  }

  const inp = {
    width: '100%', padding: '10px 12px',
    background: '#1a1a1a', border: '1px solid #333',
    borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none',
  };

  // Show selected creator confirmation
  if (selected) {
    return (
      <div style={{ width:'100%' }}>
        <p style={{ fontSize:13, fontWeight:500, margin:'0 0 10px' }}>
          Supporting
        </p>
        <div style={{
          background: '#0d1f0d', border: '1px solid #4ADE80',
          borderRadius: 12, padding: '14px 16px',
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', gap: 10,
        }}>
          <div>
            <p style={{ fontWeight:600, fontSize:14, margin:'0 0 3px',
                        color:'#4ADE80' }}>
              {selected.display_name}
              {selected.is_verified && (
                <span style={{ fontSize:11, marginLeft:6,
                               background:'#4ADE80', color:'#000',
                               padding:'1px 5px', borderRadius:4,
                               fontWeight:700 }}>✓</span>
              )}
            </p>
            <p style={{ fontSize:12, color:'#888', margin:0 }}>
              {selected.school_name}
              {selected.graduation_year ? ` · Class of ${selected.graduation_year}` : ''}
            </p>
            {selected.total_donated > 0 && (
              <p style={{ fontSize:11, color:'#4ADE80', margin:'3px 0 0' }}>
                {fmt(selected.total_donated)} raised for school
              </p>
            )}
          </div>
          <button onClick={clearSelection} style={{
            padding:'6px 10px', background:'transparent',
            border:'1px solid #333', borderRadius:6,
            color:'#888', fontSize:12, cursor:'pointer', flexShrink:0,
          }}>Change</button>
        </div>

        <div style={{ display:'flex', gap:8, marginTop:12 }}>
          <button onClick={() => onSelect(selected)} style={{
            flex:2, padding:12, background:'#4ADE80', color:'#000',
            border:'none', borderRadius:10, fontSize:14,
            fontWeight:700, cursor:'pointer',
          }}>Continue →</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width:'100%' }}>
      <div style={{ textAlign:'center', marginBottom:20 }}>
        <h3 style={{ fontSize:16, fontWeight:500, margin:'0 0 6px' }}>
          Who are you supporting?
        </h3>
        <p style={{ fontSize:13, color:'#888', margin:0, lineHeight:1.6 }}>
          Search for your grad by name. 10% of your order goes
          to their school — and they earn 10% too.
        </p>
      </div>

      {/* Search inputs */}
      <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:10 }}>
        <input
          style={inp}
          placeholder="Search by grad name or handle…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <input
          style={inp}
          placeholder="School name (optional — helps narrow results)"
          value={school}
          onChange={e => setSchool(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button onClick={search} disabled={!query || loading} style={{
          width:'100%', padding:12,
          background: !query || loading ? '#333' : '#fff',
          color:      !query || loading ? '#888' : '#000',
          border:'none', borderRadius:8, fontSize:14,
          fontWeight:700, cursor: !query || loading ? 'not-allowed' : 'pointer',
        }}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {/* Results */}
      {searched && !loading && results.length === 0 && (
        <div style={{ background:'#111', borderRadius:10, padding:'20px',
                      textAlign:'center', border:'1px solid #222',
                      marginBottom:12 }}>
          <p style={{ color:'#555', fontSize:13, margin:'0 0 8px' }}>
            No creators found matching "{query}"
            {school ? ` at ${school}` : ''}.
          </p>
          <p style={{ color:'#444', fontSize:12, margin:0 }}>
            They may not have signed up yet — ask them to join at
            unmomentoprints.com/creator/signup
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div style={{ marginBottom:12 }}>
          <p style={{ fontSize:11, color:'#666', margin:'0 0 8px' }}>
            {results.length} result{results.length !== 1 ? 's' : ''} — tap to select
          </p>
          {results.map(c => (
            <div key={c.handle} onClick={() => selectCreator(c)} style={{
              background:'#111', borderRadius:10, padding:'12px 14px',
              marginBottom:6, cursor:'pointer',
              border:'1px solid #222',
              display:'flex', justifyContent:'space-between',
              alignItems:'center', gap:10,
            }}>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontWeight:600, fontSize:13,
                            margin:'0 0 3px', display:'flex',
                            alignItems:'center', gap:5 }}>
                  {c.display_name}
                  {c.is_verified && (
                    <span style={{ fontSize:10, background:'#4ADE80',
                                   color:'#000', padding:'1px 5px',
                                   borderRadius:4, fontWeight:700 }}>✓</span>
                  )}
                </p>
                <p style={{ fontSize:12, color:'#888', margin:0,
                            overflow:'hidden', textOverflow:'ellipsis',
                            whiteSpace:'nowrap' }}>
                  {c.school_name}
                  {c.graduation_year ? ` · Class of ${c.graduation_year}` : ''}
                </p>
                <p style={{ fontSize:11, color:'#555', margin:'2px 0 0',
                            fontFamily:'monospace' }}>
                  {c.handle}
                </p>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                {c.total_donated > 0 && (
                  <p style={{ fontSize:11, color:'#4ADE80', margin:0 }}>
                    {fmt(c.total_donated)} raised
                  </p>
                )}
                <p style={{ fontSize:11, color:'#555', margin:'2px 0 0' }}>
                  Select →
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Skip / general fund */}
      <div style={{ borderTop:'1px solid #222', paddingTop:14 }}>
        <p style={{ fontSize:12, color:'#555', margin:'0 0 10px',
                    textAlign:'center', lineHeight:1.6 }}>
          Can't find your grad? Your 10% school donation will go to
          Un Momento's general PTSO fund and student scholarship pool.
        </p>
        <button onClick={onSkip} style={{
          width:'100%', padding:12,
          border:'1px solid #333', borderRadius:10,
          background:'transparent', color:'#888',
          fontSize:13, cursor:'pointer',
        }}>
          Skip — donate to general fund
        </button>
      </div>
    </div>
  );
}