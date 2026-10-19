"use client";
import { memo, useState, useEffect, useRef } from 'react';
import { StatPanel, CardBack, RARITY_GLOW, RARITY_COLOR, RARITY_FILL } from './StatPanel';

// Carte galerie : flip 3D + halo cyan + trace (memes animations que le vestiaire)
const scaleGlow=(glowStr:string,scale:number)=>glowStr.replace(/(\d+(?:\.\d+)?)px/g,(_,n)=>(parseFloat(n)*scale).toFixed(1)+'px');
const gapFor=(cols:number)=>cols<=3?'1.4rem':cols===4?'1rem':cols===5?'0.75rem':cols===6?'0.55rem':cols===7?'0.42rem':'0.32rem';
const glowScaleFor=(cols:number)=>cols<=3?1:cols===4?0.8:cols===5?0.65:cols===6?0.55:cols===7?0.48:0.42;
const GalleryCard=memo(({card,isFlipped,onFlip,glowScale}:any)=>{
  const [hover,setHover]=useState(false);
  const glowRaw=RARITY_GLOW[card.rarityTyped]||RARITY_GLOW.common;
  const glow=scaleGlow(glowRaw,glowScale??1);
  const fill=RARITY_FILL[card.rarityTyped]||RARITY_FILL.common;
  const rc=RARITY_COLOR[card.rarityTyped]||'#9ca3af';
  return(
    <div style={{perspective:'900px',cursor:'pointer',width:'100%',position:'relative',containerType:'inline-size'}} onClick={()=>onFlip(card.slug)} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}>
      <div style={{position:'relative',transformStyle:'preserve-3d',transition:'transform 0.4s cubic-bezier(0.2,0.8,0.3,1),box-shadow 0.3s ease',transform:(isFlipped?'rotateY(180deg)':'rotateY(0deg)')+((hover&&!isFlipped)?' translateY(-10px) scale(1.03)':''),boxShadow:isFlipped?'0 0 12px 3px rgba(64,232,255,0.45),0 0 24px 6px rgba(64,232,255,0.2)':((hover&&!isFlipped)?glow+', 0 22px 40px -8px rgba(0,0,0,0.7)':glow),borderRadius:'0.5rem',background:fill,...({['--rc']:rc,animation:isFlipped?'mnflCyanPulse 2.2s ease-in-out infinite':undefined} as any)}}>
        <div style={{position:'relative',backfaceVisibility:'hidden',WebkitBackfaceVisibility:'hidden',borderRadius:'0.5rem',overflow:'hidden'}}>
          <img src={card.pictureUrl} alt={card.name} loading='lazy' style={{width:'100%',height:'auto',display:'block'}} onError={(e:any)=>{e.target.style.display='none';}}/>
          {/* Reflet glossy (sheen) */}
          <div style={{position:'absolute',inset:0,zIndex:6,pointerEvents:'none',background:'linear-gradient(115deg,transparent 42%,rgba(255,255,255,0.14) 50%,transparent 58%)',opacity:hover?0.95:0.28,transition:'opacity 0.3s'}}/>
          {/* Cadre rarete (liseré interne + halo) */}
          <div style={{position:'absolute',inset:0,zIndex:7,pointerEvents:'none',borderRadius:'0.5rem',boxShadow:'inset 0 0 0 1.5px '+rc+'88, inset 0 0 16px -5px '+rc+'66'}}/>
          {/* Overlay scouting : L10 + etoiles */}
          <div style={{position:'absolute',left:0,right:0,bottom:0,zIndex:8,display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:'2cqw',padding:'16cqw 5cqw 4.5cqw',background:'linear-gradient(to top,rgba(2,5,11,0.92) 0%,rgba(2,5,11,0.45) 55%,transparent 100%)',pointerEvents:'none',opacity:hover?1:0.92,transition:'opacity 0.2s'}}>
            <div style={{display:'flex',alignItems:'baseline',gap:'1.5cqw',lineHeight:1}}>
              <span style={{fontSize:'15cqw',fontWeight:900,color:'#40e8ff',textShadow:'0 0 6px rgba(64,232,255,0.6)'}}>{card.averageScore!=null?card.averageScore:'—'}</span>
              <span style={{fontSize:'6.5cqw',fontWeight:800,color:'rgba(64,232,255,0.65)',letterSpacing:'0.06em'}}>L10</span>
            </div>
            {card.anyPlayer?.gameplayTierStars!=null&&(
              <span style={{display:'flex',alignItems:'center',gap:'1cqw',fontWeight:900,color:'#f5d76e',textShadow:'0 0 6px rgba(245,215,110,0.5)',lineHeight:1}}>
                <span style={{fontSize:'13cqw'}}>★</span><span style={{fontSize:'11cqw'}}>{Number(card.anyPlayer.gameplayTierStars)%1===0?Number(card.anyPlayer.gameplayTierStars):Number(card.anyPlayer.gameplayTierStars).toFixed(1)}</span>
              </span>
            )}
          </div>
        </div>
        <CardBack card={card} rc={rc} mobile={true}/>
      </div>
      {isFlipped&&(<svg style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',zIndex:22,pointerEvents:'none',overflow:'visible'}}><rect x='0' y='0' width='100%' height='100%' rx='8' pathLength='1000' fill='none' stroke='#40e8ff' strokeWidth='2.5' style={{filter:'drop-shadow(0 0 9px rgba(64,232,255,0.9))',strokeDasharray:'1000',strokeDashoffset:'1000',animation:'mnflCardTrace 1.4s ease-in-out 0.5s both'}}/></svg>)}
    </div>
  );
});
GalleryCard.displayName='GalleryCard';

export default function GalleryView({cards}:{cards:any[]}){
  const [activeSlug,setActiveSlug]=useState<string|null>(null);
  const [galleryCols,setGalleryCols]=useState(4);
  useEffect(()=>{
    const saved=localStorage.getItem('mnfl_gallery_cols');
    if(saved){setGalleryCols(Math.min(8,Math.max(1,parseInt(saved,10)||4)));return;}
    setGalleryCols(4);
  },[]);
  const changeCols=(delta:number)=>{setGalleryCols(c=>{const next=Math.min(8,Math.max(1,c+delta));localStorage.setItem('mnfl_gallery_cols',String(next));return next;});};
  const gridRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const el=gridRef.current; if(!el) return;
    let startDist=0, active=false;
    const dist=(t:TouchList)=>{const dx=t[0].clientX-t[1].clientX,dy=t[0].clientY-t[1].clientY;return Math.sqrt(dx*dx+dy*dy);};
    const onStart=(e:TouchEvent)=>{ if(e.touches.length===2){ startDist=dist(e.touches); active=true; } };
    const onMove=(e:TouchEvent)=>{
      if(e.touches.length===2 && active){
        e.preventDefault();
        const d=dist(e.touches); const delta=d-startDist; const THRESHOLD=55;
        if(Math.abs(delta)>THRESHOLD){
          changeCols(delta>0?-1:1); // ecarter les doigts = zoom avant = moins de colonnes ; pincer = plus de colonnes
          startDist=d;
        }
      }
    };
    const onEnd=()=>{active=false;};
    el.addEventListener('touchstart',onStart,{passive:true});
    el.addEventListener('touchmove',onMove,{passive:false});
    el.addEventListener('touchend',onEnd,{passive:true});
    return ()=>{ el.removeEventListener('touchstart',onStart); el.removeEventListener('touchmove',onMove); el.removeEventListener('touchend',onEnd); };
  },[]);
  const [isClosing,setIsClosing]=useState(false);
  const startClose=()=>{setIsClosing(true);setTimeout(()=>{setActiveSlug(null);setIsClosing(false);},600);};
  const handleFlip=(slug:string)=>{if(slug===activeSlug){startClose();}else{setActiveSlug(slug);setIsClosing(false);}};
  const activeCard=activeSlug?(cards.find(c=>c.slug===activeSlug)||null):null;
  return(
    <div style={{padding:'1.2rem',minHeight:'100%',boxSizing:'border-box'}}>
      {cards.length===0?(
        <div style={{display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'center',height:'55vh',color:'rgba(64,232,255,0.28)',fontFamily:'Courier New,monospace',gap:'0.5rem'}}>
          <p style={{fontSize:'2rem',margin:0}}>⬡</p>
          <p style={{fontSize:'0.7rem',letterSpacing:'0.25em',textTransform:'uppercase',margin:0}}>Aucune carte</p>
        </div>
      ):(
        <>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'0.5rem',marginBottom:'0.8rem'}}>
          <span style={{fontSize:'0.7rem',color:'rgba(207,216,230,0.6)',letterSpacing:'0.05em',textTransform:'uppercase' as const}}>{cards.length} {cards.length>1?'joueurs':'joueur'}</span>
          <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
          <span style={{fontSize:'0.7rem',color:'rgba(207,216,230,0.6)',letterSpacing:'0.05em',textTransform:'uppercase' as const}}>Taille</span>
          <button onClick={()=>changeCols(-1)} disabled={galleryCols<=1} style={{width:'26px',height:'26px',borderRadius:'0.3rem',background:'rgba(64,232,255,0.1)',border:'1px solid rgba(64,232,255,0.4)',color:'#40e8ff',cursor:galleryCols<=1?'not-allowed':'pointer',opacity:galleryCols<=1?0.4:1,fontSize:'1rem',lineHeight:1}}>−</button>
          <span style={{fontSize:'0.75rem',color:'#eaf2ff',minWidth:'14px',textAlign:'center' as const}}>{galleryCols}</span>
          <button onClick={()=>changeCols(1)} disabled={galleryCols>=8} style={{width:'26px',height:'26px',borderRadius:'0.3rem',background:'rgba(64,232,255,0.1)',border:'1px solid rgba(64,232,255,0.4)',color:'#40e8ff',cursor:galleryCols>=8?'not-allowed':'pointer',opacity:galleryCols>=8?0.4:1,fontSize:'1rem',lineHeight:1}}>+</button>
          </div>
        </div>
        <div ref={gridRef} style={{display:'grid',gridTemplateColumns:'repeat('+galleryCols+',1fr)',gap:gapFor(galleryCols),touchAction:'pan-y'}}>
          {cards.map(c=>(<GalleryCard key={c.slug} card={c} isFlipped={activeSlug===c.slug} onFlip={handleFlip} glowScale={glowScaleFor(galleryCols)}/>))}
        </div>
        </>
      )}
      {activeCard&&(<div className='mnfl-gallery-stat-desktop'>{<StatPanel key={activeCard.slug} card={activeCard} isClosing={isClosing} onClose={startClose} placement='overlay'/>}</div>)}
      {activeCard&&(<div className='mnfl-gallery-stat-mobile'>{<StatPanel key={'m'+activeCard.slug} card={activeCard} isClosing={isClosing} onClose={startClose} placement='galleryMobile'/>}</div>)}
    </div>
  );
}
