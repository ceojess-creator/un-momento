'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import EditorToolbar, { ToolbarAction, ElementType } from './EditorToolbar';
import { useEditorHistory } from './useEditorHistory';
import {
  SlotData, Overlay, Shape, DEFAULT_SLOT,
  CLIP_ART, CSS_FILTERS, buildCSSFilter,
  snapToGrid, SnapMode, PRINT_DIMS,
} from './EditorTypes';

// Button/magnet/keychain product specs
const PRODUCTS = [
  { id:'56mm_circle',   label:'56mm Circle Button',     shape:'circle',  w:200, h:200, hasQR:true  },
  { id:'50mm_square',   label:'50mm Square Button',     shape:'square',  w:200, h:200, hasQR:true  },
  { id:'32mm_circle',   label:'32mm Circle Button',     shape:'circle',  w:150, h:150, hasQR:false },
  { id:'56mm_magnet',   label:'56mm Magnet',            shape:'circle',  w:200, h:200, hasQR:true  },
  { id:'32mm_magnet',   label:'32mm Magnet',            shape:'circle',  w:150, h:150, hasQR:false },
  { id:'keychain_oval', label:'Keychain (40mm oval)',   shape:'oval',    w:200, h:150, hasQR:true  },
  { id:'keychain_rect', label:'Keychain (35×45mm)',     shape:'rect',    w:175, h:225, hasQR:true  },
];

const TEXT_PRESETS = [
  'Class of 2026', '[Name]', '[Name] · 2026',
  'GRAD 2026', '🎓', 'Done!',
];

let _bid = 0;

interface ButtonStudioProps {
  productId:  string;
  onComplete: (dataUrl: string, productId: string) => void;
  onBack:     () => void;
}

export default function ButtonStudio({ productId, onComplete, onBack }: ButtonStudioProps) {
  const wrapRef      = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dragRef = useRef<{
    type:       'pan' | 'overlay' | 'shape';
    id:         number;
    sx:         number;
    sy:         number;
    startPanX?: number;
    startPanY?: number;
  } | null>(null);

  const editor = useEditorHistory({
    slots:    [{ ...DEFAULT_SLOT }],
    overlays: [],
    shapes:   [],
    bgColor:  '#ffffff',
  });

  const [snapMode,     setSnapMode]     = useState<SnapMode>('snap');
  const [snapGuides,   setSnapGuides]   = useState<{x?:number;y?:number}>({});
  const [selectedId,   setSelectedId]   = useState<number|null>(null);
  const [selectedType, setSelectedType] = useState<ElementType|null>(null);
  const [showToolbar,  setShowToolbar]  = useState(false);
  const [toolbarPos,   setToolbarPos]   = useState({x:0,y:0});
  const [addingShape,  setAddingShape]  = useState<'rect'|'circle'|'line'|null>(null);
  const [panel,        setPanel]        = useState<'photo'|'text'|'overlays'|'shapes'>('photo');
  const [textInput,    setTextInput]    = useState('');

  const { state } = editor;
  const slot       = state.slots[0];
  const product    = PRODUCTS.find(p => p.id === productId) || PRODUCTS[0];

  function getDims() {
    const maxW = wrapRef.current?.clientWidth || 300;
    const scale = Math.min(1, maxW / (product.w + 40));
    return {
      W:     Math.round((product.w + 40) * scale),
      H:     Math.round((product.h + 40) * scale),
      btnW:  Math.round(product.w * scale),
      btnH:  Math.round(product.h * scale),
      offX:  Math.round(20 * scale),
      offY:  Math.round(20 * scale),
      scale,
    };
  }

  function drawProductShape(ctx: CanvasRenderingContext2D, x:number, y:number, w:number, h:number) {
    ctx.beginPath();
    if (product.shape === 'circle') {
      ctx.arc(x+w/2, y+h/2, Math.min(w,h)/2, 0, Math.PI*2);
    } else if (product.shape === 'oval') {
      ctx.ellipse(x+w/2, y+h/2, w/2, h/2, 0, 0, Math.PI*2);
    } else if (product.shape === 'square') {
      const r = Math.min(w,h) * 0.08;
      ctx.roundRect(x, y, w, h, r);
    } else {
      const r = Math.min(w,h) * 0.1;
      ctx.roundRect(x, y, w, h, r);
    }
    ctx.closePath();
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx    = canvas.getContext('2d'); if (!ctx) return;
    const { W, H, btnW, btnH, offX, offY } = getDims();
    canvas.width = W; canvas.height = H;

    // Canvas background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, W, H);

    // Product shadow
    ctx.shadowColor   = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur    = 12;
    ctx.shadowOffsetY = 4;
    drawProductShape(ctx, offX, offY, btnW, btnH);
    ctx.fillStyle = '#333';
    ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

    // Clip to product shape
    ctx.save();
    drawProductShape(ctx, offX, offY, btnW, btnH);
    ctx.clip();

    // Background color
    ctx.fillStyle = state.bgColor || '#ffffff';
    ctx.fillRect(offX, offY, btnW, btnH);

    // Photo
    if (slot.img) {
      const iw = slot.img.naturalWidth, ih = slot.img.naturalHeight;
      const scale = (iw/ih > btnW/btnH ? btnH/ih : btnW/iw) * slot.zoom;
      const dw = iw*scale, dh = ih*scale;
      const dx = offX+(btnW-dw)/2+slot.panX;
      const dy = offY+(btnH-dh)/2+slot.panY;
      const f = buildCSSFilter(slot);
      if (f !== 'none') ctx.filter = f;
      ctx.globalAlpha = (slot.opacity||100)/100;
      ctx.drawImage(slot.img, dx, dy, dw, dh);
      ctx.globalAlpha = 1; ctx.filter = 'none';
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
        ctx.strokeStyle=sh.color; ctx.lineWidth=sh.borderWidth||2;
        ctx.beginPath(); ctx.moveTo(-sh.w/2,0); ctx.lineTo(sh.w/2,0); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (selectedId===sh.id) {
        ctx.strokeStyle='#4ADE80'; ctx.lineWidth=1.5; ctx.setLineDash([4,4]);
        ctx.strokeRect(-sh.w/2-3,-sh.h/2-3,sh.w+6,sh.h+6); ctx.setLineDash([]);
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
        ctx.strokeRect(-tw/2-3,-th/2-2,tw+6,th+4);
      }
      ctx.restore();
    });

    ctx.restore(); // end clip

    // Product border
    ctx.save();
    drawProductShape(ctx, offX, offY, btnW, btnH);
    ctx.strokeStyle = '#555';
    ctx.lineWidth   = 1.5;
    ctx.stroke();
    ctx.restore();

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

    // Safe zone guide
    ctx.save();
    drawProductShape(ctx, offX+4, offY+4, btnW-8, btnH-8);
    ctx.strokeStyle = 'rgba(255,80,80,0.2)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([3,3]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // QR badge indicator
    if (product.hasQR) {
      ctx.fillStyle = 'rgba(74,222,128,0.15)';
      ctx.fillRect(offX+btnW-36, offY+btnH-20, 34, 18);
      ctx.fillStyle = '#4ADE80';
      ctx.font = '9px Arial'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      ctx.fillText('QR ✓', offX+btnW-4, offY+btnH-4);
    }

    // Product label below
    ctx.fillStyle = '#555';
    ctx.font = '11px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(product.label, W/2, offY+btnH+8);

  }, [product, state, slot, selectedId, snapGuides]);

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

  function isInButton(x:number, y:number) {
    const { offX, offY, btnW, btnH } = getDims();
    return x>=offX && x<=offX+btnW && y>=offY && y<=offY+btnH;
  }

  function showToolbarAt(x:number, y:number, type:ElementType) {
    const c=canvasRef.current!; const r=c.getBoundingClientRect();
    setToolbarPos({ x:r.left+x*(r.width/c.width), y:r.top+y*(r.height/c.height) });
    setSelectedType(type); setShowToolbar(true);
  }

  function startDrag(x:number, y:number) {
    if (addingShape && isInButton(x,y)) {
      const { offX, offY, btnW, btnH } = getDims();
      const sh: Shape = {
        id:++_bid, kind:addingShape,
        x:x-30, y:y-30, w:60, h:addingShape==='line'?4:60,
        color:'#ffffff', borderColor:'#000000', borderWidth:0,
        opacity:100, angle:0,
      };
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

    // Photo pan
    if (isInButton(x,y) && slot.img) {
      dragRef.current={type:'pan',id:0,sx:x,sy:y,startPanX:slot.panX,startPanY:slot.panY};
      setSelectedId(null); setShowToolbar(false);
      return;
    }

    // Tap photo to open toolbar
    if (isInButton(x,y) && slot.img) {
      setSelectedType('photo');
      showToolbarAt(x,y,'photo');
    }
  }

  function moveDrag(x:number, y:number) {
    const d=dragRef.current; if (!d) return;
    const { W, H } = getDims();

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
    if (d.type==='pan') {
      const dx=x-d.sx, dy=y-d.sy;
      let px=(d.startPanX||0)+dx, py=(d.startPanY||0)+dy;
      if (snapMode==='snap') {
        if (Math.abs(px)<10) { px=0; setSnapGuides(g=>({...g,x:getDims().offX+getDims().btnW/2})); }
        else setSnapGuides(g=>({...g,x:undefined}));
        if (Math.abs(py)<10) { py=0; setSnapGuides(g=>({...g,y:getDims().offY+getDims().btnH/2})); }
        else setSnapGuides(g=>({...g,y:undefined}));
      }
      editor.updateSlot(0,{panX:px,panY:py});
    }
  }

  function endDrag() {
    dragRef.current=null; setSnapGuides({});
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

    if (isInButton(x,y)) {
      if (!slot.img) {
        fileInputRef.current?.click();
      } else {
        setSelectedType('photo');
        showToolbarAt(x,y,'photo');
      }
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file=e.target.files?.[0]; if (!file) return;
    const url=URL.createObjectURL(file);
    const img=new window.Image();
    img.onload=()=>{ editor.updateSlot(0,{img,originalSrc:url,panX:0,panY:0,zoom:1,filter:'none',brightness:100,contrast:100,saturation:100,opacity:100}); };
    img.src=url; e.target.value='';
  }

  function handleToolbarChange(action: ToolbarAction) {
    if (selectedType==='photo') {
      const u: Partial<SlotData>={};
      if (action.brightness !== undefined) u.brightness = action.brightness;
      if (action.contrast   !== undefined) u.contrast   = action.contrast;
      if (action.saturation !== undefined) u.saturation = action.saturation;
      if (action.filter     !== undefined) u.filter     = CSS_FILTERS[action.filter]||'none';
      if (action.opacity    !== undefined) u.opacity    = action.opacity;
      if (Object.keys(u).length) editor.updateSlot(0,u);
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
    const { offX, offY, btnW, btnH } = getDims();
    const ov: Overlay={
      id:++_bid, text, type:isEmoji?'emoji':'text',
      x:offX+btnW/2+(Math.random()*30-15),
      y:offY+btnH/2+(Math.random()*20-10),
      size:isEmoji?Math.round(Math.min(btnW,btnH)*.2):18,
      color:'#ffffff', angle:0, opacity:100,
      fontFamily:'Arial', fontBold:false, fontItalic:false,
    };
    editor.addOverlay(ov);
    setSelectedId(ov.id); setSelectedType(isEmoji?'overlay':'text');
    showToolbarAt(ov.x,ov.y,isEmoji?'overlay':'text');
  }

  function exportButton() {
    const canvas=canvasRef.current; if (!canvas) return;
    const { offX, offY, btnW, btnH } = getDims();

    // Export at print resolution
    const printDim = PRINT_DIMS[productId as keyof typeof PRINT_DIMS] ||
      { w: btnW*4, h: btnH*4 };

    const exp   = document.createElement('canvas');
    exp.width   = printDim.w;
    exp.height  = printDim.h;
    const ctx   = exp.getContext('2d')!;
    const scaleX = printDim.w / btnW;
    const scaleY = printDim.h / btnH;

    ctx.scale(scaleX, scaleY);
    ctx.drawImage(canvas, offX, offY, btnW, btnH, 0, 0, btnW, btnH);

    onComplete(exp.toDataURL('image/jpeg', .95), productId);
  }

  const pb=(id:typeof panel,lbl:string)=>(
    <button key={id} onClick={()=>setPanel(id)} style={{flex:1,padding:'7px 4px',background:panel===id?'#1a1a1a':'transparent',border:panel===id?'1px solid #444':'1px solid transparent',borderRadius:8,color:panel===id?'#fff':'#666',fontSize:11,cursor:'pointer',fontWeight:500}}>{lbl}</button>
  );

  const selectedOv    = state.overlays.find(o=>o.id===selectedId);
  const selectedShape = state.shapes.find(s=>s.id===selectedId);
  const hasEdits      = slot.brightness!==100||slot.contrast!==100||slot.saturation!==100||slot.filter!=='none'||slot.panX!==0||slot.panY!==0||slot.zoom!==1;

  return (
    <div style={{width:'100%',maxWidth:480}}>

      <EditorToolbar
        visible={showToolbar}
        elementType={selectedType}
        position={toolbarPos}
        brightness={selectedType==='photo'?slot.brightness:undefined}
        contrast={selectedType==='photo'?slot.contrast:undefined}
        saturation={selectedType==='photo'?slot.saturation:undefined}
        filter={selectedType==='photo'?Object.entries(CSS_FILTERS).find(([,v])=>v===slot.filter)?.[0]:undefined}
        fontSize={selectedOv?.size}
        fontFamily={selectedOv?.fontFamily}
        fontBold={selectedOv?.fontBold}
        fontItalic={selectedOv?.fontItalic}
        textColor={selectedOv?.color}
        shapeColor={selectedShape?.color}
        opacity={selectedType==='photo'?slot.opacity:selectedType==='shape'?selectedShape?.opacity:selectedOv?.opacity}
        rotation={selectedType==='shape'?selectedShape?.angle:selectedOv?.angle}
        bgColor={state.bgColor}
        onChange={handleToolbarChange}
        onClose={()=>setShowToolbar(false)}
      />

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <div>
          <h3 style={{fontSize:15,fontWeight:500,margin:'0 0 2px'}}>{product.label} designer</h3>
          <p style={{fontSize:11,color:'#888',margin:0}}>
            {product.hasQR ? '✓ QR code on back face' : '⚠️ No QR — too small'}
            {' · tap to edit'}
          </p>
        </div>
        <div style={{display:'flex',gap:6}}>
          <button onClick={editor.undo} disabled={!editor.canUndo} title="Undo" style={{padding:'6px 10px',background:editor.canUndo?'#1a1a1a':'#111',border:'1px solid #333',borderRadius:6,color:editor.canUndo?'#fff':'#444',fontSize:13,cursor:editor.canUndo?'pointer':'not-allowed'}}>↩</button>
          <button onClick={editor.redo} disabled={!editor.canRedo} title="Redo" style={{padding:'6px 10px',background:editor.canRedo?'#1a1a1a':'#111',border:'1px solid #333',borderRadius:6,color:editor.canRedo?'#fff':'#444',fontSize:13,cursor:editor.canRedo?'pointer':'not-allowed'}}>↪</button>
          <button onClick={()=>setSnapMode(s=>s==='snap'?'freehand':'snap')} style={{padding:'6px 10px',background:snapMode==='snap'?'#0d1f0d':'#1a1a1a',border:`1px solid ${snapMode==='snap'?'#4ADE80':'#333'}`,borderRadius:6,color:snapMode==='snap'?'#4ADE80':'#888',fontSize:11,cursor:'pointer',whiteSpace:'nowrap'}}>
            {snapMode==='snap'?'⊞ Snap':'✏️ Free'}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div ref={wrapRef} style={{width:'100%',borderRadius:10,overflow:'hidden',border:'1px solid #222',marginBottom:6,touchAction:'none',cursor:addingShape?'crosshair':'default',background:'#1a1a1a'}}>
        <canvas ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseDown={e=>{const{x,y}=canvasXY(e);startDrag(x,y);}}
          onMouseMove={e=>{const{x,y}=canvasXY(e);moveDrag(x,y);}}
          onMouseUp={endDrag} onMouseLeave={endDrag}
          onTouchStart={e=>{const{x,y}=touchXY(e);startDrag(x,y);}}
          onTouchMove={e=>{e.preventDefault();const{x,y}=touchXY(e);moveDrag(x,y);}}
          onTouchEnd={endDrag}
          style={{display:'block',width:'100%'}}
        />
      </div>

      <p style={{fontSize:11,color:'#555',margin:'0 0 10px',textAlign:'center'}}>
        {addingShape
          ? `Click the button to place your ${addingShape}`
          : slot.img
            ? 'Tap photo to adjust · drag to reposition · red dashed = safe zone'
            : 'Tap the button shape to upload your photo'}
      </p>

      {/* Reset button */}
      {slot.img && hasEdits && (
        <button onClick={()=>editor.resetSlot(0)} style={{width:'100%',padding:'6px',marginBottom:8,background:'#2a1a00',border:'1px solid #BA7517',borderRadius:7,color:'#BA7517',fontSize:11,cursor:'pointer'}}>
          ↺ Reset photo adjustments
        </button>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handlePhotoUpload}/>

      {/* Upload button */}
      <button onClick={()=>fileInputRef.current?.click()} style={{width:'100%',padding:'10px',background:slot.img?'#1a1a1a':'#4ADE80',color:slot.img?'#888':'#000',border:slot.img?'1px solid #333':'none',borderRadius:8,fontSize:13,fontWeight:slot.img?400:700,cursor:'pointer',marginBottom:10}}>
        {slot.img ? '📷 Change photo' : '📷 Upload photo'}
      </button>

      {/* Panel tabs */}
      <div style={{display:'flex',gap:4,marginBottom:10}}>
        {pb('text','✏️ Text')}
        {pb('overlays','🎭 Emoji')}
        {pb('shapes','⬜ Shapes')}
      </div>

      <div style={{background:'#111',borderRadius:10,padding:'12px',border:'1px solid #222',marginBottom:10}}>

        {panel==='text'&&(
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
              {TEXT_PRESETS.map(t=>(
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
            <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:5}}>
              {CLIP_ART.map(e=>(
                <button key={e} onClick={()=>addOverlay(e,true)} style={{padding:'7px 3px',borderRadius:8,border:'1px solid #333',background:'#1a1a1a',cursor:'pointer',textAlign:'center',fontSize:18}}>{e}</button>
              ))}
            </div>
          </div>
        )}

        {panel==='shapes'&&(
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <p style={{fontSize:11,color:'#666',margin:0}}>Select a shape then click the button to place it</p>
            <div style={{display:'flex',gap:8}}>
              {(['rect','circle','line'] as const).map(kind=>(
                <button key={kind} onClick={()=>setAddingShape(addingShape===kind?null:kind)} style={{flex:1,padding:'10px 4px',background:addingShape===kind?'#4ADE80':'#1a1a1a',color:addingShape===kind?'#000':'#888',border:addingShape===kind?'none':'1px solid #333',borderRadius:8,fontSize:12,cursor:'pointer'}}>
                  {kind==='rect'?'⬜ Rect':kind==='circle'?'⭕ Circle':'➖ Line'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{display:'flex',gap:8}}>
        <button onClick={onBack} style={{flex:1,padding:12,border:'1px solid #333',borderRadius:10,background:'transparent',color:'#fff',fontSize:14,cursor:'pointer'}}>← Back</button>
        <button onClick={exportButton} style={{flex:2,padding:12,background:'#4ADE80',color:'#000',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer'}}>
          Use this design →
        </button>
      </div>
    </div>
  );
}