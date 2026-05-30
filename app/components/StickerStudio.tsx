'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

const SHEET_W = 320;
const SHEET_H = 560;

const LAYOUTS = [
  { id:'1x1',   label:'1 large',    cols:1, rows:1 },
  { id:'2x2',   label:'4 stickers', cols:2, rows:2 },
  { id:'3x2',   label:'6 stickers', cols:3, rows:2 },
  { id:'strip', label:'4 strip',    cols:1, rows:4 },
];

const SHAPES = [
  { id:'circle',         label:'⭕ Circle'  },
  { id:'rounded_square', label:'🟦 Rounded' },
  { id:'portrait',       label:'📷 Portrait'},
];

const CSS_FILTERS: Record<string,string> = {
  Original:'none', Warm:'sepia(0.3) saturate(1.4) brightness(1.05)',
  Cool:'saturate(0.8) hue-rotate(20deg)', 'B&W':'grayscale(1)',
  Fade:'brightness(1.1) saturate(0.7)',   Vivid:'saturate(1.8) contrast(1.1)',
  Golden:'sepia(0.5) saturate(1.6) brightness(1.1)', Drama:'contrast(1.4) saturate(1.2) brightness(0.9)',
};

const CLIP_ART = [
  {emoji:'🎓',label:'Grad cap'},{emoji:'📜',label:'Diploma'},
  {emoji:'⭐',label:'Star'},{emoji:'🏆',label:'Trophy'},
  {emoji:'🎗️',label:'Ribbon'},{emoji:'🔥',label:'Fire'},
  {emoji:'✨',label:'Sparkle'},{emoji:'❤️',label:'Heart'},
  {emoji:'🎊',label:'Confetti'},{emoji:'💫',label:'Stars'},
  {emoji:'🌟',label:'Glow'},{emoji:'💪',label:'Strong'},
];

const MORE_EMOJIS = ['🎉','🎊','💫','🌸','🦋','🙌','👑','🎵','🌈','☀️','🌙','⚡','🎯','🏅','📸','🖼️'];
const TEXT_SUGGESTIONS = ['Class of 2026','DONE!','FINALLY!','#GRAD2026','The best is yet to come','Level up','Next chapter'];
const GAP = 6;

interface SlotData { img:HTMLImageElement|null; bgRemovedUrl:string|null; filter:string; zoom:number; panX:number; panY:number; text:string; textColor:string; textSize:number; }
interface Overlay  { id:number; text:string; x:number; y:number; size:number; color:string; angle:number; }
interface StickerStudioProps {
  onComplete:(dataUrl:string,layout:string,shape:string)=>void;
  onBack:()=>void;
}

let _sid = 0;

export default function StickerStudio({ onComplete, onBack }:StickerStudioProps) {
  const wrapRef      = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ovDragRef    = useRef<{ov:Overlay;sx:number;sy:number}|null>(null);
  const slotDragRef  = useRef<{slot:number;startX:number;startY:number;startPanX:number;startPanY:number}|null>(null);

  const [layout,      setLayout]      = useState('2x2');
  const [shape,       setShape]       = useState('rounded_square');
  const [activeSlot,  setActiveSlot]  = useState(0);
  const [panel,       setPanel]       = useState<'photo'|'text'|'overlays'|'layout'>('photo');
  const [slots,       setSlots]       = useState<SlotData[]>(Array.from({length:9},()=>({img:null,bgRemovedUrl:null,filter:'none',zoom:1,panX:0,panY:0,text:'',textColor:'#ffffff',textSize:14})));
  const [overlays,    setOverlays]    = useState<Overlay[]>([]);
  const [selected,    setSelected]    = useState<number|null>(null);
  const [removingBg,  setRemovingBg]  = useState(false);
  const [overlapWarn, setOverlapWarn] = useState<string|null>(null);
  const [textInput,   setTextInput]   = useState('');
  const [textColor,   setTextColor]   = useState('#ffffff');
  const [textSize,    setTextSize]    = useState(18);

  const L         = LAYOUTS.find(l=>l.id===layout)!;
  const slotCount = L.cols * L.rows;

  function getDims(){
    const W = wrapRef.current?.clientWidth || SHEET_W;
    const H = Math.round(W * (SHEET_H / SHEET_W));
    return {W,H};
  }

  function slotRect(idx:number, W:number, H:number){
    const MARGIN = Math.round(W * 0.05);
    const GUTTER = Math.round(W * 0.02);
    const sw = (W - MARGIN*2 - GUTTER*(L.cols-1)) / L.cols;
    const sh = (H - MARGIN*2 - GUTTER*(L.rows-1)) / L.rows;
    const c  = idx % L.cols, r = Math.floor(idx / L.cols);
    return {
      x: MARGIN + c*(sw+GUTTER),
      y: MARGIN + r*(sh+GUTTER),
      w: sw, h: sh,
    };
  }

  function drawShape(ctx:CanvasRenderingContext2D, x:number, y:number, w:number, h:number){
    ctx.beginPath();
    if(shape==='circle'){
      const cx=x+w/2, cy=y+h/2, r=Math.min(w,h)/2;
      ctx.arc(cx,cy,r,0,Math.PI*2);
    } else if(shape==='rounded_square'){
      const r=Math.min(w,h)*0.15;
      ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
      ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
      ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
      ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r);
    } else {
      ctx.roundRect(x,y,w,h,6);
    }
    ctx.closePath();
  }

  const draw = useCallback(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const ctx=canvas.getContext('2d'); if(!ctx) return;
    const {W,H}=getDims();
    canvas.width=W; canvas.height=H;

    ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,W,H);

    for(let i=0;i<slotCount;i++){
      const {x,y,w,h}=slotRect(i,W,H);
      const s=slots[i];
      ctx.save();
      drawShape(ctx,x,y,w,h); ctx.clip();

      const imgSrc = s.bgRemovedUrl ? (() => { const img = new window.Image(); img.src = s.bgRemovedUrl!; return img; })() : s.img;

      if(s.img || s.bgRemovedUrl){
        const imgEl = s.bgRemovedUrl ? (() => { const im = new window.Image(); im.src = s.bgRemovedUrl!; return im; })() : s.img!;
        const iw=imgEl.naturalWidth||imgEl.width, ih=imgEl.naturalHeight||imgEl.height;
        if(iw>0&&ih>0){
          const scale=(iw/ih>w/h?h/ih:w/iw)*s.zoom;
          const dw=iw*scale, dh=ih*scale;
          const dx=x+(w-dw)/2+s.panX, dy=y+(h-dh)/2+s.panY;
          if(s.filter!=='none') ctx.filter=s.filter;
          ctx.drawImage(imgEl,dx,dy,dw,dh);
          ctx.filter='none';
        }
      } else {
        ctx.fillStyle=i===activeSlot?'#0d2a0d':'#f5f5f5';
        ctx.fillRect(x,y,w,h);
      }

      // Slot text overlay
      if(s.text){
        ctx.font=`bold ${s.textSize}px Arial`;
        ctx.textAlign='center'; ctx.textBaseline='bottom';
        ctx.fillStyle='rgba(0,0,0,0.5)';
        ctx.fillText(s.text,x+w/2+1,y+h-4);
        ctx.fillStyle=s.textColor;
        ctx.fillText(s.text,x+w/2,y+h-5);
      }

      ctx.restore();

      // Slot border / active indicator
      ctx.save();
      drawShape(ctx,x,y,w,h);
      ctx.strokeStyle=i===activeSlot?'#4ADE80':'#FF0080';
      ctx.lineWidth=i===activeSlot?2:1;
      ctx.setLineDash(i===activeSlot?[]:[3,3]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Empty slot label
      if(!s.img&&!s.bgRemovedUrl){
        ctx.fillStyle=i===activeSlot?'#4ADE80':'#aaa';
        ctx.font=`${Math.round(Math.min(w,h)*.14)}px Arial`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(i===activeSlot?'+ tap':`${i+1}`,x+w/2,y+h/2);
      }
    }

    // Global overlays
    overlays.forEach(ov=>{
      ctx.save(); ctx.translate(ov.x,ov.y); ctx.rotate(ov.angle*Math.PI/180);
      ctx.font=`${ov.size}px Arial`; ctx.fillStyle=ov.color;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.shadowColor='rgba(0,0,0,0.4)'; ctx.shadowBlur=2;
      ctx.fillText(ov.text,0,0); ctx.shadowBlur=0;
      if(selected===ov.id){
        ctx.strokeStyle='#4ADE80'; ctx.lineWidth=1.5;
        const m=ctx.measureText(ov.text), tw=m.width, th=ov.size*1.2;
        ctx.strokeRect(-tw/2-4,-th/2-2,tw+8,th+4);
      }
      ctx.restore();
    });

    // Registration marks
    const REG=Math.round(W*.045);
    [[4,4],[W-REG-4,4],[4,H-REG-4]].forEach(([rx,ry])=>{
      ctx.fillStyle='#000'; ctx.fillRect(rx,ry,REG,REG);
    });

  },[L,shape,slots,overlays,selected,activeSlot]);

  useEffect(()=>{draw();},[draw]);
  useEffect(()=>{
    const ro=new ResizeObserver(()=>draw());
    if(wrapRef.current) ro.observe(wrapRef.current);
    return ()=>ro.disconnect();
  },[draw]);

  function canvasXY(e:React.MouseEvent<HTMLCanvasElement>){
    const c=canvasRef.current!, r=c.getBoundingClientRect();
    return {x:(e.clientX-r.left)*(c.width/r.width),y:(e.clientY-r.top)*(c.height/r.height)};
  }
  function touchXY(e:React.TouchEvent<HTMLCanvasElement>){
    const c=canvasRef.current!, r=c.getBoundingClientRect(), t=e.touches[0];
    return {x:(t.clientX-r.left)*(c.width/r.width),y:(t.clientY-r.top)*(c.height/r.height)};
  }
  function getSlotAt(x:number,y:number){
    const {W,H}=getDims();
    for(let i=0;i<slotCount;i++){
      const {x:sx,y:sy,w,h}=slotRect(i,W,H);
      if(x>=sx&&x<=sx+w&&y>=sy&&y<=sy+h) return i;
    }
    return -1;
  }

  function startDrag(x:number,y:number){
    for(let i=overlays.length-1;i>=0;i--){
      const ov=overlays[i];
      if(Math.abs(x-ov.x)<40&&Math.abs(y-ov.y)<40){
        ovDragRef.current={ov,sx:x-ov.x,sy:y-ov.y}; setSelected(ov.id); return;
      }
    }
    const si=getSlotAt(x,y);
    if(si>=0&&(slots[si].img||slots[si].bgRemovedUrl)){
      slotDragRef.current={slot:si,startX:x,startY:y,startPanX:slots[si].panX,startPanY:slots[si].panY};
      setActiveSlot(si);
    }
  }
  function moveDrag(x:number,y:number){
    if(ovDragRef.current){
      const {ov,sx,sy}=ovDragRef.current;
      setOverlays(p=>p.map(o=>o.id===ov.id?{...o,x:x-sx,y:y-sy}:o));
      checkOverlaps();
    } else if(slotDragRef.current){
      const {slot,startX,startY,startPanX,startPanY}=slotDragRef.current;
      setSlots(p=>p.map((s,i)=>i===slot?{...s,panX:startPanX+(x-startX),panY:startPanY+(y-startY)}:s));
    }
  }
  function endDrag(){ ovDragRef.current=null; slotDragRef.current=null; }

  function checkOverlaps(){
    for(let i=0;i<overlays.length;i++){
      for(let j=i+1;j<overlays.length;j++){
        const a=overlays[i], b=overlays[j];
        const dist=Math.sqrt(Math.pow(a.x-b.x,2)+Math.pow(a.y-b.y,2));
        if(dist<(a.size+b.size)*0.6){
          setOverlapWarn(`⚠️ "${a.text}" and "${b.text}" are overlapping significantly. The die-cut will follow the outer edge of both.`);
          return;
        }
      }
    }
    setOverlapWarn(null);
  }

  function handleCanvasClick(e:React.MouseEvent<HTMLCanvasElement>){
    const {x,y}=canvasXY(e);
    for(let i=overlays.length-1;i>=0;i--){
      const ov=overlays[i];
      if(Math.abs(x-ov.x)<40&&Math.abs(y-ov.y)<40){ setSelected(ov.id); return; }
    }
    setSelected(null);
    const si=getSlotAt(x,y);
    if(si>=0){ setActiveSlot(si); if(!slots[si].img&&!slots[si].bgRemovedUrl) fileInputRef.current?.click(); }
  }

  async function handlePhotoUpload(e:React.ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0]; if(!file) return;
    const url=URL.createObjectURL(file);
    const img=new window.Image();
    img.onload=()=>{ setSlots(p=>p.map((s,i)=>i===activeSlot?{...s,img,bgRemovedUrl:null}:s)); };
    img.src=url; e.target.value='';
  }

  async function removeBackground(){
    const s=slots[activeSlot];
    if(!s.img){ alert('Select a slot with a photo first.'); return; }
    setRemovingBg(true);
    try {
      const canvas2=document.createElement('canvas');
      canvas2.width=s.img.naturalWidth; canvas2.height=s.img.naturalHeight;
      canvas2.getContext('2d')!.drawImage(s.img,0,0);
      const blob=await new Promise<Blob>(res=>canvas2.toBlob(b=>res(b!),'image/jpeg',.9));
      const fd=new FormData(); fd.append('image',blob,'photo.jpg');
      const res=await fetch('/api/remove-bg',{method:'POST',body:fd});
      const data=await res.json();
      if(data.url){
        const img2=new window.Image();
        img2.onload=()=>{ setSlots(p=>p.map((sl,i)=>i===activeSlot?{...sl,bgRemovedUrl:data.url}:sl)); };
        img2.src=data.url;
      }
    } catch(err){ console.error(err); }
    setRemovingBg(false);
  }

  function updateSlot(key:keyof SlotData,val:any){
    setSlots(p=>p.map((s,i)=>i===activeSlot?{...s,[key]:val}:s));
  }

  function addOverlay(text:string,isEmoji=false){
    const {W,H}=getDims();
    setOverlays(p=>[...p,{id:++_sid,text,x:W/2+(Math.random()*40-20),y:H/2+(Math.random()*40-20),size:isEmoji?Math.round(Math.min(W,H)*.08):textSize,color:textColor,angle:0}]);
  }

  function rotateSelected(deg:number){ if(selected===null) return; setOverlays(p=>p.map(o=>o.id===selected?{...o,angle:o.angle+deg}:o)); }
  function flipSelected(){ /* overlays are text/emoji — flip not applicable */ }
  function deleteSelected(){ if(selected===null) return; setOverlays(p=>p.filter(o=>o.id!==selected)); setSelected(null); }

  function exportSheet(){
    const canvas=canvasRef.current; if(!canvas) return;
    const {W,H}=getDims();
    const exp=document.createElement('canvas');
    exp.width=W*4; exp.height=H*4;
    const ctx=exp.getContext('2d')!;
    ctx.scale(4,4); ctx.drawImage(canvas,0,0,W,H);
    onComplete(exp.toDataURL('image/png'),layout,shape);
  }

  const selectedOv=overlays.find(o=>o.id===selected);
  const pb=(id:typeof panel,lbl:string)=>(
    <button key={id} onClick={()=>setPanel(id)} style={{flex:1,padding:'7px 4px',background:panel===id?'#1a1a1a':'transparent',border:panel===id?'1px solid #444':'1px solid transparent',borderRadius:8,color:panel===id?'#fff':'#666',fontSize:11,cursor:'pointer',fontWeight:500}}>{lbl}</button>
  );

  return (
    <div style={{width:'100%',maxWidth:640}}>
      <div style={{textAlign:'center',marginBottom:10}}>
        <h3 style={{fontSize:15,fontWeight:500,margin:'0 0 4px'}}>Sticker sheet designer</h3>
        <p style={{fontSize:12,color:'#888',margin:0}}>4×7 · drag photos within slots · drag overlays freely</p>
      </div>

      {overlapWarn&&(
        <div style={{background:'#2a1a00',border:'1px solid #BA7517',borderRadius:8,padding:'8px 12px',fontSize:12,color:'#BA7517',marginBottom:10,lineHeight:1.5}}>
          {overlapWarn}
          <button onClick={()=>setOverlapWarn(null)} style={{marginLeft:8,padding:'2px 8px',background:'transparent',border:'1px solid #BA7517',borderRadius:4,color:'#BA7517',fontSize:11,cursor:'pointer'}}>Got it</button>
        </div>
      )}

      <div ref={wrapRef} style={{width:'100%',borderRadius:10,overflow:'hidden',border:'1px solid #333',marginBottom:6,background:'#fff',touchAction:'none'}}>
        <canvas ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseDown={e=>{const {x,y}=canvasXY(e);startDrag(x,y);}}
          onMouseMove={e=>{const {x,y}=canvasXY(e);moveDrag(x,y);}}
          onMouseUp={endDrag} onMouseLeave={endDrag}
          onTouchStart={e=>{const {x,y}=touchXY(e);startDrag(x,y);}}
          onTouchMove={e=>{e.preventDefault();const {x,y}=touchXY(e);moveDrag(x,y);}}
          onTouchEnd={endDrag}
          style={{display:'block',width:'100%',cursor:'crosshair'}}
        />
      </div>
      <p style={{fontSize:11,color:'#555',margin:'0 0 10px',textAlign:'center'}}>Pink dashed = die-cut · Black squares = Pixcut registration marks · Drag photo to reposition</p>

      <input ref={fileInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handlePhotoUpload}/>

      {selectedOv&&(
        <div style={{display:'flex',gap:5,marginBottom:10,flexWrap:'wrap',background:'#111',borderRadius:8,padding:'8px',border:'1px solid #222'}}>
          <span style={{fontSize:11,color:'#888',flex:1,alignSelf:'center'}}>{selectedOv.text}</span>
          <button onClick={()=>rotateSelected(-15)} style={{padding:'4px 7px',background:'#1a1a1a',border:'1px solid #333',borderRadius:6,color:'#fff',fontSize:11,cursor:'pointer'}}>↺</button>
          <button onClick={()=>rotateSelected(15)}  style={{padding:'4px 7px',background:'#1a1a1a',border:'1px solid #333',borderRadius:6,color:'#fff',fontSize:11,cursor:'pointer'}}>↻</button>
          <button onClick={deleteSelected}           style={{padding:'4px 7px',background:'#2a0a0a',border:'1px solid #A32D2D',borderRadius:6,color:'#ff6b6b',fontSize:11,cursor:'pointer'}}>🗑</button>
        </div>
      )}

      <div style={{display:'flex',gap:5,marginBottom:10,flexWrap:'wrap'}}>
        {Array.from({length:slotCount},(_,i)=>(
          <button key={i} onClick={()=>{setActiveSlot(i);if(!slots[i].img&&!slots[i].bgRemovedUrl)fileInputRef.current?.click();}} style={{width:30,height:30,borderRadius:6,border:activeSlot===i?'2px solid #4ADE80':'1px solid #333',background:activeSlot===i?'#0d1f0d':(slots[i].img||slots[i].bgRemovedUrl)?'#1a2a1a':'#1a1a1a',color:activeSlot===i?'#4ADE80':'#666',fontSize:10,cursor:'pointer'}}>
            {(slots[i].img||slots[i].bgRemovedUrl)?'✓':i+1}
          </button>
        ))}
        <button onClick={()=>fileInputRef.current?.click()} style={{flex:1,padding:'4px 6px',background:'#4ADE80',color:'#000',border:'none',borderRadius:6,fontSize:10,fontWeight:700,cursor:'pointer'}}>+ Slot {activeSlot+1}</button>
      </div>

      <div style={{display:'flex',gap:4,marginBottom:10}}>
        {pb('photo','📷 Photo')}{pb('text','✏️ Text')}{pb('overlays','🎨 Overlays')}{pb('layout','📐 Layout')}
      </div>

      <div style={{background:'#111',borderRadius:10,padding:'12px',border:'1px solid #222',marginBottom:10}}>

        {panel==='photo'&&(
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <button onClick={()=>fileInputRef.current?.click()} style={{padding:'10px',background:'#4ADE80',color:'#000',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer'}}>📷 Add photo to slot {activeSlot+1}</button>
            <button onClick={removeBackground} disabled={removingBg||!slots[activeSlot].img} style={{padding:'10px',background:removingBg?'#333':'#1a1a1a',color:removingBg?'#888':'#fff',border:'1px solid #444',borderRadius:8,fontSize:13,cursor:removingBg?'wait':'pointer'}}>
              {removingBg?'✨ Removing background…':'✨ Remove background (select photo first)'}
            </button>
            {slots[activeSlot].bgRemovedUrl&&(
              <div style={{background:'#0d1f0d',borderRadius:8,padding:'8px 12px',fontSize:12,color:'#4ADE80'}}>✓ Background removed</div>
            )}
            <p style={{fontSize:11,color:'#666',margin:'4px 0 0',lineHeight:1.5}}>Filter for slot {activeSlot+1}</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:4}}>
              {Object.keys(CSS_FILTERS).map(name=>(
                <button key={name} onClick={()=>updateSlot('filter',CSS_FILTERS[name])} style={{padding:'4px 2px',border:slots[activeSlot]?.filter===CSS_FILTERS[name]?'1px solid #4ADE80':'1px solid #333',borderRadius:5,background:slots[activeSlot]?.filter===CSS_FILTERS[name]?'#0d1f0d':'transparent',color:slots[activeSlot]?.filter===CSS_FILTERS[name]?'#4ADE80':'#888',fontSize:9,cursor:'pointer'}}>{name}</button>
              ))}
            </div>
            <p style={{fontSize:11,color:'#666',margin:'4px 0 2px'}}>Zoom: {Math.round((slots[activeSlot]?.zoom||1)*100)}%</p>
            <input type="range" min={100} max={220} value={Math.round((slots[activeSlot]?.zoom||1)*100)} onChange={e=>updateSlot('zoom',Number(e.target.value)/100)} style={{width:'100%',accentColor:'#4ADE80'}}/>
            <p style={{fontSize:11,color:'#666',margin:'4px 0 2px'}}>Slot text</p>
            <input value={slots[activeSlot]?.text||''} onChange={e=>updateSlot('text',e.target.value)} placeholder="Text on this sticker (optional)" style={{width:'100%',padding:'7px 10px',background:'#1a1a1a',border:'1px solid #333',borderRadius:7,color:'#fff',fontSize:12,outline:'none'}}/>
          </div>
        )}

        {panel==='text'&&(
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
              {TEXT_SUGGESTIONS.map(t=>(
                <button key={t} onClick={()=>setTextInput(t)} style={{padding:'4px 8px',borderRadius:14,border:'1px solid #333',background:'transparent',color:'#888',fontSize:11,cursor:'pointer'}}>{t}</button>
              ))}
            </div>
            <input value={textInput} onChange={e=>setTextInput(e.target.value)} placeholder="Custom text…" onKeyDown={e=>e.key==='Enter'&&textInput&&(addOverlay(textInput),setTextInput(''))} style={{width:'100%',padding:'9px 12px',background:'#1a1a1a',border:'1px solid #333',borderRadius:8,color:'#fff',fontSize:13,outline:'none'}}/>
            <div style={{display:'flex',gap:10,alignItems:'center'}}>
              <div style={{flex:1}}>
                <p style={{fontSize:11,color:'#666',margin:'0 0 4px'}}>Size: {textSize}px</p>
                <input type="range" min={8} max={48} value={textSize} onChange={e=>setTextSize(Number(e.target.value))} style={{width:'100%',accentColor:'#4ADE80'}}/>
              </div>
              <div>
                <p style={{fontSize:11,color:'#666',margin:'0 0 4px'}}>Color</p>
                <input type="color" value={textColor} onChange={e=>setTextColor(e.target.value)} style={{width:34,height:26,border:'none',background:'none',cursor:'pointer'}}/>
              </div>
            </div>
            <button onClick={()=>{if(textInput){addOverlay(textInput);setTextInput('');}}} disabled={!textInput} style={{padding:'10px',background:textInput?'#4ADE80':'#333',color:textInput?'#000':'#888',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:textInput?'pointer':'not-allowed'}}>Add text to sheet</button>
          </div>
        )}

        {panel==='overlays'&&(
          <div>
            <p style={{fontSize:11,color:'#666',margin:'0 0 8px'}}>Tap to add · drag to position · select to rotate</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginBottom:10}}>
              {CLIP_ART.map(c=>(
                <button key={c.emoji} onClick={()=>addOverlay(c.emoji,true)} style={{padding:'8px 4px',borderRadius:8,border:'1px solid #333',background:'#1a1a1a',cursor:'pointer',textAlign:'center'}}>
                  <div style={{fontSize:20}}>{c.emoji}</div>
                  <div style={{fontSize:9,color:'#666',marginTop:2}}>{c.label}</div>
                </button>
              ))}
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
              {MORE_EMOJIS.map(e=>(
                <button key={e} onClick={()=>addOverlay(e,true)} style={{padding:'5px 8px',borderRadius:16,border:'1px solid #333',background:'transparent',fontSize:16,cursor:'pointer'}}>{e}</button>
              ))}
            </div>
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
            <p style={{fontSize:11,color:'#555',margin:0,lineHeight:1.6}}>Pink dashed lines = Pixcut S1 die-cut path. Black squares = registration marks. Keep content 3mm inside the dashed border.</p>
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