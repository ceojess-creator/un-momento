'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

const TEMPLATES = [
  {
    id: 'single',
    label: 'Single',
    slots: [{ x: 0, y: 0, w: 1, h: 1 }],
  },
  {
    id: 'two_landscape',
    label: '2 side by side',
    slots: [
      { x: 0,   y: 0, w: 0.5, h: 1 },
      { x: 0.5, y: 0, w: 0.5, h: 1 },
    ],
  },
  {
    id: 'two_portrait',
    label: '2 stacked',
    slots: [
      { x: 0, y: 0,   w: 1, h: 0.5 },
      { x: 0, y: 0.5, w: 1, h: 0.5 },
    ],
  },
  {
    id: 'three_right',
    label: '1 + 2',
    slots: [
      { x: 0,   y: 0,   w: 0.6,  h: 1   },
      { x: 0.6, y: 0,   w: 0.4,  h: 0.5 },
      { x: 0.6, y: 0.5, w: 0.4,  h: 0.5 },
    ],
  },
  {
    id: 'four_grid',
    label: '4 grid',
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
    slots: [
      { x: 0,    y: 0,   w: 0.6,  h: 0.6  },
      { x: 0.6,  y: 0,   w: 0.4,  h: 0.6  },
      { x: 0,    y: 0.6, w: 0.33, h: 0.4  },
      { x: 0.33, y: 0.6, w: 0.33, h: 0.4  },
      { x: 0.66, y: 0.6, w: 0.34, h: 0.4  },
    ],
  },
  {
    id: 'six_grid',
    label: '6 grid',
    slots: [
      { x: 0,    y: 0,   w: 0.33, h: 0.5 },
      { x: 0.33, y: 0,   w: 0.34, h: 0.5 },
      { x: 0.67, y: 0,   w: 0.33, h: 0.5 },
      { x: 0,    y: 0.5, w: 0.33, h: 0.5 },
      { x: 0.33, y: 0.5, w: 0.34, h: 0.5 },
      { x: 0.67, y: 0.5, w: 0.33, h: 0.5 },
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

const GUTTER = 2;

interface SlotState {
  photoUrl: string | null;
  file:     File | null;
  filter:   string;
  zoom:     number;
}

interface CollageEditorProps {
  onComplete:       (dataUrl: string, slots: SlotState[]) => void;
  onBack:           () => void;
  defaultGradName?: string;
  defaultSchool?:   string;
}

export default function CollageEditor({
  onComplete,
  onBack,
  defaultGradName = '',
  defaultSchool   = '',
}: CollageEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const fabricRef    = useRef<any>(null);
  const fabricMod    = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasW      = useRef(0);
  const canvasH      = useRef(0);

  const [orientation,  setOrientation]  = useState<'landscape'|'portrait'>('landscape');
  const [templateId,   setTemplateId]   = useState('single');
  const [activeSlot,   setActiveSlot]   = useState(0);
  const [activePanel,  setActivePanel]  = useState<'photos'|'text'|'overlays'|'adjust'>('photos');
  const [slots,        setSlots]        = useState<SlotState[]>(
    Array.from({ length: 6 }, () => ({
      photoUrl: null, file: null, filter: 'none', zoom: 1,
    }))
  );
  const [selectedObj,  setSelectedObj]  = useState<any>(null);
  const [overlapWarn,  setOverlapWarn]  = useState<string | null>(null);
  const [textInput,    setTextInput]    = useState('');
  const [textColor,    setTextColor]    = useState('#ffffff');
  const [textSize,     setTextSize]     = useState(16);
  const [gradName,     setGradName]     = useState(defaultGradName);
  const [school,       setSchool]       = useState(defaultSchool);
  const [qrPlacement,  setQrPlacement]  = useState('border_strip');
  const [ready,        setReady]        = useState(false);
  const [globalFilter, setGlobalFilter] = useState('none');

  const template    = TEMPLATES.find(t => t.id === templateId)!;
  const totalSlots  = template.slots.length;
  const filledSlots = slots.filter((s, i) => i < totalSlots && s.photoUrl).length;

  // Initialize Fabric canvas once
  useEffect(() => {
    let fc: any = null;
    import('fabric').then((f) => {
      fabricMod.current = f;
      if (!canvasRef.current || !containerRef.current) return;

      const W = containerRef.current.clientWidth || 360;
      const H = Math.round(W * (2/3)); // 3:2 landscape ratio

      canvasW.current = W;
      canvasH.current = H;

      fc = new f.Canvas(canvasRef.current, {
        width:           W,
        height:          H,
        backgroundColor: '#111',
        selection:       true,
      });

      fabricRef.current = fc;
      setReady(true);

      fc.on('selection:created', (e: any) => setSelectedObj(e.selected?.[0] ?? null));
      fc.on('selection:updated', (e: any) => setSelectedObj(e.selected?.[0] ?? null));
      fc.on('selection:cleared', ()       => setSelectedObj(null));
    });

    return () => { try { fc?.dispose(); } catch {} };
  }, []);

  // Redraw canvas
  const drawCanvas = useCallback(async () => {
    const fc = fabricRef.current;
    const f  = fabricMod.current;
    if (!fc || !f) return;

    const W = orientation === 'landscape' ? canvasW.current : canvasH.current;
    const H = orientation === 'landscape' ? canvasH.current : canvasW.current;

    // Resize canvas for orientation
    fc.setDimensions({ width: W, height: H });
    fc.backgroundColor = '#111';

    // Save overlays
    const overlays = fc.getObjects().filter((o: any) =>
      o.customData?.type === 'overlay'
    );

    fc.clear();
    fc.backgroundColor = '#111';

    const tpl = TEMPLATES.find(t => t.id === templateId)!;

    for (let i = 0; i < tpl.slots.length; i++) {
      const slot  = tpl.slots[i];
      const state = slots[i];
      const x     = Math.round(slot.x * W) + GUTTER;
      const y     = Math.round(slot.y * H) + GUTTER;
      const w     = Math.round(slot.w * W) - GUTTER * 2;
      const h     = Math.round(slot.h * H) - GUTTER * 2;

      if (state.photoUrl) {
        // Use HTML Image element directly for reliable loading
        const htmlImg = new window.Image();
        htmlImg.crossOrigin = 'anonymous';
        await new Promise<void>((resolve) => {
          htmlImg.onload  = () => resolve();
          htmlImg.onerror = () => resolve();
          htmlImg.src = state.photoUrl!;
        });

        const img = new f.FabricImage(htmlImg);

        const imgAspect  = htmlImg.naturalWidth / htmlImg.naturalHeight;
        const slotAspect = w / h;
        const scale      = (imgAspect > slotAspect
          ? (h / htmlImg.naturalHeight)
          : (w / htmlImg.naturalWidth)) * state.zoom;

        img.set({
          left:       x + w / 2,
          top:        y + h / 2,
          scaleX:     scale,
          scaleY:     scale,
          originX:    'center',
          originY:    'center',
          clipPath:   new f.Rect({
            left:               x,
            top:                y,
            width:              w,
            height:             h,
            absolutePositioned: true,
          }),
          selectable:  true,
          hasControls: true,
          customData:  { type: 'slot', index: i },
        });

        fc.add(img);

      } else {
        // Empty slot
        fc.add(new f.Rect({
          left:        x,
          top:         y,
          width:       w,
          height:      h,
          fill:        i === activeSlot ? '#0d2a0d' : '#1a1a1a',
          stroke:      i === activeSlot ? '#4ADE80' : '#444',
          strokeWidth: 1,
          rx: 3, ry: 3,
          selectable:  false,
          evented:     true,
          customData:  { type: 'empty_slot', index: i },
        }));

        fc.add(new f.FabricText(
          i === activeSlot ? '+ tap to add' : `${i + 1}`,
          {
            left:       x + w / 2,
            top:        y + h / 2,
            fontSize:   Math.min(w, h) * 0.14,
            fill:       i === activeSlot ? '#4ADE80' : '#555',
            originX:    'center',
            originY:    'center',
            selectable: false,
            evented:    false,
          }
        ));
      }
    }

    // Re-add overlays on top
    overlays.forEach((o: any) => fc.add(o));

    // Border strip
    const STRIP = Math.round(H * 0.11);
    if (qrPlacement === 'border_strip') {
      fc.add(new f.Rect({
        left: 0, top: H - STRIP,
        width: W, height: STRIP,
        fill: 'rgba(255,255,255,0.97)',
        selectable: false, evented: false,
      }));
      fc.add(new f.FabricText(
        gradName
          ? `${gradName}${school ? ` · ${school}` : ''} · unmomentoprints.com`
          : 'unmomentoprints.com',
        {
          left:       8,
          top:        H - STRIP + STRIP / 2,
          fontSize:   Math.round(H * 0.035),
          fill:       '#333',
          originY:    'center',
          selectable: false, evented: false,
        }
      ));
      const QS = STRIP - 4;
      fc.add(new f.Rect({
        left: W - QS - 2, top: H - STRIP + 2,
        width: QS, height: QS,
        fill: '#000',
        selectable: false, evented: false,
      }));
      fc.add(new f.FabricText('QR', {
        left:    W - QS/2 - 2,
        top:     H - STRIP + STRIP/2,
        fontSize: Math.round(QS * 0.3),
        fill:    '#fff',
        originX: 'center', originY: 'center',
        selectable: false, evented: false,
      }));
    }

    // Corner QR
    if (qrPlacement === 'corner_br' || qrPlacement === 'corner_bl') {
      const QS = Math.round(H * 0.14);
      const qx = qrPlacement === 'corner_br' ? W - QS - 4 : 4;
      const qy = H - QS - 4;
      fc.add(new f.Rect({
        left: qx - 2, top: qy - 2,
        width: QS + 4, height: QS + 4,
        fill: 'rgba(255,255,255,0.9)',
        selectable: false, evented: false,
      }));
      fc.add(new f.Rect({
        left: qx, top: qy,
        width: QS, height: QS, fill: '#000',
        selectable: false, evented: false,
      }));
    }

    // Safe zone
    fc.add(new f.Rect({
      left:            8, top: 8,
      width:           W - 16,
      height:          H - 16 - (qrPlacement === 'border_strip' ? STRIP + 2 : 0),
      fill:            'transparent',
      stroke:          'rgba(255,80,80,0.2)',
      strokeWidth:     0.5,
      strokeDashArray: [3, 3],
      selectable:      false,
      evented:         false,
      customData:      { type: 'guide' },
    }));

    fc.renderAll();
  }, [templateId, slots, qrPlacement, gradName, school, orientation, activeSlot]);

  useEffect(() => {
    if (ready) drawCanvas();
  }, [ready, drawCanvas]);

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const fc     = fabricRef.current;
    if (!canvas || !fc) return;

    const rect   = canvas.getBoundingClientRect();
    const W      = fc.getWidth();
    const H      = fc.getHeight();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const mx     = (e.clientX - rect.left) * scaleX;
    const my     = (e.clientY - rect.top)  * scaleY;

    const tpl = TEMPLATES.find(t => t.id === templateId)!;
    for (let i = 0; i < tpl.slots.length; i++) {
      const slot = tpl.slots[i];
      const x    = slot.x * W + GUTTER;
      const y    = slot.y * H + GUTTER;
      const w    = slot.w * W - GUTTER * 2;
      const h    = slot.h * H - GUTTER * 2;
      if (mx >= x && mx <= x+w && my >= y && my <= y+h) {
        setActiveSlot(i);
        if (!slots[i].photoUrl) fileInputRef.current?.click();
        return;
      }
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSlots(prev => prev.map((s, i) =>
      i === activeSlot ? { ...s, photoUrl: url, file } : s
    ));
    const nextEmpty = slots.findIndex((s, i) =>
      i > activeSlot && i < totalSlots && !s.photoUrl
    );
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
    const fc = fabricRef.current;
    const W  = fc.getWidth();
    const H  = fc.getHeight();
    const text = new fabricMod.current.FabricText(textInput, {
      left:       W / 2,
      top:        H / 2,
      fontSize:   textSize,
      fill:       textColor,
      originX:    'center',
      originY:    'center',
      fontFamily: 'Arial',
      customData: { type: 'overlay', label: textInput },
    });
    fc.add(text);
    fc.setActiveObject(text);
    fc.renderAll();
    setTextInput('');
  }

  function addEmoji(emoji: string) {
    if (!fabricRef.current || !fabricMod.current) return;
    const fc = fabricRef.current;
    const W  = fc.getWidth();
    const H  = fc.getHeight();
    const text = new fabricMod.current.FabricText(emoji, {
      left:       W / 2 + (Math.random()*40-20),
      top:        H / 3  + (Math.random()*30-15),
      fontSize:   Math.round(H * 0.1),
      originX:    'center',
      originY:    'center',
      customData: { type: 'overlay', label: emoji },
    });
    fc.add(text);
    fc.setActiveObject(text);
    fc.renderAll();
  }

  function rotateSelected(deg: number) {
    if (!selectedObj || !fabricRef.current) return;
    selectedObj.rotate((selectedObj.angle || 0) + deg);
    fabricRef.current.renderAll();
  }

  function flipSelected() {
    if (!selectedObj || !fabricRef.current) return;
    selectedObj.set({ flipX: !selectedObj.flipX });
    fabricRef.current.renderAll();
  }

  function deleteSelected() {
    if (!selectedObj || selectedObj.customData?.type === 'guide') return;
    fabricRef.current?.remove(selectedObj);
    fabricRef.current?.renderAll();
    setSelectedObj(null);
  }

  function handleComplete() {
    if (!fabricRef.current) return;
    fabricRef.current.getObjects()
      .filter((o: any) => o.customData?.type === 'guide')
      .forEach((o: any) => { o.visible = false; });
    fabricRef.current.renderAll();
    const dataUrl = fabricRef.current.toDataURL({
      format: 'jpeg', quality: 0.95, multiplier: 5,
    });
    fabricRef.current.getObjects()
      .filter((o: any) => o.customData?.type === 'guide')
      .forEach((o: any) => { o.visible = true; });
    fabricRef.current.renderAll();
    onComplete(dataUrl, slots);
  }

  const detectOverlaps = useCallback((fc: any) => {
    const objs = fc.getObjects().filter((o: any) =>
      o.customData?.type === 'overlay'
    );
    for (let i = 0; i < objs.length; i++) {
      for (let j = i + 1; j < objs.length; j++) {
        if (!objs[i].intersectsWithObject(objs[j])) continue;
        const ab = objs[i].getBoundingRect();
        const bb = objs[j].getBoundingRect();
        const ox = Math.max(0,
          Math.min(ab.left+ab.width, bb.left+bb.width) - Math.max(ab.left,bb.left));
        const oy = Math.max(0,
          Math.min(ab.top+ab.height, bb.top+bb.height) - Math.max(ab.top,bb.top));
        if ((ox*oy)/(ab.width*ab.height) > 0.3) {
          setOverlapWarn('⚠️ Elements are significantly overlapping.');
          return;
        }
      }
    }
    setOverlapWarn(null);
  }, []);

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

      {/* Orientation */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <button onClick={() => setOrientation('landscape')} style={{
          flex: 1, padding: '8px',
          border: orientation === 'landscape' ? '1px solid #4ADE80' : '1px solid #333',
          borderRadius: 8,
          background: orientation === 'landscape' ? '#0d1f0d' : 'transparent',
          color: orientation === 'landscape' ? '#4ADE80' : '#888',
          fontSize: 12, cursor: 'pointer',
        }}>▭ Landscape (4×6)</button>
        <button onClick={() => setOrientation('portrait')} style={{
          flex: 1, padding: '8px',
          border: orientation === 'portrait' ? '1px solid #4ADE80' : '1px solid #333',
          borderRadius: 8,
          background: orientation === 'portrait' ? '#0d1f0d' : 'transparent',
          color: orientation === 'portrait' ? '#4ADE80' : '#888',
          fontSize: 12, cursor: 'pointer',
        }}>▯ Portrait (6×4)</button>
      </div>

      {/* Template picker */}
      <div style={{ marginBottom: 10 }}>
        <p style={{ fontSize: 11, color: '#666', margin: '0 0 6px' }}>
          Layout — {filledSlots}/{totalSlots} photos added
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

      {/* Canvas container */}
      {!ready && (
        <div style={{
          aspectRatio: '3/2', display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: '#888', fontSize: 14,
          background: '#111', borderRadius: 10, marginBottom: 10,
        }}>
          Loading editor…
        </div>
      )}
      <div ref={containerRef} style={{
        borderRadius: 10, overflow: 'hidden',
        border: '1px solid #333', marginBottom: 10,
        display: ready ? 'block' : 'none',
        width: '100%',
      }}>
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          style={{ display: 'block', width: '100%' }}
        />
      </div>

      <input ref={fileInputRef} type="file" accept="image/*"
        style={{ display: 'none' }} onChange={handlePhotoUpload} />

      {/* Selected object toolbar */}
      {selectedObj && selectedObj.customData?.type !== 'guide' && (
        <div style={{
          display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap',
          background: '#111', borderRadius: 8, padding: '8px',
          border: '1px solid #222',
        }}>
          <span style={{ fontSize: 11, color: '#888',
                         flex: 1, alignSelf: 'center', minWidth: 50 }}>
            {selectedObj.customData?.label || selectedObj.type}
          </span>
          <button onClick={() => rotateSelected(-15)} style={{
            padding: '4px 7px', background: '#1a1a1a',
            border: '1px solid #333', borderRadius: 6,
            color: '#fff', fontSize: 11, cursor: 'pointer',
          }}>↺</button>
          <button onClick={() => rotateSelected(15)} style={{
            padding: '4px 7px', background: '#1a1a1a',
            border: '1px solid #333', borderRadius: 6,
            color: '#fff', fontSize: 11, cursor: 'pointer',
          }}>↻</button>
          <button onClick={flipSelected} style={{
            padding: '4px 7px', background: '#1a1a1a',
            border: '1px solid #333', borderRadius: 6,
            color: '#fff', fontSize: 11, cursor: 'pointer',
          }}>↔</button>
          <button onClick={() => {
            fabricRef.current?.bringObjectForward(selectedObj);
            fabricRef.current?.renderAll();
          }} style={{
            padding: '4px 7px', background: '#1a1a1a',
            border: '1px solid #333', borderRadius: 6,
            color: '#fff', fontSize: 11, cursor: 'pointer',
          }}>↑</button>
          <button onClick={() => {
            fabricRef.current?.sendObjectBackwards(selectedObj);
            fabricRef.current?.renderAll();
          }} style={{
            padding: '4px 7px', background: '#1a1a1a',
            border: '1px solid #333', borderRadius: 6,
            color: '#fff', fontSize: 11, cursor: 'pointer',
          }}>↓</button>
          <button onClick={deleteSelected} style={{
            padding: '4px 7px', background: '#2a0a0a',
            border: '1px solid #A32D2D', borderRadius: 6,
            color: '#ff6b6b', fontSize: 11, cursor: 'pointer',
          }}>🗑</button>
        </div>
      )}

      {/* Slot selector */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
        {Array.from({ length: totalSlots }, (_, i) => (
          <button key={i} onClick={() => {
            setActiveSlot(i);
            if (!slots[i].photoUrl) fileInputRef.current?.click();
          }} style={{
            width: 30, height: 30, borderRadius: 6,
            border: activeSlot === i ? '2px solid #4ADE80' : '1px solid #333',
            background: activeSlot === i
              ? '#0d1f0d' : slots[i].photoUrl ? '#1a2a1a' : '#1a1a1a',
            color: activeSlot === i ? '#4ADE80' : '#666',
            fontSize: 10, cursor: 'pointer',
          }}>
            {slots[i].photoUrl ? '✓' : i + 1}
          </button>
        ))}
        <button onClick={() => fileInputRef.current?.click()} style={{
          flex: 1, padding: '4px 6px', background: '#4ADE80', color: '#000',
          border: 'none', borderRadius: 6, fontSize: 10,
          fontWeight: 700, cursor: 'pointer',
        }}>+ Slot {activeSlot + 1}</button>
      </div>

      {/* Panel tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        {panelBtn('photos',   '📷 Photos'  )}
        {panelBtn('adjust',   '🎨 Adjust'  )}
        {panelBtn('text',     '✏️ Text'    )}
        {panelBtn('overlays', '🎭 Overlays')}
      </div>

      <div style={{
        background: '#111', borderRadius: 10, padding: '12px',
        border: '1px solid #222', marginBottom: 10,
      }}>

        {activePanel === 'photos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 12, color: '#888', margin: 0, lineHeight: 1.6 }}>
              Tap a slot on the canvas or the numbered buttons to add photos.
              Active: <strong style={{ color: '#4ADE80' }}>slot {activeSlot + 1}</strong>
            </p>
            <p style={{ fontSize: 11, color: '#666', margin: '4px 0 0' }}>
              QR memory code placement
            </p>
            {[
              { id: 'border_strip', label: 'Bottom border strip (recommended)' },
              { id: 'corner_br',    label: 'Bottom right corner'               },
              { id: 'corner_bl',    label: 'Bottom left corner'                },
              { id: 'back_label',   label: 'Back label only'                   },
            ].map(p => (
              <div key={p.id} onClick={() => setQrPlacement(p.id)} style={{
                padding: '7px 10px', borderRadius: 7, cursor: 'pointer',
                border: qrPlacement === p.id ? '1px solid #4ADE80' : '1px solid #333',
                background: qrPlacement === p.id ? '#0d1f0d' : 'transparent',
                display: 'flex', justifyContent: 'space-between', fontSize: 12,
              }}>
                <span style={{ color: qrPlacement === p.id ? '#4ADE80' : '#888' }}>
                  {p.label}
                </span>
                {qrPlacement === p.id && <span style={{ color: '#4ADE80' }}>✓</span>}
              </div>
            ))}
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
              display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
              gap: 5, marginBottom: 10,
            }}>
              {FILTERS.map(fi => (
                <button key={fi.name}
                  onClick={() => updateSlot('filter', fi.css)}
                  style={{
                    padding: '5px 3px',
                    border: slots[activeSlot]?.filter === fi.css
                      ? '1px solid #4ADE80' : '1px solid #333',
                    borderRadius: 6,
                    background: slots[activeSlot]?.filter === fi.css
                      ? '#0d1f0d' : 'transparent',
                    color: slots[activeSlot]?.filter === fi.css
                      ? '#4ADE80' : '#888',
                    fontSize: 10, cursor: 'pointer',
                  }}>
                  {fi.name}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: '#666', margin: '0 0 6px' }}>
              Apply to all slots
            </p>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
              {FILTERS.map(fi => (
                <button key={fi.name}
                  onClick={() => {
                    setGlobalFilter(fi.css);
                    setSlots(prev => prev.map(s => ({ ...s, filter: fi.css })));
                  }}
                  style={{
                    padding: '3px 7px', borderRadius: 16,
                    border: globalFilter === fi.css
                      ? '1px solid #4ADE80' : '1px solid #333',
                    background: 'transparent',
                    color: '#888', fontSize: 10, cursor: 'pointer',
                  }}>
                  {fi.name}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: '#666', margin: '0 0 4px' }}>
              Zoom slot {activeSlot + 1}: {Math.round((slots[activeSlot]?.zoom || 1) * 100)}%
            </p>
            <input type="range" min={100} max={200}
              value={Math.round((slots[activeSlot]?.zoom || 1) * 100)}
              onChange={e => updateSlot('zoom', Number(e.target.value) / 100)}
              style={{ width: '100%', accentColor: '#4ADE80' }} />
          </div>
        )}

        {activePanel === 'text' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {TEXT_TEMPLATES.map(t => (
                <button key={t}
                  onClick={() => setTextInput(
                    t.replace('[Name]',   gradName || 'Name')
                     .replace('[School]', school   || 'School')
                  )}
                  style={{
                    padding: '4px 8px', borderRadius: 16,
                    border: '1px solid #333', background: 'transparent',
                    color: '#888', fontSize: 11, cursor: 'pointer',
                  }}>
                  {t}
                </button>
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
                <input type="range" min={8} max={40} value={textSize}
                  onChange={e => setTextSize(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#4ADE80' }} />
              </div>
              <div>
                <p style={{ fontSize: 11, color: '#666', margin: '0 0 4px' }}>Color</p>
                <input type="color" value={textColor}
                  onChange={e => setTextColor(e.target.value)}
                  style={{ width: 34, height: 26, border: 'none',
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
              Tap to add · drag to position · select to rotate
            </p>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 5,
            }}>
              {CLIP_ART.map(e => (
                <button key={e} onClick={() => addEmoji(e)} style={{
                  padding: '7px 3px', borderRadius: 8,
                  border: '1px solid #333', background: '#1a1a1a',
                  cursor: 'pointer', textAlign: 'center', fontSize: 18,
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
            ? 'Add at least one photo'
            : `Use this design (${filledSlots}/${totalSlots}) →`}
        </button>
      </div>
    </div>
  );
}