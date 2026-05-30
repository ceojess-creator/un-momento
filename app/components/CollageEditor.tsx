'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import EditorToolbar, { ToolbarAction, ElementType } from './EditorToolbar';

const TEMPLATES = [
  { id:'single',    label:'Single',         slots:[{x:0,y:0,w:1,h:1}] },
  { id:'two_side',  label:'2 side by side', slots:[{x:0,y:0,w:.5,h:1},{x:.5,y:0,w:.5,h:1}] },
  { id:'two_stack', label:'2 stacked',      slots:[{x:0,y:0,w:1,h:.5},{x:0,y:.5,w:1,h:.5}] },
  { id:'one_two',   label:'1 + 2',          slots:[{x:0,y:0,w:.6,h:1},{x:.6,y:0,w:.4,h:.5},{x:.6,y:.5,w:.4,h:.5}] },
  { id:'four',      label:'4 grid',         slots:[{x:0,y:0,w:.5,h:.5},{x:.5,y:0,w:.5,h:.5},{x:0,y:.5,w:.5,h:.5},{x:.5,y:.5,w:.5,h:.5}] },
  { id:'five',      label:'5 mosaic',       slots:[{x:0,y:0,w:.6,h:.6},{x:.6,y:0,w:.4,h:.6},{x:0,y:.6,w:.33,h:.4},{x:.33,y:.6,w:.33,h:.4},{x:.66,y:.6,w:.34,h:.4}] },
  { id:'six',       label:'6 grid',         slots:[{x:0,y:0,w:.33,h:.5},{x:.33,y:0,w:.34,h:.5},{x:.67,y:0,w:.33,h:.5},{x:0,y:.5,w:.33,h:.5},{x:.33,y:.5,w:.34,h:.5},{x:.67,y:.5,w:.33,h:.5}] },
];

const CLIP_ART    = ['🎓','📜','⭐','🏆','🎗️','🔥','✨','❤️','🎉','🎊','💫','🌟','👑','🌸','🦋','💪'];
const TEXT_PRESETS= ['Class of 2026','[Name] · Class of 2026','[Name] · [School]','The best is yet to come','DONE!'];
const GAP = 2;
const SNAP_THRESHOLD = 12;

interface SlotData {
  img:        HTMLImageElement|null;
  filter:     string;
  zoom:       number;
  panX:       number;
  panY:       number;
  brightness: number;
  contrast:   number;
  saturation: number;
  opacity:    number;
}

interface Overlay {
  id:         number;
  text:       string;
  x:          number;
  y:          number;
  size:       number;
  color:      string;
  angle:      number;
  opacity:    number;
  fontFamily: string;
  fontBold:   boolean;
  fontItalic: boolean;
  type:       'text'|'emoji';
}

interface Shape {
  id:          number;
  kind:        'rect'|'circle'|'line';
  x:           number;
  y:           number;
  w:           number;
  h:           number;
  color:       string;
  borderColor: string;
  borderWidth: number;
  opacity:     number;
  angle:       number;
}

interface CollageEditorProps {
  onComplete: (dataUrl:string, slots:SlotData[]) => void;
  onBack:     () => void;
  defaultGradName?: string;
  defaultSchool?:   string;
}

let _id = 0;

function buildFilter(slot: SlotData): string {
  const parts: string[] = [];
  if (slot.brightness !== 100) parts.push(`brightness(${slot.brightness/100})`);
  if (slot.contrast   !== 100) parts.push(`contrast(${slot.contrast/100})`);
  if (slot.saturation !== 100) parts.push(`saturate(${slot.saturation/100})`);
  if (slot.filter && slot.filter !== 'none') parts.push(slot.filter);
  return parts.length ? parts.join(' ') : 'none';
}

export default function CollageEditor({ onComplete, onBack, defaultGradName='', defaultSchool='' }: CollageEditorProps) {
  const wrapRef      = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ovDragRef    = useRef<{id:number;sx:number;sy:number;type:'ov'|'shape'}|null>(null);
  const slotDragRef  = useRef<{slot:number;startX:number;startY:number;startPanX:number;startPanY:number}|null>(null);

  const [orientation, setOrientation] = useState<'l'|'p'>('l');
  const [templateId,  setTemplateId]  = useState('single');
  const [activeSlot,  setActiveSlot]  = useState(0);
  const [bgColor,     setBgColor]     = useState('#111111');
  const [slots,       setSlots]       = useState<SlotData[]>(
    Array.from({length:6},()=>({img:null,filter:'none',zoom:1,panX:0,panY:0,brightness:100,contrast:100,saturation:100,opacity:100}))
  );
  const [overlays,    setOverlays]    = useState<Overlay[]>([]);
  const [shapes,      setShapes]      = useState<Shape[]>([]);
  const [selectedId,  setSelectedId]  = useState<number|null>(null);
  const [selectedType,setSelectedType]= useState<ElementType|null>(null);
  const [toolbarPos,  setToolbarPos]  = useState({x:0,y:0});
  const [showToolbar, setShowToolbar] = useState(false);
  const [snapGuides,  setSnapGuides]  = useState<{x?:number;y?:number}>({});
  const [gradName,    setGradName]    = useState(defaultGradName);
  const [school,      setSchool]      = useState(defaultSchool);
  const [qr,          setQr]          = useState('border');
  const [textInput,   setTextInput]   = useState('');
  const [addingShape, setAddingShape] = useState<'rect'|'circle'|'line'|null>(null);
  const [panel,       setPanel]       = useState<'photos'|'text'|'overlays'|'shapes'>('photos');

  const tpl        = TEMPLATES.find(t=>t.id===templateId)!;
  const totalSlots = tpl.slots.length;
  const filled     = slots.filter((s,i)=>i<totalSlots&&s.img).length;

  function getDims() {
    const W = wrapRef.current?.clientWidth || 360;
    return orientation==='l' ? {W,H:Math.round(W*2/3)} : {W:Math.round(W*2/3),H:W};
  }

  const draw = useCallback(()=>{
    const canvas = canvasRef.current; if(!canvas) return;
    const ctx    = canvas.getContext('2d'); if(!ctx) return;
    const {W,H}  = getDims();
    canvas.width = W; canvas.height = H;

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0,0,W,H);

    // Photo slots
    tpl.slots.forEach((slot,i)=>{
      const x=Math.round(slot.x*W)+GAP, y=Math.round(slot.y*H)+GAP;
      const w=Math.round(slot.w*W)-GAP*2, h=Math.round(slot.h*H)-GAP*2;
      const s=slots[i];
      ctx.save(); ctx.beginPath(); ctx.rect(x,y,w,h); ctx.clip();
      if(s?.img){
        const iw=s.img.naturalWidth, ih=s.img.naturalHeight;
        const scale=(iw/ih>w/h ? h/ih : w/iw)*s.zoom;
        const dw=iw*scale, dh=ih*scale;
        const dx=x+(w-dw)/2+s.panX, dy=y+(h-dh)/2+s.panY;
        const f = buildFilter(s);
        if(f!=='none') ctx.filter=f;
        ctx.globalAlpha = (s.opacity||100)/100;
        ctx.drawImage(s.img,dx,dy,dw,dh);
        ctx.globalAlpha = 1; ctx.filter='none';
      } else {
        ctx.fillStyle=i===activeSlot?'#0d2a0d':'rgba(255,255,255,0.05)';
        ctx.fillRect(x,y,w,h);
        ctx.strokeStyle=i===activeSlot?'#4ADE80':'#333';
        ctx.lineWidth=1.5;
        ctx.strokeRect(x+.75,y+.75,w-1.5,h-1.5);
        ctx.fillStyle=i===activeSlot?'#4ADE80':'#555';
        ctx.font=`${Math.round(Math.min(w,h)*.15)}px Arial`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(i===activeSlot?'+ tap':`${i+1}`,x+w/2,y+h/2);
      }
      ctx.restore();
    });

    // Snap guides
    if(snapGuides.x !== undefined){
      ctx.strokeStyle='rgba(74,222,128,0.6)'; ctx.lineWidth=1;
      ctx.setLineDash([4,4]);
      ctx.beginPath(); ctx.moveTo(snapGuides.x,0); ctx.lineTo(snapGuides.x,H); ctx.stroke();
      ctx.setLineDash([]);
    }
    if(snapGuides.y !== undefined){
      ctx.strokeStyle='rgba(74,222,128,0.6)'; ctx.lineWidth=1;
      ctx.setLineDash([4,4]);
      ctx.beginPath(); ctx.moveTo(0,snapGuides.y); ctx.lineTo(W,snapGuides.y); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Shapes
    shapes.forEach(sh=>{
      ctx.save();
      ctx.translate(sh.x+sh.w/2, sh.y+sh.h/2);
      ctx.rotate(sh.angle*Math.PI/180);
      ctx.globalAlpha = sh.opacity/100;
      ctx.fillStyle   = sh.color;
      if(sh.kind==='rect'){
        ctx.fillRect(-sh.w/2,-sh.h/2,sh.w,sh.h);
        if(sh.borderWidth>0){
          ctx.strokeStyle=sh.borderColor; ctx.lineWidth=sh.borderWidth;
          ctx.strokeRect(-sh.w/2,-sh.h/2,sh.w,sh.h);
        }
      } else if(sh.kind==='circle'){
        ctx.beginPath();
        ctx.ellipse(0,0,sh.w/2,sh.h/2,0,0,Math.PI*2);
        ctx.fill();
        if(sh.borderWidth>0){ ctx.strokeStyle=sh.borderColor; ctx.lineWidth=sh.borderWidth; ctx.stroke(); }
      } else if(sh.kind==='line'){
        ctx.strokeStyle=sh.color; ctx.lineWidth=sh.borderWidth||3;
        ctx.beginPath(); ctx.moveTo(-sh.w/2,0); ctx.lineTo(sh.w/2,0); ctx.stroke();
      }
      ctx.globalAlpha=1;
      if(selectedId===sh.id){
        ctx.strokeStyle='#4ADE80'; ctx.lineWidth=1.5; ctx.setLineDash([4,4]);
        ctx.strokeRect(-sh.w/2-4,-sh.h/2-4,sh.w+8,sh.h+8);
        ctx.setLineDash([]);
      }
      ctx.restore();
    });

    // Overlays
    overlays.forEach(ov=>{
      ctx.save();
      ctx.translate(ov.x,ov.y);
      ctx.rotate(ov.angle*Math.PI/180);
      ctx.globalAlpha = ov.opacity/100;
      const weight = ov.fontBold   ? 'bold '   : '';
      const style  = ov.fontItalic ? 'italic '  : '';
      ctx.font     = `${style}${weight}${ov.size}px ${ov.fontFamily||'Arial'}`;
      ctx.fillStyle= ov.color;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.shadowColor='rgba(0,0,0,0.5)'; ctx.shadowBlur=3;
      ctx.fillText(ov.text,0,0);
      ctx.shadowBlur=0; ctx.globalAlpha=1;
      if(selectedId===ov.id){
        ctx.strokeStyle='#4ADE80'; ctx.lineWidth=1.5;
        const m=ctx.measureText(ov.text), tw=m.width, th=ov.size*1.2;
        ctx.strokeRect(-tw/2-4,-th/2-2,tw+8,th+4);
      }
      ctx.restore();
    });

    // QR strip
    const STRIP=Math.round(H*.1);
    if(qr==='border'){
      ctx.fillStyle='rgba(255,255,255,0.97)'; ctx.fillRect(0,H-STRIP,W,STRIP);
      ctx.fillStyle='#333'; ctx.font=`${Math.round(STRIP*.38)}px Arial`;
      ctx.textAlign='left'; ctx.textBaseline='middle';
      const lbl=gradName?`${gradName}${school?` · ${school}`:''} · unmomentoprints.com`:'unmomentoprints.com';
      ctx.fillText(lbl,8,H-STRIP+STRIP/2,W-STRIP-12);
      const QS=STRIP-4;
      ctx.fillStyle='#000'; ctx.fillRect(W-QS-2,H-STRIP+2,QS,QS);
      ctx.fillStyle='#fff'; ctx.font=`${Math.round(QS*.3)}px Arial`;
      ctx.textAlign='center'; ctx.fillText('QR',W-QS/2-2,H-STRIP+STRIP/2);
    }
    if(qr==='corner_br'||qr==='corner_bl'){
      const QS=Math.round(H*.13), qx=qr==='corner_br'?W-QS-4:4, qy=H-QS-4;
      ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.fillRect(qx-2,qy-2,QS+4,QS+4);
      ctx.fillStyle='#000'; ctx.fillRect(qx,qy,QS,QS);
    }

    // Safe zone guide
    ctx.strokeStyle='rgba(255,80,80,0.15)'; ctx.lineWidth=.5; ctx.setLineDash([3,3]);
    ctx.strokeRect(8,8,W-16,H-16-(qr==='border'?STRIP+2:0));
    ctx.setLineDash([]);
  },[tpl,slots,overlays,shapes,selectedId,gradName,school,qr,activeSlot,orientation,bgColor,snapGuides]);

  useEffect(()=>{draw();},[draw]);
  useEffect(()=>{
    const ro=new ResizeObserver(()=>draw());
    if(wrapRef.current) ro.observe(wrapRef.current);
    return ()=>ro.disconnect();
  },[draw]);

  // Canvas coordinate helpers
  function cc(e:React.MouseEvent<HTMLCanvasElement>){
    const c=canvasRef.current!, r=c.getBoundingClientRect();
    return {x:(e.clientX-r.left)*(c.width/r.width), y:(e.clientY-r.top)*(c.height/r.height)};
  }
  function tcXY(e:React.TouchEvent<HTMLCanvasElement>){
    const c=canvasRef.current!, r=c.getBoundingClientRect(), t=e.touches[0];
    return {x:(t.clientX-r.left)*(c.width/r.width), y:(t.clientY-r.top)*(c.height/r.height)};
  }
  function getSlotAt(x:number,y:number){
    const {W,H}=getDims();
    for(let i=0;i<tpl.slots.length;i++){
      const s=tpl.slots[i];
      const sx=s.x*W+GAP, sy=s.y*H+GAP, sw=s.w*W-GAP*2, sh=s.h*H-GAP*2;
      if(x>=sx&&x<=sx+sw&&y>=sy&&y<=sy+sh) return i;
    }
    return -1;
  }

  // Snap logic
  function snapXY(x:number, y:number): {x:number;y:number;guides:{x?:number;y?:number}} {
    const {W,H}=getDims();
    const guides:{x?:number;y?:number}={};
    const snapsX=[0,W/4,W/3,W/2,W*2/3,W*3/4,W];
    const snapsY=[0,H/4,H/3,H/2,H*2/3,H*3/4,H];
    let nx=x, ny=y;
    for(const sx of snapsX){
      if(Math.abs(x-sx)<SNAP_THRESHOLD){ nx=sx; guides.x=sx; break; }
    }
    for(const sy of snapsY){
      if(Math.abs(y-sy)<SNAP_THRESHOLD){ ny=sy; guides.y=sy; break; }
    }
    return {x:nx,y:ny,guides};
  }

  function startDrag(x:number,y:number){
    if(addingShape){
      const {W,H}=getDims();
      const newShape:Shape={
        id:++_id, kind:addingShape,
        x:x-40, y:y-40, w:80, h:addingShape==='line'?6:80,
        color:'#4ADE80', borderColor:'#ffffff', borderWidth:0,
        opacity:100, angle:0,
      };
      setShapes(p=>[...p,newShape]);
      setSelectedId(newShape.id);
      setSelectedType('shape');
      setAddingShape(null);
      showToolbarAt(x,y,'shape');
      return;
    }

    // Check overlays
    for(let i=overlays.length-1;i>=0;i--){
      const ov=overlays[i];
      if(Math.abs(x-ov.x)<50&&Math.abs(y-ov.y)<50){
        ovDragRef.current={id:ov.id,sx:x-ov.x,sy:y-ov.y,type:'ov'};
        setSelectedId(ov.id); setSelectedType(ov.type==='emoji'?'overlay':'text');
        showToolbarAt(x,y,ov.type==='emoji'?'overlay':'text');
        return;
      }
    }

    // Check shapes
    for(let i=shapes.length-1;i>=0;i--){
      const sh=shapes[i];
      if(x>=sh.x&&x<=sh.x+sh.w&&y>=sh.y&&y<=sh.y+sh.h){
        ovDragRef.current={id:sh.id,sx:x-sh.x,sy:y-sh.y,type:'shape'};
        setSelectedId(sh.id); setSelectedType('shape');
        showToolbarAt(x,y,'shape');
        return;
      }
    }

    // Check photo slots
    const si=getSlotAt(x,y);
    if(si>=0&&slots[si].img){
      slotDragRef.current={slot:si,startX:x,startY:y,startPanX:slots[si].panX,startPanY:slots[si].panY};
      setActiveSlot(si);
      setSelectedId(null); setShowToolbar(false);
    }
  }

  function moveDrag(x:number,y:number){
    if(ovDragRef.current){
      const {id,sx,sy,type}=ovDragRef.current;
      const {x:nx,y:ny,guides}=snapXY(x-sx,y-sy);
      setSnapGuides(guides);
      if(type==='ov'){
        setOverlays(p=>p.map(o=>o.id===id?{...o,x:nx+(sx),y:ny+(sy)}:o));
      } else {
        setShapes(p=>p.map(s=>s.id===id?{...s,x:nx,y:ny}:s));
      }
    } else if(slotDragRef.current){
      const {slot,startX,startY,startPanX,startPanY}=slotDragRef.current;
      setSlots(p=>p.map((s,i)=>i===slot?{...s,panX:startPanX+(x-startX),panY:startPanY+(y-startY)}:s));
    }
  }

  function endDrag(){ ovDragRef.current=null; slotDragRef.current=null; setSnapGuides({}); }

  function showToolbarAt(x:number,y:number,type:ElementType){
    const c=canvasRef.current!; const r=c.getBoundingClientRect();
    const scaleX=r.width/c.width; const scaleY=r.height/c.height;
    setToolbarPos({x:r.left+x*scaleX, y:r.top+y*scaleY});
    setSelectedType(type); setShowToolbar(true);
  }

  function handleCanvasClick(e:React.MouseEvent<HTMLCanvasElement>){
    const {x,y}=cc(e);

    // Check overlays
    for(let i=overlays.length-1;i>=0;i--){
      const ov=overlays[i];
      if(Math.abs(x-ov.x)<50&&Math.abs(y-ov.y)<50){
        setSelectedId(ov.id);
        setSelectedType(ov.type==='emoji'?'overlay':'text');
        showToolbarAt(x,y,ov.type==='emoji'?'overlay':'text');
        return;
      }
    }

    // Check shapes
    for(let i=shapes.length-1;i>=0;i--){
      const sh=shapes[i];
      if(x>=sh.x&&x<=sh.x+sh.w&&y>=sh.y&&y<=sh.y+sh.h){
        setSelectedId(sh.id); setSelectedType('shape');
        showToolbarAt(x,y,'shape'); return;
      }
    }

    // Check photo slots
    setSelectedId(null); setShowToolbar(false);
    const si=getSlotAt(x,y);
    if(si>=0){
      setActiveSlot(si);
      if(!slots[si].img) fileInputRef.current?.click();
      else {
        setSelectedType('photo');
        showToolbarAt(x,y,'photo');
      }
    }
  }

  async function handlePhotoUpload(e:React.ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0]; if(!file) return;
    const url=URL.createObjectURL(file);
    const img=new window.Image();
    img.onload=()=>{
      setSlots(p=>p.map((s,i)=>i===activeSlot?{...s,img}:s));
      const nx=slots.findIndex((s,i)=>i>activeSlot&&i<totalSlots&&!s.img);
      if(nx!==-1) setActiveSlot(nx);
    };
    img.src=url; e.target.value='';
  }

  function handleToolbarChange(action: ToolbarAction){
    // Photo adjustments
    if(action.brightness  !== undefined) setSlots(p=>p.map((s,i)=>i===activeSlot?{...s,brightness:action.brightness!}:s));
    if(action.contrast    !== undefined) setSlots(p=>p.map((s,i)=>i===activeSlot?{...s,contrast:action.contrast!}:s));
    if(action.saturation  !== undefined) setSlots(p=>p.map((s,i)=>i===activeSlot?{...s,saturation:action.saturation!}:s));
    if(action.filter      !== undefined) setSlots(p=>p.map((s,i)=>i===activeSlot?{...s,filter:action.filter!}:s));
    if(action.opacity     !== undefined && selectedType==='photo') setSlots(p=>p.map((s,i)=>i===activeSlot?{...s,opacity:action.opacity!}:s));

    // Overlay/text adjustments
    if(selectedType==='text'||selectedType==='overlay'){
      setOverlays(p=>p.map(o=>{
        if(o.id!==selectedId) return o;
        const upd={...o};
        if(action.fontSize    !== undefined) upd.size       = action.fontSize;
        if(action.fontFamily  !== undefined) upd.fontFamily = action.fontFamily;
        if(action.fontBold    !== undefined) upd.fontBold   = action.fontBold;
        if(action.fontItalic  !== undefined) upd.fontItalic = action.fontItalic;
        if(action.textColor   !== undefined) upd.color      = action.textColor;
        if(action.opacity     !== undefined) upd.opacity    = action.opacity;
        if(action.rotation    !== undefined) upd.angle      = action.rotation;
        if(action.flipX       === true)      upd.angle      = -upd.angle;
        return upd;
      }));
    }

    // Shape adjustments
    if(selectedType==='shape'){
      setShapes(p=>p.map(s=>{
        if(s.id!==selectedId) return s;
        const upd={...s};
        if(action.shapeColor  !== undefined) upd.color       = action.shapeColor;
        if(action.shapeBorder !== undefined) upd.borderColor = action.shapeBorder;
        if(action.borderWidth !== undefined) upd.borderWidth = action.borderWidth;
        if(action.opacity     !== undefined) upd.opacity     = action.opacity;
        if(action.rotation    !== undefined) upd.angle       = action.rotation;
        return upd;
      }));
    }

    // Z-order
    if(action.bringForward){
      if(selectedType==='shape') setShapes(p=>{const i=p.findIndex(s=>s.id===selectedId);if(i<p.length-1){const a=[...p];[a[i],a[i+1]]=[a[i+1],a[i]];return a;}return p;});
      else setOverlays(p=>{const i=p.findIndex(o=>o.id===selectedId);if(i<p.length-1){const a=[...p];[a[i],a[i+1]]=[a[i+1],a[i]];return a;}return p;});
    }
    if(action.sendBackward){
      if(selectedType==='shape') setShapes(p=>{const i=p.findIndex(s=>s.id===selectedId);if(i>0){const a=[...p];[a[i],a[i-1]]=[a[i-1],a[i]];return a;}return p;});
      else setOverlays(p=>{const i=p.findIndex(o=>o.id===selectedId);if(i>0){const a=[...p];[a[i],a[i-1]]=[a[i-1],a[i]];return a;}return p;});
    }

    // Delete
    if(action.delete){
      if(selectedType==='shape') setShapes(p=>p.filter(s=>s.id!==selectedId));
      else setOverlays(p=>p.filter(o=>o.id!==selectedId));
      setSelectedId(null); setShowToolbar(false);
    }

    // Background
    if(action.bgColor !== undefined) setBgColor(action.bgColor);
  }

  function addOverlay(text:string, isEmoji=false){
    const {W,H}=getDims();
    const ov:Overlay={
      id:++_id, text, type:isEmoji?'emoji':'text',
      x:W/2+(Math.random()*60-30), y:H/3+(Math.random()*40-20),
      size:isEmoji?Math.round(H*.1):24, color:'#ffffff',
      angle:0, opacity:100, fontFamily:'Arial',
      fontBold:false, fontItalic:false,
    };
    setOverlays(p=>[...p,ov]);
    setSelectedId(ov.id);
    setSelectedType(isEmoji?'overlay':'text');
    showToolbarAt(ov.x,ov.y,isEmoji?'overlay':'text');
  }

  function exportPrint(){
    const canvas=canvasRef.current; if(!canvas) return;
    const {W,H}=getDims();
    const exp=document.createElement('canvas');
    exp.width=W*5; exp.height=H*5;
    const ctx=exp.getContext('2d')!;
    ctx.scale(5,5); ctx.drawImage(canvas,0,0,W,H);
    onComplete(exp.toDataURL('image/jpeg',.95),slots);
  }

  const pb=(id:typeof panel,lbl:string)=>(
    <button key={id} onClick={()=>setPanel(id)} style={{
      flex:1, padding:'7px 4px',
      background:panel===id?'#1a1a1a':'transparent',
      border:panel===id?'1px solid #444':'1px solid transparent',
      borderRadius:8, color:panel===id?'#fff':'#666',
      fontSize:11, cursor:'pointer', fontWeight:500,
    }}>{lbl}</button>
  );

  const selectedOv    = overlays.find(o=>o.id===selectedId);
  const selectedShape = shapes.find(s=>s.id===selectedId);
  const activeSlotData= slots[activeSlot];

  return (
    <div style={{width:'100%',maxWidth:640}}>

      {/* Floating EditorToolbar */}
      <EditorToolbar
        visible={showToolbar}
        elementType={selectedType}
        position={toolbarPos}
        brightness={selectedType==='photo' ? activeSlotData?.brightness : undefined}
        contrast={selectedType==='photo'   ? activeSlotData?.contrast   : undefined}
        saturation={selectedType==='photo' ? activeSlotData?.saturation : undefined}
        filter={selectedType==='photo'     ? activeSlotData?.filter     : undefined}
        fontSize={selectedOv?.size}
        fontFamily={selectedOv?.fontFamily}
        fontBold={selectedOv?.fontBold}
        fontItalic={selectedOv?.fontItalic}
        textColor={selectedOv?.color}
        shapeColor={selectedShape?.color}
        opacity={
          selectedType==='photo'   ? activeSlotData?.opacity :
          selectedType==='shape'   ? selectedShape?.opacity  :
          selectedOv?.opacity
        }
        rotation={
          selectedType==='shape'   ? selectedShape?.angle :
          selectedOv?.angle
        }
        bgColor={bgColor}
        onChange={handleToolbarChange}
        onClose={()=>setShowToolbar(false)}
      />

      <div style={{textAlign:'center',marginBottom:10}}>
        <h3 style={{fontSize:15,fontWeight:500,margin:'0 0 4px'}}>Photo print designer</h3>
        <p style={{fontSize:12,color:'#888',margin:0}}>4×6 · tap any element to edit · drag to move</p>
      </div>

      {/* Orientation */}
      <div style={{display:'flex',gap:6,marginBottom:10}}>
        {[['l','▭ Landscape'],['p','▯ Portrait']].map(([v,lbl])=>(
          <button key={v} onClick={()=>setOrientation(v as 'l'|'p')} style={{
            flex:1, padding:'8px',
            border:orientation===v?'1px solid #4ADE80':'1px solid #333',
            borderRadius:8,
            background:orientation===v?'#0d1f0d':'transparent',
            color:orientation===v?'#4ADE80':'#888',
            fontSize:12, cursor:'pointer',
          }}>{lbl}</button>
        ))}
      </div>

      {/* Templates */}
      <div style={{marginBottom:10}}>
        <p style={{fontSize:11,color:'#666',margin:'0 0 6px'}}>Layout — {filled}/{totalSlots} photos</p>
        <div style={{display:'flex',gap:5,overflowX:'auto',paddingBottom:2}}>
          {TEMPLATES.map(t=>(
            <button key={t.id} onClick={()=>{setTemplateId(t.id);setActiveSlot(0);}} style={{
              padding:'5px 9px', borderRadius:8, flexShrink:0,
              border:templateId===t.id?'1px solid #4ADE80':'1px solid #333',
              background:templateId===t.id?'#0d1f0d':'#111',
              color:templateId===t.id?'#4ADE80':'#888',
              fontSize:11, cursor:'pointer',
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div ref={wrapRef} style={{
        width:'100%', borderRadius:10, overflow:'hidden',
        border:'1px solid #333', marginBottom:6,
        background:bgColor, touchAction:'none',
        cursor: addingShape ? 'crosshair' : 'default',
      }}>
        <canvas ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseDown={e=>{const {x,y}=cc(e);startDrag(x,y);}}
          onMouseMove={e=>{const {x,y}=cc(e);moveDrag(x,y);}}
          onMouseUp={endDrag} onMouseLeave={endDrag}
          onTouchStart={e=>{const {x,y}=tcXY(e);startDrag(x,y);}}
          onTouchMove={e=>{e.preventDefault();const {x,y}=tcXY(e);moveDrag(x,y);}}
          onTouchEnd={endDrag}
          style={{display:'block',width:'100%'}}
        />
      </div>

      <p style={{fontSize:11,color:'#555',margin:'0 0 10px',textAlign:'center'}}>
        {addingShape ? `Click canvas to place ${addingShape}` : 'Tap any element to open editor · drag to move · snap guides auto-align'}
      </p>

      <input ref={fileInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handlePhotoUpload}/>

      {/* Slot selector */}
      <div style={{display:'flex',gap:5,marginBottom:10}}>
        {Array.from({length:totalSlots},(_,i)=>(
          <button key={i} onClick={()=>{setActiveSlot(i);if(!slots[i].img)fileInputRef.current?.click();}} style={{
            width:30, height:30, borderRadius:6,
            border:activeSlot===i?'2px solid #4ADE80':'1px solid #333',
            background:activeSlot===i?'#0d1f0d':slots[i].img?'#1a2a1a':'#1a1a1a',
            color:activeSlot===i?'#4ADE80':'#666',
            fontSize:10, cursor:'pointer',
          }}>
            {slots[i].img?'✓':i+1}
          </button>
        ))}
        <button onClick={()=>fileInputRef.current?.click()} style={{
          flex:1, padding:'4px 6px', background:'#4ADE80',
          color:'#000', border:'none', borderRadius:6,
          fontSize:10, fontWeight:700, cursor:'pointer',
        }}>+ Photo</button>
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
              Active slot: <strong style={{color:'#4ADE80'}}>slot {activeSlot+1}</strong> · tap photo on canvas to open editor
            </p>
            <p style={{fontSize:11,color:'#666',margin:'4px 0 0'}}>QR placement</p>
            {[{id:'border',label:'Bottom border strip'},{id:'corner_br',label:'Bottom right corner'},{id:'corner_bl',label:'Bottom left corner'},{id:'back',label:'Back label only'}].map(p=>(
              <div key={p.id} onClick={()=>setQr(p.id)} style={{
                padding:'7px 10px', borderRadius:7, cursor:'pointer',
                border:qr===p.id?'1px solid #4ADE80':'1px solid #333',
                background:qr===p.id?'#0d1f0d':'transparent',
                display:'flex', justifyContent:'space-between', fontSize:12,
              }}>
                <span style={{color:qr===p.id?'#4ADE80':'#888'}}>{p.label}</span>
                {qr===p.id&&<span style={{color:'#4ADE80'}}>✓</span>}
              </div>
            ))}
            <input value={gradName} onChange={e=>setGradName(e.target.value)}
              placeholder="Graduate name"
              style={{width:'100%',padding:'8px 10px',background:'#1a1a1a',border:'1px solid #333',borderRadius:7,color:'#fff',fontSize:12,outline:'none'}}/>
            <input value={school} onChange={e=>setSchool(e.target.value)}
              placeholder="School name (optional)"
              style={{width:'100%',padding:'8px 10px',background:'#1a1a1a',border:'1px solid #333',borderRadius:7,color:'#fff',fontSize:12,outline:'none'}}/>
          </div>
        )}

        {panel==='text'&&(
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
              {TEXT_PRESETS.map(t=>(
                <button key={t} onClick={()=>setTextInput(t.replace('[Name]',gradName||'Name').replace('[School]',school||'School'))}
                  style={{padding:'4px 8px',borderRadius:14,border:'1px solid #333',background:'transparent',color:'#888',fontSize:11,cursor:'pointer'}}>
                  {t}
                </button>
              ))}
            </div>
            <input value={textInput} onChange={e=>setTextInput(e.target.value)}
              placeholder="Custom text…"
              onKeyDown={e=>e.key==='Enter'&&textInput&&(addOverlay(textInput),setTextInput(''))}
              style={{width:'100%',padding:'9px 12px',background:'#1a1a1a',border:'1px solid #333',borderRadius:8,color:'#fff',fontSize:13,outline:'none'}}/>
            <button onClick={()=>{if(textInput){addOverlay(textInput);setTextInput('');}}}
              disabled={!textInput}
              style={{padding:'10px',background:textInput?'#4ADE80':'#333',color:textInput?'#000':'#888',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:textInput?'pointer':'not-allowed'}}>
              Add text → tap to style
            </button>
          </div>
        )}

        {panel==='overlays'&&(
          <div>
            <p style={{fontSize:11,color:'#666',margin:'0 0 8px'}}>Tap to add · tap on canvas to style</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:5}}>
              {CLIP_ART.map(e=>(
                <button key={e} onClick={()=>addOverlay(e,true)}
                  style={{padding:'7px 3px',borderRadius:8,border:'1px solid #333',background:'#1a1a1a',cursor:'pointer',textAlign:'center',fontSize:18}}>
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}

        {panel==='shapes'&&(
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <p style={{fontSize:11,color:'#666',margin:0}}>Select a shape then click on the canvas to place it</p>
            <div style={{display:'flex',gap:8}}>
              {([['rect','⬜ Rectangle'],['circle','⭕ Circle'],['line','➖ Line']] as const).map(([kind,label])=>(
                <button key={kind} onClick={()=>setAddingShape(addingShape===kind?null:kind)}
                  style={{
                    flex:1, padding:'10px 4px',
                    background:addingShape===kind?'#4ADE80':'#1a1a1a',
                    color:addingShape===kind?'#000':'#888',
                    border:addingShape===kind?'none':'1px solid #333',
                    borderRadius:8, fontSize:12, cursor:'pointer',
                  }}>
                  {label}
                </button>
              ))}
            </div>
            {addingShape&&(
              <div style={{background:'#0d1f0d',border:'1px solid #4ADE80',borderRadius:8,padding:'8px 12px',fontSize:12,color:'#4ADE80'}}>
                Click anywhere on the canvas to place your {addingShape}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{display:'flex',gap:8}}>
        <button onClick={onBack} style={{flex:1,padding:12,border:'1px solid #333',borderRadius:10,background:'transparent',color:'#fff',fontSize:14,cursor:'pointer'}}>← Back</button>
        <button onClick={exportPrint} style={{
          flex:2, padding:12,
          background:filled===0?'#333':'#4ADE80',
          color:filled===0?'#888':'#000',
          border:'none', borderRadius:10,
          fontSize:14, fontWeight:700,
          cursor:filled===0?'not-allowed':'pointer',
        }}>
          {filled===0?'Add at least one photo':`Use this design (${filled}/${totalSlots}) →`}
        </button>
      </div>
    </div>
  );
}