'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

const TEMPLATES = [
  { id: 'single',    label: 'Single',        slots: [{ x:0,y:0,w:1,h:1 }] },
  { id: 'two_side',  label: '2 side by side', slots: [{ x:0,y:0,w:.5,h:1 },{ x:.5,y:0,w:.5,h:1 }] },
  { id: 'two_stack', label: '2 stacked',      slots: [{ x:0,y:0,w:1,h:.5 },{ x:0,y:.5,w:1,h:.5 }] },
  { id: 'one_two',   label: '1 + 2',          slots: [{ x:0,y:0,w:.6,h:1 },{ x:.6,y:0,w:.4,h:.5 },{ x:.6,y:.5,w:.4,h:.5 }] },
  { id: 'four',      label: '4 grid',         slots: [{ x:0,y:0,w:.5,h:.5 },{ x:.5,y:0,w:.5,h:.5 },{ x:0,y:.5,w:.5,h:.5 },{ x:.5,y:.5,w:.5,h:.5 }] },
  { id: 'five',      label: '5 mosaic',       slots: [{ x:0,y:0,w:.6,h:.6 },{ x:.6,y:0,w:.4,h:.6 },{ x:0,y:.6,w:.33,h:.4 },{ x:.33,y:.6,w:.33,h:.4 },{ x:.66,y:.6,w:.34,h:.4 }] },
  { id: 'six',       label: '6 grid',         slots: [{ x:0,y:0,w:.33,h:.5 },{ x:.33,y:0,w:.34,h:.5 },{ x:.67,y:0,w:.33,h:.5 },{ x:0,y:.5,w:.33,h:.5 },{ x:.33,y:.5,w:.34,h:.5 },{ x:.67,y:.5,w:.33,h:.5 }] },
];

const CSS_FILTERS: Record<string,string> = {
  Original:'none', Warm:'sepia(0.3) saturate(1.4) brightness(1.05)',
  Cool:'saturate(0.8) hue-rotate(20deg)', 'B&W':'grayscale(1)',
  Fade:'brightness(1.1) saturate(0.7)',   Vivid:'saturate(1.8) contrast(1.1)',
  Golden:'sepia(0.5) saturate(1.6) brightness(1.1)', Drama:'contrast(1.4) saturate(1.2) brightness(0.9)',
};

const CLIP_ART = ['🎓','📜','⭐','🏆','🎗️','🔥','✨','❤️','🎉','🎊','💫','🌟','👑','🌸','🦋','💪'];
const TEXT_PRESETS = ['Class of 2026','[Name] · Class of 2026','[Name] · [School]','The best is yet to come','DONE!'];
const GAP = 2;

interface SlotData { img:HTMLImageElement|null; filter:string; zoom:number; panX:number; panY:number; }
interface Overlay  { id:number; text:string; x:number; y:number; size:number; color:string; angle:number; }
interface CollageEditorProps {
  onComplete:(dataUrl:string,slots:SlotData[])=>void;
  onBack:()=>void;
  defaultGradName?:string;
  defaultSchool?:string;
}

let _ovId = 0;

export default function CollageEditor({ onComplete, onBack, defaultGradName='', defaultSchool='' }:CollageEditorProps) {
  const wrapRef      = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ovDragRef    = useRef<{ov:Overlay;sx:number;sy:number}|null>(null);
  const slotDragRef  = useRef<{slot:number;startX:number;startY:number;startPanX:number;startPanY:number}|null>(null);

  const [orientation, setOrientation] = useState<'l'|'p'>('l');
  const [templateId,  setTemplateId]  = useState('single');
  const [activeSlot,  setActiveSlot]  = useState(0);
  const [panel,       setPanel]       = useState<'photos'|'text'|'overlays'|'adjust'>('photos');
  const [slots,       setSlots]       = useState<SlotData[]>(Array.from({length:6},()=>({img:null,filter:'none',zoom:1,panX:0,panY:0})));
  const [overlays,    setOverlays]    = useState<Overlay[]>([]);
  const [selected,    setSelected]    = useState<number|null>(null);
  const [gradName,    setGradName]    = useState(defaultGradName);
  const [school,      setSchool]      = useState(defaultSchool);
  const [qr,          setQr]          = useState('border');
  const [textInput,   setTextInput]   = useState('');
  const [textColor,   setTextColor]   = useState('#ffffff');
  const [textSize,    setTextSize]    = useState(20);
  const [globalFilt,  setGlobalFilt]  = useState('Original');

  const tpl        = TEMPLATES.find(t=>t.id===templateId)!;
  const totalSlots = tpl.slots.length;
  const filled     = slots.filter((s,i)=>i<totalSlots&&s.img).length;

  function getDims() {
    const W = wrapRef.current?.clientWidth||360;
    return orientation==='l' ? {W,H:Math.round(W*2/3)} : {W:Math.round(W*2/3),H:W};
  }

  const draw = useCallback(()=>{
    const canvas = canvasRef.current; if(!canvas) return;
    const ctx = canvas.getContext('2d'); if(!ctx) return;
    const {W,H} = getDims();
    canvas.width=W; canvas.height=H;
    ctx.fillStyle='#111'; ctx.fillRect(0,0,W,H);

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
        if(s.filter!=='none') ctx.filter=s.filter;
        ctx.drawImage(s.img,dx,dy,dw,dh);
        ctx.filter='none';
      } else {
        ctx.fillStyle=i===activeSlot?'#0d2a0d':'#1a1a1a'; ctx.fillRect(x,y,w,h);
        ctx.strokeStyle=i===activeSlot?'#4ADE80':'#333'; ctx.lineWidth=1.5;
        ctx.strokeRect(x+.75,y+.75,w-1.5,h-1.5);
        ctx.fillStyle=i===activeSlot?'#4ADE80':'#555';
        ctx.font=`${Math.round(Math.min(w,h)*.15)}px Arial`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(i===activeSlot?'+ tap':`${i+1}`,x+w/2,y+h/2);
      }
      ctx.restore();
    });

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

    overlays.forEach(ov=>{
      ctx.save(); ctx.translate(ov.x,ov.y); ctx.rotate(ov.angle*Math.PI/180);
      ctx.font=`${ov.size}px Arial`; ctx.fillStyle=ov.color;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.shadowColor='rgba(0,0,0,0.5)'; ctx.shadowBlur=3;
      ctx.fillText(ov.text,0,0); ctx.shadowBlur=0;
      if(selected===ov.id){
        ctx.strokeStyle='#4ADE80'; ctx.lineWidth=1.5;
        const m=ctx.measureText(ov.text), tw=m.width, th=ov.size*1.2;
        ctx.strokeRect(-tw/2-4,-th/2-2,tw+8,th+4);
      }
      ctx.restore();
    });

    ctx.strokeStyle='rgba(255,80,80,0.2)'; ctx.lineWidth=.5; ctx.setLineDash([3,3]);
    ctx.strokeRect(8,8,W-16,H-16-(qr==='border'?STRIP+2:0));
    ctx.setLineDash([]);
  },[tpl,slots,overlays,selected,gradName,school,qr,activeSlot,orientation]);

  useEffect(()=>{draw();},[draw]);
  useEffect(()=>{
    const ro=new ResizeObserver(()=>draw());
    if(wrapRef.current) ro.observe(wrapRef.current);
    return ()=>ro.disconnect();
  },[draw]);

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

  function startDrag(x:number,y:number){
    for(let i=overlays.length-1;i>=0;i--){
      const ov=overlays[i];
      if(Math.abs(x-ov.x)<40&&Math.abs(y-ov.y)<40){
        ovDragRef.current={ov,sx:x-ov.x,sy:y-ov.y};
        setSelected(ov.id); return;
      }
    }
    const si=getSlotAt(x,y);
    if(si>=0&&slots[si].img){
      slotDragRef.current={slot:si,startX:x,startY:y,startPanX:slots[si].panX,startPanY:slots[si].panY};
      setActiveSlot(si);
    }
  }
  function moveDrag(x:number,y:number){
    if(ovDragRef.current){
      const {ov,sx,sy}=ovDragRef.current;
      setOverlays(p=>p.map(o=>o.id===ov.id?{...o,x:x-sx,y:y-sy}:o));
    } else if(slotDragRef.current){
      const {slot,startX,startY,startPanX,startPanY}=slotDragRef.current;
      setSlots(p=>p.map((s,i)=>i===slot?{...s,panX:startPanX+(x-startX),panY:startPanY+(y-startY)}:s));
    }
  }
  function endDrag(){ ovDragRef.current=null; slotDragRef.current=null; }

  function handleCanvasClick(e:React.MouseEvent<HTMLCanvasElement>){
    const {x,y}=cc(e);
    for(let i=overlays.length-1;i>=0;i--){
      const ov=overlays[i];
      if(Math.abs(x-ov.x)<40&&Math.abs(y-ov.y)<40){ setSelected(ov.id); return; }
    }
    setSelected(null);
    const si=getSlotAt(x,y);
    if(si>=0){ setActiveSlot(si); if(!slots[si].img) fileInputRef.current?.click(); }
  }

  async function handlePhotoUpload(e:React.ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0]; if(!file) return;
    const url=URL.createObjectURL(file);
    const img=new window.Image();
    img.onload=()=>{ setSlots(p=>p.map((s,i)=>i===activeSlot?{...s,img}:s));
      const nx=slots.findIndex((s,i)=>i>activeSlot&&i<totalSlots&&!s.img);
      if(nx!==-1) setActiveSlot(nx);
    };
    img.src=url; e.target.value='';
  }

  function updateSlot(key:keyof SlotData,val:any){
    setSlots(p=>p.map((s,i)=>i===activeSlot?{...s,[key]:val}:s));
  }
  function addOverlay(text:string,isEmoji=false){
    const {W,H}=getDims();
    setOverlays(p=>[...p,{id:++_ovId,text,x:W/2+(Math.random()*40-20),y:H/3+(Math.random()*30-15),size:isEmoji?Math.round(H*.1):textSize,color:textColor,angle:0}]);
  }
  function rotateSelected(deg:number){ if(selected===null) return; setOverlays(p=>p.map(o=>o.id===selected?{...o,angle:o.angle+deg}:o)); }
  function deleteSelectedOverlay(){ if(selected===null) return; setOverlays(p=>p.filter(o=>o.id!==selected)); setSelected(null); }

  function exportPrint(){
    const canvas=canvasRef.current; if(!canvas) return;
    const {W,H}=getDims();
    const exp=document.createElement('canvas');
    exp.width=W*5; exp.height=H*5;
    const ctx=exp.getContext('2d')!;
    ctx.scale(5,5); ctx.drawImage(canvas,0,0,W,H);
    onComplete(exp.toDataURL('image/jpeg',.95),slots);
  }

  const selectedOv=overlays.find(o=>o.id===selected);
  const pb=(id:typeof panel,lbl:string)=>(
    <button key={id} onClick={()=>setPanel(id)} style={{flex:1,padding:'7px 4px',background:panel===id?'#1a1a1a':'transparent',border:panel===id?'1px solid #444':'1px solid transparent',borderRadius:8,color:panel===id?'#fff':'#666',fontSize:11,cursor:'pointer',fontWeight:500}}>{lbl}</button>
  );

  return (
    <div style={{width:'100%',maxWidth:640}}>
      <div style={{textAlign:'center',marginBottom:10}}>
        <h3 style={{fontSize:15,fontWeight:500,margin:'0 0 4px'}}>Photo print designer</h3>
        <p style={{fontSize:12,color:'#888',margin:0}}>4×6 · up to 6 photos · drag to reposition</p>
      </div>

      <div style={{display:'flex',gap:6,marginBottom:10}}>
        {[['l','▭ Landscape (4×6)'],['p','▯ Portrait (6×4)']].map(([v,lbl])=>(
          <button key={v} onClick={()=>setOrientation(v as 'l'|'p')} style={{flex:1,padding:'8px',border:orientation===v?'1px solid #4ADE80':'1px solid #333',borderRadius:8,background:orientation===v?'#0d1f0d':'transparent',color:orientation===v?'#4ADE80':'#888',fontSize:12,cursor:'pointer'}}>{lbl}</button>
        ))}
      </div>

      <div style={{marginBottom:10}}>
        <p style={{fontSize:11,color:'#666',margin:'0 0 6px'}}>Layout — {filled}/{totalSlots} photos</p>
        <div style={{display:'flex',gap:5,overflowX:'auto',paddingBottom:2}}>
          {TEMPLATES.map(t=>(
            <button key={t.id} onClick={()=>{setTemplateId(t.id);setActiveSlot(0);}} style={{padding:'5px 9px',borderRadius:8,flexShrink:0,border:templateId===t.id?'1px solid #4ADE80':'1px solid #333',background:templateId===t.id?'#0d1f0d':'#111',color:templateId===t.id?'#4ADE80':'#888',fontSize:11,cursor:'pointer'}}>{t.label}</button>
          ))}
        </div>
      </div>

      <div ref={wrapRef} style={{width:'100%',borderRadius:10,overflow:'hidden',border:'1px solid #333',marginBottom:6,background:'#111',touchAction:'none'}}>
        <canvas ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseDown={e=>startDrag(...Object.values(cc(e)) as [number,number])}
          onMouseMove={e=>moveDrag(...Object.values(cc(e)) as [number,number])}
          onMouseUp={endDrag} onMouseLeave={endDrag}
          onTouchStart={e=>startDrag(...Object.values(tcXY(e)) as [number,number])}
          onTouchMove={e=>{e.preventDefault();moveDrag(...Object.values(tcXY(e)) as [number,number]);}}
          onTouchEnd={endDrag}
          style={{display:'block',width:'100%',cursor:'crosshair'}}
        />
      </div>
      {filled>0&&<p style={{fontSize:11,color:'#555',margin:'0 0 10px',textAlign:'center'}}>Drag photo within its slot to reposition · zoom slider to crop</p>}

      <input ref={fileInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handlePhotoUpload}/>

      {selectedOv&&(
        <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:10,background:'#111',borderRadius:8,padding:'8px',border:'1px solid #222'}}>
          <div style={{display:'flex',gap:5,alignItems:'center',flexWrap:'wrap'}}>
            <span style={{fontSize:11,color:'#888',flex:1,minWidth:50}}>{selectedOv.text}</span>
            <button onClick={()=>rotateSelected(-15)} style={{padding:'4px 7px',background:'#1a1a1a',border:'1px solid #333',borderRadius:6,color:'#fff',fontSize:11,cursor:'pointer'}}>↺</button>
            <button onClick={()=>rotateSelected(15)}  style={{padding:'4px 7px',background:'#1a1a1a',border:'1px solid #333',borderRadius:6,color:'#fff',fontSize:11,cursor:'pointer'}}>↻</button>
            <button onClick={deleteSelectedOverlay}    style={{padding:'4px 7px',background:'#2a0a0a',border:'1px solid #A32D2D',borderRadius:6,color:'#ff6b6b',fontSize:11,cursor:'pointer'}}>🗑</button>
          </div>
          <div>
            <p style={{fontSize:11,color:'#666',margin:'0 0 3px'}}>Size: {selectedOv.size}px</p>
            <input type="range" min={12} max={120} value={selectedOv.size}
              onChange={e=>setOverlays(p=>p.map(o=>o.id===selected?{...o,size:Number(e.target.value)}:o))}
              style={{width:'100%',accentColor:'#4ADE80'}}/>
          </div>
        </div>
      )}

      <div style={{display:'flex',gap:5,marginBottom:10}}>
        {Array.from({length:totalSlots},(_,i)=>(
          <button key={i} onClick={()=>{setActiveSlot(i);if(!slots[i].img)fileInputRef.current?.click();}} style={{width:30,height:30,borderRadius:6,border:activeSlot===i?'2px solid #4ADE80':'1px solid #333',background:activeSlot===i?'#0d1f0d':slots[i].img?'#1a2a1a':'#1a1a1a',color:activeSlot===i?'#4ADE80':'#666',fontSize:10,cursor:'pointer'}}>
            {slots[i].img?'✓':i+1}
          </button>
        ))}
        <button onClick={()=>fileInputRef.current?.click()} style={{flex:1,padding:'4px 6px',background:'#4ADE80',color:'#000',border:'none',borderRadius:6,fontSize:10,fontWeight:700,cursor:'pointer'}}>+ Slot {activeSlot+1}</button>
      </div>

      <div style={{display:'flex',gap:4,marginBottom:10}}>
        {pb('photos','📷 Photos')}{pb('adjust','🎨 Adjust')}{pb('text','✏️ Text')}{pb('overlays','🎭 Overlays')}
      </div>

      <div style={{background:'#111',borderRadius:10,padding:'12px',border:'1px solid #222',marginBottom:10}}>

        {panel==='photos'&&(
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <p style={{fontSize:12,color:'#888',margin:0,lineHeight:1.6}}>Tap a slot or numbered button. Active: <strong style={{color:'#4ADE80'}}>slot {activeSlot+1}</strong></p>
            <p style={{fontSize:11,color:'#666',margin:'4px 0 0'}}>QR placement</p>
            {[{id:'border',label:'Bottom border strip (recommended)'},{id:'corner_br',label:'Bottom right corner'},{id:'corner_bl',label:'Bottom left corner'},{id:'back',label:'Back label only'}].map(p=>(
              <div key={p.id} onClick={()=>setQr(p.id)} style={{padding:'7px 10px',borderRadius:7,cursor:'pointer',border:qr===p.id?'1px solid #4ADE80':'1px solid #333',background:qr===p.id?'#0d1f0d':'transparent',display:'flex',justifyContent:'space-between',fontSize:12}}>
                <span style={{color:qr===p.id?'#4ADE80':'#888'}}>{p.label}</span>
                {qr===p.id&&<span style={{color:'#4ADE80'}}>✓</span>}
              </div>
            ))}
            <input value={gradName} onChange={e=>setGradName(e.target.value)} placeholder="Graduate name" style={{width:'100%',padding:'8px 10px',background:'#1a1a1a',border:'1px solid #333',borderRadius:7,color:'#fff',fontSize:12,outline:'none'}}/>
            <input value={school} onChange={e=>setSchool(e.target.value)} placeholder="School name (optional)" style={{width:'100%',padding:'8px 10px',background:'#1a1a1a',border:'1px solid #333',borderRadius:7,color:'#fff',fontSize:12,outline:'none'}}/>
          </div>
        )}

        {panel==='adjust'&&(
          <div>
            <p style={{fontSize:11,color:'#666',margin:'0 0 8px'}}>Filter — slot {activeSlot+1}</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:5,marginBottom:10}}>
              {Object.keys(CSS_FILTERS).map(name=>(
                <button key={name} onClick={()=>updateSlot('filter',CSS_FILTERS[name])} style={{padding:'5px 3px',border:slots[activeSlot]?.filter===CSS_FILTERS[name]?'1px solid #4ADE80':'1px solid #333',borderRadius:6,background:slots[activeSlot]?.filter===CSS_FILTERS[name]?'#0d1f0d':'transparent',color:slots[activeSlot]?.filter===CSS_FILTERS[name]?'#4ADE80':'#888',fontSize:10,cursor:'pointer'}}>{name}</button>
              ))}
            </div>
            <p style={{fontSize:11,color:'#666',margin:'0 0 5px'}}>Apply to all</p>
            <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:10}}>
              {Object.keys(CSS_FILTERS).map(name=>(
                <button key={name} onClick={()=>{setGlobalFilt(name);setSlots(p=>p.map(s=>({...s,filter:CSS_FILTERS[name]})));}} style={{padding:'3px 7px',borderRadius:14,border:globalFilt===name?'1px solid #4ADE80':'1px solid #333',background:'transparent',color:'#888',fontSize:10,cursor:'pointer'}}>{name}</button>
              ))}
            </div>
            <p style={{fontSize:11,color:'#666',margin:'0 0 4px'}}>Zoom slot {activeSlot+1}: {Math.round((slots[activeSlot]?.zoom||1)*100)}%</p>
            <input type="range" min={100} max={220} value={Math.round((slots[activeSlot]?.zoom||1)*100)} onChange={e=>updateSlot('zoom',Number(e.target.value)/100)} style={{width:'100%',accentColor:'#4ADE80'}}/>
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
            <button onClick={()=>{if(textInput){addOverlay(textInput);setTextInput('');}}} disabled={!textInput} style={{padding:'10px',background:textInput?'#4ADE80':'#333',color:textInput?'#000':'#888',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:textInput?'pointer':'not-allowed'}}>Add text to print</button>
          </div>
        )}

        {panel==='overlays'&&(
          <div>
            <p style={{fontSize:11,color:'#666',margin:'0 0 8px'}}>Tap to add · drag on canvas · select to rotate</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:5}}>
              {CLIP_ART.map(e=>(
                <button key={e} onClick={()=>addOverlay(e,true)} style={{padding:'7px 3px',borderRadius:8,border:'1px solid #333',background:'#1a1a1a',cursor:'pointer',textAlign:'center',fontSize:18}}>{e}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{display:'flex',gap:8}}>
        <button onClick={onBack} style={{flex:1,padding:12,border:'1px solid #333',borderRadius:10,background:'transparent',color:'#fff',fontSize:14,cursor:'pointer'}}>← Back</button>
        <button onClick={exportPrint} style={{flex:2,padding:12,background:filled===0?'#333':'#4ADE80',color:filled===0?'#888':'#000',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:filled===0?'not-allowed':'pointer'}}>
          {filled===0?'Add at least one photo':`Use this design (${filled}/${totalSlots}) →`}
        </button>
      </div>
    </div>
  );
}