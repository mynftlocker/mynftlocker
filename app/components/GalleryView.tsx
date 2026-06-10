'use client';
import { memo, useState, useEffect } from 'react';

const RARITY_GLOW: Record<string,string> = {
  common:'0 0 9px 1px rgba(220,220,255,0.55)',
  limited:'0 0 11px 1px rgba(234,179,8,0.95)',
  rare:'0 0 12px 1px rgba(59,130,246,0.95)',
  super_rare:'0 0 13px 2px rgba(239,68,68,0.97)',
  unique:'0 0 15px 2px rgba(168,85,247,1)',
};
const RARITY_COLOR: Record<string,string> = {
  common:'#9ca3af',limited:'#eab308',rare:'#3b82f6',super_rare:'#ef4444',unique:'#a855f7',
};
const RARITY_FILL: Record<string,string> = {
  common:'#a8a8b5',limited:'#b48a14',rare:'#1e4ba8',super_rare:'#a82a2a',unique:'#7e3fc4',
};
const isNBA=(c:any)=>c?.__typename==='NBACard';
const parseCard=(name:string)=>{
  const parts=name.split('\u2022');const left=parts[0].trim();const right=(parts[1]||'').trim();
  const sm=left.match(/(\d{4}-\d{2})/);const season=sm?sm[1]:'';
  const pn=left.replace(/\d{4}-\d{2}/,'').trim();
  const lastName=(pn.split(' ').pop()||'').toUpperCase();
  const sr=right.match(/(\d+\/\d+)/);
  return {lastName,season,serial:sr?sr[1]:null};
};
const nfs=(l:number)=>l<=5?'1.45rem':l<=7?'1.2rem':l<=9?'1rem':l<=11?'0.82rem':l<=13?'0.7rem':'0.6rem';

// ===== DOS DE CARTE (identique vestiaire) =====
const CardBack=memo(({card,rc}:any)=>{
  const {season,serial}=parseCard(card.name);
  const ln=(card.anyPlayer?.lastName||parseCard(card.name).lastName).toUpperCase();
  const sn=card.anyPlayer?.shirtNumber??null;
  const bonus=card.power?('+'+Math.round((parseFloat(card.power)-1)*100)+'%'):null;
  const score=card.averageScore!=null?String(card.averageScore):null;
  const stats:any[]=[['L10',score||'\u2014',true],['Beat L10','\uD83D\uDD12',false],['GW','\uD83D\uDD12',false],['R\u00e9comp.','\uD83D\uDD12',false]];
  return(
    <div style={{position:'absolute',inset:0,backfaceVisibility:'hidden',WebkitBackfaceVisibility:'hidden',transform:'rotateY(180deg)',borderRadius:'0.5rem',overflow:'hidden',background:'radial-gradient(ellipse 130% 90% at 50% 0%,#191b24 0%,#0c0d14 60%,#06070d 100%)',display:'flex',flexDirection:'column' as const,border:'1px solid '+rc+'44'}}>
      <div style={{height:'3px',background:'linear-gradient(90deg,transparent,'+rc+',transparent)'}}></div>
      <div style={{padding:'0.35rem 0.4rem 0.3rem',textAlign:'center',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <p style={{margin:0,fontSize:'0.6rem',color:'#e3c074',fontWeight:900,letterSpacing:'0.08em'}}>myNFTlocker</p>
        <p style={{margin:'1px 0 0',fontSize:'0.48rem',color:'#9aa3b2',fontWeight:600,letterSpacing:'0.1em'}}>{isNBA(card)?'NBA':'FOOT'} \u2022 {season}</p>
      </div>
      <div style={{flex:1,minHeight:0,display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'center',padding:'0.2rem 0.3rem',overflow:'hidden'}}>
        <p style={{margin:0,width:'100%',fontSize:nfs(ln.length),fontWeight:900,color:'#fff',lineHeight:1.05,textAlign:'center',textShadow:'0 0 14px '+rc+'aa',overflow:'hidden'}}>{ln}</p>
        <p style={{margin:'2px 0 0',fontSize:'0.5rem',color:'#9aa3b2',fontWeight:700,letterSpacing:'0.05em'}}>{sn!==null?('#'+sn):''}{(sn!==null&&serial)?'  \u00b7  ':''}{serial||''}</p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',borderTop:'1px solid rgba(255,255,255,0.06)',padding:'0.3rem 0.1rem'}}>
        {stats.map(([l,v,hot]:any)=>(
          <div key={l} style={{textAlign:'center'}}>
            <p style={{margin:0,fontSize:hot?'0.95rem':'0.62rem',fontWeight:900,color:hot?'#fff':'#5c6470',lineHeight:1.1,textShadow:(hot&&score)?('0 0 10px '+rc+'88'):'none'}}>{v}</p>
            <p style={{margin:'1px 0 0',fontSize:'0.4rem',color:hot?rc:'#5c6470',textTransform:'uppercase',fontWeight:800,letterSpacing:'0.03em'}}>{l}</p>
          </div>
        ))}
      </div>
      <div style={{display:'flex',gap:'0.3rem',padding:'0.3rem 0.4rem 0.45rem'}}>
        <span style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',height:'1.05rem',borderRadius:'0.3rem',border:'1px solid '+rc+'55',background:rc+'15',fontSize:'0.46rem',fontWeight:800,color:rc,letterSpacing:'0.02em',whiteSpace:'nowrap'}}>BONUS {bonus||'\u2014'}</span>
        <span style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',height:'1.05rem',borderRadius:'0.3rem',border:'1px solid '+rc+'55',background:'rgba(0,0,0,0.4)',fontSize:'0.46rem',fontWeight:700,color:rc,textTransform:'uppercase',letterSpacing:'0.02em',whiteSpace:'nowrap'}}>{card.rarityTyped.replace('_',' ')}</span>
      </div>
    </div>
  );
});
CardBack.displayName='CardBack';

// ===== CARTE GALERIE (flip 3D + halo cyan + trace, identique vestiaire) =====
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

// ===== TABLEAU NOIR (StatPanel identique vestiaire, overlay fixe) =====
const StatPanel=memo(({card,onClose,isClosing=false}:any)=>{
  const rc=RARITY_COLOR[card.rarityTyped]||'#9ca3af';
  const {season,serial}=parseCard(card.name);
  const ln=(card.anyPlayer?.lastName||parseCard(card.name).lastName).toUpperCase();
  const sn=card.anyPlayer?.shirtNumber;
  const bonus=card.power?('+'+(Math.round((parseFloat(card.power)-1)*100))+'%'):null;
  const avgNum=card.averageScore!=null?parseFloat(String(card.averageScore)):null;
  const team=card.anyTeam?.name||'\u2014';
  const xp=card.xp?card.xp.toLocaleString():'\u2014';
  const edition=card.specialEdition?card.specialEdition.replace(/_/g,' ').toUpperCase():'STANDARD';
  const nbaSeasonStr=card.seasonYear&&card.seasonYear>2000?String(card.seasonYear)+'-'+String(card.seasonYear+1).slice(2):'2025-26';
  const raw=(card.anyPlayer?.playerGameScores||[]).map((s:any)=>s.score).filter((s:any)=>s!=null) as number[];
  const scores=[...raw].reverse();
  const [typedName,setTypedName]=useState('');
  const [countedAvg,setCountedAvg]=useState('0');
  const [nbaStats,setNbaStats]=useState<any>(null);
  const [nbaLoading,setNbaLoading]=useState(false);
  useEffect(()=>{let i=0;let iv:any;const t=setTimeout(()=>{iv=setInterval(()=>{i++;setTypedName(ln.slice(0,i));if(i>=ln.length)clearInterval(iv);},45);},600);return()=>{clearTimeout(t);clearInterval(iv);};},[ln]);
  useEffect(()=>{if(avgNum==null)return;let step=0;let iv:any;const t=setTimeout(()=>{iv=setInterval(()=>{step++;const cur=Math.min((avgNum/20)*step,avgNum);setCountedAvg(cur%1===0?String(Math.round(cur)):cur.toFixed(1));if(step>=20)clearInterval(iv);},40);},700);return()=>{clearTimeout(t);clearInterval(iv);};},[avgNum]);
  useEffect(()=>{if(!card.anyPlayer?.lastName)return;const _full=(card.name.split('\u2022')[0]||'').replace(/\d{4}-\d{2}/,'').trim();setNbaLoading(true);fetch('/api/player-stats?name='+encodeURIComponent(_full||card.anyPlayer.lastName)+'&season='+(card.seasonYear||0)).then(r=>r.json()).then(d=>{if(!d.error)setNbaStats(d);}).catch(()=>{}).finally(()=>setNbaLoading(false));},[]);
  const W=240,H=46,n=scores.length;
  const mn=Math.min(...(n?scores:[0]),0),mx=Math.max(...(n?scores:[1]),1),rng=mx-mn||1;
  const sx=(i:number)=>((i/Math.max(n-1,1))*(W-10)+5).toFixed(1);
  const sy=(s:number)=>(H-5-((s-mn)/rng)*(H-10)).toFixed(1);
  const pts=n>1?scores.map((s,i)=>sx(i)+','+sy(s)).join(' '):'';
  const gid='sg'+card.slug.slice(-4);
  const CY='#40e8ff';const CYS='0 0 8px rgba(64,232,255,0.5)';
  const sep:React.CSSProperties={borderBottom:'1px solid rgba(64,232,255,0.16)',paddingBottom:'0.42rem',marginBottom:'0.42rem',flexShrink:0};
  const fv=(v:any,t:string)=>{if(v==null)return '\u2014';const nn=Number(v);if(t==='pct')return nn.toFixed(1)+'%';if(t==='pm')return(nn>=0?'+':'')+nn.toFixed(1);return nn.toFixed(1);};
  return(
    <div key={card.slug} style={{position:'fixed',right:'1.5%',top:'7%',width:'33%',maxWidth:'440px',height:'86vh',zIndex:200,background:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(64,232,255,0.03) 2px,rgba(64,232,255,0.03) 3px),linear-gradient(rgba(2,10,22,0.95),rgba(2,10,22,0.95))',border:'1px solid rgba(64,232,255,0.5)',boxShadow:'0 0 40px rgba(64,232,255,0.15),inset 0 0 60px rgba(0,0,0,0.5)',clipPath:isClosing?'none':'polygon(14px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px)',padding:'0.8rem 0.75rem',display:'flex',flexDirection:'column' as const,overflow:'hidden',animation:isClosing?'mnflClose 0.45s cubic-bezier(0.7,0,0.95,1) both':'mnflDeploy 0.55s ease-out 0.1s backwards',fontFamily:'Courier New,Consolas,monospace',backdropFilter:isClosing?'none':'blur(12px)',WebkitBackdropFilter:isClosing?'none':'blur(12px)'}}>
      <div style={{...sep,display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div>
          <p style={{margin:0,fontSize:'0.55rem',color:'rgba(64,232,255,0.5)',fontWeight:700,letterSpacing:'0.18em',textTransform:'uppercase'}}>myNFTlocker \u00b7 STATS</p>
          <p style={{margin:'4px 0 2px',fontSize:'1.1rem',fontWeight:900,color:CY,letterSpacing:'0.06em',textShadow:CYS,minHeight:'1.35em'}}>{typedName}{typedName.length<ln.length?'\u258a':''}</p>
          <p style={{margin:0,fontSize:'0.6rem',color:'rgba(64,232,255,0.38)',letterSpacing:'0.04em'}}>{sn!=null?'#'+sn+' \u00b7 ':''}{season}</p>
        </div>
        <button onClick={!isClosing?onClose:undefined} style={{background:'transparent',border:'1px solid rgba(64,232,255,0.35)',borderRadius:'50%',width:'20px',height:'20px',color:CY,cursor:'pointer',fontSize:'0.55rem',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,opacity:isClosing?0:1,marginTop:'2px'}}>\u2715</button>
      </div>
      <div style={{...sep,display:'flex',alignItems:'stretch'}}>
        <div style={{width:'50%',textAlign:'center',display:'flex',flexDirection:'column' as const,justifyContent:'center',borderRight:'1px solid rgba(64,232,255,0.1)',paddingRight:'0.5rem'}}>
          <p style={{margin:0,fontSize:'2.2rem',fontWeight:900,color:CY,lineHeight:1,textShadow:'0 0 22px '+CY}}>{countedAvg}</p>
          <p style={{margin:'2px 0 0',fontSize:'0.52rem',color:'rgba(64,232,255,0.6)',letterSpacing:'0.2em',textTransform:'uppercase'}}>MOY. L10</p>
        </div>
        <div style={{width:'50%',display:'flex',flexDirection:'column' as const,gap:'0.24rem',paddingLeft:'0.5rem',justifyContent:'center'}}>
          {bonus&&<div style={{padding:'0.22rem 0.4rem',border:'1px solid rgba(64,232,255,0.28)',borderRadius:'0.25rem',background:'rgba(64,232,255,0.07)',display:'flex',justifyContent:'space-between',alignItems:'baseline'}}><span style={{fontSize:'0.52rem',color:'rgba(64,232,255,0.55)',letterSpacing:'0.1em'}}>BONUS</span><span style={{fontSize:'0.72rem',fontWeight:800,color:CY,textShadow:CYS}}>{bonus}</span></div>}
          <div style={{padding:'0.22rem 0.4rem',border:'1px solid '+rc+'55',borderRadius:'0.25rem',background:rc+'0d',textAlign:'center'}}><span style={{fontSize:'0.65rem',fontWeight:900,color:rc,letterSpacing:'0.1em',textShadow:'0 0 7px '+rc}}>{card.rarityTyped.replace(/_/g,' ').toUpperCase()}</span></div>
        </div>
      </div>
      {n>1&&<div style={{...sep}}>
        <p style={{margin:'0 0 0.2rem',fontSize:'0.5rem',color:'rgba(64,232,255,0.48)',letterSpacing:'0.14em',textTransform:'uppercase'}}>\u2197  10 DERNIERS MATCHS</p>
        <svg width='100%' viewBox={'0 0 '+W+' '+H} style={{display:'block',overflow:'visible'}}>
          <defs><linearGradient id={gid} x1='0' y1='0' x2='0' y2='1'><stop offset='0%' stopColor={rc} stopOpacity='0.28'/><stop offset='100%' stopColor={rc} stopOpacity='0'/></linearGradient></defs>
          <polygon points={'5,'+(H-5)+' '+pts+' '+sx(n-1)+','+(H-5)} fill={'url(#'+gid+')'}/>
          <polyline points={pts} fill='none' stroke={rc} strokeWidth='1.8' strokeLinejoin='round' strokeLinecap='round'/>
          {scores.map((s:number,i:number)=>i%2===0?<circle key={i} cx={sx(i)} cy={sy(s)} r='2.5' fill={rc} opacity='0.9'/>:null)}
        </svg>
      </div>}
      <div style={{...sep}}>
        <p style={{margin:'0 0 0.3rem',fontSize:'0.52rem',fontWeight:900,color:'rgba(64,232,255,0.6)',letterSpacing:'0.2em',textTransform:'uppercase'}}>CARTE</p>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.18rem 0.6rem'}}>
          {([[' \u00c9QUIPE',team],[' S\u00c9RIE',serial],[' SAISON',season],[' XP',xp],[' \u00c9DITION',edition]] as [string,string][]).map(([l,v])=>(
            <div key={l} style={{minWidth:0}}>
              <span style={{display:'block',fontSize:'0.5rem',color:'rgba(64,232,255,0.4)',letterSpacing:'0.1em',textTransform:'uppercase'}}>{l}</span>
              <span style={{display:'block',fontSize:'0.72rem',fontWeight:700,color:CY,textShadow:'0 0 5px rgba(64,232,255,0.3)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{...sep,flex:1,minHeight:0,overflow:'hidden'}}>
        <p style={{margin:'0 0 0.3rem',fontSize:'0.52rem',fontWeight:900,color:'rgba(64,232,255,0.6)',letterSpacing:'0.2em',textTransform:'uppercase'}}>NBA STATS \u00b7 {nbaStats?.season||nbaSeasonStr}</p>
        {nbaLoading&&<p style={{margin:0,fontSize:'0.62rem',color:'rgba(64,232,255,0.42)',letterSpacing:'0.14em'}}>CHARGEMENT...</p>}
        {!nbaLoading&&nbaStats&&(
          <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'0.18rem'}}>
            {([[' PTS',nbaStats.pts,'dec'],[' AST',nbaStats.ast,'dec'],[' REB',nbaStats.reb,'dec'],[' STL',nbaStats.stl,'dec'],[' BLK',nbaStats.blk,'dec'],[' TOV',nbaStats.tov,'dec'],[' MIN',nbaStats.min,'dec'],[' FG%',nbaStats.fgp,'pct'],[' 3P%',nbaStats.tp,'pct'],[' FT%',nbaStats.ftp,'pct'],[' FTA',nbaStats.fta,'dec'],[' +/-',nbaStats.pm,'pm']] as any[]).map(([l,v,t]:any)=>(<div key={l} style={{textAlign:'center',padding:'0.16rem 0.08rem',border:'1px solid rgba(64,232,255,0.14)',borderRadius:'0.2rem',background:'rgba(64,232,255,0.04)'}}><span style={{display:'block',fontSize:'0.4rem',color:'rgba(64,232,255,0.5)',letterSpacing:'0.04em',textTransform:'uppercase'}}>{l}</span><span style={{display:'block',fontSize:'0.76rem',fontWeight:900,color:CY,textShadow:CYS,lineHeight:1.15}}>{fv(v,t)}</span></div>))}
          </div>
        )}
        {!nbaLoading&&!nbaStats&&<p style={{margin:0,fontSize:'0.58rem',color:'rgba(64,232,255,0.28)',letterSpacing:'0.06em'}}>stats non disponibles</p>}
      </div>
      <div style={{flexShrink:0,marginTop:'auto',paddingTop:'0.3rem',borderTop:'1px solid rgba(64,232,255,0.14)'}}>
        <div style={{display:'flex',gap:'0.3rem',marginBottom:'0.22rem'}}>
          {['BEAT L10','GW','R\u00c9COMP.'].map((l:string)=>(
            <div key={l} style={{flex:1,padding:'0.16rem 0',border:'1px solid rgba(64,232,255,0.1)',borderRadius:'0.2rem',textAlign:'center',background:'rgba(64,232,255,0.025)'}}><span style={{fontSize:'0.5rem',color:'rgba(64,232,255,0.28)',letterSpacing:'0.03em'}}>{l} \uD83D\uDD12</span></div>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.3rem',marginTop:'0.15rem'}}>
          {([['PRIX','-- ETH'],['OWNER','--']] as [string,string][]).map(([l,v])=>(
            <div key={l} style={{background:'rgba(0,0,0,0.3)',border:'1px solid rgba(64,232,255,0.12)',borderRadius:'0.25rem',padding:'0.28rem 0.4rem',display:'flex',flexDirection:'column' as const,gap:'0.1rem'}}><span style={{fontSize:'0.42rem',color:'rgba(64,232,255,0.4)',letterSpacing:'0.1em',textTransform:'uppercase'}}>{l} \uD83D\uDD12</span><span style={{fontSize:'0.62rem',color:'rgba(64,232,255,0.28)',fontWeight:600}}>{v}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
});
StatPanel.displayName='StatPanel';

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
      {activeCard&&<StatPanel key={activeCard.slug} card={activeCard} isClosing={isClosing} onClose={startClose}/>}
    </div>
  );
}
