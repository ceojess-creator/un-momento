'use client';
import { useState, useRef, useEffect } from 'react';

export type ElementType = 'photo' | 'text' | 'overlay' | 'shape';

export interface ToolbarAction {
  // Photo controls
  brightness?:    number;
  contrast?:      number;
  saturation?:    number;
  filter?:        string;
  // Text controls
  fontSize?:      number;
  fontFamily?:    string;
  fontBold?:      boolean;
  fontItalic?:    boolean;
  textColor?:     string;
  textAlign?:     'left'|'center'|'right';
  // Shape controls
  shapeColor?:    string;
  shapeBorder?:   string;
  borderWidth?:   number;
  opacity?:       number;
  // Transform
  rotation?:      number;
  flipX?:         boolean;
  flipY?:         boolean;
  // Z-order
  bringForward?:  boolean;
  sendBackward?:  boolean;
  // Delete
  delete?:        boolean;
  // Background
  bgColor?:       string;
}

interface EditorToolbarProps {
  visible:        boolean;
  elementType:    ElementType | null;
  position:       { x: number; y: number };
  // Current values
  brightness?:    number;
  contrast?:      number;
  saturation?:    number;
  filter?:        string;
  fontSize?:      number;
  fontFamily?:    string;
  fontBold?:      boolean;
  fontItalic?:    boolean;
  textColor?:     string;
  shapeColor?:    string;
  opacity?:       number;
  rotation?:      number;
  bgColor?:       string;
  // Callbacks
  onChange:       (action: ToolbarAction) => void;
  onClose:        () => void;
}

const FILTERS = [
  { id:'none',      label:'None'      },
  { id:'grayscale', label:'B&W'       },
  { id:'sepia',     label:'Sepia'     },
  { id:'warm',      label:'Warm'      },
  { id:'cool',      label:'Cool'      },
  { id:'vivid',     label:'Vivid'     },
  { id:'fade',      label:'Fade'      },
];

const FONTS = [
  'System UI', 'Georgia', 'Times New Roman',
  'Arial', 'Helvetica', 'Courier New',
  'Trebuchet MS', 'Impact',
];

const COLORS = [
  '#ffffff','#000000','#ff0000','#ff6b00',
  '#ffdd00','#00cc44','#0066ff','#9900ff',
  '#ff69b4','#00ffff','#8B4513','#808080',
];

const BG_COLORS = [
  '#ffffff','#000000','#0a0a0a','#1a1a2e',
  '#16213e','#f5f5f5','#fdf6e3','#e8f4f8',
  '#fff9f0','#f0fff4','#1a1a1a','#2d2d2d',
];

export default function EditorToolbar({
  visible, elementType, position,
  brightness=100, contrast=100, saturation=100,
  filter='none', fontSize=24, fontFamily='System UI',
  fontBold=false, fontItalic=false, textColor='#ffffff',
  shapeColor='#ffffff', opacity=100, rotation=0, bgColor='#000000',
  onChange, onClose,
}: EditorToolbarProps) {
  const [tab, setTab] = useState<'adjust'|'filter'|'text'|'transform'|'bg'>('adjust');
  const ref = useRef<HTMLDivElement>(null);

  // Auto-select relevant tab when element type changes
  useEffect(() => {
    if (elementType === 'text')    setTab('text');
    else if (elementType === 'shape') setTab('adjust');
    else setTab('adjust');
  }, [elementType]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (visible) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [visible, onClose]);

  if (!visible) return null;

  // Position toolbar — keep on screen
  const toolbarW = 280;
  const toolbarH = 320;
  const vw = typeof window !== 'undefined' ? window.innerWidth  : 400;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

  let left = position.x - toolbarW / 2;
  let top  = position.y + 20;

  if (left < 8)          left = 8;
  if (left + toolbarW > vw - 8) left = vw - toolbarW - 8;
  if (top  + toolbarH > vh - 8) top  = position.y - toolbarH - 20;
  if (top  < 8)          top  = 8;

  const sliderStyle = {
    width:'100%', accentColor:'#4ADE80',
    cursor:'pointer',
  };

  const tabBtn = (id: typeof tab, label: string, show: boolean) =>
    show ? (
      <button key={id} onClick={() => setTab(id)} style={{
        padding:'4px 8px', borderRadius:5, cursor:'pointer',
        background: tab===id ? '#4ADE80' : 'transparent',
        color:      tab===id ? '#000'    : '#aaa',
        border:     tab===id ? 'none'    : '1px solid transparent',
        fontSize:10, fontWeight: tab===id ? 700 : 400,
        whiteSpace:'nowrap',
      }}>{label}</button>
    ) : null;

  return (
    <div ref={ref} style={{
      position:   'fixed',
      left,
      top,
      width:      toolbarW,
      background: '#1a1a1a',
      border:     '1px solid #333',
      borderRadius: 12,
      boxShadow:  '0 8px 32px rgba(0,0,0,0.6)',
      zIndex:     9999,
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      color:      '#fff',
      userSelect: 'none',
    }}>

      {/* Header */}
      <div style={{
        display:'flex', justifyContent:'space-between',
        alignItems:'center', padding:'8px 12px',
        borderBottom:'1px solid #2a2a2a',
      }}>
        <span style={{ fontSize:11, color:'#888', textTransform:'uppercase',
                       letterSpacing:1 }}>
          {elementType === 'photo'   ? '📷 Photo'
         : elementType === 'text'    ? '✏️ Text'
         : elementType === 'overlay' ? '🎨 Overlay'
         : elementType === 'shape'   ? '⬜ Shape'
         : 'Edit'}
        </span>
        <button onClick={onClose} style={{
          background:'transparent', border:'none', color:'#666',
          cursor:'pointer', fontSize:16, padding:'0 4px',
        }}>✕</button>
      </div>

      {/* Tab bar */}
      <div style={{
        display:'flex', gap:2, padding:'6px 8px',
        borderBottom:'1px solid #2a2a2a', flexWrap:'wrap',
      }}>
        {tabBtn('adjust',    '⚙️ Adjust',    elementType !== 'text')}
        {tabBtn('filter',    '🎨 Filter',    elementType === 'photo')}
        {tabBtn('text',      '✏️ Text',      elementType === 'text')}
        {tabBtn('transform', '↻ Transform',  true)}
        {tabBtn('bg',        '🖼 Background', true)}
      </div>

      {/* Tab content */}
      <div style={{ padding:'10px 12px' }}>

        {/* Adjust tab */}
        {tab === 'adjust' && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {elementType === 'photo' && (
              <>
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between',
                                fontSize:11, color:'#888', marginBottom:3 }}>
                    <span>Brightness</span><span>{brightness}%</span>
                  </div>
                  <input type="range" min={0} max={200} value={brightness}
                    style={sliderStyle}
                    onChange={e => onChange({ brightness: +e.target.value })} />
                </div>
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between',
                                fontSize:11, color:'#888', marginBottom:3 }}>
                    <span>Contrast</span><span>{contrast}%</span>
                  </div>
                  <input type="range" min={0} max={200} value={contrast}
                    style={sliderStyle}
                    onChange={e => onChange({ contrast: +e.target.value })} />
                </div>
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between',
                                fontSize:11, color:'#888', marginBottom:3 }}>
                    <span>Saturation</span><span>{saturation}%</span>
                  </div>
                  <input type="range" min={0} max={200} value={saturation}
                    style={sliderStyle}
                    onChange={e => onChange({ saturation: +e.target.value })} />
                </div>
              </>
            )}
            <div>
              <div style={{ display:'flex', justifyContent:'space-between',
                            fontSize:11, color:'#888', marginBottom:3 }}>
                <span>Opacity</span><span>{opacity}%</span>
              </div>
              <input type="range" min={10} max={100} value={opacity}
                style={sliderStyle}
                onChange={e => onChange({ opacity: +e.target.value })} />
            </div>
            {elementType === 'shape' && (
              <div>
                <p style={{ fontSize:11, color:'#888', margin:'0 0 6px' }}>
                  Shape color
                </p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                  {COLORS.map(c => (
                    <div key={c} onClick={() => onChange({ shapeColor: c })}
                      style={{
                        width:22, height:22, borderRadius:4,
                        background:c, cursor:'pointer',
                        border: shapeColor===c
                          ? '2px solid #4ADE80' : '1px solid #444',
                      }}/>
                  ))}
                  <input type="color" value={shapeColor}
                    onChange={e => onChange({ shapeColor: e.target.value })}
                    style={{ width:22, height:22, padding:0, border:'none',
                             borderRadius:4, cursor:'pointer',
                             background:'transparent' }}
                    title="Custom color" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filter tab */}
        {tab === 'filter' && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {FILTERS.map(f => (
              <button key={f.id} onClick={() => onChange({ filter: f.id })}
                style={{
                  padding:'5px 10px', borderRadius:6, cursor:'pointer',
                  background: filter===f.id ? '#4ADE80' : '#2a2a2a',
                  color:      filter===f.id ? '#000'    : '#aaa',
                  border:     filter===f.id ? 'none'    : '1px solid #333',
                  fontSize:12,
                }}>
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Text tab */}
        {tab === 'text' && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <div>
              <p style={{ fontSize:11, color:'#888', margin:'0 0 4px' }}>Font</p>
              <select value={fontFamily}
                onChange={e => onChange({ fontFamily: e.target.value })}
                style={{
                  width:'100%', padding:'6px 8px',
                  background:'#2a2a2a', border:'1px solid #333',
                  borderRadius:6, color:'#fff', fontSize:12,
                  outline:'none',
                }}>
                {FONTS.map(f => (
                  <option key={f} value={f} style={{ fontFamily: f }}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div style={{ display:'flex', justifyContent:'space-between',
                            fontSize:11, color:'#888', marginBottom:3 }}>
                <span>Size</span><span>{fontSize}px</span>
              </div>
              <input type="range" min={10} max={120} value={fontSize}
                style={sliderStyle}
                onChange={e => onChange({ fontSize: +e.target.value })} />
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={() => onChange({ fontBold: !fontBold })} style={{
                flex:1, padding:'6px', borderRadius:6, cursor:'pointer',
                background: fontBold ? '#4ADE80' : '#2a2a2a',
                color:      fontBold ? '#000'    : '#aaa',
                border:     fontBold ? 'none'    : '1px solid #333',
                fontSize:13, fontWeight:700,
              }}>B</button>
              <button onClick={() => onChange({ fontItalic: !fontItalic })} style={{
                flex:1, padding:'6px', borderRadius:6, cursor:'pointer',
                background: fontItalic ? '#4ADE80' : '#2a2a2a',
                color:      fontItalic ? '#000'    : '#aaa',
                border:     fontItalic ? 'none'    : '1px solid #333',
                fontSize:13, fontStyle:'italic',
              }}>I</button>
              {(['left','center','right'] as const).map(a => (
                <button key={a} onClick={() => onChange({ textAlign: a })} style={{
                  flex:1, padding:'6px', borderRadius:6, cursor:'pointer',
                  background:'#2a2a2a', border:'1px solid #333',
                  color:'#aaa', fontSize:11,
                }}>
                  {a==='left'?'⬅':a==='center'?'↔':'➡'}
                </button>
              ))}
            </div>
            <div>
              <p style={{ fontSize:11, color:'#888', margin:'0 0 6px' }}>
                Text color
              </p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                {COLORS.map(c => (
                  <div key={c} onClick={() => onChange({ textColor: c })}
                    style={{
                      width:22, height:22, borderRadius:4,
                      background:c, cursor:'pointer',
                      border: textColor===c
                        ? '2px solid #4ADE80' : '1px solid #444',
                    }}/>
                ))}
                <input type="color" value={textColor}
                  onChange={e => onChange({ textColor: e.target.value })}
                  style={{ width:22, height:22, padding:0, border:'none',
                           borderRadius:4, cursor:'pointer',
                           background:'transparent' }}
                  title="Custom color" />
              </div>
            </div>
          </div>
        )}

        {/* Transform tab */}
        {tab === 'transform' && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <div>
              <div style={{ display:'flex', justifyContent:'space-between',
                            fontSize:11, color:'#888', marginBottom:3 }}>
                <span>Rotation</span><span>{rotation}°</span>
              </div>
              <input type="range" min={-180} max={180} value={rotation}
                style={sliderStyle}
                onChange={e => onChange({ rotation: +e.target.value })} />
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={() => onChange({ flipX: true })} style={{
                flex:1, padding:'8px', borderRadius:6, cursor:'pointer',
                background:'#2a2a2a', border:'1px solid #333',
                color:'#aaa', fontSize:12,
              }}>↔ Flip H</button>
              <button onClick={() => onChange({ flipY: true })} style={{
                flex:1, padding:'8px', borderRadius:6, cursor:'pointer',
                background:'#2a2a2a', border:'1px solid #333',
                color:'#aaa', fontSize:12,
              }}>↕ Flip V</button>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={() => onChange({ bringForward: true })} style={{
                flex:1, padding:'8px', borderRadius:6, cursor:'pointer',
                background:'#2a2a2a', border:'1px solid #333',
                color:'#aaa', fontSize:12,
              }}>⬆ Forward</button>
              <button onClick={() => onChange({ sendBackward: true })} style={{
                flex:1, padding:'8px', borderRadius:6, cursor:'pointer',
                background:'#2a2a2a', border:'1px solid #333',
                color:'#aaa', fontSize:12,
              }}>⬇ Backward</button>
            </div>
            <button onClick={() => onChange({ delete: true })} style={{
              width:'100%', padding:'8px', borderRadius:6, cursor:'pointer',
              background:'#2a0000', border:'1px solid #660000',
              color:'#ff4444', fontSize:12, fontWeight:600,
            }}>🗑 Delete element</button>
          </div>
        )}

        {/* Background tab */}
        {tab === 'bg' && (
          <div>
            <p style={{ fontSize:11, color:'#888', margin:'0 0 8px' }}>
              Canvas background
            </p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:8 }}>
              {BG_COLORS.map(c => (
                <div key={c} onClick={() => onChange({ bgColor: c })}
                  style={{
                    width:28, height:28, borderRadius:6,
                    background:c, cursor:'pointer',
                    border: bgColor===c
                      ? '2px solid #4ADE80'
                      : c==='#ffffff'
                        ? '1px solid #555'
                        : '1px solid #333',
                  }}/>
              ))}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <input type="color" value={bgColor}
                onChange={e => onChange({ bgColor: e.target.value })}
                style={{ width:36, height:36, padding:0, border:'none',
                         borderRadius:6, cursor:'pointer',
                         background:'transparent' }} />
              <span style={{ fontSize:11, color:'#888' }}>
                Custom color — {bgColor}
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}