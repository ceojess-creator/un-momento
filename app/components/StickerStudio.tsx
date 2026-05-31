'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import EditorToolbar, { ToolbarAction, ElementType } from './EditorToolbar';
import { useEditorHistory } from './useEditorHistory';
import {
  SlotData, Overlay, Shape, DEFAULT_SLOT,
  CLIP_ART, CSS_FILTERS, buildCSSFilter,
  snapToGrid, SnapMode,
} from './EditorTypes';

const LAYOUTS = [
  { id:'1x1',   label:'1 large',    cols:1, rows:1 },
  { id:'2x2',   label:'4 stickers', cols:2, rows:2 },
  { id:'3x2',   label:'6 stickers', cols:3, rows:2 },
  { id:'strip', label:'4 strip',    cols:1, rows:4 },
];

const SHAPES = [
  { id:'circle',         label:'⭕ Circle'   },
  { id:'rounded_square', label:'🟦 Rounded'  },
  { id:'portrait',       label:'📷 Portrait' },
];

const TEXT_SUGGESTIONS = [
  'Class of 2026','DONE!','FINALLY!','#GRAD2026',
  'The best is yet to come','Level up','Next chapter',
];

const MORE_EMOJIS = ['🎉','🎊','💫','🌸','🦋','🙌','👑','🎵','🌈','☀️','🌙','⚡','🎯','🏅','📸','🖼️'];

let _sid = 0;

interface StickerStudioProps {
  onComplete: (dataUrl: string, layout: string, shape: string) => void;
  onBack:     () => void;
}

export default function StickerStudio({ onComplete, onBack }: StickerStudioProps) {
  const wrapRef      = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dragRef = useRef<{
    type:      'slot_pan' | 'slot_move' | 'overlay' | 'shape';
    id:        number;
    fromSlot?: number;
    sx:        number;
    sy:        number;
    startPanX?: number;
    startPanY?: number;
  } | null>(null);

  const editor = useEditorHistory({
    slots:    Array.from({ length: 9 }, () => ({ ...DEFAULT_SLOT })),
    overlays: [],
    shapes:   [],
    bgColor:  '#ffffff',
  });

  const [layout,       setLayout]       = useState('2x2');
  const [shape,        setShape]        = useState('rounded_square');
  const [activeSlot,   setActiveSlot]   = useState(0);
  const [panel,        setPanel]        = useState<'photo'|'text'|'overlays'|'shapes'|'layout'>('photo');
  const [snapMode,     setSnapMode]     = useState<SnapMode>('snap');
  const [snapGuides,   setSnapGuides]   = useState<{x?:number;y?:number}>({});
  const [dragOverSlot, setDragOverSlot] = useState<number|null>(null);
  const [selectedId,   setSelectedId]   = useState<number|null>(null);
  const [selectedType, setSelectedType] = useState<ElementType|null>(null);
  const [showToolbar,  setShowToolbar]  = useState(false);
  const [toolbarPos,   setToolbarPos]   = useState({x:0,y:0});
  const [addingShape,  setAddingShape]  = useState<'rect'|'circle'|'line'|null>(null);
  const [removingBg,   setRemovingBg]   = useState(false);
  const [overlapWarn,  setOverlapWarn]  = useState<string|null>(null);
  const [textInput,    setTextInput]    = useState('');

  const { state } = editor;
  const L         = LAYOUTS.find(l => l.id === layout)!;
  const slotCount = L.cols * L.rows;

  function getDims() {
    const W = wrapRef.current?.clientWidth || 320;
    return { W, H: Math.round(W * (560/320)) };
  }

  function slotRect(idx: number, W: number, H: number) {
    const MARGIN = Math.round(W * 0.05);
    const GUTTER = Math.round(W * 0.02);
    const sw = (W - MARGIN*2 - GUTTER*(L.cols-1)) / L.cols;
    const sh = (H - MARGIN*2 - GUTTER*(L.rows-1)) / L.rows;
    const c  = idx % L.cols, r = Math.floor(idx / L.cols);
    return { x: MARGIN+c*(sw+GUTTER), y: MARGIN+r*(sh+GUTTER), w: sw, h: sh };
  }

  function drawShape(ctx: CanvasRenderingContext2D, x:number, y:number, w:number, h:number) {
    ctx.beginPath();
    if (shape==='circle') {
      ctx.arc(x+w/2, y+h/2, Math.min(w,h)/2, 0, Math.PI*2);
    } else if (shape==='rounded_square') {
      const r = Math.min(w,h)*0.15;
      ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
      ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
      ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
      ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r);
    } else {
      ctx.roundRect(x,y,w,h,6);
    }
    ctx.closePath();
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx    = canvas.getContext('2d'); if (!ctx) return;
    const { W, H } = getDims();
    canvas.width = W; canvas.height = H;

    // Background
    ctx.fillStyle = state.bgColor || '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // Sticker slots
    for (let i = 0; i < slotCount; i++) {
      const { x, y, w, h } = slotRect(i, W, H);
      const s = state.slots[i];
      const isActive   = i === activeSlot;
      const isDragOver = i === dragOverSlot;

      ctx.save();
      drawShape(ctx, x, y, w, h);
      ctx.clip();

      const imgEl = s.bgRemovedUrl
        ? (() => { const im = new window.Image(); im.src = s.bgRemovedUrl!; return im; })()
        : s.img;

      if (imgEl) {
        const iw = imgEl.naturalWidth || imgEl.width;
        const ih = imgEl.naturalHeight || imgEl.height;
        if (iw > 0 && ih > 0) {
          const scale = (iw/ih > w/h ? h/ih : w/iw) * s.zoom;
          const dw = iw*scale, dh = ih*scale;
          const dx = x+(w-dw)/2+s.panX, dy = y+(h-dh)/2+s.panY;
          const f = buildCSSFilter(s);
          if (f !== 'none') ctx.filter = f;
          ctx.globalAlpha = (s.opacity||100)/100;
          ctx.drawImage(imgEl, dx, dy, dw, dh);
          ctx.globalAlpha = 1; ctx.filter = 'none';
        }
      } else {
        ctx.fillStyle = isDragOver ? '#e8ffe8' : isActive ? '#f0fff0' : '#f5f5f5';
        ctx.fillRect(x, y, w, h);
      }

      // Slot text
      if (s.text) {
        ctx.font = `bold 14px Arial`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillText(s.text, x+w/2+1, y+h-4);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(s.text, x+w/2, y+h-5);
      }

      ctx.restore();

      // Border / die-cut line
      ctx.save();
      drawShape(ctx, x, y, w, h);
      ctx.strokeStyle = isDragOver ? '#4ADE80' : isActive ? '#4ADE80' : '#FF0080';
      ctx.lineWidth   = isDragOver ? 2.5 : isActive ? 2 : 1;
      ctx.setLineDash(isDragOver ? [] : isActive ? [] : [3,3]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Empty slot label
      if (!imgEl) {
        ctx.fillStyle = isActive||isDragOver ? '#4ADE80' : '#aaa';
        ctx.font      = `${Math.round(Math.min(w,h)*.14)}px Arial`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(isDragOver ? '↓ drop' : isActive ? '+ tap' : `${i+1}`, x+w/2, y+h/2);
      }

      // Move handle on filled slots
      if (imgEl) {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(x, y, 28, 18);
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText('⠿ move', x+3, y+4);

        // Reset button
        const hasEdits = s.brightness!==100||s.contrast!==100||s.saturation!==100||s.filter!=='none'||s.panX!==0||s.panY!==0||s.zoom!==1;
        if (hasEdits) {
          ctx.fillStyle = 'rgba(186,117,23,0.85)';
          ctx.fillRect(x+w-38, y, 38, 18);
          ctx.fillStyle = '#fff'; ctx.textAlign = 'right';
          ctx.fillText('↺ reset', x+w-3, y+4);
        }
      }
    }

    // Snap guides
    if (snapGuides.x !== undefined) {
      ctx.strokeStyle='rgba(74,222,128,0.5)'; ctx.lineWidth=1; ctx.setLineDash([4,4]);
      ctx.beginPath(); ctx.moveTo(snapGuides.x,0); ctx.lineTo(snapGuides.x,H); ctx.stroke();
      ctx.setLineDash([]);
    }
    if (snapGuides.y !== undefined) {
      ctx.strokeStyle='rgba(74,222,128,0.5)'; ctx.lineWidth=1; ctx.setLineDash([4,4]);
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
      } else {
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
      const weight = ov.fontBold   ? 'bold '  : '';
      const style  = ov.fontItalic ? 'italic ' : '';
      ctx.font      = `${style}${weight}${ov.size}px ${ov.fontFamily||'Arial'}`;
      ctx.fillStyle = ov.color;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor='rgba(0,0,0,0.4)'; ctx.shadowBlur=2;
      ctx.fillText(ov.text, 0, 0);
      ctx.shadowBlur=0; ctx.globalAlpha=1;
      if (selectedId===ov.id) {
        ctx.strokeStyle='#4ADE80'; ctx.lineWidth=1.5;
        const m=ctx.measureText(ov.text), tw=m.width, th=ov.size*1.2;
        ctx.strokeRect(-tw/2-4,-th/2-2,tw+8,th+4);
      }
      ctx.restore();
    });

    // Registration marks
    const REG = Math.round(W*.045);
    [[4,4],[W-REG-4,4],[4,H-REG-4]].forEach(([rx,ry]) => {
      ctx.fillStyle='#000'; ctx.fillRect(rx,ry,REG,REG);
    });
  }, [L, shape, state, selectedId, activeSlot, snapGuides, dragOverSlot]);

  useEffect(() => { draw(); }, [draw]);
  useEffect(() => {
    const ro = new ResizeObserver(() => draw());
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey||e.ctrlKey) && e.key==='z') { e.preventDefault(); if(e.shiftKey) editor.redo(); else editor.undo(); }
      if ((e.metaKey||e.ctrlKey) && e.key==='y') { e.preventDefault(); editor.redo(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editor]);

  function canvasXY(e: React.MouseEvent<HTMLCanvasElement>) {
    const c=canvasRef.current!, r=c.getBoundingClientRect();
    return { x:(e.clientX-r.left)*(c.width/r.width), y:(e.clientY-r.top)*(c.height/r.height) };
  }
  function touchXY(e: React.TouchEvent<HTMLCanvasElement>) {
    const c=canvasRef.current!, r=c.getBoundingClientRect(), t=e.touches[0];
    return { x:(t.clientX-r.left)*(c.width/r.width), y:(t.clientY-r.top)*(c.height/r.height) };
  }
  function getSlotAt(x:number, y:number) {
    const {W,H}=getDims();
    for (let i=0;i<slotCount;i++) {
      const {x:sx,y:sy,w,h}=slotRect(i,W,H);
      if (x>=sx&&x<=sx+w&&y>=sy&&y<=sy+h) return i;
    }
    return -1;
  }

  function showToolbarAt(x:number, y:number, type:ElementType) {
    const c=canvasRef.current!; const r=c.getBoundingClientRect();
    setToolbarPos({ x:r.left+x*(r.width/c.width), y:r.top+y*(r.height/c.height) });
    setSelectedType(type); setShowToolbar(true);
  }

  function startDrag(x:number, y:number) {
    if (addingShape) {
      const sh: Shape = { id:++_sid, kind:addingShape, x:x-40, y:y-40, w:80, h:addingShape==='line'?6:80, color:'#4ADE80', borderColor:'#ffffff', borderWidth:0, opacity:100, angle:0 };
      editor.addShape(sh);
      setSelectedId(sh.id); setSelectedType('shape');
      setAddingShape(null);
      showToolbarAt(x,y,'shape');
      return;
    }

    // Overlays
    for (let i=state.overlays.length-1;i>=0;i--) {
      const ov=state.overlays[i];
      if (Math.abs(x-ov.x)<50&&Math.abs(y-ov.y)<50) {
        dragRef.current={type:'overlay',id:ov.id,sx:x-ov.x,sy:y-ov.y};
        setSelectedId(ov.id); setSelectedType(ov.type==='emoji'?'overlay':'text');
        showToolbarAt(x,y,ov.type==='emoji'?'overlay':'text');
        return;
      }
    }

    // Shapes
    for (let i=state.shapes.length-1;i>=0;i--) {
      const sh=state.shapes[i];
      if (x>=sh.x&&x<=sh.x+sh.w&&y>=sh.y&&y<=sh.y+sh.h) {
        dragRef.current={type:'shape',id:sh.id,sx:x-sh.x,sy:y-sh.y};
        setSelectedId(sh.id); setSelectedType('shape');
        showToolbarAt(x,y,'shape');
        return;
      }
    }

    // Slots
    const si = getSlotAt(x,y);
    if (si >= 0) {
      const { W, H } = getDims();
      const b = slotRect(si,W,H);
      const s = state.slots[si];
      const imgEl = s.bgRemovedUrl || s.img;

      // Move handle
      if (imgEl && x>=b.x&&x<=b.x+28&&y>=b.y&&y<=b.y+18) {
        dragRef.current={type:'slot_move',id:si,fromSlot:si,sx:x,sy:y};
        setActiveSlot(si); setSelectedId(null); setShowToolbar(false);
        return;
      }

      // Reset button
      const hasEdits = s.brightness!==100||s.contrast!==100||s.saturation!==100||s.filter!=='none'||s.panX!==0||s.panY!==0||s.zoom!==1;
      if (imgEl && hasEdits && x>=b.x+b.w-38&&x<=b.x+b.w&&y>=b.y&&y<=b.y+18) {
        editor.resetSlot(si);
        return;
      }

      // Pan
      if (imgEl) {
        dragRef.current={type:'slot_pan',id:si,sx:x,sy:y,startPanX:s.panX,startPanY:s.panY};
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
    }
    if (d.type==='shape') {
      const {x:nx,y:ny,guides}=snapToGrid(x-d.sx,y-d.sy,W,H,snapMode);
      setSnapGuides(guides);
      editor.updateShape(d.id,{x:nx,y:ny});
    }
    if (d.type==='slot_pan') {
      const dx=x-d.sx, dy=y-d.sy;
      let px=(d.startPanX||0)+dx, py=(d.startPanY||0)+dy;
      if (snapMode==='snap') {
        if (Math.abs(px)<12) { px=0; setSnapGuides(g=>({...g,x:W/2})); }
        else setSnapGuides(g=>({...g,x:undefined}));
        if (Math.abs(py)<12) { py=0; setSnapGuides(g=>({...g,y:H/2})); }
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
      if (toSlot>=0 && toSlot!==d.fromSlot) editor.swapSlots(d.fromSlot!, toSlot);
    }
    dragRef.current=null; setSnapGuides({}); setDragOverSlot(null);
  }

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const {x,y}=canvasXY(e);

    for (let i=state.overlays.length-1;i>=0;i--) {
      const ov=state.overlays[i];
      if (Math.abs(x-ov.x)<50&&Math.abs(y-ov.y)<50) {
        setSelectedId(ov.id); setSelectedType(ov.type==='emoji'?'overlay':'text');
        showToolbarAt(x,y,ov.type==='emoji'?'overlay':'text'); return;
      }
    }
    for (let i=state.shapes.length-1;i>=0;i--) {
      const sh=state.shapes[i];
      if (x>=sh.x&&x<=sh.x+sh.w&&y>=sh.y&&y<=sh.y+sh.h) {
        setSelectedId(sh.id); setSelectedType('shape');
        showToolbarAt(x,y,'shape'); return;
      }
    }

    setSelectedId(null); setShowToolbar(false);
    const si=getSlotAt(x,y);
    if (si>=0) {
      setActiveSlot(si);
      const s=state.slots[si];
      if (!s.img&&!s.bgRemovedUrl) fileInputRef.current?.click();
      else { setSelectedType('photo'); showToolbarAt(x,y,'photo'); }
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file=e.target.files?.[0]; if (!file) return;
    const url=URL.createObjectURL(file);
    const img=new window.Image();
    img.onload=()=>{ editor.updateSlot(activeSlot,{img,originalSrc:url,bgRemovedUrl:null,panX:0,panY:0,zoom:1,filter:'none',brightness:100,contrast:100,saturation:100,opacity:100}); };
    img.src=url; e.target.value='';
  }

  async function removeBackground() {
    const s=state.slots[activeSlot];
    if (!s.img) { alert('Select a slot with a photo first.'); return; }
    setRemovingBg(true);
    try {
      const c2=document.createElement('canvas');
      c2.width=s.img.naturalWidth; c2.height=s.img.naturalHeight;
      c2.getContext('2d')!.drawImage(s.img,0,0);
      const blob=await new Promise<Blob>(res=>c2.toBlob(b=>res(b!),'image/jpeg',.9));
      const fd=new FormData(); fd.append('image',blob,'photo.jpg');
      const res=await fetch('/api/remove-bg',{method:'POST',body:fd});
      const data=await res.json();
      if (data.url) {
        const img2=new window.Image();
        img2.onload=()=>{ editor.updateSlot(activeSlot,{bgRemovedUrl:data.url}); };
        img2.src=data.url;
      }
    } catch(err) { console.error(err); }
    setRemovingBg(false);
  }

  function handleToolbarChange(action: ToolbarAction) {
    if (selectedType==='photo') {
      const u: Partial<SlotData>={};
      if (action.brightness !== undefined) u.brightness = action.brightness;
      if (action.contrast   !== undefined) u.contrast   = action.contrast;
      if (action.saturation !== undefined) u.saturation = action.saturation;
      if (action.filter     !== undefined) u.filter     = CSS_FILTERS[action.filter]||'none';
      if (action.opacity    !== undefined) u.opacity    = action.opacity;
      if (Object.keys(u).length) editor.updateSlot(activeSlot,u);
    }
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
    if (selectedType==='shape') {
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
      id:++_sid, text, type:isEmoji?'emoji':'text',
      x:W/2+(Math.random()*60-30), y:H/2+(Math.random()*40-20),
      size:isEmoji?Math.round(Math.min(W,H)*.08):20, color:'#ffffff',
      angle:0, opacity:100, fontFamily:'Arial', fontBold:false, fontItalic:false,
    };
    editor.addOverlay(ov);
    setSelectedId(ov.id); setSelectedType(isEmoji?'overlay':'text');
    showToolbarAt(ov.x,ov.y,isEmoji?'overlay':'text');
  }

  function exportSheet() {
    const canvas=canvasRef.current; if (!canvas) return;
    const {W,H}=getDims();
    const exp=document.createElement('canvas');
    exp.width=W*4; exp.height=H*4;
    const ctx=exp.getContext('2d')!;
    ctx.scale(4,4); ctx.drawImage(canvas,0,0,W,H);
    onComplete(exp.toDataURL('image/png'),layout,shape);
  }

  const pb=(id:typeof panel,lbl:string)=>(
    <button key={id} onClick={()=>setPanel(id)} style={{flex:1,padding:'7px 4px',background:panel===id?'#1a1a1a':'transparent',border:panel===id?'1px solid #444':'1px solid transparent',borderRadius:8,color:panel===id?'#fff':'#666',fontSize:11,cursor:'pointer',fontWeight:500}}>{lbl}</button>
  );

  const activeSlotData = state.slots[activeSlot];
  const selectedOv     = state.overlays.find(o=>o.id===selectedId);
  const selectedShape  = state.shapes.find(s=>s.id===selectedId);

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

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <div>
          <h3 style={{fontSize:15,fontWeight:500,margin:'0 0 2px'}}>Sticker sheet designer</h3>
          <p style={{fontSize:11,color:'#888',margin:0}}>Pixcut S1 · die-cut · tap any element to edit</p>
        </div>
        <div style={{display:'flex',gap:6}}>
          <button onClick={editor.undo} disabled={!editor.canUndo} title="Undo (Ctrl+Z)" style={{padding:'6px 10px',background:editor.canUndo?'#1a1a1a':'#111',border:'1px solid #333',borderRadius:6,color:editor.canUndo?'#fff':'#444',fontSize:13,cursor:editor.canUndo?'pointer':'not-allowed'}}>↩</button>
          <button onClick={editor.redo} disabled={!editor.canRedo} title="Redo" style={{padding:'6px 10px',background:editor.canRedo?'#1a1a1a':'#111',border:'1px solid #333',borderRadius:6,color:editor.canRedo?'#fff':'#444',fontSize:13,cursor:editor.canRedo?'pointer':'not-allowed'}}>↪</button>
          <button onClick={()=>setSnapMode(s=>s==='snap'?'freehand':'snap')} style={{padding:'6px 10px',background:snapMode==='snap'?'#0d1f0d':'#1a1a1a',border:`1px solid ${snapMode==='snap'?'#4ADE80':'#333'}`,borderRadius:6,color:snapMode==='snap'?'#4ADE80':'#888',fontSize:11,cursor:'pointer',whiteSpace:'nowrap'}}>
            {snapMode==='snap'?'⊞ Snap':'✏️ Free'}
          </button>
        </div>
      </div>

      {overlapWarn&&(
        <div style={{background:'#2a1a00',border:'1px solid #BA7517',borderRadius:8,padding:'8px 12px',fontSize:12,color:'#BA7517',marginBottom:10,lineHeight:1.5}}>
          {overlapWarn}
          <button onClick={()=>setOverlapWarn(null)} style={{marginLeft:8,padding:'2px 8px',background:'transparent',border:'1px solid #BA7517',borderRadius:4,color:'#BA7517',fontSize:11,cursor:'pointer'}}>Got it</button>
        </div>
      )}

      {/* Canvas */}
      <div ref={wrapRef} style={{width:'100%',borderRadius:10,overflow:'hidden',border:'1px solid #333',marginBottom:6,background:state.bgColor||'#fff',touchAction:'none',cursor:addingShape?'crosshair':'default'}}>
        <canvas ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseDown={e=>{const{x,y}=canvasXY(e);startDrag(x,y);}}
          onMouseMove={e=>{const{x,y}=canvasXY(e);moveDrag(x,y);}}
          onMouseUp={e=>{const{x,y}=canvasXY(e);endDrag(x,y);}}
          onMouseLeave={()=>endDrag()}
          onTouchStart={e=>{const{x,y}=touchXY(e);startDrag(x,y);}}
          onTouchMove={e=>{e.preventDefault();const{x,y}=touchXY(e);moveDrag(x,y);}}
          onTouchEnd={e=>{const t=e.changedTouches[0];const c=canvasRef.current!,r=c.getBoundingClientRect();endDrag((t.clientX-r.left)*(c.width/r.width),(t.clientY-r.top)*(c.height/r.height));}}
          style={{display:'block',width:'100%'}}
        />
      </div>
      <p style={{fontSize:11,color:'#555',margin:'0 0 10px',textAlign:'center'}}>
        {addingShape?`Click canvas to place ${addingShape}`:'Pink dashed = die-cut · ⠿ drag handle to swap slots · tap photo to adjust'}
      </p>

      <input ref={fileInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handlePhotoUpload}/>

      {/* Slot selector */}
      <div style={{display:'flex',gap:5,marginBottom:10,flexWrap:'wrap'}}>
        {Array.from({length:slotCount},(_,i)=>(
          <button key={i} onClick={()=>{setActiveSlot(i);const s=state.slots[i];if(!s.img&&!s.bgRemovedUrl)fileInputRef.current?.click();}} style={{width:30,height:30,borderRadius:6,border:activeSlot===i?'2px solid #4ADE80':'1px solid #333',background:activeSlot===i?'#0d1f0d':(state.slots[i].img||state.slots[i].bgRemovedUrl)?'#1a2a1a':'#1a1a1a',color:activeSlot===i?'#4ADE80':'#666',fontSize:10,cursor:'pointer'}}>
            {(state.slots[i].img||state.slots[i].bgRemovedUrl)?'✓':i+1}
          </button>
        ))}
        <button onClick={()=>fileInputRef.current?.click()} style={{flex:1,padding:'4px 6px',background:'#4ADE80',color:'#000',border:'none',borderRadius:6,fontSize:10,fontWeight:700,cursor:'pointer'}}>+ Slot {activeSlot+1}</button>
      </div>

      {/* Panel tabs */}
      <div style={{display:'flex',gap:4,marginBottom:10}}>
        {pb('photo','📷 Photo')}
        {pb('text','✏️ Text')}
        {pb('overlays','🎭 Emoji')}
        {pb('shapes','⬜ Shapes')}
        {pb('layout','📐 Layout')}
      </div>

      <div style={{background:'#111',borderRadius:10,padding:'12px',border:'1px solid #222',marginBottom:10}}>

        {panel==='photo'&&(
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <button onClick={()=>fileInputRef.current?.click()} style={{padding:'10px',background:'#4ADE80',color:'#000',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer'}}>📷 Add photo to slot {activeSlot+1}</button>
            <button onClick={removeBackground} disabled={removingBg||!state.slots[activeSlot].img} style={{padding:'10px',background:removingBg?'#333':'#1a1a1a',color:removingBg?'#888':'#fff',border:'1px solid #444',borderRadius:8,fontSize:13,cursor:removingBg?'wait':'pointer'}}>
              {removingBg?'✨ Removing background…':'✨ Remove background'}
            </button>
            {state.slots[activeSlot].bgRemovedUrl&&(
              <div style={{background:'#0d1f0d',borderRadius:8,padding:'8px 12px',fontSize:12,color:'#4ADE80'}}>✓ Background removed — tap photo on canvas to style</div>
            )}
            <p style={{fontSize:11,color:'#666',margin:'4px 0 0',lineHeight:1.5}}>
              Tap the photo on canvas to open the style editor · ⠿ move handle to swap slots · ↺ reset clears edits
            </p>
            <div>
              <p style={{fontSize:11,color:'#666',margin:'0 0 4px'}}>Slot text label</p>
              <input value={activeSlotData?.text||''} onChange={e=>editor.updateSlot(activeSlot,{text:e.target.value})}
                placeholder="Text on this sticker (optional)"
                style={{width:'100%',padding:'7px 10px',background:'#1a1a1a',border:'1px solid #333',borderRadius:7,color:'#fff',fontSize:12,outline:'none'}}/>
            </div>
          </div>
        )}

        {panel==='text'&&(
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
              {TEXT_SUGGESTIONS.map(t=>(
                <button key={t} onClick={()=>setTextInput(t)} style={{padding:'4px 8px',borderRadius:14,border:'1px solid #333',background:'transparent',color:'#888',fontSize:11,cursor:'pointer'}}>{t}</button>
              ))}
            </div>
            <input value={textInput} onChange={e=>setTextInput(e.target.value)}
              placeholder="Custom text…"
              onKeyDown={e=>e.key==='Enter'&&textInput&&(addOverlay(textInput),setTextInput(''))}
              style={{width:'100%',padding:'9px 12px',background:'#1a1a1a',border:'1px solid #333',borderRadius:8,color:'#fff',fontSize:13,outline:'none'}}/>
            <button onClick={()=>{if(textInput){addOverlay(textInput);setTextInput('');}}} disabled={!textInput} style={{padding:'10px',background:textInput?'#4ADE80':'#333',color:textInput?'#000':'#888',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:textInput?'pointer':'not-allowed'}}>
              Add text → tap to style
            </button>
          </div>
        )}

        {panel==='overlays'&&(
          <div>
            <p style={{fontSize:11,color:'#666',margin:'0 0 8px'}}>Tap to add · tap on canvas to style</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:5,marginBottom:8}}>
              {CLIP_ART.map(e=>(
                <button key={e} onClick={()=>addOverlay(e,true)} style={{padding:'7px 3px',borderRadius:8,border:'1px solid #333',background:'#1a1a1a',cursor:'pointer',textAlign:'center',fontSize:18}}>{e}</button>
              ))}
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
              {MORE_EMOJIS.map(e=>(
                <button key={e} onClick={()=>addOverlay(e,true)} style={{padding:'5px 8px',borderRadius:16,border:'1px solid #333',background:'transparent',fontSize:16,cursor:'pointer'}}>{e}</button>
              ))}
            </div>
          </div>
        )}

        {panel==='shapes'&&(
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <p style={{fontSize:11,color:'#666',margin:0}}>Select a shape then click the canvas to place it</p>
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

        {panel==='layout'&&(
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div>
              <p style={{fontSize:11,color:'#666',margin:'0 0 6px'}}>Layout</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:6}}>
                {LAYOUTS.map(l=>(
                  <button key={l.id} onClick={()=>setLayout(l.id)} style={{padding:'8px',border:layout===l.id?'1px solid #4ADE80':'1px solid #333',borderRadius:8,background:layout===l.id?'#0d1f0d':'transparent',color:layout===l.id?'#4ADE80':'#888',fontSize:12,cursor:'pointer'}}>{l.label}</button>
                ))}
              </div>
            </div>
            <div>
              <p style={{fontSize:11,color:'#666',margin:'0 0 6px'}}>Die-cut shape</p>
              <div style={{display:'flex',gap:6}}>
                {SHAPES.map(s=>(
                  <button key={s.id} onClick={()=>setShape(s.id)} style={{flex:1,padding:'8px',border:shape===s.id?'1px solid #4ADE80':'1px solid #333',borderRadius:8,background:shape===s.id?'#0d1f0d':'transparent',color:shape===s.id?'#4ADE80':'#888',fontSize:11,cursor:'pointer'}}>{s.label}</button>
                ))}
              </div>
            </div>
            <p style={{fontSize:11,color:'#555',margin:0,lineHeight:1.6}}>Pink dashed = Pixcut S1 die-cut path · Black squares = registration marks · Keep content 3mm inside border</p>
          </div>
        )}
      </div>

      <div style={{display:'flex',gap:8}}>
        <button onClick={onBack} style={{flex:1,padding:12,border:'1px solid #333',borderRadius:10,background:'transparent',color:'#fff',fontSize:14,cursor:'pointer'}}>← Back</button>
        <button onClick={exportSheet} style={{flex:2,padding:12,background:'#4ADE80',color:'#000',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer'}}>Use this sticker sheet →</button>
      </div>
    </div>
  );
}