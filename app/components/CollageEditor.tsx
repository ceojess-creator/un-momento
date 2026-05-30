'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import EditorToolbar, { ToolbarAction, ElementType } from './EditorToolbar';
import { useEditorHistory } from './useEditorHistory';
import {
  SlotData, Overlay, Shape, DEFAULT_SLOT,
  CLIP_ART, CSS_FILTERS, FILTER_LABELS,
  buildCSSFilter, snapToGrid, SnapMode,
} from './EditorTypes';

const TEMPLATES = [
  { id:'single',    label:'Single',         slots:[{x:0,y:0,w:1,h:1}] },
  { id:'two_side',  label:'2 side by side', slots:[{x:0,y:0,w:.5,h:1},{x:.5,y:0,w:.5,h:1}] },
  { id:'two_stack', label:'2 stacked',      slots:[{x:0,y:0,w:1,h:.5},{x:0,y:.5,w:1,h:.5}] },
  { id:'one_two',   label:'1 + 2',          slots:[{x:0,y:0,w:.6,h:1},{x:.6,y:0,w:.4,h:.5},{x:.6,y:.5,w:.4,h:.5}] },
  { id:'four',      label:'4 grid',         slots:[{x:0,y:0,w:.5,h:.5},{x:.5,y:0,w:.5,h:.5},{x:0,y:.5,w:.5,h:.5},{x:.5,y:.5,w:.5,h:.5}] },
  { id:'five',      label:'5 mosaic',       slots:[{x:0,y:0,w:.6,h:.6},{x:.6,y:0,w:.4,h:.6},{x:0,y:.6,w:.33,h:.4},{x:.33,y:.6,w:.33,h:.4},{x:.66,y:.6,w:.34,h:.4}] },
  { id:'six',       label:'6 grid',         slots:[{x:0,y:0,w:.33,h:.5},{x:.33,y:0,w:.34,h:.5},{x:.67,y:0,w:.33,h:.5},{x:0,y:.5,w:.33,h:.5},{x:.33,y:.5,w:.34,h:.5},{x:.67,y:.5,w:.33,h:.5}] },
];

const TEXT_PRESETS = ['Class of 2026','[Name] · Class of 2026','[Name] · [School]','The best is yet to come','DONE!'];
const GAP = 2;
let _id = 0;

interface CollageEditorProps {
  onComplete: (dataUrl: string, slots: SlotData[]) => void;
  onBack:     () => void;
  defaultGradName?: string;
  defaultSchool?:   string;
}

export default function CollageEditor({ onComplete, onBack, defaultGradName='', defaultSchool='' }: CollageEditorProps) {
  const wrapRef      = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag state refs (not in history)
  const dragRef = useRef<{
    type:       'slot_pan' | 'slot_move' | 'overlay' | 'shape';
    id:         number;
    fromSlot?:  number;
    sx:         number;
    sy:         number;
    startPanX?: number;
    startPanY?: number;
  } | null>(null);

  const editor = useEditorHistory({
    slots:    Array.from({ length: 6 }, () => ({ ...DEFAULT_SLOT })),
    overlays: [],
    shapes:   [],
    bgColor:  '#111111',
  });

  const [orientation,   setOrientation]   = useState<'l'|'p'>('l');
  const [templateId,    setTemplateId]    = useState('single');
  const [activeSlot,    setActiveSlot]    = useState(0);
  const [snapMode,      setSnapMode]      = useState<SnapMode>('snap');
  const [snapGuides,    setSnapGuides]    = useState<{x?:number;y?:number}>({});
  const [dragOverSlot,  setDragOverSlot]  = useState<number|null>(null);
  const [selectedId,    setSelectedId]    = useState<number|null>(null);
  const [selectedType,  setSelectedType]  = useState<ElementType|null>(null);
  const [showToolbar,   setShowToolbar]   = useState(false);
  const [toolbarPos,    setToolbarPos]    = useState({x:0,y:0});
  const [addingShape,   setAddingShape]   = useState<'rect'|'circle'|'line'|null>(null);
  const [panel,         setPanel]         = useState<'photos'|'text'|'overlays'|'shapes'>('photos');
  const [gradName,      setGradName]      = useState(defaultGradName);
  const [school,        setSchool]        = useState(defaultSchool);
  const [qr,            setQr]            = useState('border');
  const [textInput,     setTextInput]     = useState('');

  const { state } = editor;
  const tpl        = TEMPLATES.find(t => t.id === templateId)!;
  const totalSlots = tpl.slots.length;
  const filled     = state.slots.filter((s,i) => i < totalSlots && s.img).length;

  function getDims() {
    const W = wrapRef.current?.clientWidth || 360;
    return orientation === 'l' ? { W, H: Math.round(W*2/3) } : { W: Math.round(W*2/3), H: W };
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx    = canvas.getContext('2d'); if (!ctx) return;
    const { W, H } = getDims();
    canvas.width = W; canvas.height = H;

    // Background
    ctx.fillStyle = state.bgColor;
    ctx.fillRect(0, 0, W, H);

    // Photo slots
    tpl.slots.forEach((slot, i) => {
      const x = Math.round(slot.x*W)+GAP, y = Math.round(slot.y*H)+GAP;
      const w = Math.round(slot.w*W)-GAP*2, h = Math.round(slot.h*H)-GAP*2;
      const s = state.slots[i];

      ctx.save();
      ctx.beginPath(); ctx.rect(x,y,w,h); ctx.clip();

      if (s?.img) {
        const iw = s.img.naturalWidth, ih = s.img.naturalHeight;
        const scale = (iw/ih > w/h ? h/ih : w/iw) * s.zoom;
        const dw = iw*scale, dh = ih*scale;
        const dx = x+(w-dw)/2+s.panX, dy = y+(h-dh)/2+s.panY;
        const f = buildCSSFilter(s);
        if (f !== 'none') ctx.filter = f;
        ctx.globalAlpha = (s.opacity||100)/100;
        ctx.drawImage(s.img, dx, dy, dw, dh);
        ctx.globalAlpha = 1; ctx.filter = 'none';
      } else {
        const isActive   = i === activeSlot;
        const isDragOver = i === dragOverSlot;
        ctx.fillStyle = isDragOver ? '#1a3a1a' : isActive ? '#0d2a0d' : 'rgba(255,255,255,0.04)';
        ctx.fillRect(x,y,w,h);
        ctx.strokeStyle = isDragOver ? '#4ADE80' : isActive ? '#4ADE80' : '#333';
        ctx.lineWidth   = isDragOver ? 2.5 : 1.5;
        if (isDragOver) ctx.setLineDash([5,3]);
        ctx.strokeRect(x+.75, y+.75, w-1.5, h-1.5);
        ctx.setLineDash([]);
        ctx.fillStyle   = isActive || isDragOver ? '#4ADE80' : '#555';
        ctx.font        = `${Math.round(Math.min(w,h)*.15)}px Arial`;
        ctx.textAlign   = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(isDragOver ? '↓ drop' : isActive ? '+ tap' : `${i+1}`, x+w/2, y+h/2);
      }

      // Slot with image — show move handle
      if (s?.img) {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(x, y, 28, 18);
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText('⠿ move', x+3, y+4);

        // Reset button
        const hasEdits = s.brightness!==100||s.contrast!==100||s.saturation!==100||s.filter!=='none'||s.panX!==0||s.panY!==0||s.zoom!==1;
        if (hasEdits) {
          ctx.fillStyle = 'rgba(186,117,23,0.85)';
          ctx.fillRect(x+w-38, y, 38, 18);
          ctx.fillStyle = '#fff';
          ctx.textAlign = 'right';
          ctx.fillText('↺ reset', x+w-3, y+4);
        }
      }

      ctx.restore();
    });

    // Snap guides
    if (snapGuides.x !== undefined) {
      ctx.strokeStyle = 'rgba(74,222,128,0.5)'; ctx.lineWidth = 1;
      ctx.setLineDash([4,4]);
      ctx.beginPath(); ctx.moveTo(snapGuides.x,0); ctx.lineTo(snapGuides.x,H); ctx.stroke();
      ctx.setLineDash([]);
    }
    if (snapGuides.y !== undefined) {
      ctx.strokeStyle = 'rgba(74,222,128,0.5)'; ctx.lineWidth = 1;
      ctx.setLineDash([4,4]);
      ctx.beginPath(); ctx.moveTo(0,snapGuides.y); ctx.lineTo(W,snapGuides.y); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Shapes
    state.shapes.forEach(sh => {
      ctx.save();
      ctx.translate(sh.x+sh.w/2, sh.y+sh.h/2);
      ctx.rotate(sh.angle*Math.PI/180);
      ctx.globalAlpha = sh.opacity/100;
      ctx.fillStyle   = sh.color;
      if (sh.kind==='rect') {
        ctx.fillRect(-sh.w/2,-sh.h/2,sh.w,sh.h);
        if (sh.borderWidth>0) { ctx.strokeStyle=sh.borderColor; ctx.lineWidth=sh.borderWidth; ctx.strokeRect(-sh.w/2,-sh.h/2,sh.w,sh.h); }
      } else if (sh.kind==='circle') {
        ctx.beginPath(); ctx.ellipse(0,0,sh.w/2,sh.h/2,0,0,Math.PI*2); ctx.fill();
        if (sh.borderWidth>0) { ctx.strokeStyle=sh.borderColor; ctx.lineWidth=sh.borderWidth; ctx.stroke(); }
      } else if (sh.kind==='line') {
        ctx.strokeStyle=sh.color; ctx.lineWidth=sh.borderWidth||3;
        ctx.beginPath(); ctx.moveTo(-sh.w/2,0); ctx.lineTo(sh.w/2,0); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (selectedId===sh.id) {
        ctx.strokeStyle='#4ADE80'; ctx.lineWidth=1.5; ctx.setLineDash([4,4]);
        ctx.strokeRect(-sh.w/2-4,-sh.h/2-4,sh.w+8,sh.h+8); ctx.setLineDash([]);
      }
      ctx.restore();
    });

    // Overlays
    state.overlays.forEach(ov => {
      ctx.save();
      ctx.translate(ov.x, ov.y);
      ctx.rotate(ov.angle*Math.PI/180);
      ctx.globalAlpha = ov.opacity/100;
      const weight = ov.fontBold   ? 'bold '   : '';
      const style  = ov.fontItalic ? 'italic '  : '';
      ctx.font      = `${style}${weight}${ov.size}px ${ov.fontFamily||'Arial'}`;
      ctx.fillStyle = ov.color;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 3;
      ctx.fillText(ov.text, 0, 0);
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      if (selectedId===ov.id) {
        ctx.strokeStyle='#4ADE80'; ctx.lineWidth=1.5;
        const m=ctx.measureText(ov.text), tw=m.width, th=ov.size*1.2;
        ctx.strokeRect(-tw/2-4,-th/2-2,tw+8,th+4);
      }
      ctx.restore();
    });

    // QR strip
    const STRIP = Math.round(H*.1);
    if (qr==='border') {
      ctx.fillStyle='rgba(255,255,255,0.97)'; ctx.fillRect(0,H-STRIP,W,STRIP);
      ctx.fillStyle='#333'; ctx.font=`${Math.round(STRIP*.38)}px Arial`;
      ctx.textAlign='left'; ctx.textBaseline='middle';
      const lbl = gradName ? `${gradName}${school?` · ${school}`:''} · unmomentoprints.com` : 'unmomentoprints.com';
      ctx.fillText(lbl,8,H-STRIP+STRIP/2,W-STRIP-12);
      const QS=STRIP-4;
      ctx.fillStyle='#000'; ctx.fillRect(W-QS-2,H-STRIP+2,QS,QS);
      ctx.fillStyle='#fff'; ctx.font=`${Math.round(QS*.3)}px Arial`;
      ctx.textAlign='center'; ctx.fillText('QR',W-QS/2-2,H-STRIP+STRIP/2);
    }
    if (qr==='corner_br'||qr==='corner_bl') {
      const QS=Math.round(H*.13), qx=qr==='corner_br'?W-QS-4:4, qy=H-QS-4;
      ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.fillRect(qx-2,qy-2,QS+4,QS+4);
      ctx.fillStyle='#000'; ctx.fillRect(qx,qy,QS,QS);
    }

    // Safe zone
    ctx.strokeStyle='rgba(255,80,80,0.15)'; ctx.lineWidth=.5; ctx.setLineDash([3,3]);
    ctx.strokeRect(8,8,W-16,H-16-(qr==='border'?STRIP+2:0));
    ctx.setLineDash([]);
  }, [tpl, state, selectedId, gradName, school, qr, activeSlot, orientation, snapGuides, dragOverSlot]);

  useEffect(() => { draw(); }, [draw]);
  useEffect(() => {
    const ro = new ResizeObserver(() => draw());
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [draw]);

  // Keyboard undo/redo
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey||e.ctrlKey) && e.key==='z') { e.preventDefault(); if(e.shiftKey) editor.redo(); else editor.undo(); }
      if ((e.metaKey||e.ctrlKey) && e.key==='y') { e.preventDefault(); editor.redo(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editor]);

  function cc(e: React.MouseEvent<HTMLCanvasElement>) {
    const c=canvasRef.current!, r=c.getBoundingClientRect();
    return { x:(e.clientX-r.left)*(c.width/r.width), y:(e.clientY-r.top)*(c.height/r.height) };
  }
  function tcXY(e: React.TouchEvent<HTMLCanvasElement>) {
    const c=canvasRef.current!, r=c.getBoundingClientRect(), t=e.touches[0];
    return { x:(t.clientX-r.left)*(c.width/r.width), y:(t.clientY-r.top)*(c.height/r.height) };
  }
  function getSlotAt(x:number, y:number) {
    const {W,H}=getDims();
    for (let i=0;i<tpl.slots.length;i++) {
      const s=tpl.slots[i];
      if (x>=s.x*W+GAP&&x<=s.x*W+s.w*W-GAP&&y>=s.y*H+GAP&&y<=s.y*H+s.h*H-GAP) return i;
    }
    return -1;
  }
  function getSlotBounds(i:number) {
    const {W,H}=getDims(); const s=tpl.slots[i];
    return { x:s.x*W+GAP, y:s.y*H+GAP, w:s.w*W-GAP*2, h:s.h*H-GAP*2 };
  }

  function showToolbarAt(x:number, y:number, type:ElementType) {
    const c=canvasRef.current!; const r=c.getBoundingClientRect();
    setToolbarPos({ x:r.left+x*(r.width/c.width), y:r.top+y*(r.height/c.height) });
    setSelectedType(type); setShowToolbar(true);
  }

  function startDrag(x:number, y:number) {
    // Adding shape
    if (addingShape) {
      const sh: Shape = { id:++_id, kind:addingShape, x:x-40, y:y-40, w:80, h:addingShape==='line'?6:80, color:'#4ADE80', borderColor:'#ffffff', borderWidth:0, opacity:100, angle:0 };
      editor.addShape(sh);
      setSelectedId(sh.id); setSelectedType('shape');
      setAddingShape(null);
      showToolbarAt(x,y,'shape');
      return;
    }

    // Check overlays
    for (let i=state.overlays.length-1;i>=0;i--) {
      const ov=state.overlays[i];
      if (Math.abs(x-ov.x)<50&&Math.abs(y-ov.y)<50) {
        dragRef.current={type:'overlay',id:ov.id,sx:x-ov.x,sy:y-ov.y};
        setSelectedId(ov.id); setSelectedType(ov.type==='emoji'?'overlay':'text');
        showToolbarAt(x,y,ov.type==='emoji'?'overlay':'text');
        return;
      }
    }

    // Check shapes
    for (let i=state.shapes.length-1;i>=0;i--) {
      const sh=state.shapes[i];
      if (x>=sh.x&&x<=sh.x+sh.w&&y>=sh.y&&y<=sh.y+sh.h) {
        dragRef.current={type:'shape',id:sh.id,sx:x-sh.x,sy:y-sh.y};
        setSelectedId(sh.id); setSelectedType('shape');
        showToolbarAt(x,y,'shape');
        return;
      }
    }

    // Check slot — move handle or pan
    const si = getSlotAt(x,y);
    if (si>=0) {
      const b = getSlotBounds(si);
      // Move handle (top-left 28×18)
      if (state.slots[si].img && x>=b.x&&x<=b.x+28&&y>=b.y&&y<=b.y+18) {
        dragRef.current={type:'slot_move',id:si,fromSlot:si,sx:x,sy:y};
        setActiveSlot(si); setSelectedId(null); setShowToolbar(false);
        return;
      }
      // Reset button (top-right 38×18)
      const s=state.slots[si];
      const hasEdits=s.brightness!==100||s.contrast!==100||s.saturation!==100||s.filter!=='none'||s.panX!==0||s.panY!==0||s.zoom!==1;
      if (s.img && hasEdits && x>=b.x+b.w-38&&x<=b.x+b.w&&y>=b.y&&y<=b.y+18) {
        editor.resetSlot(si);
        return;
      }
      // Pan photo within slot
      if (state.slots[si].img) {
        dragRef.current={type:'slot_pan',id:si,sx:x,sy:y,startPanX:state.slots[si].panX,startPanY:state.slots[si].panY};
        setActiveSlot(si); setSelectedId(null); setShowToolbar(false);
        return;
      }
      setActiveSlot(si); setSelectedId(null); setShowToolbar(false);
    }
  }

  function moveDrag(x:number, y:number) {
    const d=dragRef.current; if (!d) return;
    const {W,H}=getDims();

    if (d.type==='overlay') {
      const {x:nx,y:ny,guides}=snapToGrid(x-d.sx,y-d.sy,W,H,snapMode);
      setSnapGuides(guides);
      editor.updateOverlay(d.id,{x:nx+d.sx,y:ny+d.sy});
      // Don't push every frame — just update visually via state mutation
      // We'll push on endDrag
    }
    if (d.type==='shape') {
      const {x:nx,y:ny,guides}=snapToGrid(x-d.sx,y-d.sy,W,H,snapMode);
      setSnapGuides(guides);
      editor.updateShape(d.id,{x:nx,y:ny});
    }
    if (d.type==='slot_pan') {
      const dx=x-d.sx, dy=y-d.sy;
      const slot=state.slots[d.id];
      const b=getSlotBounds(d.id);
      let px=(d.startPanX||0)+dx, py=(d.startPanY||0)+dy;
      if (snapMode==='snap') {
        // Snap pan to center
        if (Math.abs(px)<12) { px=0; setSnapGuides(g=>({...g,x:b.x+b.w/2})); }
        else setSnapGuides(g=>({...g,x:undefined}));
        if (Math.abs(py)<12) { py=0; setSnapGuides(g=>({...g,y:b.y+b.h/2})); }
        else setSnapGuides(g=>({...g,y:undefined}));
      }
      editor.updateSlot(d.id,{panX:px,panY:py});
    }
    if (d.type==='slot_move') {
      const si=getSlotAt(x,y);
      setDragOverSlot(si>=0&&si!==d.fromSlot ? si : null);
    }
  }

  function endDrag(x?:number, y?:number) {
    const d=dragRef.current;
    if (d?.type==='slot_move' && x!==undefined && y!==undefined) {
      const toSlot=getSlotAt(x,y);
      if (toSlot>=0 && toSlot!==d.fromSlot) {
        editor.swapSlots(d.fromSlot!, toSlot);
      }
    }
    dragRef.current=null; setSnapGuides({}); setDragOverSlot(null);
  }

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const {x,y}=cc(e);

    // Overlays
    for (let i=state.overlays.length-1;i>=0;i--) {
      const ov=state.overlays[i];
      if (Math.abs(x-ov.x)<50&&Math.abs(y-ov.y)<50) {
        setSelectedId(ov.id); setSelectedType(ov.type==='emoji'?'overlay':'text');
        showToolbarAt(x,y,ov.type==='emoji'?'overlay':'text'); return;
      }
    }

    // Shapes
    for (let i=state.shapes.length-1;i>=0;i--) {
      const sh=state.shapes[i];
      if (x>=sh.x&&x<=sh.x+sh.w&&y>=sh.y&&y<=sh.y+sh.h) {
        setSelectedId(sh.id); setSelectedType('shape');
        showToolbarAt(x,y,'shape'); return;
      }
    }

    // Slots
    setSelectedId(null); setShowToolbar(false);
    const si=getSlotAt(x,y);
    if (si>=0) {
      setActiveSlot(si);
      if (!state.slots[si].img) fileInputRef.current?.click();
      else { setSelectedType('photo'); showToolbarAt(x,y,'photo'); }
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file=e.target.files?.[0]; if (!file) return;
    const url=URL.createObjectURL(file);
    const img=new window.Image();
    img.onload=()=>{
      editor.updateSlot(activeSlot,{img,originalSrc:url,panX:0,panY:0,zoom:1,filter:'none',brightness:100,contrast:100,saturation:100,opacity:100});
      const nx=state.slots.findIndex((s,i)=>i>activeSlot&&i<totalSlots&&!s.img);
      if (nx!==-1) setActiveSlot(nx);
    };
    img.src=url; e.target.value='';
  }

  function handleToolbarChange(action: ToolbarAction) {
    // Photo
    if (selectedType==='photo') {
      const u: Partial<SlotData>={};
      if (action.brightness !== undefined) u.brightness = action.brightness;
      if (action.contrast   !== undefined) u.contrast   = action.contrast;
      if (action.saturation !== undefined) u.saturation = action.saturation;
      if (action.filter     !== undefined) u.filter     = CSS_FILTERS[action.filter]||'none';
      if (action.opacity    !== undefined) u.opacity    = action.opacity;
      if (Object.keys(u).length) editor.updateSlot(activeSlot,u);
    }

    // Overlay/text
    if (selectedType==='text'||selectedType==='overlay') {
      const ov=state.overlays.find(o=>o.id===selectedId); if (!ov) return;
      const u: Partial<Overlay>={};
      if (action.fontSize    !== undefined) u.size       = action.fontSize;
      if (action.fontFamily  !== undefined) u.fontFamily = action.fontFamily;
      if (action.fontBold    !== undefined) u.fontBold   = action.fontBold;
      if (action.fontItalic  !== undefined) u.fontItalic = action.fontItalic;
      if (action.textColor   !== undefined) u.color      = action.textColor;
      if (action.opacity     !== undefined) u.opacity    = action.opacity;
      if (action.rotation    !== undefined) u.angle      = action.rotation;
      if (action.flipX       === true)      u.angle      = -(ov.angle||0);
      if (Object.keys(u).length) editor.updateOverlay(selectedId!,u);
    }

    // Shape
    if (selectedType==='shape') {
      const sh=state.shapes.find(s=>s.id===selectedId); if (!sh) return;
      const u: Partial<Shape>={};
      if (action.shapeColor  !== undefined) u.color       = action.shapeColor;
      if (action.shapeBorder !== undefined) u.borderColor = action.shapeBorder;
      if (action.borderWidth !== undefined) u.borderWidth = action.borderWidth;
      if (action.opacity     !== undefined) u.opacity     = action.opacity;
      if (action.rotation    !== undefined) u.angle       = action.rotation;
      if (Object.keys(u).length) editor.updateShape(selectedId!,u);
    }

    if (action.bringForward) editor.bringForward(selectedId!,selectedType==='shape'?'shape':'overlay');
    if (action.sendBackward) editor.sendBackward(selectedId!,selectedType==='shape'?'shape':'overlay');
    if (action.bgColor !== undefined) editor.setBgColor(action.bgColor);
    if (action.delete) {
      if (selectedType==='shape') editor.deleteShape(selectedId!);
      else editor.deleteOverlay(selectedId!);
      setSelectedId(null); setShowToolbar(false);
    }
  }

  function addOverlay(text:string, isEmoji=false) {
    const {W,H}=getDims();
    const ov: Overlay={
      id:++_id, text, type:isEmoji?'emoji':'text',
      x:W/2+(Math.random()*60-30), y:H/3+(Math.random()*40-20),
      size:isEmoji?Math.round(H*.1):24, color:'#ffffff',
      angle:0, opacity:100, fontFamily:'Arial', fontBold:false, fontItalic:false,
    };
    editor.addOverlay(ov);
    setSelectedId(ov.id); setSelectedType(isEmoji?'overlay':'text');
    showToolbarAt(ov.x,ov.y,isEmoji?'overlay':'text');
  }

  function exportPrint() {
    const canvas=canvasRef.current; if (!canvas) return;
    const {W,H}=getDims();
    const exp=document.createElement('canvas');
    exp.width=W*5; exp.height=H*5;
    const ctx=exp.getContext('2d')!;
    ctx.scale(5,5); ctx.drawImage(canvas,0,0,W,H);
    onComplete(exp.toDataURL('image/jpeg',.95),state.slots);
  }

  const pb=(id:typeof panel,lbl:string)=>(
    <button key={id} onClick={()=>setPanel(id)} style={{flex:1,padding:'7px 4px',background:panel===id?'#1a1a1a':'transparent',border:panel===id?'1px solid #444':'1px solid transparent',borderRadius:8,color:panel===id?'#fff':'#666',fontSize:11,cursor:'pointer',fontWeight:500}}>{lbl}</button>
  );

  const activeSlotData   = state.slots[activeSlot];
  const selectedOv       = state.overlays.find(o=>o.id===selectedId);
  const selectedShape    = state.shapes.find(s=>s.id===selectedId);

  return (
    <div style={{width:'100%',maxWidth:640}}>

      <EditorToolbar
        visible={showToolbar}
        elementType={selectedType}
        position={toolbarPos}
        brightness={selectedType==='photo'?activeSlotData?.brightness:undefined}
        contrast={selectedType==='photo'?activeSlotData?.contrast:undefined}
        saturation={selectedType==='photo'?activeSlotData?.saturation:undefined}
        filter={selectedType==='photo'?Object.entries(CSS_FILTERS).find(([,v])=>v===activeSlotData?.filter)?.[0]:undefined}
        fontSize={selectedOv?.size}
        fontFamily={selectedOv?.fontFamily}
        fontBold={selectedOv?.fontBold}
        fontItalic={selectedOv?.fontItalic}
        textColor={selectedOv?.color}
        shapeColor={selectedShape?.color}
        opacity={selectedType==='photo'?activeSlotData?.opacity:selectedType==='shape'?selectedShape?.opacity:selectedOv?.opacity}
        rotation={selectedType==='shape'?selectedShape?.angle:selectedOv?.angle}
        bgColor={state.bgColor}
        onChange={handleToolbarChange}
        onClose={()=>setShowToolbar(false)}
      />

      {/* Header + undo/redo/snap */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <div>
          <h3 style={{fontSize:15,fontWeight:500,margin:'0 0 2px'}}>Photo print designer</h3>
          <p style={{fontSize:11,color:'#888',margin:0}}>4×6 · tap any element to edit</p>
        </div>
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          <button onClick={editor.undo} disabled={!editor.canUndo} title="Undo (Ctrl+Z)" style={{padding:'6px 10px',background:editor.canUndo?'#1a1a1a':'#111',border:'1px solid #333',borderRadius:6,color:editor.canUndo?'#fff':'#444',fontSize:13,cursor:editor.canUndo?'pointer':'not-allowed'}}>↩</button>
          <button onClick={editor.redo} disabled={!editor.canRedo} title="Redo (Ctrl+Y)" style={{padding:'6px 10px',background:editor.canRedo?'#1a1a1a':'#111',border:'1px solid #333',borderRadius:6,color:editor.canRedo?'#fff':'#444',fontSize:13,cursor:editor.canRedo?'pointer':'not-allowed'}}>↪</button>
          <button onClick={()=>setSnapMode(s=>s==='snap'?'freehand':'snap')} style={{padding:'6px 10px',background:snapMode==='snap'?'#0d1f0d':'#1a1a1a',border:`1px solid ${snapMode==='snap'?'#4ADE80':'#333'}`,borderRadius:6,color:snapMode==='snap'?'#4ADE80':'#888',fontSize:11,cursor:'pointer',whiteSpace:'nowrap'}}>
            {snapMode==='snap'?'⊞ Snap':'✏️ Free'}
          </button>
        </div>
      </div>

      {/* Orientation */}
      <div style={{display:'flex',gap:6,marginBottom:10}}>
        {[['l','▭ Landscape'],['p','▯ Portrait']].map(([v,lbl])=>(
          <button key={v} onClick={()=>setOrientation(v as 'l'|'p')} style={{flex:1,padding:'8px',border:orientation===v?'1px solid #4ADE80':'1px solid #333',borderRadius:8,background:orientation===v?'#0d1f0d':'transparent',color:orientation===v?'#4ADE80':'#888',fontSize:12,cursor:'pointer'}}>{lbl}</button>
        ))}
      </div>

      {/* Templates */}
      <div style={{marginBottom:10}}>
        <p style={{fontSize:11,color:'#666',margin:'0 0 6px'}}>Layout — {filled}/{totalSlots} photos</p>
        <div style={{display:'flex',gap:5,overflowX:'auto',paddingBottom:2}}>
          {TEMPLATES.map(t=>(
            <button key={t.id} onClick={()=>{setTemplateId(t.id);setActiveSlot(0);}} style={{padding:'5px 9px',borderRadius:8,flexShrink:0,border:templateId===t.id?'1px solid #4ADE80':'1px solid #333',background:templateId===t.id?'#0d1f0d':'#111',color:templateId===t.id?'#4ADE80':'#888',fontSize:11,cursor:'pointer'}}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div ref={wrapRef} style={{width:'100%',borderRadius:10,overflow:'hidden',border:'1px solid #333',marginBottom:6,background:state.bgColor,touchAction:'none',cursor:addingShape?'crosshair':'default'}}>
        <canvas ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseDown={e=>{const{x,y}=cc(e);startDrag(x,y);}}
          onMouseMove={e=>{const{x,y}=cc(e);moveDrag(x,y);}}
          onMouseUp={e=>{const{x,y}=cc(e);endDrag(x,y);}}
          onMouseLeave={()=>endDrag()}
          onTouchStart={e=>{const{x,y}=tcXY(e);startDrag(x,y);}}
          onTouchMove={e=>{e.preventDefault();const{x,y}=tcXY(e);moveDrag(x,y);}}
          onTouchEnd={e=>{const t=e.changedTouches[0];const c=canvasRef.current!,r=c.getBoundingClientRect();endDrag((t.clientX-r.left)*(c.width/r.width),(t.clientY-r.top)*(c.height/r.height));}}
          style={{display:'block',width:'100%'}}
        />
      </div>

      <p style={{fontSize:11,color:'#555',margin:'0 0 10px',textAlign:'center'}}>
        {addingShape?`Click canvas to place ${addingShape}`:'⠿ drag move handle to swap slots · tap photo to adjust · ↺ reset button clears edits'}
      </p>

      <input ref={fileInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handlePhotoUpload}/>

      {/* Slot selector */}
      <div style={{display:'flex',gap:5,marginBottom:10}}>
        {Array.from({length:totalSlots},(_,i)=>(
          <button key={i} onClick={()=>{setActiveSlot(i);if(!state.slots[i].img)fileInputRef.current?.click();}} style={{width:30,height:30,borderRadius:6,border:activeSlot===i?'2px solid #4ADE80':'1px solid #333',background:activeSlot===i?'#0d1f0d':state.slots[i].img?'#1a2a1a':'#1a1a1a',color:activeSlot===i?'#4ADE80':'#666',fontSize:10,cursor:'pointer'}}>
            {state.slots[i].img?'✓':i+1}
          </button>
        ))}
        <button onClick={()=>fileInputRef.current?.click()} style={{flex:1,padding:'4px 6px',background:'#4ADE80',color:'#000',border:'none',borderRadius:6,fontSize:10,fontWeight:700,cursor:'pointer'}}>+ Photo</button>
      </div>

      {/* Panel tabs */}
      <div style={{display:'flex',gap:4,marginBottom:10}}>
        {pb('photos','📷 Photos')}
        {pb('text','✏️ Text')}
        {pb('overlays','🎭 Emoji')}
        {pb('shapes','⬜ Shapes')}
      </div>

      <div style={{background:'#111',borderRadius:10,padding:'12px',border:'1px solid #222',marginBottom:10}}>

        {panel==='photos'&&(
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <p style={{fontSize:12,color:'#888',margin:0,lineHeight:1.6}}>
              Active: <strong style={{color:'#4ADE80'}}>slot {activeSlot+1}</strong> · tap photo on canvas to open editor
            </p>
            <p style={{fontSize:11,color:'#666',margin:'4px 0 0'}}>QR placement</p>
            {[{id:'border',label:'Bottom border strip'},{id:'corner_br',label:'Bottom right corner'},{id:'corner_bl',label:'Bottom left corner'},{id:'back',label:'Back label only'}].map(p=>(
              <div key={p.id} onClick={()=>setQr(p.id)} style={{padding:'7px 10px',borderRadius:7,cursor:'pointer',border:qr===p.id?'1px solid #4ADE80':'1px solid #333',background:qr===p.id?'#0d1f0d':'transparent',display:'flex',justifyContent:'space-between',fontSize:12}}>
                <span style={{color:qr===p.id?'#4ADE80':'#888'}}>{p.label}</span>
                {qr===p.id&&<span style={{color:'#4ADE80'}}>✓</span>}
              </div>
            ))}
            <input value={gradName} onChange={e=>setGradName(e.target.value)} placeholder="Graduate name" style={{width:'100%',padding:'8px 10px',background:'#1a1a1a',border:'1px solid #333',borderRadius:7,color:'#fff',fontSize:12,outline:'none'}}/>
            <input value={school} onChange={e=>setSchool(e.target.value)} placeholder="School name (optional)" style={{width:'100%',padding:'8px 10px',background:'#1a1a1a',border:'1px solid #333',borderRadius:7,color:'#fff',fontSize:12,outline:'none'}}/>
          </div>
        )}

        {panel==='text'&&(
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
              {TEXT_PRESETS.map(t=>(
                <button key={t} onClick={()=>setTextInput(t.replace('[Name]',gradName||'Name').replace('[School]',school||'School'))} style={{padding:'4px 8px',borderRadius:14,border:'1px solid #333',background:'transparent',color:'#888',fontSize:11,cursor:'pointer'}}>{t}</button>
              ))}
            </div>
            <input value={textInput} onChange={e=>setTextInput(e.target.value)} placeholder="Custom text…" onKeyDown={e=>e.key==='Enter'&&textInput&&(addOverlay(textInput),setTextInput(''))} style={{width:'100%',padding:'9px 12px',background:'#1a1a1a',border:'1px solid #333',borderRadius:8,color:'#fff',fontSize:13,outline:'none'}}/>
            <button onClick={()=>{if(textInput){addOverlay(textInput);setTextInput('');}}} disabled={!textInput} style={{padding:'10px',background:textInput?'#4ADE80':'#333',color:textInput?'#000':'#888',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:textInput?'pointer':'not-allowed'}}>
              Add text → tap to style
            </button>
          </div>
        )}

        {panel==='overlays'&&(
          <div>
            <p style={{fontSize:11,color:'#666',margin:'0 0 8px'}}>Tap to add · tap on canvas to style</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:5}}>
              {CLIP_ART.map(e=>(
                <button key={e} onClick={()=>addOverlay(e,true)} style={{padding:'7px 3px',borderRadius:8,border:'1px solid #333',background:'#1a1a1a',cursor:'pointer',textAlign:'center',fontSize:18}}>{e}</button>
              ))}
            </div>
          </div>
        )}

        {panel==='shapes'&&(
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <p style={{fontSize:11,color:'#666',margin:0}}>Select a shape then click on the canvas to place it</p>
            <div style={{display:'flex',gap:8}}>
              {(['rect','circle','line'] as const).map(kind=>(
                <button key={kind} onClick={()=>setAddingShape(addingShape===kind?null:kind)} style={{flex:1,padding:'10px 4px',background:addingShape===kind?'#4ADE80':'#1a1a1a',color:addingShape===kind?'#000':'#888',border:addingShape===kind?'none':'1px solid #333',borderRadius:8,fontSize:12,cursor:'pointer'}}>
                  {kind==='rect'?'⬜ Rect':kind==='circle'?'⭕ Circle':'➖ Line'}
                </button>
              ))}
            </div>
            {addingShape&&(
              <div style={{background:'#0d1f0d',border:'1px solid #4ADE80',borderRadius:8,padding:'8px 12px',fontSize:12,color:'#4ADE80'}}>
                Click on the canvas to place your {addingShape}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{display:'flex',gap:8}}>
        <button onClick={onBack} style={{flex:1,padding:12,border:'1px solid #333',borderRadius:10,background:'transparent',color:'#fff',fontSize:14,cursor:'pointer'}}>← Back</button>
        <button onClick={exportPrint} style={{flex:2,padding:12,background:filled===0?'#333':'#4ADE80',color:filled===0?'#888':'#000',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:filled===0?'not-allowed':'pointer'}}>
          {filled===0?'Add at least one photo':`Use this design (${filled}/${totalSlots}) →`}
        </button>
      </div>
    </div>
  );
}