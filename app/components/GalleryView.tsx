"use client";
import { memo, useState } from 'react';
import { StatPanel, CardBack, RARITY_GLOW, RARITY_COLOR, RARITY_FILL } from './StatPanel';

// Carte galerie : flip 3D + halo cyan + trace (memes animations que le vestiaire)
const GalleryCard=memo(({card,isFlipped,onFlip}:any)=>{
  const [hover,setHover]=useState(false);
  const glow=RARITY_GLOW[card.rarityTyped]||RARITY_GLOW.common;
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
  const [isClosing,setIsClosing]=useState(false);
  const startClose=()=>{setIsClosing(true);setTimeout(()=>{setActiveSlug(null);setIsClosing(false);},600);};
  const handleFlip=(slug:string)=>{if(slug===activeSlug){startClose();}else{setActiveSlug(slug);setIsClosing(false);}};
  const activeCard=activeSlug?(cards.find(c=>c.slug===activeSlug)||null):null;
  return(
    <div style={{padding:'1.2rem',minHeight:'100%',boxSizing:'border-box'}}>
      {cards.length===0?(
        <div style={{display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'center',height:'55vh',color:'rgba(64,232,255,0.28)',fontFamily:'Courier New,monospace',gap:'0.5rem'}}>
          <p style={{fontSize:'2rem',margin:0}}>\u2b21</p>
          <p style={{fontSize:'0.7rem',letterSpacing:'0.25em',textTransform:'uppercase',margin:0}}>Aucune carte</p>
        </div>
      ):(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:'1.4rem'}}>
          {cards.map(c=>(<GalleryCard key={c.slug} card={c} isFlipped={activeSlug===c.slug} onFlip={handleFlip}/>))}
        </div>
      )}
      {activeCard&&<StatPanel key={activeCard.slug} card={activeCard} isClosing={isClosing} onClose={startClose} placement='overlay'/>}
    </div>
  );
}
