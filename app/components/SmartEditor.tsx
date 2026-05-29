'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

// ── Constants ─────────────────────────────────────────────────
const PRINT_W    = 900;   // preview width (px) — 4×6 ratio
const PRINT_H    = 600;   // preview height (px)
const STICKER_W  = 600;   // 4×7 sticker sheet preview
const STICKER_H  = 700;

const FILTERS = [
  { name: 'Original',   css: 'none' },
  { name: 'Warm',       css: 'sepia(0.3) saturate(1.4) brightness(1.05)' },
  { name: 'Cool',       css: 'saturate(0.8) hue-rotate(20deg) brightness(1.05)' },
  { name: 'B&W',        css: 'grayscale(1)' },
  { name: 'Fade',       css: 'opacity(0.85) brightness(1.1) saturate(0.7)' },
  { name: 'Vivid',      css: 'saturate(1.8) contrast(1.1)' },
  { name: 'Matte',      css: 'contrast(0.9) brightness(1.05) saturate(0.8)' },
  { name: 'Golden',     css: 'sepia(0.5) saturate(1.6) brightness(1.1)' },
  { name: 'Drama',      css: 'contrast(1.4) saturate(1.2) brightness(0.9)' },
  { name: 'Soft',       css: 'brightness(1.1) contrast(0.9) saturate(0.9)' },
];

const QR_PLACEMENTS = [
  { id: 'corner_br', label: 'Bottom right corner' },
  { id: 'border_strip', label: 'Bottom border strip' },
  { id: 'corner_bl', label: 'Bottom left corner' },
  { id: 'back_label', label: 'Back label only' },
];

const STICKER_LAYOUTS = [
  { id: '1x1', label: '1 large sticker',    cols: 1, rows: 1 },
  { id: '2x2', label: '4 stickers (2×2)',   cols: 2, rows: 2 },
  { id: '3x2', label: '6 stickers (3×2)',   cols: 3, rows: 2 },
  { id: 'strip', label: '4-strip portrait', cols: 1, rows: 4 },
];

const STICKER_SHAPES = [
  { id: 'circle',         label: 'Circle' },
  { id: 'rounded_square', label: 'Rounded square' },
  { id: 'portrait_rect',  label: 'Portrait strip' },
];

const TEXT_TEMPLATES = [
  { label: 'Name + Year',       text: '[Name] · Class of 2026' },
  { label: 'Name + School',     text: '[Name] · [School]' },
  { label: 'Full',              text: '[Name] · [School] · Class of 2026' },
  { label: 'Motivational',      text: 'The best is yet to come.' },
  { label: 'Custom',            text: '' },
];

interface EditorState {
  photoUrl:       string | null;
  filter:         string;
  brightness:     number;
  contrast:       number;
  saturation:     number;
  textOverlay:    string;
  textColor:      string;
  textSize:       number;
  qrPlacement:    string;
  stickerLayout:  string;
  stickerShape:   string;
  gradName:       string;
  gradSchool:     string;
  gradYear:       string;
}

interface SmartEditorProps {
  onComplete: (state: EditorState, photoFile: File | null) => void;
  showSticker?: boolean;
  defaultGradName?: string;
}

export default function SmartEditor({
  onComplete,
  showSticker = true,
  defaultGradName = '',
}: SmartEditorProps) {

  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'photo' | 'filter' | 'text' | 'qr' | 'sticker'>('photo');

  const [photoFile, setPhotoFile]   = useState<File | null>(null);
  const [state, setState]           = useState<EditorState>({
    photoUrl:      null,
    filter:        'none',
    brightness:    100,
    contrast:      100,
    saturation:    100,
    textOverlay:   defaultGradName ? `${defaultGradName} · Class of 2026` : '',
    textColor:     '#ffffff',
    textSize:      24,
    qrPlacement:   'border_strip',
    stickerLayout: '2x2',
    stickerShape:  'rounded_square',
    gradName:      defaultGradName,
    gradSchool:    '',
    gradYear:      '2026',
  });

  const set = (k: keyof EditorState, v: any) =>
    setState(prev => ({ ...prev, [k]: v }));

  // ── Draw preview canvas ───────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current || !state.photoUrl) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Clear
      ctx.clearRect(0, 0, PRINT_W, PRINT_H);

      // Apply filter + adjustments
      ctx.filter = [
        state.filter !== 'none' ? state.filter : '',
        `brightness(${state.brightness}%)`,
        `contrast(${state.contrast}%)`,
        `saturate(${state.saturation}%)`,
      ].filter(Boolean).join(' ') || 'none';

      // Draw photo cover-fit
      const imgAspect    = img.width / img.height;
      const canvasAspect = PRINT_W / PRINT_H;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (imgAspect > canvasAspect) {
        sw = img.height * canvasAspect;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / canvasAspect;
        sy = (img.height - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, PRINT_W, PRINT_H);
      ctx.filter = 'none';

      // Border strip (white bar at bottom)
      const STRIP_H = 50;
      if (state.qrPlacement === 'border_strip') {
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.fillRect(0, PRINT_H - STRIP_H, PRINT_W, STRIP_H);

        // Text in strip
        ctx.fillStyle = '#333';
        ctx.font      = '14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(
          state.gradName
            ? `${state.gradName} · unmomentoprints.com`
            : 'unmomentoprints.com',
          16, PRINT_H - STRIP_H + 32
        );

        // QR placeholder
        ctx.fillStyle = '#000';
        ctx.fillRect(PRINT_W - 46, PRINT_H - STRIP_H + 6, 38, 38);
        ctx.fillStyle = '#fff';
        ctx.font      = '8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('QR', PRINT_W - 27, PRINT_H - STRIP_H + 29);
      }

      // Corner QR
      if (state.qrPlacement === 'corner_br' ||
          state.qrPlacement === 'corner_bl') {
        const x = state.qrPlacement === 'corner_br'
          ? PRINT_W - 66 : 16;
        const y = PRINT_H - 66;
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.fillRect(x - 4, y - 4, 58, 58);
        ctx.fillStyle = '#000';
        ctx.fillRect(x, y, 50, 50);
        ctx.fillStyle = '#fff';
        ctx.font      = '9px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('QR', x + 25, y + 29);
      }

      // Text overlay
      if (state.textOverlay) {
        const textY = state.qrPlacement === 'border_strip'
          ? PRINT_H - STRIP_H - 16 : PRINT_H - 20;
        ctx.font      = `bold ${state.textSize}px Arial`;
        ctx.textAlign = 'center';
        // Shadow
        ctx.fillStyle   = 'rgba(0,0,0,0.6)';
        ctx.fillText(state.textOverlay, PRINT_W / 2 + 1, textY + 1);
        // Text
        ctx.fillStyle = state.textColor;
        ctx.fillText(state.textOverlay, PRINT_W / 2, textY);
      }

      // Safe zone guide lines
      ctx.strokeStyle = 'rgba(255,100,100,0.4)';
      ctx.lineWidth   = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(24, 24, PRINT_W - 48, PRINT_H - 48);
      ctx.setLineDash([]);
    };
    img.src = state.photoUrl;
  }, [state]);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    set('photoUrl', url);
  }

  function applyTemplate(template: typeof TEXT_TEMPLATES[0]) {
    if (template.text === '') return;
    const text = template.text
      .replace('[Name]',   state.gradName   || 'Your Name')
      .replace('[School]', state.gradSchool || 'Your School');
    set('textOverlay', text);
  }

  const tabStyle = (tab: string) => ({
    flex: 1, padding: '8px 4px',
    background: activeTab === tab ? '#1a1a1a' : 'transparent',
    border: activeTab === tab
      ? '1px solid #444' : '1px solid transparent',
    borderRadius: 8, color: activeTab === tab ? '#fff' : '#666',
    fontSize: 11, cursor: 'pointer', fontWeight: 500,
  });

  const sliderStyle = {
    width: '100%', accentColor: '#4ADE80',
  };

  const inputStyle = {
    width: '100%', padding: '9px 12px',
    background: '#1a1a1a', border: '1px solid #333',
    borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none',
  };

  return (
    <div style={{ width: '100%', maxWidth: 640 }}>

      {/* Canvas preview */}
      <div style={{
        position: 'relative', marginBottom: 12,
        borderRadius: 10, overflow: 'hidden',
        border: '1px solid #333', background: '#111',
      }}>
        {state.photoUrl ? (
          <canvas
            ref={canvasRef}
            width={PRINT_W}
            height={PRINT_H}
            style={{ width: '100%', display: 'block' }}
          />
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              aspectRatio: '3/2', display: 'flex',
              flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer',
              background: '#111',
            }}
          >
            <p style={{ fontSize: 32, marginBottom: 8 }}>📸</p>
            <p style={{ color: '#555', fontSize: 14, margin: 0 }}>
              Tap to upload your photo
            </p>
            <p style={{ color: '#444', fontSize: 11,
                        margin: '4px 0 0' }}>
              Min 600×600px · JPG or PNG
            </p>
          </div>
        )}

        {/* Safe zone label */}
        {state.photoUrl && (
          <div style={{
            position: 'absolute', top: 8, left: 8,
            background: 'rgba(0,0,0,0.6)', borderRadius: 4,
            padding: '2px 6px', fontSize: 10, color: '#ff6464',
          }}>
            — safe zone
          </div>
        )}

        {/* Change photo button */}
        {state.photoUrl && (
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              position: 'absolute', top: 8, right: 8,
              padding: '4px 10px', background: 'rgba(0,0,0,0.7)',
              border: '1px solid #444', borderRadius: 6,
              color: '#fff', fontSize: 11, cursor: 'pointer',
            }}
          >
            Change photo
          </button>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*"
        style={{ display: 'none' }} onChange={handleFileUpload} />

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {[
          { id: 'photo',   label: '📷 Photo'   },
          { id: 'filter',  label: '🎨 Filter'  },
          { id: 'text',    label: '✏️ Text'    },
          { id: 'qr',      label: '⬛ QR'      },
          ...(showSticker
            ? [{ id: 'sticker', label: '✂️ Sticker' }]
            : []),
        ].map(tab => (
          <button key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={tabStyle(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{
        background: '#111', borderRadius: 10,
        padding: '14px', border: '1px solid #222',
        marginBottom: 12,
      }}>

        {/* Photo tab */}
        {activeTab === 'photo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 12, color: '#888', margin: 0, lineHeight: 1.6 }}>
              Upload your graduation photo. The red dashed line shows
              the safe zone — keep important elements inside it.
              Minimum 600×600px for print quality.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '12px', background: '#4ADE80', color: '#000',
                border: 'none', borderRadius: 8, fontSize: 13,
                fontWeight: 700, cursor: 'pointer',
              }}
            >
              {state.photoUrl ? 'Change photo' : 'Upload photo'}
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
                Graduate name (appears in border)
              </p>
              <input style={inputStyle}
                placeholder="e.g. Jessica Ealy"
                value={state.gradName}
                onChange={e => set('gradName', e.target.value)}
              />
              <input style={inputStyle}
                placeholder="School name (optional)"
                value={state.gradSchool}
                onChange={e => set('gradSchool', e.target.value)}
              />
              <input style={inputStyle}
                placeholder="Graduation year"
                value={state.gradYear}
                onChange={e => set('gradYear', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Filter tab */}
        {activeTab === 'filter' && (
          <div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 6, marginBottom: 14,
            }}>
              {FILTERS.map(f => (
                <button key={f.name}
                  onClick={() => set('filter', f.css)}
                  style={{
                    padding: '6px 4px',
                    background: state.filter === f.css
                      ? '#0d1f0d' : 'transparent',
                    border: state.filter === f.css
                      ? '1px solid #4ADE80' : '1px solid #333',
                    borderRadius: 6, color: state.filter === f.css
                      ? '#4ADE80' : '#888',
                    fontSize: 11, cursor: 'pointer',
                  }}
                >
                  {f.name}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Brightness', key: 'brightness', min: 50,  max: 150 },
                { label: 'Contrast',   key: 'contrast',   min: 50,  max: 150 },
                { label: 'Saturation', key: 'saturation', min: 0,   max: 200 },
              ].map(slider => (
                <div key={slider.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between',
                                fontSize: 12, color: '#888', marginBottom: 4 }}>
                    <span>{slider.label}</span>
                    <span>{(state as any)[slider.key]}%</span>
                  </div>
                  <input type="range" style={sliderStyle}
                    min={slider.min} max={slider.max}
                    value={(state as any)[slider.key]}
                    onChange={e =>
                      set(slider.key as keyof EditorState,
                          Number(e.target.value))}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Text tab */}
        {activeTab === 'text' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
              Templates
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {TEXT_TEMPLATES.map(t => (
                <button key={t.label}
                  onClick={() => applyTemplate(t)}
                  style={{
                    padding: '5px 10px', borderRadius: 20,
                    border: '1px solid #333', background: 'transparent',
                    color: '#888', fontSize: 12, cursor: 'pointer',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <input style={inputStyle}
              placeholder="Custom text overlay (optional)"
              value={state.textOverlay}
              onChange={e => set('textOverlay', e.target.value)}
            />

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, color: '#888', margin: '0 0 4px' }}>
                  Text size
                </p>
                <input type="range" style={sliderStyle}
                  min={14} max={48} value={state.textSize}
                  onChange={e => set('textSize', Number(e.target.value))}
                />
              </div>
              <div>
                <p style={{ fontSize: 12, color: '#888', margin: '0 0 4px' }}>
                  Color
                </p>
                <input type="color" value={state.textColor}
                  onChange={e => set('textColor', e.target.value)}
                  style={{ width: 40, height: 32, border: 'none',
                           background: 'none', cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* QR tab */}
        {activeTab === 'qr' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 12, color: '#888', margin: 0, lineHeight: 1.6 }}>
              Choose where the QR memory code appears on your print.
              The QR links to your voice/video message forever —
              scannable from inside a frame.
            </p>
            {QR_PLACEMENTS.map(p => (
              <div key={p.id}
                onClick={() => set('qrPlacement', p.id)}
                style={{
                  padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                  border: state.qrPlacement === p.id
                    ? '1px solid #4ADE80' : '1px solid #333',
                  background: state.qrPlacement === p.id
                    ? '#0d1f0d' : 'transparent',
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: 13,
                               color: state.qrPlacement === p.id
                                 ? '#4ADE80' : '#888' }}>
                  {p.label}
                </span>
                {state.qrPlacement === p.id && (
                  <span style={{ color: '#4ADE80', fontSize: 16 }}>✓</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Sticker tab */}
        {activeTab === 'sticker' && showSticker && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <p style={{ fontSize: 12, color: '#888', margin: '0 0 8px' }}>
                Layout
              </p>
              <div style={{ display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                {STICKER_LAYOUTS.map(l => (
                  <button key={l.id}
                    onClick={() => set('stickerLayout', l.id)}
                    style={{
                      padding: '8px', borderRadius: 8,
                      border: state.stickerLayout === l.id
                        ? '1px solid #4ADE80' : '1px solid #333',
                      background: state.stickerLayout === l.id
                        ? '#0d1f0d' : 'transparent',
                      color: state.stickerLayout === l.id
                        ? '#4ADE80' : '#888',
                      fontSize: 12, cursor: 'pointer',
                    }}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p style={{ fontSize: 12, color: '#888', margin: '0 0 8px' }}>
                Shape
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                {STICKER_SHAPES.map(s => (
                  <button key={s.id}
                    onClick={() => set('stickerShape', s.id)}
                    style={{
                      flex: 1, padding: '8px',
                      borderRadius: 8,
                      border: state.stickerShape === s.id
                        ? '1px solid #4ADE80' : '1px solid #333',
                      background: state.stickerShape === s.id
                        ? '#0d1f0d' : 'transparent',
                      color: state.stickerShape === s.id
                        ? '#4ADE80' : '#888',
                      fontSize: 12, cursor: 'pointer',
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{
              background: '#0a0a0a', borderRadius: 8,
              padding: '10px 12px', fontSize: 12,
              color: '#555', lineHeight: 1.6,
            }}>
              Die-cut lines are generated automatically for the
              Liene Pixcut S1. Registration marks are placed in
              the corners. Your sticker sheet will cut exactly
              as shown.
            </div>
          </div>
        )}
      </div>

      {/* Complete button */}
      <button
        onClick={() => onComplete(state, photoFile)}
        disabled={!state.photoUrl}
        style={{
          width: '100%', padding: 14,
          background: state.photoUrl ? '#4ADE80' : '#333',
          color: state.photoUrl ? '#000' : '#888',
          border: 'none', borderRadius: 10,
          fontSize: 15, fontWeight: 700,
          cursor: state.photoUrl ? 'pointer' : 'not-allowed',
        }}
      >
        {state.photoUrl ? 'Use this design →' : 'Upload a photo to continue'}
      </button>
    </div>
  );
}