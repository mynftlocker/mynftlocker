"use client";
import { memo, useState, useEffect } from 'react';
import { StatPanel, CardBack, RARITY_GLOW, RARITY_COLOR, RARITY_FILL } from './StatPanel';

// Carte galerie : flip 3D + halo cyan + trace (memes animations que le vestiaire)
const scaleGlow=(glowStr:string,scale:number)=>glowStr.replace(/(\d+(?:\.\d+)?)px/g,(_,n)=>(parseFloat(n)*scale).toFixed(1)+'px');
const glowScaleFor=(cols:number)=>cols<=3?1:cols===4?0.8:cols===5?0.65:cols===6?0.55:cols===7?0.48:0.42;
const GalleryCard=memo(({card,isFlipped,onFlip,glowScale}:any)=>{
  const [hover,setHover]=useState(false);
  const glowRaw=RARITY_GLOW[card.rarityTyped]||RARITY_GLOW.common;
  const glow=scaleGlow(glowRaw,glowScale??1);
  const fill=RARITY_FILL[card.rarityTyped]||RARITY_FILL.common;
  const rc=RARITY_COLOR[card.rarityTyped]||'#9ca3af';
  return(
    <div style={{perspective:'900px',cursor:'pointer',width:'100%',position:'relative'}} onClick={()=>onFlip(card.slug)} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}>
      <div style={{position:'relative',transformStyle:'preserve-3d',transition:'transform 0.4s cubic-bezier(0.2,0.8,0.3,1),box-shadow 0.3s ease',transform:(isFlipped?'rotateY(180deg)':'rotateY(0deg)')+((hover&&!isFlipped)?' translateY(-10px) scale(1.03)':''),boxShadow:isFlipped?'0 0 12px 3px rgba(64,232,255,0.45),0 0 24px 6px rgba(64,232,255,0.2)':((hover&&!isFlipped)?glow+', 0 22px 40px -8px rgba(0,0,0,0.7)':glow),borderRadius:'0.5rem',background:fill,...({['--rc']:rc,animation:isFlipped?'mnflCyanPulse 2.2s ease-in-out infinite':undefined} as any)}}>
        <div style={{backfaceVisibility:'hidden',WebkitBackfaceVisibility:'hidden',borderRadius:'0.5rem',overflow:'hidden'}}>
          <img src={card.pictureUrl} alt={card.name} loading='lazy' style={{width:'100%',height:'auto',display:'block'}} onError={(e:any)=>{e.target.style.display='none';}}/>
        </div>
        <CardBack card={card} rc={rc}/>
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
    const w=window.innerWidth;
    setGalleryCols(w<480?2:w<768?3:w<1100?4:5);
  },[]);
  const changeCols=(delta:number)=>{setGalleryCols(c=>{const next=Math.min(8,Math.max(1,c+delta));localStorage.setItem('mnfl_gallery_cols',String(next));return next;});};
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
        <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:'0.5rem',marginBottom:'0.8rem'}}>
          <span style={{fontSize:'0.7rem',color:'rgba(207,216,230,0.6)',letterSpacing:'0.05em',textTransform:'uppercase' as const}}>Taille</span>
          <button onClick={()=>changeCols(-1)} disabled={galleryCols<=1} style={{width:'26px',height:'26px',borderRadius:'0.3rem',background:'rgba(64,232,255,0.1)',border:'1px solid rgba(64,232,255,0.4)',color:'#40e8ff',cursor:galleryCols<=1?'not-allowed':'pointer',opacity:galleryCols<=1?0.4:1,fontSize:'1rem',lineHeight:1}}>−</button>
          <span style={{fontSize:'0.75rem',color:'#eaf2ff',minWidth:'14px',textAlign:'center' as const}}>{galleryCols}</span>
          <button onClick={()=>changeCols(1)} disabled={galleryCols>=8} style={{width:'26px',height:'26px',borderRadius:'0.3rem',background:'rgba(64,232,255,0.1)',border:'1px solid rgba(64,232,255,0.4)',color:'#40e8ff',cursor:galleryCols>=8?'not-allowed':'pointer',opacity:galleryCols>=8?0.4:1,fontSize:'1rem',lineHeight:1}}>+</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat('+galleryCols+',1fr)',gap:'1.4rem'}}>
          {cards.map(c=>(<GalleryCard key={c.slug} card={c} isFlipped={activeSlug===c.slug} onFlip={handleFlip} glowScale={glowScaleFor(galleryCols)}/>))}
        </div>
        </>
      )}
      {activeCard&&(<div className='mnfl-gallery-stat-desktop'>{<StatPanel key={activeCard.slug} card={activeCard} isClosing={isClosing} onClose={startClose} placement='overlay'/>}</div>)}
      {activeCard&&(<div className='mnfl-gallery-stat-mobile'>{<StatPanel key={'m'+activeCard.slug} card={activeCard} isClosing={isClosing} onClose={startClose} placement='galleryMobile'/>}</div>)}
    </div>
  );
}
