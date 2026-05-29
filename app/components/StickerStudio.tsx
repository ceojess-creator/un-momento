'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

// Fabric.js loaded dynamically to avoid SSR issues
let fabric: any = null;

const SHEET_W = 600;
const SHEET_H = 700;

const LAYOUTS = [
  { id: '1x1',   label: '1 large',    cols: 1, rows: 1 },
  { id: '2x2',   label: '4 stickers', cols: 2, rows: 2 },
  { id: '3x2',   label: '6 stickers', cols: 3, rows: 2 },
  { id: 'strip', label: '4 strip',    cols: 1, rows: 4 },
];

const SHAPES = [
  { id: 'circle',         label: '⭕ Circle'   },
  { id: 'rounded_square', label: '🟦 Rounded'  },
  { id: 'portrait',       label: '📷 Portrait' },
];

const FONTS = [
  'Arial', 'Georgia', 'Courier New', 'Impact', 'Comic Sans MS',
];

const CLIP_ART = [
  { emoji: '🎓', label: 'Grad cap'  },
  { emoji: '📜', label: 'Diploma'   },
  { emoji: '⭐', label: 'Star'      },
  { emoji: '🏆', label: 'Trophy'    },
  { emoji: '🎗️', label: 'Ribbon'   },
  { emoji: '🔥', label: 'Fire'      },
  { emoji: '✨', label: 'Sparkle'   },
  { emoji: '❤️', label: 'Heart'    },
  { emoji: '🎊', label: 'Confetti'  },
  { emoji: '💫', label: 'Stars'     },
  { emoji: '🌟', label: 'Glow'      },
  { emoji: '💪', label: 'Strong'    },
];

const TEXT_SUGGESTIONS = [
  'Class of 2026', 'DONE!', 'FINALLY!', '#GRAD2026',
  'The best is yet to come', 'Level up', 'Next chapter',
];

interface StickerStudioProps {
  onComplete: (dataUrl: string, layout: string, shape: string) => void;
  onBack:     () => void;
}

export default function StickerStudio({ onComplete, onBack }: StickerStudioProps) {
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const fabricRef      = useRef<any>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);

  const [layout,       setLayout]      = useState('2x2');
  const [shape,        setShape]       = useState('rounded_square');
  const [activePanel,  setActivePanel] = useState<'photo'|'text'|'overlays'|'layout'>('photo');
  const [removingBg,   setRemovingBg]  = useState(false);
  const [selectedObj,  setSelectedObj] = useState<any>(null);
  const [overlapWarn,  setOverlapWarn] = useState<string | null>(null);
  const [textInput,    setTextInput]   = useState('');
  const [textFont,     setTextFont]    = useState('Arial');
  const [textColor,    setTextColor]   = useState('#ffffff');
  const [textSize,     setTextSize]    = useState(24);
  const [fabricLoaded, setFabricLoaded] = useState(false);

  // Load Fabric.js dynamically
  useEffect(() => {
    import('fabric').then(f => {
      fabric = f;
      setFabricLoaded(true);
    });
  }, []);

  // Initialize Fabric canvas
  useEffect(() => {
    if (!fabricLoaded || !canvasRef.current) return;

    const fc = new fabric.Canvas(canvasRef.current, {
      width:           SHEET_W,
      height:          SHEET_H,
      backgroundColor: '#ffffff',
      selection:       true,
    });

    fabricRef.current = fc;

    // Draw layout grid guides
    drawLayoutGuides(fc, layout);

    // Selection events
    fc.on('selection:created',  (e: any) => setSelectedObj(e.selected?.[0]));
    fc.on('selection:updated',  (e: any) => setSelectedObj(e.selected?.[0]));
    fc.on('selection:cleared',  ()       => setSelectedObj(null));

    // Overlap detection on object move
    fc.on('object:moving', () => checkOverlaps(fc));
    fc.on('object:moved',  () => checkOverlaps(fc));

    return () => fc.dispose();
  }, [fabricLoaded, layout]);

  function drawLayoutGuides(fc: any, layoutId: string) {
    // Remove existing guides
    const guides = fc.getObjects().filter((o: any) => o.data?.type === 'guide');
    guides.forEach((g: any) => fc.remove(g));

    const l       = LAYOUTS.find(x => x.id === layoutId)!;
    const MARGIN  = 30;
    const GUTTER  = 10;
    const slotW   = (SHEET_W - MARGIN * 2 - GUTTER * (l.cols - 1)) / l.cols;
    const slotH   = (SHEET_H - MARGIN * 2 - GUTTER * (l.rows - 1)) / l.rows;

    for (let r = 0; r < l.rows; r++) {
      for (let c = 0; c < l.cols; c++) {
        const x = MARGIN + c * (slotW + GUTTER);
        const y = MARGIN + r * (slotH + GUTTER);

        // Slot boundary (dashed)
        const rect = new fabric.Rect({
          left:         x,
          top:          y,
          width:        slotW,
          height:       slotH,
          fill:         'rgba(240,240,240,0.3)',
          stroke:       '#FF0080',
          strokeWidth:  1,
          strokeDashArray: [4, 4],
          selectable:   false,
          evented:      false,
          data:         { type: 'guide', slot: r * l.cols + c },
        });
        fc.add(rect);

        // Slot number label
        const label = new fabric.Text(`${r * l.cols + c + 1}`, {
          left:         x + slotW / 2,
          top:          y + slotH / 2,
          fontSize:     20,
          fill:         '#ccc',
          textAlign:    'center',
          originX:      'center',
          originY:      'center',
          selectable:   false,
          evented:      false,
          data:         { type: 'guide' },
        });
        fc.add(label);
      }
    }

    // Registration marks
    [[8,8],[SHEET_W-26,8],[8,SHEET_H-26]].forEach(([rx,ry]) => {
      const mark = new fabric.Rect({
        left:       rx, top: ry,
        width:      18, height: 18,
        fill:       '#000',
        selectable: false,
        evented:    false,
        data:       { type: 'guide' },
      });
      fc.add(mark);
    });

    fc.renderAll();
  }

  // Overlap detection with warning
  function checkOverlaps(fc: any) {
    const objects = fc.getObjects().filter((o: any) => !o.data?.type);
    let warned    = false;

    for (let i = 0; i < objects.length; i++) {
      for (let j = i + 1; j < objects.length; j++) {
        const a = objects[i];
        const b = objects[j];

        if (!a.intersectsWithObject(b)) continue;

        // Calculate overlap area
        const aBounds = a.getBoundingRect();
        const bBounds = b.getBoundingRect();

        const overlapX = Math.max(0,
          Math.min(aBounds.left + aBounds.width,  bBounds.left + bBounds.width) -
          Math.max(aBounds.left, bBounds.left)
        );
        const overlapY = Math.max(0,
          Math.min(aBounds.top  + aBounds.height, bBounds.top  + bBounds.height) -
          Math.max(aBounds.top,  bBounds.top)
        );
        const overlapArea = overlapX * overlapY;
        const aArea       = aBounds.width * aBounds.height;
        const bArea       = bBounds.width * bBounds.height;

        // Warn if overlap > 30% of either object
        if (overlapArea / aArea > 0.30 || overlapArea / bArea > 0.30) {
          const aName = a.data?.label || a.type;
          const bName = b.data?.label || b.type;
          setOverlapWarn(
            `⚠️ "${aName}" is covering "${bName}" by more than 30%. ` +
            `The die-cut will follow the outer edge of both — is that what you want?`
          );
          warned = true;
          break;
        }
      }
      if (warned) break;
    }

    if (!warned) setOverlapWarn(null);
  }

  // Add photo to canvas
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !fabricRef.current) return;

    const url = URL.createObjectURL(file);
    fabric.Image.fromURL(url, (img: any) => {
      // Scale to fit a slot
      const l      = LAYOUTS.find(x => x.id === layout)!;
      const MARGIN = 30;
      const GUTTER = 10;
      const slotW  = (SHEET_W - MARGIN * 2 - GUTTER * (l.cols - 1)) / l.cols;
      const slotH  = (SHEET_H - MARGIN * 2 - GUTTER * (l.rows - 1)) / l.rows;

      const scale = Math.min(slotW / img.width!, slotH / img.height!);
      img.scale(scale);
      img.set({
        left: MARGIN + 10,
        top:  MARGIN + 10,
        data: { type: 'photo', label: 'photo', file },
      });
      fabricRef.current.add(img);
      fabricRef.current.setActiveObject(img);
      fabricRef.current.renderAll();
    });
  }

  // Remove background via API
  async function removeBackground() {
    const active = fabricRef.current?.getActiveObject();
    if (!active || active.data?.type !== 'photo') {
      alert('Select a photo first');
      return;
    }
    setRemovingBg(true);

    try {
      const file = active.data.file as File;
      const fd   = new FormData();
      fd.append('image', file);

      const res  = await fetch('/api/remove-bg', { method: 'POST', body: fd });
      const data = await res.json();

      if (data.url) {
        fabric.Image.fromURL(data.url, (newImg: any) => {
          newImg.set({
            left:    active.left,
            top:     active.top,
            scaleX:  active.scaleX,
            scaleY:  active.scaleY,
            angle:   active.angle,
            data:    { type: 'cutout', label: 'cutout' },
          });
          fabricRef.current.remove(active);
          fabricRef.current.add(newImg);
          fabricRef.current.setActiveObject(newImg);
          fabricRef.current.renderAll();
        });
      }
    } catch (err) {
      console.error('BG removal failed:', err);
    }
    setRemovingBg(false);
  }

  // Add text
  function addText() {
    if (!textInput || !fabricRef.current) return;
    const text = new fabric.Text(textInput, {
      left:     SHEET_W / 2,
      top:      SHEET_H / 2,
      fontSize: textSize,
      fontFamily: textFont,
      fill:     textColor,
      originX:  'center',
      originY:  'center',
      data:     { type: 'text', label: `text: "${textInput}"` },
    });
    fabricRef.current.add(text);
    fabricRef.current.setActiveObject(text);
    fabricRef.current.renderAll();
    setTextInput('');
  }

  // Add emoji / clip art
  function addEmoji(emoji: string) {
    if (!fabricRef.current) return;
    const text = new fabric.Text(emoji, {
      left:     SHEET_W / 2 + Math.random() * 60 - 30,
      top:      SHEET_H / 2 + Math.random() * 60 - 30,
      fontSize: 40,
      originX:  'center',
      originY:  'center',
      data:     { type: 'emoji', label: emoji },
    });
    fabricRef.current.add(text);
    fabricRef.current.setActiveObject(text);
    fabricRef.current.renderAll();
  }

  // Delete selected object
  function deleteSelected() {
    const active = fabricRef.current?.getActiveObject();
    if (!active || active.data?.type === 'guide') return;
    fabricRef.current.remove(active);
    fabricRef.current.renderAll();
    setSelectedObj(null);
  }

  // Bring forward / send back
  function bringForward() {
    const active = fabricRef.current?.getActiveObject();
    if (!active) return;
    fabricRef.current.bringForward(active);
    fabricRef.current.renderAll();
  }

  function sendBackward() {
    const active = fabricRef.current?.getActiveObject();
    if (!active) return;
    fabricRef.current.sendBackwards(active);
    fabricRef.current.renderAll();
  }

  // Handle layout change
  function handleLayoutChange(newLayout: string) {
    setLayout(newLayout);
    if (fabricRef.current) {
      drawLayoutGuides(fabricRef.current, newLayout);
    }
  }

  // Export final design
  function handleComplete() {
    if (!fabricRef.current) return;

    // Hide guides for export
    fabricRef.current.getObjects()
      .filter((o: any) => o.data?.type === 'guide')
      .forEach((o: any) => o.set({ visible: false }));

    const dataUrl = fabricRef.current.toDataURL({
      format:     'png',
      multiplier: 2,  // 2× for print quality
    });

    // Restore guides
    fabricRef.current.getObjects()
      .filter((o: any) => o.data?.type === 'guide')
      .forEach((o: any) => o.set({ visible: true }));

    fabricRef.current.renderAll();
    onComplete(dataUrl, layout, shape);
  }

  const panelBtn = (id: typeof activePanel, label: string) => (
    <button key={id} onClick={() => setActivePanel(id)}
      style={{
        flex: 1, padding: '7px 4px',
        background: activePanel === id ? '#1a1a1a' : 'transparent',
        border:     activePanel === id ? '1px solid #444' : '1px solid transparent',
        borderRadius: 8,
        color:      activePanel === id ? '#fff' : '#666',
        fontSize:   11, cursor: 'pointer', fontWeight: 500,
      }}
    >
      {label}
    </button>
  );

  if (!fabricLoaded) {
    return (
      <div style={{ textAlign: 'center', padding: '40px',
                    color: '#888', fontSize: 14 }}>
        Loading sticker studio…
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: 640 }}>

      <div style={{ textAlign: 'center', marginBottom: 10 }}>
        <h3 style={{ fontSize: 15, fontWeight: 500, margin: '0 0 4px' }}>
          Sticker sheet designer
        </h3>
        <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
          Drag elements freely. Pink dashed lines = die-cut area.
          Black squares = registration marks for Pixcut accuracy.
        </p>
      </div>

      {/* Overlap warning */}
      {overlapWarn && (
        <div style={{
          background: '#2a1a00', border: '1px solid #BA7517',
          borderRadius: 8, padding: '8px 12px',
          fontSize: 12, color: '#BA7517', marginBottom: 10,
          lineHeight: 1.5,
        }}>
          {overlapWarn}
          <button onClick={() => setOverlapWarn(null)}
            style={{
              marginLeft: 8, padding: '2px 8px',
              background: 'transparent', border: '1px solid #BA7517',
              borderRadius: 4, color: '#BA7517', fontSize: 11,
              cursor: 'pointer',
            }}>
            Got it
          </button>
        </div>
      )}

      {/* Fabric canvas */}
      <div style={{
        borderRadius: 10, overflow: 'hidden',
        border: '1px solid #333', marginBottom: 10,
        background: '#fff',
      }}>
        <canvas ref={canvasRef} />
      </div>

      {/* Selected object toolbar */}
      {selectedObj && selectedObj.data?.type !== 'guide' && (
        <div style={{
          display: 'flex', gap: 6, marginBottom: 10,
          background: '#111', borderRadius: 8, padding: '8px',
          border: '1px solid #222',
        }}>
          <span style={{ fontSize: 12, color: '#888', flex: 1,
                         alignSelf: 'center' }}>
            Selected: {selectedObj.data?.label || selectedObj.type}
          </span>
          <button onClick={bringForward}
            style={{ padding: '4px 8px', background: '#1a1a1a',
                     border: '1px solid #333', borderRadius: 6,
                     color: '#fff', fontSize: 11, cursor: 'pointer' }}>
            ↑ Forward
          </button>
          <button onClick={sendBackward}
            style={{ padding: '4px 8px', background: '#1a1a1a',
                     border: '1px solid #333', borderRadius: 6,
                     color: '#fff', fontSize: 11, cursor: 'pointer' }}>
            ↓ Back
          </button>
          <button onClick={deleteSelected}
            style={{ padding: '4px 8px', background: '#2a0a0a',
                     border: '1px solid #A32D2D', borderRadius: 6,
                     color: '#ff6b6b', fontSize: 11, cursor: 'pointer' }}>
            🗑 Delete
          </button>
        </div>
      )}

      {/* Panel tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        {panelBtn('photo',    '📷 Photo'   )}
        {panelBtn('text',     '✏️ Text'    )}
        {panelBtn('overlays', '🎨 Overlays')}
        {panelBtn('layout',   '📐 Layout'  )}
      </div>

      {/* Panel content */}
      <div style={{
        background: '#111', borderRadius: 10, padding: '12px',
        border: '1px solid #222', marginBottom: 10,
      }}>

        {/* Photo panel */}
        {activePanel === 'photo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '10px', background: '#4ADE80', color: '#000',
                border: 'none', borderRadius: 8, fontSize: 13,
                fontWeight: 700, cursor: 'pointer',
              }}>
              📷 Add photo to canvas
            </button>
            <input ref={fileInputRef} type="file" accept="image/*"
              style={{ display: 'none' }} onChange={handlePhotoUpload} />

            <button onClick={removeBackground} disabled={removingBg}
              style={{
                padding: '10px',
                background: removingBg ? '#333' : '#1a1a1a',
                color:      removingBg ? '#888' : '#fff',
                border: '1px solid #444', borderRadius: 8,
                fontSize: 13,
                cursor: removingBg ? 'wait' : 'pointer',
              }}>
              {removingBg
                ? '✨ Removing background…'
                : '✨ Remove background (select a photo first)'}
            </button>

            <p style={{ fontSize: 11, color: '#555', margin: 0,
                        lineHeight: 1.5 }}>
              After adding a photo, tap it to select it, then tap
              "Remove background" to cut out the graduate.
              Drag the cutout anywhere on the sheet.
            </p>
          </div>
        )}

        {/* Text panel */}
        {activePanel === 'text' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              placeholder="Type text to add…"
              onKeyDown={e => e.key === 'Enter' && addText()}
              style={{
                width: '100%', padding: '9px 12px',
                background: '#1a1a1a', border: '1px solid #333',
                borderRadius: 8, color: '#fff', fontSize: 13,
                outline: 'none',
              }}
            />

            {/* Quick suggestions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {TEXT_SUGGESTIONS.map(s => (
                <button key={s} onClick={() => setTextInput(s)}
                  style={{
                    padding: '4px 8px', borderRadius: 16,
                    border: '1px solid #333', background: 'transparent',
                    color: '#888', fontSize: 11, cursor: 'pointer',
                  }}>
                  {s}
                </button>
              ))}
            </div>

            {/* Font */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {FONTS.map(f => (
                <button key={f} onClick={() => setTextFont(f)}
                  style={{
                    padding: '4px 8px', borderRadius: 6,
                    border: textFont === f
                      ? '1px solid #4ADE80' : '1px solid #333',
                    background: textFont === f ? '#0d1f0d' : 'transparent',
                    color: textFont === f ? '#4ADE80' : '#666',
                    fontSize: 11, cursor: 'pointer', fontFamily: f,
                  }}>
                  {f}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, color: '#666', margin: '0 0 4px' }}>
                  Size: {textSize}px
                </p>
                <input type="range" min={10} max={60}
                  value={textSize}
                  onChange={e => setTextSize(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#4ADE80' }} />
              </div>
              <div>
                <p style={{ fontSize: 11, color: '#666', margin: '0 0 4px' }}>
                  Color
                </p>
                <input type="color" value={textColor}
                  onChange={e => setTextColor(e.target.value)}
                  style={{ width: 36, height: 28, border: 'none',
                           background: 'none', cursor: 'pointer' }} />
              </div>
            </div>

            <button onClick={addText} disabled={!textInput}
              style={{
                padding: '10px',
                background: textInput ? '#4ADE80' : '#333',
                color:      textInput ? '#000'    : '#888',
                border: 'none', borderRadius: 8, fontSize: 13,
                fontWeight: 700,
                cursor: textInput ? 'pointer' : 'not-allowed',
              }}>
              Add text to canvas
            </button>
          </div>
        )}

        {/* Overlays panel */}
        {activePanel === 'overlays' && (
          <div>
            <p style={{ fontSize: 11, color: '#666', margin: '0 0 8px' }}>
              Tap to add — drag to position on canvas
            </p>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
              gap: 6, marginBottom: 10,
            }}>
              {CLIP_ART.map(c => (
                <button key={c.emoji} onClick={() => addEmoji(c.emoji)}
                  style={{
                    padding: '8px 4px', borderRadius: 8,
                    border: '1px solid #333', background: '#1a1a1a',
                    cursor: 'pointer', textAlign: 'center',
                  }}>
                  <div style={{ fontSize: 22 }}>{c.emoji}</div>
                  <div style={{ fontSize: 9, color: '#666',
                                marginTop: 2 }}>{c.label}</div>
                </button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: '#666', margin: '0 0 6px' }}>
              More emojis
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {['🎉','🎊','💫','🌸','🦋','🙌','👑','🎵',
                '🌈','☀️','🌙','⚡','🎯','🏅','📸','🖼️'].map(e => (
                <button key={e} onClick={() => addEmoji(e)}
                  style={{
                    padding: '5px 8px', borderRadius: 16,
                    border: '1px solid #333', background: 'transparent',
                    fontSize: 18, cursor: 'pointer',
                  }}>
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Layout panel */}
        {activePanel === 'layout' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <p style={{ fontSize: 11, color: '#666', margin: '0 0 6px' }}>
                Layout — changing clears the canvas guides
              </p>
              <div style={{ display: 'grid',
                            gridTemplateColumns: 'repeat(2,1fr)', gap: 6 }}>
                {LAYOUTS.map(l => (
                  <button key={l.id} onClick={() => handleLayoutChange(l.id)}
                    style={{
                      padding: '8px',
                      border: layout === l.id
                        ? '1px solid #4ADE80' : '1px solid #333',
                      borderRadius: 8,
                      background: layout === l.id ? '#0d1f0d' : 'transparent',
                      color: layout === l.id ? '#4ADE80' : '#888',
                      fontSize: 12, cursor: 'pointer',
                    }}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontSize: 11, color: '#666', margin: '0 0 6px' }}>
                Die-cut shape
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                {SHAPES.map(s => (
                  <button key={s.id} onClick={() => setShape(s.id)}
                    style={{
                      flex: 1, padding: '8px',
                      border: shape === s.id
                        ? '1px solid #4ADE80' : '1px solid #333',
                      borderRadius: 8,
                      background: shape === s.id ? '#0d1f0d' : 'transparent',
                      color: shape === s.id ? '#4ADE80' : '#888',
                      fontSize: 11, cursor: 'pointer',
                    }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{
              background: '#0a0a0a', borderRadius: 8,
              padding: '8px 10px', fontSize: 11, color: '#555',
              lineHeight: 1.6,
            }}>
              Die-cut lines (pink dashed) show where the Pixcut S1 will cut.
              Registration marks (black squares) ensure accurate alignment.
              Keep important content 3mm inside the dashed line.
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onBack}
          style={{
            flex: 1, padding: 12, border: '1px solid #333',
            borderRadius: 10, background: 'transparent',
            color: '#fff', fontSize: 14, cursor: 'pointer',
          }}>
          ← Back
        </button>
        <button onClick={handleComplete}
          style={{
            flex: 2, padding: 12, background: '#4ADE80',
            color: '#000', border: 'none', borderRadius: 10,
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>
          Use this sticker sheet →
        </button>
      </div>
    </div>
  );
}