'use client';
import { useState, memo } from 'react';
import { t as tr, useLang } from '../i18n';
import { RARITY_GLOW, RARITY_COLOR, RARITY_FILL, parseCard, nameFontSize, isNBA, isSpecialCard, specialLabel } from '../lib/cardUtils';
// Dos de carte + emplacement du vestiaire (extrait de page.tsx)
export const CardBack=memo(({ card }: { card: any }) => {
  const { season, serial } = parseCard(card.name);
  const rc = RARITY_COLOR[card.rarityTyped]||'#9ca3af';
  const lastName=(card.anyPlayer?.lastName||parseCard(card.name).lastName).toUpperCase();
  const shirtNumber=card.anyPlayer?.shirtNumber??null;
  return(
    <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,backfaceVisibility:'hidden',transform:'rotateY(180deg)',borderRadius:'0.4rem',overflow:'hidden',background:'radial-gradient(ellipse at center,#15151f,#07070d)',display:'flex',flexDirection:'column' as const,borderTop:'3px solid '+rc,borderBottom:'3px solid '+rc}}>
      <div style={{padding:'0.5rem',borderBottom:'1px solid rgba(255,255,255,0.06)',textAlign:'center'}}>
        <p style={{margin:0,fontSize:'0.75rem',color:rc,fontWeight:800,letterSpacing:'0.06em'}}>myNFTlocker</p>
        <p style={{margin:'2px 0 0',fontSize:'0.6rem',color:'#b8956a',fontWeight:600}}>{isNBA(card)?'NBA':'FOOTBALL'} • {card.seasonYear||season}</p>
      </div>
      <div style={{padding:'0.4rem',textAlign:'center'}}>
        <p style={{margin:0,fontSize:nameFontSize(lastName.length),fontWeight:900,color:'#fff',lineHeight:1.1,textShadow:'0 0 18px '+rc+'99'}}>{lastName}</p>
        {shirtNumber!==null&&<p style={{margin:'0.25rem 0 0',fontSize:'1.1rem',color:rc,fontWeight:900}}>#{shirtNumber}</p>}
        {serial&&<p style={{margin:'0.1rem 0 0',fontSize:'0.65rem',color:'#b8956a',fontWeight:600}}>{serial}</p>}
        {isSpecialCard(card)&&<p style={{margin:'0.15rem 0 0',fontSize:'0.55rem',color:rc,fontWeight:700,letterSpacing:'0.05em'}}>{specialLabel(card.specialEdition)}</p>}
      </div>
      <div style={{flex:1,display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'center'}}>
        <p style={{margin:0,fontSize:'1.5rem',fontWeight:800,color:'#fff'}}>{card.averageScore??'--'}</p>
        <p style={{margin:0,fontSize:'0.55rem',color:'#d4af37',letterSpacing:'0.2em',textTransform:'uppercase',fontWeight:700}}>L10</p>
      </div>
      <div style={{padding:'0.3rem',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'0.15rem'}}>
          {[['BEAT L10','--'],['BONUS',card.power?('+'+Math.round((parseFloat(card.power)-1)*100)+'%'):'--'],['GW','--'],['REW','--']].map(([l,v])=>(
            <div key={l} style={{textAlign:'center'}}>
              <p style={{margin:0,fontSize:'0.92rem',fontWeight:900,color:'#ffffff'}}>{v}</p>
              <p style={{margin:'1px 0 0',fontSize:'0.5rem',color:'#e8c456',letterSpacing:'0.06em',textTransform:'uppercase',fontWeight:800}}>{l}</p>
            </div>
          ))}
        </div>
      </div>
      <div style={{padding:'0.3rem 0.5rem 0.45rem',display:'flex',justifyContent:'center',gap:'0.4rem'}}>
        <span style={{padding:'0.15rem 0.5rem',borderRadius:'999px',border:'1px solid '+rc+'66',background:'#000a',fontSize:'0.55rem',fontWeight:800,color:rc}}>BONUS --</span>
        <span style={{padding:'0.15rem 0.5rem',borderRadius:'999px',border:'1px solid '+rc+'66',background:rc+'15',fontSize:'0.55rem',fontWeight:700,color:rc,textTransform:'uppercase'}}>{card.rarityTyped==='common'?'SET':card.rarityTyped.replace('_',' ')}</span>
      </div>
    </div>
  );
});
CardBack.displayName='CardBack';

export const LockerSlot=memo(({card,isFlipped,isStarred,isHof,onFlip,onStar}:any)=>{
  const [hover,setHover]=useState(false);
  const {lastName}=parseCard(card.name);
  const dn=(card.anyPlayer?.lastName||lastName).toUpperCase();
  const rc=RARITY_COLOR[card.rarityTyped]||'#9ca3af';
  const glow=RARITY_GLOW[card.rarityTyped]||RARITY_GLOW.common;
  const fill=RARITY_FILL[card.rarityTyped]||RARITY_FILL.common;
  const bonus=card.power?('+'+Math.round((parseFloat(card.power)-1)*100)+'%'):null;
  const score=card.averageScore!=null?String(card.averageScore):null;
  return(
    <div style={{display:'flex',flexDirection:'column' as const,borderRadius:'0.65rem',overflow:'hidden',background:'rgba(255,255,255,0.04)',backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',border:'1px solid '+rc+'30',boxShadow:(hover?glow+', ':'')+'0 4px 18px rgba(0,0,0,0.5)',transition:'box-shadow 0.3s,transform 0.3s ease',transform:hover?'perspective(800px) rotateY(4deg) rotateX(-2deg) translateY(-5px) scale(1.02)':' perspective(800px) rotateY(0deg) rotateX(0deg) scale(1)',cursor:'pointer'}} onClick={()=>onFlip(card.slug)} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}>
      <div style={{padding:'6px',position:'relative'}}>
        <div style={{position:'relative',transformStyle:'preserve-3d',transition:'transform 0.45s ease',transform:isFlipped?'rotateY(180deg)':' rotateY(0deg)',boxShadow:glow,borderRadius:'0.4rem',background:fill}}>
          <div style={{backfaceVisibility:'hidden',borderRadius:'0.4rem',overflow:'hidden',position:'relative'}}>
            <button style={{position:'absolute',top:'5px',right:'5px',background:isStarred?'#7c3aedcc':'#00000099',border:'none',borderRadius:'50%',width:'24px',height:'24px',cursor:'pointer',fontSize:'12px',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10,opacity:(hover||isStarred)?1:0,transition:'opacity 0.2s',pointerEvents:(hover||isStarred)?'auto':'none'}} onClick={e=>{e.stopPropagation();onStar(card.slug);}}>
              {isStarred?'⭐':'☆'}
            </button>
            <img src={card.pictureUrl} alt={card.name} loading='lazy' style={{width:'100%',height:'auto',display:'block'}}/>
            {hover&&!isFlipped&&(
              <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'0.35rem 0.5rem',background:'linear-gradient(to top,rgba(0,0,0,0.92) 0%,rgba(0,0,0,0.55) 65%,transparent 100%)'}}>
                <div style={{display:'flex',alignItems:'baseline',gap:'0.3rem'}}>
                  <span style={{fontSize:'1.25rem',fontWeight:900,color:'#fff',fontFamily:'monospace',lineHeight:1}}>{score||'—'}</span>
                  <span style={{fontSize:'0.48rem',color:rc,fontWeight:800,letterSpacing:'0.14em',textTransform:'uppercase'}}>L10</span>
                  {bonus&&<span style={{marginLeft:'auto',fontSize:'0.48rem',color:rc,fontWeight:800,letterSpacing:'0.06em',border:'1px solid '+rc+'55',padding:'0.05rem 0.25rem',borderRadius:'0.2rem'}}>BONUS {bonus}</span>}
                </div>
                <p style={{margin:'1px 0 0',fontSize:'0.42rem',color:'rgba(255,255,255,0.5)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.12em',fontFamily:'monospace'}}>{card.rarityTyped==='common'?'SET':card.rarityTyped.replace('_',' ')} • {card.anyTeam?.name||''}</p>
              </div>
            )}
          </div>
          <CardBack card={card}/>
        </div>
      </div>
      <div style={{padding:'3px 8px 6px',textAlign:'center',borderTop:'1px solid '+rc+'22',background:'rgba(0,0,0,0.2)'}}>
        <span style={{fontSize:'0.58rem',fontWeight:800,color:rc,letterSpacing:'0.12em',textTransform:'uppercase',fontFamily:'monospace',textShadow:'0 0 8px '+rc+'66'}}>{dn}</span>
      </div>
    </div>
  );
});
LockerSlot.displayName='LockerSlot';
