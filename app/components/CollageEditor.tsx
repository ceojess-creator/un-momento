'use client';
import { useEffect, useRef, useState } from 'react';

// 4×6 print at preview resolution
const PRINT_W = 540;
const PRINT_H = 360;

const TEMPLATES = [
  {
    id: 'single',
    label: 'Single',
    icon: '▪',
    slots: [{ x: 0, y: 0, w: 1, h: 1 }],
  },
  {
    id: 'two_landscape',
    label: '2 side by side',
    icon: '▪▪',
    slots: [
      { x: 0,   y: 0, w: 0.5, h: 1 },
      { x: 0.5, y: 0, w: 0.5, h: 1 },
    ],
  },
  {
    id: 'two_portrait',
    label: '2 stacked',
    icon: '▪\n▪',
    slots: [
      { x: 0, y: 0,   w: 1, h: 0.5 },
      { x: 0, y: 0.5, w: 1, h: 0.5 },
    ],
  },
  {
    id: 'three_right',
    label: '1 + 2',
    icon: '▪▪▪',
    slots: [
      { x: 0,    y: 0,   w: 0.6,  h: 1   },
      { x: 0.6,  y: 0,   w: 0.4,  h: 0.5 },
      { x: 0.6,  y: 0.5, w: 0.4,  h: 0.5 },
    ],
  },
  {
    id: 'four_grid',
    label: '4 grid',
    icon: '▪▪\n▪▪',
    slots: [
      { x: 0,   y: 0,   w: 0.5, h: 0.5 },
      { x: 0.5, y: 0,   w: 0.5, h: 0.5 },
      { x: 0,   y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  {
    id: 'five_mosaic',
    label: '5 mosaic',
    icon: '▪▪▪',
    slots: [
      { x: 0,    y: 0,    w: 0.6,  h: 0.6  },
      { x: 0.6,  y: 0,    w: 0.4,  h: 0.6  },
      { x: 0,    y: 0.6,  w: 0.33, h: 0.4  },
      { x: 0.33, y: 0.6,  w: 0.33, h: 0.4  },
      { x: 0.66, y: 0.6,  w: 0.34, h: 0.4  },
    ],
  },
  {
    id: 'six_grid',
    label: '6 grid',
    icon: '▪▪▪\n▪▪▪',
    slots: [
      { x: 0,    y: 0,    w: 0.33, h: 0.5 },
      { x: 0.33, y: 0,    w: 0.34, h: 0.5 },
      { x: 0.67, y: 0,    w: 0.33, h: 0.5 },
      { x: 0,    y: 0.5,  w: 0.33, h: 0.5 },
      { x: 0.33, y: 0.5,  w: 0.34, h: 0.5 },
      { x: 0.67, y: 0.5,  w: 0.33, h: 0.5 },
    ],
  },
];

const FILTERS = [
  { name: 'Original', css: 'none' },
  { name: 'Warm',     css: 'sepia(0.3) saturate(1.4) brightness(1.05)' },
  { name: 'Cool',     css: 'saturate(0.8) hue-rotate(20deg)' },
  { name: 'B&W',      css: 'grayscale(1)' },
  { name: 'Fade',     css: 'brightness(1.1) saturate(0.7)' },
  { name: 'Vivid',    css: 'saturate(1.8) contrast(1.1)' },
  { name: 'Golden',   css: 'sepia(0.5) saturate(1.6) brightness(1.1)' },
  { name: 'Drama',    css: 'contrast(1.4) saturate(1.2) brightness(0.9)' },
];

const CLIP_ART = [
  '🎓','📜','⭐','🏆','🎗️','🔥','✨','❤️',
  '🎉','🎊','💫','🌟','👑','🌸','🦋','💪',
];

const TEXT_TEMPLATES = [
  'Class of 2026',
  '[Name] · Class of 2026',
  '[Name] · [School]',
  'The best is yet to come',
  'DONE!',
];

const GUTTER = 3; // px between slots

interface SlotState {
  photoUrl:   string | null;
  file:       File | null;
  filter:     string;
  zoom:       number;
  offsetX:    number;
  offsetY:    number;
}

interface CollageEditorProps {
  onComplete:      (dataUrl: string, slots: SlotState[]) => void;
  onBack:          () => void;
  defaultGradName?: string;
  defaultSchool?:   string;
}

export default function CollageEditor({
  onComplete,
  onBack,
  defaultGradName = '',
  defaultSchool   = '',
}: CollageEditorProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const fabricRef    = useRef<any>(null);
  const fabricMod    = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [templateId,   setTemplateId]   = useState('single');
  const [activeSlot,   setActiveSlot]   = useState(0);
  const [activePanel,  setActivePanel]  = useState<'photos'|'text'|'overlays'|'adjust'>('photos');
  const [slots,        setSlots]        = useState<SlotState[]>(
    Array.from({ length: 6 }, () => ({
      photoUrl: null, file: null,
      filter: 'none', zoom: 1, offsetX: 0, offsetY: 0,
    }))
  );
  const [overlapWarn,  setOverlapWarn]  = useState<string | null>(null);
  const [textInput,    setTextInput]    = useState('');
  const [textColor,    setTextColor]    = useState('#ffffff');
  const [textSize,     setTextSize]     = useState(20);
  const [gradName,     setGradName]     = useState(defaultGradName);
  const [school,       setSchool]       = useState(defaultSchool);
  const [qrPlacement,  setQrPlacement]  = useState('border_strip');
  const [ready,        setReady]        = useState(false);
  const [globalFilter, setGlobalFilter] = useState('none');

  const template = TEMPLATES.find(t => t.id === templateId)!;

  // Initialize Fabric canvas
  useEffect(() => {
    let fc: any = null;
    import('fabric').then((f) => {
      fabricMod.current = f;
      if (!canvasRef.current) return;

      fc = new f.Canvas(canvasRef.current, {
        width:           PRINT_W,
        height:          PRINT_H,
        backgroundColor: '#1a1a1a',
        selection:       true,
      });

      fabricRef.current = fc;
      setReady(true);

      fc.on('selection:created', (e: any) => {
        const obj = e.selected?.[0];
        if (obj?.customData?.type === 'slot') {
          setActiveSlot(obj.customData.index);
        }
      });

      fc.on('object:moving', () => detectOverlaps(fc));
      fc.on('object:moved',  () => detectOverlaps(fc));
    });

    return () => { try { fc?.dispose(); } catch {} };
  }, []);

  // Redraw when template or slots change
  useEffect(() => {
    if (!fabricRef.current || !fabricMod.current || !ready) return;
    drawCanvas();
  }, [templateId, slots, qrPlacement, gradName, school, globalFilter, ready]);

  async function drawCanvas() {
    const fc = fabricRef.current;
    const f  = fabricMod.current;
    if (!fc || !f) return;

    fc.clear();
    fc.backgroundColor = '#000';

    const tpl = TEMPLATES.find(t => t.id === templateId)!;

    for (let i = 0; i < tpl.slots.length; i++) {
      const slot    = tpl.slots[i];
      const state   = slots[i];
      const x       = slot.x * PRINT_W + (i % Math.round(1 / slot.w) > 0 ? GUTTER : 0);
      const y       = slot.y * PRINT_H + (Math.floor(i / Math.round(1 / slot.w)) > 0 ? GUTTER : 0);
      const w       = slot.w * PRINT_W - GUTTER;
      const h       = slot.h * PRINT_H - GUTTER;

      if (state.photoUrl) {
        const img = await f.FabricImage.fromURL(
          state.photoUrl, { crossOrigin: 'anonymous' }
        );

        // Cover-fit the image to the slot
        const imgAspect  = img.width! / img.height!;
        const slotAspect = w / h;
        let scale: number;
        if (imgAspect > slotAspect) {
          scale = (h / img.height!) * state.zoom;
        } else {
          scale = (w / img.width!) * state.zoom;
        }

        img.set({
          left:       x + w / 2 + state.offsetX,
          top:        y + h / 2 + state.offsetY,
          scaleX:     scale,
          scaleY:     scale,
          originX:    'center',
          originY:    'center',
          clipPath:   new f.Rect({ left: x, top: y, width: w, height: h,
                                   absolutePositioned: true }),
          filters:    buildFilters(f, state.filter || globalFilter),
          customData: { type: 'slot', index: i },
        });

        img.applyFilters();
        fc.add(img);

      } else {
        // Empty slot placeholder
        const rect = new f.Rect({
          left:       x,
          top:        y,
          width:      w,
          height:     h,
          fill:       i === activeSlot ? '#1a3a1a' : '#111',
          stroke:     i === activeSlot ? '#4ADE80' : '#333',
          strokeWidth: 1.5,
          rx:         4, ry: 4,
          customData: { type: 'slot', index: i },
        });

        const label = new f.FabricText(
          i === activeSlot ? '+ tap to add' : `${i + 1}`,
          {
            left:       x + w / 2,
            top:        y + h / 2,
            fontSize:   Math.min(w, h) * 0.2,
            fill:       i === activeSlot ? '#4ADE80' : '#555',
            originX:    'center',
            originY:    'center',
            selectable: false,
            evented:    false,
          }
        );

        fc.add(rect, label);
      }
    }

    // Border strip with QR placeholder
    if (qrPlacement === 'border_strip') {
      const STRIP = 36;
      const strip = new f.Rect({
        left:       0,
        top:        PRINT_H - STRIP,
        width:      PRINT_W,
        height:     STRIP,
        fill:       'rgba(255,255,255,0.95)',
        selectable: false,
        evented:    false,
      });

      const nameText = new f.FabricText(
        gradName
          ? `${gradName}${school ? ` · ${school}` : ''} · unmomentoprints.com`
          : 'unmomentoprints.com',
        {
          left:       12,
          top:        PRINT_H - STRIP + STRIP / 2,
          fontSize:   11,
          fill:       '#333',
          originY:    'center',
          selectable: false,
          evented:    false,
        }
      );

      const qrBox = new f.Rect({
        left:       PRINT_W - 34,
        top:        PRINT_H - STRIP + 3,
        width:      30,
        height:     30,
        fill:       '#000',
        selectable: false,
        evented:    false,
      });

      const qrLabel = new f.FabricText('QR', {
        left:       PRINT_W - 19,
        top:        PRINT_H - STRIP + 18,
        fontSize:   8,
        fill:       '#fff',
        originX:    'center',
        originY:    'center',
        selectable: false,
        evented:    false,
      });

      fc.add(strip, nameText, qrBox, qrLabel);
    }

    // Corner QR
    if (qrPlacement === 'corner_br' || qrPlacement === 'corner_bl') {
      const qx = qrPlacement === 'corner_br' ? PRINT_W - 44 : 6;
      const qy = PRINT_H - 44;

      fc.add(new f.Rect({
        left: qx - 4, top: qy - 4, width: 44, height: 44,
        fill: 'rgba(255,255,255,0.9)',
        selectable: false, evented: false,
      }));
      fc.add(new f.Rect({
        left: qx, top: qy, width: 36, height: 36,
        fill: '#000',
        selectable: false, evented: false,
      }));
    }

    // Safe zone guide
    fc.add(new f.Rect({
      left:            18,
      top:             18,
      width:           PRINT_W - 36,
      height:          PRINT_H - 36 - (qrPlacement === 'border_strip' ? 40 : 0),
      fill:            'transparent',
      stroke:          'rgba(255,80,80,0.35)',
      strokeWidth:     1,
      strokeDashArray: [4, 4],
      selectable:      false,
      evented:         false,
    }));

    fc.renderAll();
  }

  function buildFilters(f: any, filterCss: string) {
    if (!filterCss || filterCss === 'none') return [];
    const filters: any[] = [];
    if (filterCss.includes('grayscale'))   filters.push(new f.filters.Grayscale());
    if (filterCss.includes('sepia'))       filters.push(new f.filters.Sepia());
    if (filterCss.includes('brightness')) {
      const m = filterCss.match(/brightness\(([\d.]+)\)/);
      if (m) filters.push(new f.filters.Brightness({ brightness: parseFloat(m[1]) - 1 }));
    }
    if (filterCss.includes('contrast')) {
      const m = filterCss.match(/contrast\(([\d.]+)\)/);
      if (m) filters.push(new f.filters.Contrast({ contrast: parseFloat(m[1]) - 1 }));
    }
    if (filterCss.includes('saturate')) {
      const m = filterCss.match(/saturate\(([\d.]+)\)/);
      if (m) filters.push(new f.filters.Saturation({ saturation: parseFloat(m[1]) - 1 }));
    }
    return filters;
  }

  function detectOverlaps(fc: any) {
    const objs = fc.getObjects().filter((o: any) =>
      o.customData?.type === 'overlay'
    );
    for (let i = 0; i < objs.length; i++) {
      for (let j = i + 1; j < objs.length; j++) {
        if (objs[i].intersectsWithObject(objs[j])) {
          const ab = objs[i].getBoundingRect();
          const bb = objs[j].getBoundingRect();
          const ox = Math.max(0,
            Math.min(ab.left+ab.width, bb.left+bb.width) - Math.max(ab.left,bb.left));
          const oy = Math.max(0,
            Math.min(ab.top+ab.height, bb.top+bb.height) - Math.max(ab.top,bb.top));
          const overlap = ox * oy;
          if (overlap / (ab.width * ab.height) > 0.3) {
            setOverlapWarn(`⚠️ Elements are significantly overlapping. Check your layout before printing.`);
            return;
          }
        }
      }
    }
    setOverlapWarn(null);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSlots(prev => prev.map((s, i) =>
      i === activeSlot ? { ...s, photoUrl: url, file } : s
    ));
    // Auto-advance to next empty slot
    const tpl    = TEMPLATES.find(t => t.id === templateId)!;
    const nextEmpty = slots.findIndex((s, i) => i > activeSlot && i < tpl.slots.length && !s.photoUrl);
    if (nextEmpty !== -1) setActiveSlot(nextEmpty);
    e.target.value = '';
  }

  function updateSlot(key: keyof SlotState, value: any) {
    setSlots(prev => prev.map((s, i) =>
      i === activeSlot ? { ...s, [key]: value } : s
    ));
  }

  function addTextOverlay() {
    if (!textInput || !fabricRef.current || !fabricMod.current) return;
    const f    = fabricMod.current;
    const text = new f.FabricText(textInput, {
      left:       PRINT_W / 2,
      top:        PRINT_H / 2,
      fontSize:   textSize,
      fill:       textColor,
      originX:    'center',
      originY:    'center',
      fontFamily: 'Arial',
      customData: { type: 'overlay', label: textInput },
    });
    fabricRef.current.add(text);
    fabricRef.current.setActiveObject(text);
    fabricRef.current.renderAll();
    setTextInput('');
  }

  function addEmoji(emoji: string) {
    if (!fabricRef.current || !fabricMod.current) return;
    const text = new fabricMod.current.FabricText(emoji, {
      left:       PRINT_W / 2 + (Math.random() * 60 - 30),
      top:        PRINT_H / 3  + (Math.random() * 40 - 20),
      fontSize:   32,
      originX:    'center',
      originY:    'center',
      customData: { type: 'overlay', label: emoji },
    });
    fabricRef.current.add(text);
    fabricRef.current.setActiveObject(text);
    fabricRef.current.renderAll();
  }

  function handleComplete() {
    if (!fabricRef.current) return;
    // Hide safe zone guide for export
    fabricRef.current.getObjects()
      .filter((o: any) => !o.customData)
      .forEach((o: any) => {
        if (o.strokeDashArray) o.visible = false;
      });
    fabricRef.current.renderAll();

    const dataUrl = fabricRef.current.toDataURL({
      format: 'jpeg', quality: 0.95, multiplier: 3,
    });

    fabricRef.current.getObjects()
      .forEach((o: any) => { if (o.strokeDashArray) o.visible = true; });
    fabricRef.current.renderAll();

    onComplete(dataUrl, slots);
  }

  const tpl       = TEMPLATES.find(t => t.id === templateId)!;
  const filledSlots = slots.filter((s, i) => i < tpl.slots.length && s.photoUrl).length;
  const totalSlots  = tpl.slots.length;

  const panelBtn = (id: typeof activePanel, label: string) => (
    <button key={id} onClick={() => setActivePanel(id)} style={{
      flex: 1, padding: '7px 4px',
      background: activePanel === id ? '#1a1a1a' : 'transparent',
      border:     activePanel === id ? '1px solid #444' : '1px solid transparent',
      borderRadius: 8,
      color:      activePanel === id ? '#fff' : '#666',
      fontSize: 11, cursor: 'pointer', fontWeight: 500,
    }}>{label}</button>
  );

  return (
    <div style={{ width: '100%', maxWidth: 640 }}>

      <div style={{ textAlign: 'center', marginBottom: 10 }}>
        <h3 style={{ fontSize: 15, fontWeight: 500, margin: '0 0 4px' }}>
          Photo print designer
        </h3>
        <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
          4×6 print · up to 6 photos · QR memory code included
        </p>
      </div>

      {overlapWarn && (
        <div style={{
          background: '#2a1a00', border: '1px solid #BA7517',
          borderRadius: 8, padding: '8px 12px',
          fontSize: 12, color: '#BA7517', marginBottom: 10, lineHeight: 1.5,
        }}>
          {overlapWarn}
          <button onClick={() => setOverlapWarn(null)} style={{
            marginLeft: 8, padding: '2px 8px', background: 'transparent',
            border: '1px solid #BA7517', borderRadius: 4,
            color: '#BA7517', fontSize: 11, cursor: 'pointer',
          }}>Got it</button>
        </div>
      )}

      {/* Template picker */}
      <div style={{ marginBottom: 10 }}>
        <p style={{ fontSize: 11, color: '#666', margin: '0 0 6px' }}>
          Layout template — {filledSlots}/{totalSlots} photos added
        </p>
        <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 4 }}>
          {TEMPLATES.map(t => (
            <button key={t.id}
              onClick={() => { setTemplateId(t.id); setActiveSlot(0); }}
              style={{
                padding: '6px 10px', borderRadius: 8, flexShrink: 0,
                border: templateId === t.id ? '1px solid #4ADE80' : '1px solid #333',
                background: templateId === t.id ? '#0d1f0d' : '#111',
                color: templateId === t.id ? '#4ADE80' : '#888',
                fontSize: 11, cursor: 'pointer',
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Canvas */}
      {!ready && (
        <div style={{
          aspectRatio: '3/2', display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: '#888', fontSize: 14,
          background: '#111', borderRadius: 10, marginBottom: 10,
        }}>
          Loading editor…
        </div>
      )}
      <div style={{
        borderRadius: 10, overflow: 'hidden',
        border: '1px solid #333', marginBottom: 10,
        display: ready ? 'block' : 'none',
      }}>
        <canvas ref={canvasRef}
          onClick={(e) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect   = canvas.getBoundingClientRect();
            const scaleX = PRINT_W / rect.width;
            const scaleY = PRINT_H / rect.height;
            const mx     = (e.clientX - rect.left) * scaleX;
            const my     = (e.clientY - rect.top)  * scaleY;
            const tpl    = TEMPLATES.find(t => t.id === templateId)!;
            tpl.slots.forEach((slot, i) => {
              const x = slot.x * PRINT_W;
              const y = slot.y * PRINT_H;
              const w = slot.w * PRINT_W;
              const h = slot.h * PRINT_H;
              if (mx >= x && mx <= x+w && my >= y && my <= y+h) {
                setActiveSlot(i);
                if (!slots[i].photoUrl) fileInputRef.current?.click();
              }
            });
          }}
          style={{ width: '100%', display: 'block', cursor: 'pointer' }}
        />
      </div>

      <input ref={fileInputRef} type="file" accept="image/*"
        style={{ display: 'none' }} onChange={handlePhotoUpload} />

      {/* Slot selector */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
        {Array.from({ length: totalSlots }, (_, i) => (
          <button key={i} onClick={() => {
            setActiveSlot(i);
            if (!slots[i].photoUrl) fileInputRef.current?.click();
          }} style={{
            width: 32, height: 32, borderRadius: 6,
            border: activeSlot === i ? '2px solid #4ADE80' : '1px solid #333',
            background: activeSlot === i
              ? '#0d1f0d' : slots[i].photoUrl ? '#1a2a1a' : '#1a1a1a',
            color: activeSlot === i ? '#4ADE80' : '#666',
            fontSize: 11, cursor: 'pointer',
          }}>
            {slots[i].photoUrl ? '✓' : i + 1}
          </button>
        ))}
        <button onClick={() => fileInputRef.current?.click()} style={{
          flex: 1, padding: '4px 8px', background: '#4ADE80', color: '#000',
          border: 'none', borderRadius: 6, fontSize: 11,
          fontWeight: 700, cursor: 'pointer',
        }}>
          + Add photo to slot {activeSlot + 1}
        </button>
      </div>

      {/* Panel tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        {panelBtn('photos',  '📷 Photos' )}
        {panelBtn('adjust',  '🎨 Adjust' )}
        {panelBtn('text',    '✏️ Text'   )}
        {panelBtn('overlays','🎭 Overlays')}
      </div>

      <div style={{
        background: '#111', borderRadius: 10, padding: '12px',
        border: '1px solid #222', marginBottom: 10,
      }}>

        {activePanel === 'photos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 12, color: '#888', margin: 0, lineHeight: 1.6 }}>
              Tap a slot on the canvas or use the slot buttons above to add photos.
              Active slot: <strong style={{ color: '#4ADE80' }}>{activeSlot + 1}</strong>
            </p>

            {/* QR placement */}
            <p style={{ fontSize: 11, color: '#666', margin: '4px 0 0' }}>
              QR memory code placement
            </p>
            {[
              { id: 'border_strip', label: 'Bottom border strip (recommended)' },
              { id: 'corner_br',    label: 'Bottom right corner'              },
              { id: 'corner_bl',    label: 'Bottom left corner'               },
              { id: 'back_label',   label: 'Back label only'                  },
            ].map(p => (
              <div key={p.id} onClick={() => setQrPlacement(p.id)} style={{
                padding: '8px 10px', borderRadius: 7, cursor: 'pointer',
                border: qrPlacement === p.id ? '1px solid #4ADE80' : '1px solid #333',
                background: qrPlacement === p.id ? '#0d1f0d' : 'transparent',
                display: 'flex', justifyContent: 'space-between',
                fontSize: 12,
              }}>
                <span style={{ color: qrPlacement === p.id ? '#4ADE80' : '#888' }}>
                  {p.label}
                </span>
                {qrPlacement === p.id && <span style={{ color: '#4ADE80' }}>✓</span>}
              </div>
            ))}

            {/* Grad info */}
            <input value={gradName} onChange={e => setGradName(e.target.value)}
              placeholder="Graduate name (shows in border)"
              style={{
                width: '100%', padding: '8px 10px',
                background: '#1a1a1a', border: '1px solid #333',
                borderRadius: 7, color: '#fff', fontSize: 12, outline: 'none',
              }} />
            <input value={school} onChange={e => setSchool(e.target.value)}
              placeholder="School name (optional)"
              style={{
                width: '100%', padding: '8px 10px',
                background: '#1a1a1a', border: '1px solid #333',
                borderRadius: 7, color: '#fff', fontSize: 12, outline: 'none',
              }} />
          </div>
        )}

        {activePanel === 'adjust' && (
          <div>
            <p style={{ fontSize: 11, color: '#666', margin: '0 0 8px' }}>
              Filter for slot {activeSlot + 1}
            </p>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5,
              marginBottom: 12,
            }}>
              {FILTERS.map(f => (
                <button key={f.name}
                  onClick={() => updateSlot('filter', f.css)}
                  style={{
                    padding: '6px 4px',
                    border: slots[activeSlot]?.filter === f.css
                      ? '1px solid #4ADE80' : '1px solid #333',
                    borderRadius: 6,
                    background: slots[activeSlot]?.filter === f.css
                      ? '#0d1f0d' : 'transparent',
                    color: slots[activeSlot]?.filter === f.css ? '#4ADE80' : '#888',
                    fontSize: 10, cursor: 'pointer',
                  }}>
                  {f.name}
                </button>
              ))}
            </div>

            <p style={{ fontSize: 11, color: '#666', margin: '0 0 6px' }}>
              Apply same filter to all slots
            </p>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {FILTERS.map(f => (
                <button key={f.name}
                  onClick={() => {
                    setGlobalFilter(f.css);
                    setSlots(prev => prev.map(s => ({ ...s, filter: f.css })));
                  }}
                  style={{
                    padding: '4px 8px', borderRadius: 16,
                    border: globalFilter === f.css
                      ? '1px solid #4ADE80' : '1px solid #333',
                    background: 'transparent',
                    color: '#888', fontSize: 10, cursor: 'pointer',
                  }}>
                  {f.name}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 11, color: '#666', margin: '0 0 4px' }}>
                Zoom slot {activeSlot + 1}: {Math.round(slots[activeSlot]?.zoom * 100)}%
              </p>
              <input type="range" min={100} max={200}
                value={Math.round((slots[activeSlot]?.zoom || 1) * 100)}
                onChange={e => updateSlot('zoom', Number(e.target.value) / 100)}
                style={{ width: '100%', accentColor: '#4ADE80' }} />
            </div>
          </div>
        )}

        {activePanel === 'text' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 4 }}>
              {TEXT_TEMPLATES.map(t => (
                <button key={t} onClick={() => setTextInput(
                  t.replace('[Name]', gradName || 'Name')
                   .replace('[School]', school || 'School')
                )} style={{
                  padding: '4px 8px', borderRadius: 16,
                  border: '1px solid #333', background: 'transparent',
                  color: '#888', fontSize: 11, cursor: 'pointer',
                }}>{t}</button>
              ))}
            </div>
            <input value={textInput} onChange={e => setTextInput(e.target.value)}
              placeholder="Custom text…"
              onKeyDown={e => e.key === 'Enter' && addTextOverlay()}
              style={{
                width: '100%', padding: '9px 12px',
                background: '#1a1a1a', border: '1px solid #333',
                borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none',
              }} />
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, color: '#666', margin: '0 0 4px' }}>
                  Size: {textSize}px
                </p>
                <input type="range" min={10} max={48} value={textSize}
                  onChange={e => setTextSize(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#4ADE80' }} />
              </div>
              <div>
                <p style={{ fontSize: 11, color: '#666', margin: '0 0 4px' }}>Color</p>
                <input type="color" value={textColor}
                  onChange={e => setTextColor(e.target.value)}
                  style={{ width: 36, height: 28, border: 'none',
                           background: 'none', cursor: 'pointer' }} />
              </div>
            </div>
            <button onClick={addTextOverlay} disabled={!textInput} style={{
              padding: '10px',
              background: textInput ? '#4ADE80' : '#333',
              color:      textInput ? '#000'    : '#888',
              border: 'none', borderRadius: 8, fontSize: 13,
              fontWeight: 700, cursor: textInput ? 'pointer' : 'not-allowed',
            }}>Add text to print</button>
          </div>
        )}

        {activePanel === 'overlays' && (
          <div>
            <p style={{ fontSize: 11, color: '#666', margin: '0 0 8px' }}>
              Tap to add · drag to position on the print
            </p>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 5,
            }}>
              {CLIP_ART.map(e => (
                <button key={e} onClick={() => addEmoji(e)} style={{
                  padding: '8px 4px', borderRadius: 8,
                  border: '1px solid #333', background: '#1a1a1a',
                  cursor: 'pointer', textAlign: 'center', fontSize: 20,
                }}>{e}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onBack} style={{
          flex: 1, padding: 12, border: '1px solid #333',
          borderRadius: 10, background: 'transparent',
          color: '#fff', fontSize: 14, cursor: 'pointer',
        }}>← Back</button>
        <button onClick={handleComplete} style={{
          flex: 2, padding: 12,
          background: filledSlots === 0 ? '#333' : '#4ADE80',
          color:      filledSlots === 0 ? '#888' : '#000',
          border: 'none', borderRadius: 10,
          fontSize: 14, fontWeight: 700,
          cursor: filledSlots === 0 ? 'not-allowed' : 'pointer',
        }}>
          {filledSlots === 0
            ? 'Add at least one photo to continue'
            : `Use this design (${filledSlots}/${totalSlots} photos) →`}
        </button>
      </div>
    </div>
  );
}