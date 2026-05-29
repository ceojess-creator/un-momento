'use client';
import { useEffect, useRef, useState } from 'react';

// ── Constants ─────────────────────────────────────────────────
const SHEET_W = 600;   // 4" × 150 DPI preview
const SHEET_H = 700;   // 4.7" × 150 DPI preview

const LAYOUTS = [
  { id: '1x1',  label: '1 large',     cols: 1, rows: 1 },
  { id: '2x2',  label: '4 stickers',  cols: 2, rows: 2 },
  { id: '3x2',  label: '6 stickers',  cols: 3, rows: 2 },
  { id: 'strip',label: '4 strip',     cols: 1, rows: 4 },
];

const SHAPES = [
  { id: 'circle',         label: '⭕ Circle'   },
  { id: 'rounded_square', label: '🟦 Rounded'  },
  { id: 'portrait',       label: '📷 Portrait' },
];

const FONTS = [
  { id: 'Arial',           label: 'Classic'    },
  { id: 'Georgia',         label: 'Serif'      },
  { id: 'Courier New',     label: 'Typewriter' },
  { id: 'Impact',          label: 'Bold'       },
  { id: 'Comic Sans MS',   label: 'Fun'        },
];

const GRAD_EMOJIS = [
  '🎓','🎊','🎉','⭐','✨','🌟','💫','🏆',
  '📜','🎗️','🌸','🦋','🔥','💪','🙌','❤️',
  '2026','CLASS OF','#GRAD','DONE!','FINALLY',
];

const CLIP_ART = [
  { id: 'cap',     emoji: '🎓', label: 'Grad cap'  },
  { id: 'diploma', emoji: '📜', label: 'Diploma'   },
  { id: 'star',    emoji: '⭐', label: 'Star'       },
  { id: 'trophy',  emoji: '🏆', label: 'Trophy'     },
  { id: 'ribbon',  emoji: '🎗️', label: 'Ribbon'    },
  { id: 'fire',    emoji: '🔥', label: 'Fire'       },
  { id: 'sparkle', emoji: '✨', label: 'Sparkle'   },
  { id: 'heart',   emoji: '❤️', label: 'Heart'     },
];

interface StickerSlot {
  id:          number;
  photoUrl:    string | null;
  bgRemoved:   string | null;  // base64 PNG with bg removed
  text:        string;
  textFont:    string;
  textColor:   string;
  textSize:    number;
  overlays:    string[];       // emojis/clip art
  filter:      string;
}

interface StickerStudioProps {
  onComplete: (slots: StickerSlot[], layout: string, shape: string) => void;
  onBack:     () => void;
}

export default function StickerStudio({ onComplete, onBack }: StickerStudioProps) {
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);

  const [layout,      setLayout]      = useState('2x2');
  const [shape,       setShape]       = useState('rounded_square');
  const [activeSlot,  setActiveSlot]  = useState(0);
  const [removingBg,  setRemovingBg]  = useState(false);
  const [activePanel, setActivePanel] = useState<'photo' | 'text' | 'overlays' | 'layout'>('photo');

  const selectedLayout = LAYOUTS.find(l => l.id === layout)!;
  const slotCount      = selectedLayout.cols * selectedLayout.rows;

  const [slots, setSlots] = useState<StickerSlot[]>(() =>
    Array.from({ length: 9 }, (_, i) => ({
      id:       i,
      photoUrl: null,
      bgRemoved: null,
      text:     '',
      textFont: 'Arial',
      textColor: '#ffffff',
      textSize: 18,
      overlays: [],
      filter:   'none',
    }))
  );

  const slot = slots[activeSlot];

  function updateSlot(updates: Partial<StickerSlot>) {
    setSlots(prev => prev.map((s, i) =>
      i === activeSlot ? { ...s, ...updates } : s
    ));
  }

  // ── Upload photo for active slot ─────────────────────────
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    updateSlot({ photoUrl: url, bgRemoved: null });
  }

  // ── Remove background ─────────────────────────────────────
  async function removeBackground() {
    if (!slot.photoUrl) return;
    setRemovingBg(true);

    try {
      // Convert blob URL to file
      const blob   = await fetch(slot.photoUrl).then(r => r.blob());
      const file   = new File([blob], 'photo.jpg', { type: blob.type });
      const fd     = new FormData();
      fd.append('image', file);

      const res  = await fetch('/api/remove-bg', { method: 'POST', body: fd });
      const data = await res.json();

      if (data.url) {
        updateSlot({ bgRemoved: data.url });
      }
    } catch (err) {
      console.error('BG removal failed:', err);
    }
    setRemovingBg(false);
  }

  // ── Toggle overlay ────────────────────────────────────────
  function toggleOverlay(emoji: string) {
    updateSlot({
      overlays: slot.overlays.includes(emoji)
        ? slot.overlays.filter(o => o !== emoji)
        : [...slot.overlays, emoji],
    });
  }

  // ── Render canvas preview ─────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, SHEET_W, SHEET_H);

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, SHEET_W, SHEET_H);

    const { cols, rows } = selectedLayout;
    const MARGIN  = 30;
    const GUTTER  = 10;
    const slotW   = (SHEET_W - MARGIN * 2 - GUTTER * (cols - 1)) / cols;
    const slotH   = (SHEET_H - MARGIN * 2 - GUTTER * (rows - 1)) / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx  = r * cols + c;
        const s    = slots[idx];
        const x    = MARGIN + c * (slotW + GUTTER);
        const y    = MARGIN + r * (slotH + GUTTER);
        const isActive = idx === activeSlot;

        // Clip to shape
        ctx.save();
        ctx.beginPath();
        if (shape === 'circle') {
          const cx = x + slotW / 2;
          const cy = y + slotH / 2;
          const r  = Math.min(slotW, slotH) / 2;
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
        } else if (shape === 'rounded_square') {
          const rad = Math.min(slotW, slotH) * 0.12;
          ctx.moveTo(x + rad, y);
          ctx.lineTo(x + slotW - rad, y);
          ctx.arcTo(x + slotW, y, x + slotW, y + rad, rad);
          ctx.lineTo(x + slotW, y + slotH - rad);
          ctx.arcTo(x + slotW, y + slotH, x + slotW - rad, y + slotH, rad);
          ctx.lineTo(x + rad, y + slotH);
          ctx.arcTo(x, y + slotH, x, y + slotH - rad, rad);
          ctx.lineTo(x, y + rad);
          ctx.arcTo(x, y, x + rad, y, rad);
        } else {
          ctx.roundRect(x, y, slotW, slotH, 8);
        }
        ctx.clip();

        // Photo or placeholder
        if (s.bgRemoved || s.photoUrl) {
          const img = new Image();
          img.onload = () => {
            ctx.filter = s.filter !== 'none' ? s.filter : 'none';
            const iAspect = img.width / img.height;
            const sAspect = slotW / slotH;
            let sx = 0, sy = 0, sw = img.width, sh = img.height;
            if (iAspect > sAspect) {
              sw = img.height * sAspect;
              sx = (img.width - sw) / 2;
            } else {
              sh = img.width / sAspect;
              sy = (img.height - sh) / 2;
            }
            ctx.drawImage(img, sx, sy, sw, sh, x, y, slotW, slotH);
            ctx.filter = 'none';

            // Text overlay
            if (s.text) {
              ctx.font      = `bold ${s.textSize}px ${s.textFont}`;
              ctx.textAlign = 'center';
              ctx.fillStyle = 'rgba(0,0,0,0.5)';
              ctx.fillText(s.text, x + slotW / 2 + 1, y + slotH - 12);
              ctx.fillStyle = s.textColor;
              ctx.fillText(s.text, x + slotW / 2, y + slotH - 13);
            }

            // Overlays
            s.overlays.forEach((emoji, ei) => {
              ctx.font      = `${slotW * 0.2}px Arial`;
              ctx.textAlign = 'center';
              ctx.fillText(
                emoji,
                x + slotW * 0.25 + (ei % 2) * slotW * 0.5,
                y + slotH * 0.3 + Math.floor(ei / 2) * slotH * 0.25
              );
            });

            // Active slot indicator
            if (isActive) {
              ctx.restore();
              ctx.strokeStyle = '#4ADE80';
              ctx.lineWidth   = 3;
              ctx.setLineDash([]);
              ctx.strokeRect(x, y, slotW, slotH);
            }
          };
          img.src = s.bgRemoved || s.photoUrl || '';
        } else {
          // Placeholder
          ctx.fillStyle = idx === activeSlot ? '#1a3a1a' : '#f5f5f5';
          ctx.fillRect(x, y, slotW, slotH);
          ctx.fillStyle = idx === activeSlot ? '#4ADE80' : '#ccc';
          ctx.font      = '14px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(
            idx === activeSlot ? '+ Add photo' : `${idx + 1}`,
            x + slotW / 2,
            y + slotH / 2 + 5
          );
          ctx.restore();

          if (isActive) {
            ctx.strokeStyle = '#4ADE80';
            ctx.lineWidth   = 2;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(x + 1, y + 1, slotW - 2, slotH - 2);
            ctx.setLineDash([]);
          }
          continue;
        }

        ctx.restore();
      }
    }

    // Registration marks (Pixcut alignment)
    const REG = 18;
    ctx.fillStyle = '#000';
    [[8, 8],[SHEET_W - 8 - REG, 8],[8, SHEET_H - 8 - REG]]
      .forEach(([rx, ry]) => ctx.fillRect(rx, ry, REG, REG));

    // Cut path preview (magenta dashed)
    ctx.strokeStyle = '#FF0080';
    ctx.lineWidth   = 1;
    ctx.setLineDash([3, 3]);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = MARGIN + c * (slotW + GUTTER) - 3;
        const y = MARGIN + r * (slotH + GUTTER) - 3;
        ctx.strokeRect(x, y, slotW + 6, slotH + 6);
      }
    }
    ctx.setLineDash([]);

  }, [slots, layout, shape, activeSlot]);

  // Handle canvas clicks to select slots
  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect   = canvas.getBoundingClientRect();
    const scaleX = SHEET_W / rect.width;
    const scaleY = SHEET_H / rect.height;
    const mx     = (e.clientX - rect.left) * scaleX;
    const my     = (e.clientY - rect.top)  * scaleY;

    const { cols, rows } = selectedLayout;
    const MARGIN = 30;
    const GUTTER = 10;
    const slotW  = (SHEET_W - MARGIN * 2 - GUTTER * (cols - 1)) / cols;
    const slotH  = (SHEET_H - MARGIN * 2 - GUTTER * (rows - 1)) / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = MARGIN + c * (slotW + GUTTER);
        const y = MARGIN + r * (slotH + GUTTER);
        if (mx >= x && mx <= x + slotW && my >= y && my <= y + slotH) {
          const idx = r * cols + c;
          setActiveSlot(idx);
          if (!slots[idx].photoUrl) {
            fileInputRef.current?.click();
          }
          return;
        }
      }
    }
  }

  const panelBtn = (id: typeof activePanel, label: string) => (
    <button key={id} onClick={() => setActivePanel(id)}
      style={{
        flex: 1, padding: '7px 4px',
        background: activePanel === id ? '#1a1a1a' : 'transparent',
        border: activePanel === id ? '1px solid #444' : '1px solid transparent',
        borderRadius: 8, color: activePanel === id ? '#fff' : '#666',
        fontSize: 11, cursor: 'pointer', fontWeight: 500,
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ width: '100%', maxWidth: 640 }}>

      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, fontWeight: 500, margin: '0 0 4px' }}>
          Sticker sheet designer
        </h3>
        <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
          Tap a slot to edit it. Die-cut lines shown in pink.
          Registration marks in corners for Pixcut accuracy.
        </p>
      </div>

      {/* Canvas */}
      <div style={{
        borderRadius: 10, overflow: 'hidden',
        border: '1px solid #333', marginBottom: 12,
        background: '#fff', cursor: 'pointer',
      }}>
        <canvas
          ref={canvasRef}
          width={SHEET_W}
          height={SHEET_H}
          style={{ width: '100%', display: 'block' }}
          onClick={handleCanvasClick}
        />
      </div>

      <input ref={fileInputRef} type="file" accept="image/*"
        style={{ display: 'none' }} onChange={handlePhotoUpload} />

      {/* Layout + Shape row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, color: '#666',
                      margin: '0 0 6px' }}>Layout</p>
          <div style={{ display: 'flex', gap: 4 }}>
            {LAYOUTS.map(l => (
              <button key={l.id} onClick={() => {
                setLayout(l.id);
                setActiveSlot(0);
              }}
                style={{
                  flex: 1, padding: '5px 2px',
                  border: layout === l.id
                    ? '1px solid #4ADE80' : '1px solid #333',
                  borderRadius: 6,
                  background: layout === l.id ? '#0d1f0d' : 'transparent',
                  color: layout === l.id ? '#4ADE80' : '#666',
                  fontSize: 10, cursor: 'pointer',
                }}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, color: '#666',
                      margin: '0 0 6px' }}>Shape</p>
          <div style={{ display: 'flex', gap: 4 }}>
            {SHAPES.map(s => (
              <button key={s.id} onClick={() => setShape(s.id)}
                style={{
                  flex: 1, padding: '5px 2px',
                  border: shape === s.id
                    ? '1px solid #4ADE80' : '1px solid #333',
                  borderRadius: 6,
                  background: shape === s.id ? '#0d1f0d' : 'transparent',
                  color: shape === s.id ? '#4ADE80' : '#666',
                  fontSize: 10, cursor: 'pointer',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Editing panel */}
      <div style={{
        background: '#111', borderRadius: 10, padding: '12px',
        border: '1px solid #222', marginBottom: 12,
      }}>
        <p style={{ fontSize: 12, color: '#555', margin: '0 0 10px' }}>
          Editing slot {activeSlot + 1}
        </p>

        {/* Panel tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
          {panelBtn('photo',    '📷 Photo'   )}
          {panelBtn('text',     '✏️ Text'    )}
          {panelBtn('overlays', '🎨 Overlays')}
        </div>

        {/* Photo panel */}
        {activePanel === 'photo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '10px', background: '#4ADE80', color: '#000',
                border: 'none', borderRadius: 8, fontSize: 13,
                fontWeight: 700, cursor: 'pointer',
              }}
            >
              {slot.photoUrl ? 'Change photo' : 'Upload photo for this slot'}
            </button>

            {slot.photoUrl && !slot.bgRemoved && (
              <button onClick={removeBackground} disabled={removingBg}
                style={{
                  padding: '10px',
                  background: removingBg ? '#333' : '#1a1a1a',
                  color: removingBg ? '#888' : '#fff',
                  border: '1px solid #444', borderRadius: 8,
                  fontSize: 13, cursor: removingBg ? 'wait' : 'pointer',
                }}
              >
                {removingBg
                  ? '✨ Removing background…'
                  : '✨ Remove background (makes sticker-shaped cut-out)'}
              </button>
            )}

            {slot.bgRemoved && (
              <div style={{
                background: '#0d1f0d', borderRadius: 8,
                padding: '8px 12px', fontSize: 12,
                color: '#4ADE80',
              }}>
                ✓ Background removed — grad is cut out
              </div>
            )}

            {slot.bgRemoved && (
              <button onClick={() => updateSlot({ bgRemoved: null })}
                style={{
                  padding: '8px', background: 'transparent',
                  border: '1px solid #333', borderRadius: 8,
                  color: '#666', fontSize: 12, cursor: 'pointer',
                }}
              >
                Undo background removal
              </button>
            )}
          </div>
        )}

        {/* Text panel */}
        {activePanel === 'text' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              value={slot.text}
              onChange={e => updateSlot({ text: e.target.value })}
              placeholder="Add text to this sticker"
              style={{
                width: '100%', padding: '9px 12px',
                background: '#1a1a1a', border: '1px solid #333',
                borderRadius: 8, color: '#fff', fontSize: 13,
                outline: 'none',
              }}
            />

            {/* Quick text suggestions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {GRAD_EMOJIS.filter(e => !e.startsWith('🎓')).slice(0,8).map(t => (
                <button key={t}
                  onClick={() => updateSlot({ text: t })}
                  style={{
                    padding: '4px 8px', borderRadius: 16,
                    border: '1px solid #333', background: 'transparent',
                    color: '#888', fontSize: 11, cursor: 'pointer',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Font picker */}
            <div>
              <p style={{ fontSize: 11, color: '#666', margin: '4px 0' }}>
                Font
              </p>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {FONTS.map(f => (
                  <button key={f.id}
                    onClick={() => updateSlot({ textFont: f.id })}
                    style={{
                      padding: '4px 8px', borderRadius: 6,
                      border: slot.textFont === f.id
                        ? '1px solid #4ADE80' : '1px solid #333',
                      background: slot.textFont === f.id
                        ? '#0d1f0d' : 'transparent',
                      color: slot.textFont === f.id ? '#4ADE80' : '#666',
                      fontSize: 11, cursor: 'pointer',
                      fontFamily: f.id,
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, color: '#666', margin: '0 0 4px' }}>
                  Size
                </p>
                <input type="range" min={10} max={36}
                  value={slot.textSize}
                  onChange={e => updateSlot({ textSize: Number(e.target.value) })}
                  style={{ width: '100%', accentColor: '#4ADE80' }}
                />
              </div>
              <div>
                <p style={{ fontSize: 11, color: '#666', margin: '0 0 4px' }}>
                  Color
                </p>
                <input type="color" value={slot.textColor}
                  onChange={e => updateSlot({ textColor: e.target.value })}
                  style={{ width: 36, height: 28, border: 'none',
                           background: 'none', cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Overlays panel */}
        {activePanel === 'overlays' && (
          <div>
            <p style={{ fontSize: 11, color: '#666', margin: '0 0 8px' }}>
              Clip art + emojis
            </p>
            <div style={{ display: 'grid',
                          gridTemplateColumns: 'repeat(4, 1fr)', gap: 6,
                          marginBottom: 10 }}>
              {CLIP_ART.map(c => (
                <button key={c.id}
                  onClick={() => toggleOverlay(c.emoji)}
                  style={{
                    padding: '8px 4px', borderRadius: 8,
                    border: slot.overlays.includes(c.emoji)
                      ? '1px solid #4ADE80' : '1px solid #333',
                    background: slot.overlays.includes(c.emoji)
                      ? '#0d1f0d' : 'transparent',
                    cursor: 'pointer', textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 20 }}>{c.emoji}</div>
                  <div style={{ fontSize: 9, color: '#666',
                                marginTop: 2 }}>{c.label}</div>
                </button>
              ))}
            </div>

            <p style={{ fontSize: 11, color: '#666', margin: '0 0 6px' }}>
              Emojis
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {GRAD_EMOJIS.map(e => (
                <button key={e}
                  onClick={() => toggleOverlay(e)}
                  style={{
                    padding: '5px 8px', borderRadius: 16,
                    border: slot.overlays.includes(e)
                      ? '1px solid #4ADE80' : '1px solid #333',
                    background: slot.overlays.includes(e)
                      ? '#0d1f0d' : 'transparent',
                    color: slot.overlays.includes(e) ? '#4ADE80' : '#888',
                    fontSize: 13, cursor: 'pointer',
                  }}
                >
                  {e}
                </button>
              ))}
            </div>

            {slot.overlays.length > 0 && (
              <button
                onClick={() => updateSlot({ overlays: [] })}
                style={{
                  marginTop: 8, padding: '6px 12px',
                  background: 'transparent', border: '1px solid #333',
                  borderRadius: 8, color: '#666', fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Clear all overlays
              </button>
            )}
          </div>
        )}
      </div>

      {/* Slot selector */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 12,
                    flexWrap: 'wrap' }}>
        {Array.from({ length: slotCount }, (_, i) => (
          <button key={i} onClick={() => setActiveSlot(i)}
            style={{
              width: 36, height: 36, borderRadius: 8,
              border: activeSlot === i
                ? '2px solid #4ADE80' : '1px solid #333',
              background: activeSlot === i
                ? '#0d1f0d'
                : slots[i].photoUrl ? '#1a2a1a' : '#1a1a1a',
              color: activeSlot === i ? '#4ADE80' : '#666',
              fontSize: 12, cursor: 'pointer',
            }}
          >
            {slots[i].photoUrl ? '✓' : i + 1}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onBack}
          style={{
            flex: 1, padding: 12, border: '1px solid #333',
            borderRadius: 10, background: 'transparent',
            color: '#fff', fontSize: 14, cursor: 'pointer',
          }}
        >
          ← Back
        </button>
        <button
          onClick={() => onComplete(
            slots.slice(0, slotCount), layout, shape
          )}
          disabled={!slots[0].photoUrl}
          style={{
            flex: 2, padding: 12,
            background: slots[0].photoUrl ? '#4ADE80' : '#333',
            color: slots[0].photoUrl ? '#000' : '#888',
            border: 'none', borderRadius: 10,
            fontSize: 14, fontWeight: 700,
            cursor: slots[0].photoUrl ? 'pointer' : 'not-allowed',
          }}
        >
          Use this sticker sheet →
        </button>
      </div>
    </div>
  );
}
