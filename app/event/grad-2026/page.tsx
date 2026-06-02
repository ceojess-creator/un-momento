'use client';
import { useState, useEffect } from 'react';
import CollageEditor  from '@/app/components/CollageEditor';
import MemoryRecorder from '@/app/components/MediaRecorder';
import StickerStudio  from '@/app/components/StickerStudio';
import CreatorSearch  from '@/app/components/CreatorSearch';
import ButtonStudio   from '@/app/components/ButtonStudio';
import { useCart, generateCartId, CartItem } from '@/app/context/CartContext';

const BUNDLES = [
  {
    id:'essential', name:'Momento Essential', price:18,
    desc:'Instant 4×6 photo print + QR memory code',
    includes:['4×6 photo print','QR code on print face','Ships in 4–5 days'],
    popular:false, hasSticker:false, hasButton:false,
    hasQR:true, isMulti:false, printCount:1,
  },
  {
    id:'classic', name:'Momento Classic', price:28,
    desc:'Photo print + die-cut sticker sheet + QR memory code',
    includes:['4×6 photo print','Die-cut 4×7 sticker sheet','QR code on print face','Ships in 4–5 days'],
    popular:true, hasSticker:true, hasButton:false,
    hasQR:true, isMulti:false, printCount:1,
  },
  {
    id:'bundle', name:'Momento Bundle', price:45,
    desc:'Photo + stickers + button or magnet + card jacket',
    includes:['4×6 photo print','Die-cut 4×7 sticker sheet','Custom button or magnet','Black card jacket','QR code on print face','Ships in 4–5 days'],
    popular:false, hasSticker:true, hasButton:true,
    hasQR:true, isMulti:false, printCount:1,
  },
  {
    id:'signature', name:'Momento Signature', price:58,
    desc:'The complete graduation keepsake experience',
    includes:['4×6 photo print','Die-cut 4×7 sticker sheet','Custom button or magnet','Black card jacket','Metallic marker','QR video memory upgrade','Ships in 4–5 days'],
    popular:false, hasSticker:true, hasButton:true,
    hasQR:true, isMulti:false, printCount:1,
  },
  {
    id:'drop', name:'Momento Drop', price:25,
    desc:'1 design printed 10 times — perfect for handing out',
    includes:['10 copies of your design','4×6 photo print × 10','QR memory clip optional (+$5)','Ships in 4–5 days'],
    popular:false, hasSticker:false, hasButton:false,
    hasQR:false, isMulti:false, printCount:10,
  },
  {
    id:'vault', name:'Momento Vault', price:45,
    desc:'10 individual photos, each printed as a separate 4×6',
    includes:['10 unique 4×6 photo prints','Design each print individually','1 QR memory clip on all 10 prints','Ships in 4–5 days'],
    popular:false, hasSticker:false, hasButton:false,
    hasQR:true, isMulti:true, printCount:10,
  },
];

const BUTTON_SIZES = [
  { id:'56mm_circle',   label:'56mm Circle',         hasQR:true  },
  { id:'50mm_square',   label:'50mm Square',          hasQR:true  },
  { id:'32mm_circle',   label:'32mm Circle',          hasQR:false },
  { id:'56mm_magnet',   label:'56mm Magnet',          hasQR:true  },
  { id:'32mm_magnet',   label:'32mm Magnet',          hasQR:false },
  { id:'keychain_oval', label:'Keychain (40mm oval)', hasQR:true  },
  { id:'keychain_rect', label:'Keychain (35x45mm)',   hasQR:true  },
];

const ADDONS = [
  { id:'qr_video',        name:'QR Video Memory Upgrade',   price:10 },
  { id:'card_jacket',     name:'Black Card Jacket',          price:5  },
  { id:'metallic_marker', name:'Metallic Marker',            price:4  },
  { id:'oil_marker',      name:'Oil-Based Marker',           price:4  },
  { id:'extra_print',     name:'Extra Photo Print',          price:10 },
  { id:'extra_sticker',   name:'Extra Sticker Sheet',        price:12 },
  { id:'holo_upgrade',    name:'Holographic Button Upgrade', price:2  },
];

const HOLO_STYLES = [
  { id:'HOLO-RAINBOW-MULTI',  name:'Rainbow Multi',    emoji:'🌈' },
  { id:'HOLO-RAINBOW-SILVER', name:'Rainbow Silver',   emoji:'✨' },
  { id:'HOLO-STAR-SMALL-1',   name:'Small Star 1',     emoji:'⭐' },
  { id:'HOLO-STAR-SMALL-2',   name:'Small Star 2',     emoji:'🌟' },
  { id:'HOLO-STAR-LARGE',     name:'Large Star',       emoji:'💫' },
  { id:'HOLO-HEARTS',         name:'Hearts',           emoji:'❤️' },
  { id:'HOLO-GLITTER',        name:'All Over Glitter', emoji:'💎' },
  { id:'HOLO-PRISMATIC',      name:'Prismatic',        emoji:'🔮' },
];

const ADDON_PRICES: Record<string,number> = {
  qr_video:10, card_jacket:5, metallic_marker:4,
  oil_marker:4, extra_print:10, extra_sticker:12, holo_upgrade:2,
};

const BUNDLE_EMOJI: Record<string,string> = {
  essential:'🖼️', classic:'🎨', bundle:'🎁',
  signature:'✨', drop:'📋', vault:'🎞️',
};

type Step = 'bundle'|'creator'|'media'|'design'|'vault_design'|'drop_qr'|'sticker'|'button'|'fulfillment'|'review'|'details';

export default function GradEventPage() {
  const { state: cartState, addItem, removeItem, clearCart, cartTotal, cartCount } = useCart();

  const [step,            setStep]            = useState<Step>('bundle');
  const [bundle,          setBundle]          = useState<string|null>(null);
  const [addons,          setAddons]          = useState<string[]>([]);
  const [mediaFile,       setMediaFile]       = useState<File|null>(null);
  const [mediaType,       setMediaType]       = useState<'video'|'audio'|null>(null);
  const [mediaUrl,        setMediaUrl]        = useState<string|null>(null);
  const [editorState,     setEditorState]     = useState<any>(null);
  const [stickerData,     setStickerData]     = useState<any>(null);
  const [buttonSize,      setButtonSize]      = useState<string|null>(null);
  const [buttonDesign,    setButtonDesign]    = useState<any>(null);
  const [showButtonStudio,setShowButtonStudio]= useState(false);
  const [dropQR,          setDropQR]          = useState(false);
  const [vaultPrints,     setVaultPrints]     = useState<any[]>(Array.from({length:10},()=>null));
  const [vaultPrintIndex, setVaultPrintIndex] = useState(0);
  const [holoStyle,       setHoloStyle]       = useState<string|null>(null);
  const [holoStyleName,   setHoloStyleName]   = useState<string>('');
  const [fulfillment,     setFulfillment]     = useState<'ship'|'pickup'>('ship');
  const [boothActive,     setBoothActive]     = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<any>(null);
  const [refParam,        setRefParam]        = useState('');
  const [showCart,        setShowCart]        = useState(false);
  const [form,            setForm]            = useState({
    name:'', email:'', phone:'',
    address:'', city:'', state:'', zip:'',
  });

  const selectedBundle = BUNDLES.find(b => b.id === bundle);
  const addonTotal     = addons.reduce((sum,id) => sum + (ADDON_PRICES[id]||0), 0);
  const itemTotal      = (selectedBundle?.price||0) + addonTotal + (dropQR?5:0);

  // Steps for current bundle
  const getSteps = (b: typeof selectedBundle): Step[] => {
    if (!b) return ['bundle'];
    return [
      'bundle',
      'creator',
      ...(b.hasQR || b.id==='vault' ? ['media' as Step] : []),
      ...(b.id==='drop'  ? ['design' as Step, 'drop_qr' as Step] : []),
      ...(b.id==='vault' ? ['vault_design' as Step] : []),
      ...(b.id!=='drop' && b.id!=='vault' ? ['design' as Step] : []),
      ...(b.hasSticker ? ['sticker' as Step] : []),
      ...(b.hasButton  ? ['button'  as Step] : []),
      'fulfillment',
      'review',
    ];
  };

  const STEPS = getSteps(selectedBundle);
  const stepIndex = STEPS.indexOf(step);

  const STEP_LABELS: Record<Step,string> = {
    bundle:'Bundle', creator:'Supporting', media:'Memory', design:'Design',
    vault_design:'10 Prints', drop_qr:'QR', sticker:'Sticker', button:'Button',
    fulfillment:'Delivery', review:'Review', details:'Details',
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref    = params.get('ref');
    if (ref) setRefParam(ref);
    fetch('/api/event/booth-check?slug=grad-2026')
      .then(r=>r.json())
      .then(d=>setBoothActive(d.booth_active||false))
      .catch(()=>{});
  }, []);

  function toggleAddon(id:string) {
    setAddons(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev,id]);
  }

  function setField(k:string, v:string) {
    setForm(f=>({...f,[k]:v}));
  }

  function nextStep(current:Step) {
    const idx = STEPS.indexOf(current);
    if (idx < STEPS.length-1) setStep(STEPS[idx+1]);
  }

  function prevStep(current:Step) {
    const idx = STEPS.indexOf(current);
    if (idx > 0) setStep(STEPS[idx-1]);
  }

  function addToCart() {
    const b = selectedBundle;
    if (!b) return;

    const item: CartItem = {
      cartId:        generateCartId(),
      bundleId:      b.id,
      bundleName:    b.name,
      bundlePrice:   b.price,
      creatorHandle: selectedCreator?.handle      || null,
      creatorName:   selectedCreator?.display_name || null,
      schoolName:    selectedCreator?.school_name  || null,
      addons,
      addonTotal,
      editorState,
      stickerData,
      buttonSize,
      buttonDesign,
      holoStyle,
      holoStyleName,
      dropQR,
      vaultPrints:   vaultPrints.filter(Boolean),
      mediaFile:     null,
      mediaType,
      mediaUrl:      null,
      fulfillment,
      printCount:    b.printCount,
      isMulti:       b.isMulti,
    };

    console.log('[cart] addToCart:', item.bundleId, item.bundlePrice);
    addItem(item);

    // Reset for next item
    setBundle(null);
    setAddons([]);
    setMediaFile(null);
    setMediaType(null);
    setMediaUrl(null);
    setEditorState(null);
    setStickerData(null);
    setButtonSize(null);
    setButtonDesign(null);
    setShowButtonStudio(false);
    setDropQR(false);
    setVaultPrints(Array.from({length:10},()=>null));
    setVaultPrintIndex(0);
    setHoloStyle(null);
    setHoloStyleName('');
    setSelectedCreator(null);
    setStep('bundle');
    setShowCart(true);
  }

  async function handleCheckout() {
    setLoading(true);
    try {
      console.log('[checkout] items:', cartState.items.length, 'total:', cartTotal);
      const res = await fetch('/api/checkout/cart', {
        method:  'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          items:      cartState.items,
          form,
          event_slug: 'grad-2026',
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        setTimeout(() => clearCart(), 2000);
      }
    } catch(err) { console.error(err); }
    setLoading(false);
  }

  const inp = {
    width:'100%', padding:'10px 12px',
    background:'#1a1a1a', border:'1px solid #333',
    borderRadius:8, color:'#fff', fontSize:14, outline:'none',
  };

  // Cart panel component
  const CartPanel = () => (
    <div style={{background:'#111', border:'1px solid #222',
                 borderRadius:12, padding:'16px', marginBottom:24}}>
      <div style={{display:'flex', justifyContent:'space-between',
                   alignItems:'center', marginBottom:12}}>
        <p style={{fontWeight:600, fontSize:15, margin:0}}>
          Your cart ({cartCount} item{cartCount!==1?'s':''})
        </p>
        <button onClick={()=>setShowCart(false)} style={{
          background:'transparent', border:'none',
          color:'#666', fontSize:18, cursor:'pointer',
        }}>✕</button>
      </div>

      {cartState.items.length===0 ? (
        <p style={{color:'#555', fontSize:13, textAlign:'center',
                   padding:'16px 0', margin:0}}>
          Your cart is empty — pick a bundle below.
        </p>
      ) : (
        <>
          {cartState.items.map(item => (
            <div key={item.cartId} style={{
              background:'#1a1a1a', borderRadius:10,
              padding:'12px', marginBottom:8, border:'1px solid #222',
            }}>
              <div style={{display:'flex', justifyContent:'space-between',
                           alignItems:'flex-start', gap:10}}>
                <div style={{flex:1}}>
                  <p style={{fontWeight:600, fontSize:13, margin:'0 0 3px'}}>
                    {BUNDLE_EMOJI[item.bundleId]} {item.bundleName}
                  </p>
                  {item.creatorName && (
                    <p style={{fontSize:11, color:'#4ADE80', margin:'0 0 2px'}}>
                      Supporting {item.creatorName}
                    </p>
                  )}
                  <p style={{fontSize:11, color:'#666', margin:'0 0 2px'}}>
                    {item.fulfillment==='pickup'?'🎪 Booth pickup':'📦 Ship to door'}
                  </p>
                  {item.addons.length>0 && (
                    <p style={{fontSize:10, color:'#555', margin:0}}>
                      + {item.addons.map(id=>ADDONS.find(a=>a.id===id)?.name).filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
                <div style={{textAlign:'right', flexShrink:0}}>
                  <p style={{fontSize:14, fontWeight:700, color:'#4ADE80', margin:'0 0 6px'}}>
                    ${item.bundlePrice + (item.addons.reduce((s,id)=>s+(ADDON_PRICES[id]||0),0)) + (item.dropQR?5:0)}
                  </p>
                  <button onClick={()=>removeItem(item.cartId)} style={{
                    padding:'3px 8px', background:'transparent',
                    border:'1px solid #A32D2D', borderRadius:6,
                    color:'#ff6b6b', fontSize:10, cursor:'pointer',
                  }}>Remove</button>
                </div>
              </div>
            </div>
          ))}

          <div style={{borderTop:'1px solid #222', paddingTop:12, marginTop:4}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:12}}>
              <span style={{fontSize:14, fontWeight:600}}>Cart total</span>
              <span style={{fontSize:16, fontWeight:700, color:'#4ADE80'}}>${cartTotal}</span>
            </div>
            <div style={{display:'flex', flexDirection:'column', gap:8}}>
              <button onClick={()=>setShowCart(false)} style={{
                width:'100%', padding:'10px',
                background:'transparent', border:'1px solid #333',
                borderRadius:8, color:'#888', fontSize:13, cursor:'pointer',
              }}>+ Add another bundle</button>
              <button onClick={()=>{ setShowCart(false); setStep('details'); }} style={{
                width:'100%', padding:'12px',
                background:'#4ADE80', color:'#000', border:'none',
                borderRadius:8, fontSize:14, fontWeight:700, cursor:'pointer',
              }}>
                Checkout — ${cartTotal} →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <main style={{
      minHeight:'100vh', background:'#0a0a0a', color:'#fff',
      fontFamily:'-apple-system, BlinkMacSystemFont, sans-serif',
      padding:'24px 16px 48px',
    }}>
      <div style={{maxWidth:640, margin:'0 auto'}}>

        {/* Header */}
        <div style={{display:'flex', justifyContent:'space-between',
                     alignItems:'flex-start', marginBottom:24}}>
          <div>
            <p style={{fontSize:11, color:'#555', letterSpacing:4,
                       textTransform:'uppercase', margin:'0 0 4px'}}>Un Momento</p>
            <h1 style={{fontSize:22, fontWeight:500, margin:'0 0 2px'}}>
              Graduation Season 2026
            </h1>
            <p style={{fontSize:13, color:'#888', margin:0}}>
              Order online · ships anywhere in the US
            </p>
          </div>
          <button onClick={()=>setShowCart(!showCart)} style={{
            position:'relative', padding:'8px 14px',
            background: cartCount>0 ? '#0d1f0d' : '#1a1a1a',
            border: `1px solid ${cartCount>0?'#4ADE80':'#333'}`,
            borderRadius:10, color: cartCount>0?'#4ADE80':'#888',
            fontSize:13, cursor:'pointer', flexShrink:0,
            display:'flex', alignItems:'center', gap:6,
          }}>
            🛒 Cart
            {cartCount>0 && (
              <span style={{
                background:'#4ADE80', color:'#000', borderRadius:'50%',
                width:18, height:18, display:'flex', alignItems:'center',
                justifyContent:'center', fontSize:10, fontWeight:700,
              }}>{cartCount}</span>
            )}
          </button>
        </div>

        {/* Cart panel */}
        {showCart && <CartPanel />}

        {/* Progress — show during customization steps */}
        {step !== 'bundle' && step !== 'details' && (
          <div style={{display:'flex', gap:4, marginBottom:24}}>
            {STEPS.map((s,i) => (
              <div key={s} style={{flex:1, textAlign:'center'}}>
                <div style={{height:4, borderRadius:2, marginBottom:4,
                  background: i<stepIndex?'#4ADE80':i===stepIndex?'#fff':'#333'}}/>
                <span style={{fontSize:9, color:i===stepIndex?'#fff':'#444'}}>
                  {STEP_LABELS[s]}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── BUNDLE ── */}
        {step==='bundle' && !showCart && (
          <div>
            {cartCount>0 && (
              <div style={{
                background:'#0d1f0d', border:'1px solid #1a3a1a',
                borderRadius:10, padding:'10px 14px', marginBottom:16,
                display:'flex', justifyContent:'space-between', alignItems:'center',
              }}>
                <p style={{fontSize:13, color:'#4ADE80', margin:0}}>
                  ✓ {cartCount} item{cartCount!==1?'s':''} in cart · ${cartTotal}
                </p>
                <button onClick={()=>setShowCart(true)} style={{
                  padding:'4px 10px', background:'transparent',
                  border:'1px solid #4ADE80', borderRadius:6,
                  color:'#4ADE80', fontSize:11, cursor:'pointer',
                }}>View cart</button>
              </div>
            )}

            <p style={{fontSize:13, color:'#888', margin:'0 0 12px'}}>
              {cartCount>0 ? 'Add another bundle:' : 'Choose your bundle:'}
            </p>

            {BUNDLES.map(b => (
              <div key={b.id} onClick={()=>setBundle(b.id)} style={{
                border: bundle===b.id?'2px solid #4ADE80':'1px solid #222',
                borderRadius:12, padding:'1rem', marginBottom:10,
                cursor:'pointer', background:bundle===b.id?'#0d1f0d':'#111',
                position:'relative',
              }}>
                {b.popular && (
                  <span style={{position:'absolute', top:-10, left:12,
                                background:'#4ADE80', color:'#000',
                                fontSize:10, fontWeight:700,
                                padding:'2px 8px', borderRadius:10}}>
                    MOST POPULAR
                  </span>
                )}
                <div style={{display:'flex', justifyContent:'space-between',
                             alignItems:'flex-start'}}>
                  <div>
                    <p style={{fontWeight:600, fontSize:15, margin:'0 0 4px'}}>
                      {BUNDLE_EMOJI[b.id]} {b.name}
                    </p>
                    <p style={{fontSize:13, color:'#888', margin:'0 0 8px'}}>{b.desc}</p>
                    <ul style={{paddingLeft:16, margin:0}}>
                      {b.includes.map(item=>(
                        <li key={item} style={{fontSize:12, color:'#666', marginBottom:2}}>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p style={{fontSize:22, fontWeight:700, margin:0,
                             flexShrink:0, marginLeft:16}}>${b.price}</p>
                </div>
              </div>
            ))}

            {bundle && (
              <div style={{marginTop:16}}>
                <p style={{fontSize:13, color:'#888', marginBottom:10}}>Add-ons (optional)</p>
                <div style={{display:'flex', flexWrap:'wrap', gap:8}}>
                  {ADDONS.map(a=>(
                    <button key={a.id} onClick={()=>toggleAddon(a.id)} style={{
                      padding:'6px 12px', borderRadius:20,
                      border: addons.includes(a.id)?'1px solid #4ADE80':'1px solid #333',
                      background: addons.includes(a.id)?'#0d1f0d':'transparent',
                      color: addons.includes(a.id)?'#4ADE80':'#888',
                      fontSize:12, cursor:'pointer',
                    }}>{a.name} +${a.price}</button>
                  ))}
                </div>
              </div>
            )}

            {bundle && (
              <button onClick={()=>nextStep('bundle')} style={{
                width:'100%', marginTop:16, padding:14,
                background:'#4ADE80', color:'#000', border:'none',
                borderRadius:10, fontSize:15, fontWeight:700, cursor:'pointer',
              }}>Customize this bundle →</button>
            )}

            {cartCount>0 && !bundle && (
              <button onClick={()=>{ setShowCart(false); setStep('details'); }} style={{
                width:'100%', marginTop:16, padding:14,
                background:'#fff', color:'#000', border:'none',
                borderRadius:10, fontSize:15, fontWeight:700, cursor:'pointer',
              }}>Checkout — ${cartTotal} →</button>
            )}
          </div>
        )}

        {/* ── CREATOR ── */}
        {step==='creator' && (
          <div>
            <CreatorSearch
              prefilledRef={refParam}
              onSelect={(creator)=>{ setSelectedCreator(creator); nextStep('creator'); }}
              onSkip={()=>{ setSelectedCreator(null); nextStep('creator'); }}
            />
            <button onClick={()=>prevStep('creator')} style={{
              width:'100%', marginTop:8, padding:10,
              border:'1px solid #333', borderRadius:10,
              background:'transparent', color:'#666',
              fontSize:13, cursor:'pointer',
            }}>Back</button>
          </div>
        )}

        {/* ── MEDIA ── */}
        {step==='media' && (
          <div>
            <MemoryRecorder
             onComplete={async (file, type) => {
              setMediaFile(file);
              setMediaType(type);
              try {
                // Step 1: get presigned upload URL
                const { uploadUrl, key } = await fetch('/api/upload-url', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ contentType: file.type || 'video/mp4', folder: 'media' }),
                }).then(r => r.json());

                // Step 2: upload directly to R2 (no Vercel size limit)
                await fetch(uploadUrl, {
                  method: 'PUT',
                  headers: { 'Content-Type': file.type || 'video/mp4' },
                  body: file,
                });

                if (key) setMediaUrl(key);
              } catch (e) {
                console.error('Media upload failed', e);
              }
              nextStep('media');
            }}
            />
            <button onClick={()=>prevStep('media')} style={{
              marginTop:8, width:'100%', padding:10,
              border:'1px solid #333', borderRadius:10,
              background:'transparent', color:'#666',
              fontSize:13, cursor:'pointer',
            }}>Back</button>
          </div>
        )}

        {/* ── DESIGN ── */}
        {step==='design' && (
          <div>
            <p style={{fontSize:13, color:'#888', margin:'0 0 16px', lineHeight:1.6}}>
              Design your 4×6 photo print. Any photo, any memory.
            </p>
            <CollageEditor
              mediaUrl={mediaUrl}
              defaultGradName={selectedCreator?.display_name || ''}
              defaultSchool={selectedCreator?.school_name || ''}
              onComplete={(dataUrl,slots)=>{ setEditorState({dataUrl,slots}); nextStep('design'); }}
              onBack={()=>prevStep('design')}
            />
          </div>
        )}

        {/* ── STICKER ── */}
        {step==='sticker' && (
          <div>
            <p style={{fontSize:13, color:'#888', margin:'0 0 16px', lineHeight:1.6}}>
              Design your die-cut sticker sheet.
            </p>
            <StickerStudio
              onComplete={(dataUrl,layout,shape)=>{ setStickerData({dataUrl,layout,shape}); nextStep('sticker'); }}
              onBack={()=>prevStep('sticker')}
            />
          </div>
        )}

        {/* ── BUTTON ── */}
        {step==='button' && (
          <div>
            {showButtonStudio && buttonSize ? (
              <ButtonStudio
                productId={buttonSize}
                onComplete={(dataUrl,pid)=>{
                  setButtonDesign({dataUrl, productId:pid});
                  setShowButtonStudio(false);
                  nextStep('button');
                }}
                onBack={()=>setShowButtonStudio(false)}
              />
            ) : buttonDesign ? (
              <div>
                <div style={{background:'#0d1f0d', border:'1px solid #4ADE80',
                             borderRadius:12, padding:'16px',
                             textAlign:'center', marginBottom:16}}>
                  <p style={{color:'#4ADE80', fontWeight:600, fontSize:15, margin:'0 0 8px'}}>
                    Button design ready
                  </p>
                  <img src={buttonDesign.dataUrl} alt="button"
                    style={{width:100, height:100, borderRadius:'50%',
                            objectFit:'cover', border:'2px solid #4ADE80',
                            display:'inline-block'}}/>
                  <p style={{fontSize:12, color:'#888', margin:'8px 0 0'}}>
                    {BUTTON_SIZES.find(s=>s.id===buttonSize)?.label}
                  </p>
                </div>

                {addons.includes('holo_upgrade') && (
                  <div style={{marginBottom:16}}>
                    <p style={{fontSize:13,fontWeight:500,margin:'0 0 8px',color:'#fff'}}>
                      ✨ Choose your holographic style
                    </p>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:6}}>
                      {HOLO_STYLES.map(s=>(
                        <div key={s.id}
                          onClick={()=>{setHoloStyle(s.id);setHoloStyleName(s.name);}}
                          style={{
                            padding:'10px 12px',borderRadius:8,cursor:'pointer',
                            border:holoStyle===s.id?'2px solid #4ADE80':'1px solid #333',
                            background:holoStyle===s.id?'#0d1f0d':'#111',
                            display:'flex',alignItems:'center',gap:8,
                          }}>
                          <span style={{fontSize:20}}>{s.emoji}</span>
                          <span style={{fontSize:12,color:holoStyle===s.id?'#4ADE80':'#888',
                                        fontWeight:holoStyle===s.id?600:400}}>
                            {s.name}
                          </span>
                          {holoStyle===s.id&&<span style={{marginLeft:'auto',color:'#4ADE80'}}>✓</span>}
                        </div>
                      ))}
                      <div onClick={()=>{setHoloStyle('default');setHoloStyleName('Surprise me');}}
                        style={{
                          padding:'10px 12px',borderRadius:8,cursor:'pointer',
                          border:holoStyle==='default'?'2px solid #4ADE80':'1px dashed #333',
                          background:holoStyle==='default'?'#0d1f0d':'transparent',
                          display:'flex',alignItems:'center',gap:8,gridColumn:'1/-1',
                        }}>
                        <span style={{fontSize:20}}>🎲</span>
                        <span style={{fontSize:12,color:holoStyle==='default'?'#4ADE80':'#666'}}>
                          Surprise me — highest stock style
                        </span>
                        {holoStyle==='default'&&<span style={{marginLeft:'auto',color:'#4ADE80'}}>✓</span>}
                      </div>
                    </div>
                  </div>
                )}

                <div style={{display:'flex', gap:8}}>
                  <button onClick={()=>{ setButtonDesign(null); setShowButtonStudio(true); }}
                    style={{flex:1, padding:12, border:'1px solid #333',
                            borderRadius:10, background:'transparent',
                            color:'#fff', fontSize:14, cursor:'pointer'}}>
                    Redesign
                  </button>
                  <button onClick={()=>{
                    if(addons.includes('holo_upgrade')&&!holoStyle){
                      setHoloStyle('default'); setHoloStyleName('Surprise me');
                    }
                    nextStep('button');
                  }} style={{flex:2, padding:12, background:'#4ADE80',
                              color:'#000', border:'none', borderRadius:10,
                              fontSize:14, fontWeight:700, cursor:'pointer'}}>
                    Continue
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{fontSize:14, fontWeight:500, margin:'0 0 16px'}}>
                  Choose your button, magnet, or keychain size
                </p>
                {BUTTON_SIZES.map(s=>(
                  <div key={s.id} onClick={()=>setButtonSize(s.id)} style={{
                    border: buttonSize===s.id?'2px solid #4ADE80':'1px solid #222',
                    borderRadius:12, padding:'14px 16px', marginBottom:8,
                    cursor:'pointer', background:buttonSize===s.id?'#0d1f0d':'#111',
                  }}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <div>
                        <p style={{fontWeight:600, fontSize:14, margin:'0 0 3px'}}>{s.label}</p>
                        <p style={{fontSize:12, color:'#888', margin:0}}>
                          {s.hasQR?'QR memory code on back':'Too small for QR code'}
                        </p>
                      </div>
                      {buttonSize===s.id&&<span style={{color:'#4ADE80', fontSize:18}}>✓</span>}
                    </div>
                  </div>
                ))}
                <div style={{display:'flex', gap:8, marginTop:16}}>
                  <button onClick={()=>prevStep('button')}
                    style={{flex:1, padding:12, border:'1px solid #333',
                            borderRadius:10, background:'transparent',
                            color:'#fff', fontSize:14, cursor:'pointer'}}>Back</button>
                  <button onClick={()=>{ if(buttonSize) setShowButtonStudio(true); }}
                    disabled={!buttonSize}
                    style={{flex:2, padding:12,
                            background:buttonSize?'#4ADE80':'#333',
                            color:buttonSize?'#000':'#888', border:'none',
                            borderRadius:10, fontSize:14, fontWeight:700,
                            cursor:buttonSize?'pointer':'not-allowed'}}>
                    Design my {BUTTON_SIZES.find(s=>s.id===buttonSize)?.label||'button'} →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── DROP QR ── */}
        {step==='drop_qr' && (
          <div>
            <div style={{textAlign:'center',marginBottom:24}}>
              <p style={{fontSize:11,color:'#4ADE80',letterSpacing:4,
                         textTransform:'uppercase',margin:'0 0 8px'}}>Optional</p>
              <h2 style={{fontSize:20,fontWeight:500,margin:'0 0 8px'}}>
                Add a QR memory clip?
              </h2>
              <p style={{fontSize:13,color:'#888',lineHeight:1.6,margin:0}}>
                Scannable QR code on all 10 prints. Links to your video or voice message. Forever.
              </p>
            </div>
            <div onClick={()=>setDropQR(true)} style={{
              border: dropQR?'2px solid #4ADE80':'1px solid #222',
              borderRadius:12, padding:'16px', marginBottom:8,
              cursor:'pointer', background:dropQR?'#0d1f0d':'#111',
            }}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <p style={{fontWeight:600,fontSize:14,margin:'0 0 4px'}}>
                    ✓ Yes — add QR memory clip
                  </p>
                  <p style={{fontSize:12,color:'#888',margin:0}}>+$5</p>
                </div>
                <p style={{fontSize:18,fontWeight:700,color:'#4ADE80',margin:0}}>+$5</p>
              </div>
            </div>
            <div onClick={()=>setDropQR(false)} style={{
              border: !dropQR?'2px solid #4ADE80':'1px solid #222',
              borderRadius:12, padding:'16px', marginBottom:24,
              cursor:'pointer', background:!dropQR?'#0d1f0d':'#111',
            }}>
              <p style={{fontWeight:600,fontSize:14,margin:'0 0 4px'}}>No thanks — prints only</p>
              <p style={{fontSize:12,color:'#888',margin:0}}>Just the 10 prints</p>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>prevStep('drop_qr')}
                style={{flex:1,padding:12,border:'1px solid #333',borderRadius:10,
                        background:'transparent',color:'#fff',fontSize:14,cursor:'pointer'}}>
                Back
              </button>
              <button onClick={()=>nextStep('drop_qr')}
                style={{flex:2,padding:12,background:'#4ADE80',color:'#000',border:'none',
                        borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer'}}>
                Continue {dropQR?'— record message':'— prints only'} →
              </button>
            </div>
          </div>
        )}

        {/* ── VAULT DESIGN ── */}
        {step==='vault_design' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',
                         alignItems:'center',marginBottom:16}}>
              <div>
                <h2 style={{fontSize:18,fontWeight:500,margin:'0 0 4px'}}>
                  Design your 10 prints
                </h2>
                <p style={{fontSize:12,color:'#888',margin:0}}>
                  Print {vaultPrintIndex+1} of 10
                </p>
              </div>
              <div style={{display:'flex',gap:4}}>
                {Array.from({length:10},(_,i)=>(
                  <div key={i} onClick={()=>setVaultPrintIndex(i)} style={{
                    width:22,height:22,borderRadius:4,cursor:'pointer',
                    background:vaultPrints[i]?'#4ADE80':i===vaultPrintIndex?'#1a3a1a':'#1a1a1a',
                    border:i===vaultPrintIndex?'2px solid #4ADE80':'1px solid #333',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:9,color:vaultPrints[i]?'#000':i===vaultPrintIndex?'#4ADE80':'#555',
                  }}>{vaultPrints[i]?'✓':i+1}</div>
                ))}
              </div>
            </div>
            <CollageEditor
              mediaUrl={mediaUrl}
              key={vaultPrintIndex}
              defaultGradName={selectedCreator?.display_name||''}
              defaultSchool={selectedCreator?.school_name||''}
              onComplete={(dataUrl,slots)=>{
                const updated=[...vaultPrints];
                updated[vaultPrintIndex]={dataUrl,slots};
                setVaultPrints(updated);
                if(vaultPrintIndex<9) setVaultPrintIndex(vaultPrintIndex+1);
              }}
              onBack={()=>{
                if(vaultPrintIndex>0) setVaultPrintIndex(vaultPrintIndex-1);
                else prevStep('vault_design');
              }}
            />
            {vaultPrints.filter(Boolean).length===10&&(
              <button onClick={()=>nextStep('vault_design')} style={{
                width:'100%',marginTop:12,padding:14,
                background:'#4ADE80',color:'#000',border:'none',
                borderRadius:10,fontSize:15,fontWeight:700,cursor:'pointer',
              }}>All 10 prints designed — continue →</button>
            )}
            <p style={{fontSize:11,color:'#555',textAlign:'center',marginTop:8}}>
              {vaultPrints.filter(Boolean).length}/10 prints designed
            </p>
          </div>
        )}

        {/* ── FULFILLMENT ── */}
        {step==='fulfillment' && (
          <div>
            <p style={{fontSize:14, fontWeight:500, margin:'0 0 16px'}}>
              How would you like to receive this item?
            </p>
            <div onClick={()=>setFulfillment('ship')} style={{
              border: fulfillment==='ship'?'2px solid #4ADE80':'1px solid #222',
              borderRadius:12, padding:'1rem', marginBottom:10,
              cursor:'pointer', background:fulfillment==='ship'?'#0d1f0d':'#111',
            }}>
              <p style={{fontWeight:600, fontSize:15, margin:'0 0 4px'}}>📦 Ship to my door</p>
              <p style={{fontSize:13, color:'#888', margin:0}}>Ships in 4–5 business days.</p>
            </div>
            {boothActive && (
              <div onClick={()=>setFulfillment('pickup')} style={{
                border: fulfillment==='pickup'?'2px solid #4ADE80':'1px solid #222',
                borderRadius:12, padding:'1rem', marginBottom:10,
                cursor:'pointer', background:fulfillment==='pickup'?'#0d1f0d':'#111',
                position:'relative',
              }}>
                <span style={{position:'absolute', top:-10, left:12, background:'#4ADE80',
                              color:'#000', fontSize:10, fontWeight:700,
                              padding:'2px 8px', borderRadius:10}}>AVAILABLE TODAY</span>
                <p style={{fontWeight:600, fontSize:15, margin:'0 0 4px'}}>🎪 Pick up at the booth</p>
                <p style={{fontSize:13, color:'#888', margin:0}}>Print ready in under 2 minutes.</p>
              </div>
            )}
            <div style={{display:'flex', gap:8, marginTop:16}}>
              <button onClick={()=>prevStep('fulfillment')}
                style={{flex:1, padding:12, border:'1px solid #333', borderRadius:10,
                        background:'transparent', color:'#fff', fontSize:14, cursor:'pointer'}}>
                Back
              </button>
              <button onClick={()=>nextStep('fulfillment')}
                style={{flex:2, padding:12, background:'#4ADE80', color:'#000',
                        border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer'}}>
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ── REVIEW → ADD TO CART ── */}
        {step==='review' && selectedBundle && (
          <div>
            <p style={{fontSize:14, fontWeight:600, margin:'0 0 12px'}}>Review this item</p>
            <div style={{background:'#111', borderRadius:12, padding:'1rem', marginBottom:16}}>
              {[
                ['Bundle',      `${selectedBundle.name} — $${selectedBundle.price}`],
                ...addons.map(id=>{ const a=ADDONS.find(x=>x.id===id); return [a?.name||'', `+$${a?.price}`]; }),
                ...(dropQR?[['QR clip','+$5']]:[] as any),
                ['Supporting',  selectedCreator?selectedCreator.display_name:'General fund'],
                ['Memory clip', mediaFile?`${mediaType} recorded`:'Not recorded'],
                ['Photo design',
                  selectedBundle.id==='vault'
                    ?`${vaultPrints.filter(Boolean).length}/10 prints designed`
                    :selectedBundle.id==='drop'
                    ?`1 design × 10 copies${dropQR?' + QR':''}`
                    :editorState?'Designed':'Not designed'
                ],
                ['Sticker',     stickerData?'Designed':selectedBundle.hasSticker?'Not designed':'—'],
                ['Button',      buttonSize?BUTTON_SIZES.find(s=>s.id===buttonSize)?.label||'':'—'],
                ['Delivery',    fulfillment==='pickup'?'Booth pickup':'Ship to door'],
              ].map(([k,v])=>(
                <div key={String(k)} style={{display:'flex', justifyContent:'space-between',
                                     padding:'5px 0', borderBottom:'1px solid #222', fontSize:13}}>
                  <span style={{color:'#888'}}>{k}</span>
                  <span style={{color:'#fff', maxWidth:220, textAlign:'right'}}>{v}</span>
                </div>
              ))}
              <div style={{display:'flex', justifyContent:'space-between',
                           padding:'10px 0 0', fontSize:15, fontWeight:700}}>
                <span>Item total</span>
                <span style={{color:'#4ADE80'}}>${itemTotal}</span>
              </div>
            </div>

            <div style={{display:'flex', gap:8}}>
              <button onClick={()=>prevStep('review')}
                style={{flex:1, padding:12, border:'1px solid #333', borderRadius:10,
                        background:'transparent', color:'#fff', fontSize:14, cursor:'pointer'}}>
                Back
              </button>
              <button onClick={addToCart}
                style={{flex:2, padding:12, background:'#4ADE80', color:'#000',
                        border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer'}}>
                Add to cart →
              </button>
            </div>
          </div>
        )}

        {/* ── DETAILS ── */}
        {step==='details' && (
          <div style={{display:'flex', flexDirection:'column', gap:12}}>
            <div style={{background:'#0d1f0d', border:'1px solid #1a3a1a',
                         borderRadius:10, padding:'10px 14px'}}>
              <p style={{fontSize:13, color:'#4ADE80', margin:0, fontWeight:600}}>
                {cartCount} item{cartCount!==1?'s':''} · ${cartTotal} total
              </p>
              {cartState.items.some(i=>i.creatorName) && (
                <p style={{fontSize:11, color:'#888', margin:'3px 0 0'}}>
                  Supporting: {[...new Set(cartState.items.filter(i=>i.creatorName).map(i=>i.creatorName))].join(', ')}
                </p>
              )}
            </div>

            <p style={{fontWeight:500, fontSize:14, margin:'0 0 4px'}}>Your information</p>
            <input style={inp} placeholder="Full name *"
              value={form.name} onChange={e=>setField('name',e.target.value)}/>
            <input style={inp} placeholder="Email address *" type="email"
              value={form.email} onChange={e=>setField('email',e.target.value)}/>
            <input style={inp} placeholder="Phone number"
              value={form.phone} onChange={e=>setField('phone',e.target.value)}/>

            {cartState.items.some(i=>i.fulfillment==='ship') && (
              <>
                <p style={{fontWeight:500, fontSize:14, margin:'4px 0'}}>Shipping address</p>
                <input style={inp} placeholder="Street address *"
                  value={form.address} onChange={e=>setField('address',e.target.value)}/>
                <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:8}}>
                  <input style={inp} placeholder="City *"
                    value={form.city} onChange={e=>setField('city',e.target.value)}/>
                  <input style={inp} placeholder="State *"
                    value={form.state} onChange={e=>setField('state',e.target.value)}/>
                </div>
                <input style={inp} placeholder="ZIP code *"
                  value={form.zip} onChange={e=>setField('zip',e.target.value)}/>
              </>
            )}

            <div style={{display:'flex', gap:8}}>
              <button onClick={()=>{ setStep('bundle'); setShowCart(true); }}
                style={{flex:1, padding:12, border:'1px solid #333', borderRadius:10,
                        background:'transparent', color:'#fff', fontSize:14, cursor:'pointer'}}>
                ← Cart
              </button>
              <button
                onClick={()=>{
                  const hasShip = cartState.items.some(i=>i.fulfillment==='ship');
                  const valid   = form.name && form.email &&
                    (!hasShip || (form.address && form.city && form.state && form.zip));
                  if(valid) handleCheckout();
                }}
                disabled={loading}
                style={{flex:2, padding:12,
                        background:loading?'#333':'#4ADE80',
                        color:loading?'#888':'#000', border:'none',
                        borderRadius:10, fontSize:14, fontWeight:700,
                        cursor:loading?'wait':'pointer'}}>
                {loading?'Opening checkout...':'Pay $'+cartTotal+' →'}
              </button>
            </div>
          </div>
        )}

        <p style={{textAlign:'center', fontSize:11, color:'#333', marginTop:24}}>
          2026 Un Momento · Ships anywhere in the US
        </p>
      </div>
    </main>
  );
}