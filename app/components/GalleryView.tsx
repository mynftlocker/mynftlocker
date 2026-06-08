'use client';
import {useState,useEffect,useCallback,memo} from 'react';

const RARITY_COLOR:Record<string,string>={common:'#9ca3af',limited:'#eab308',rare:'#3b82f6',super_rare:'#ef4444',unique:'#a855f7'};

function parseCard(name:string){
  const parts=name.split('•');const left=parts[0].trim();const right=(parts[1]||'').trim();
  const sm=left.match(/(\d{4}-\d{2})/);const season=sm?sm[1]:'';
  const sr=right.match(/(\d+\/\d+)/);
  return{season,serial:sr?('#'+sr[1]):'—'};
}

const GalleryPod=memo(({card,isActive,onActivate}:any)=>{
  const [hover,setHover]=useState(false);
  const [scanning,setScanning]=useState(false);
  const rc=RARITY_COLOR[card.rarityTyped]||'#9ca3af';
  const handleClick=useCallback(()=>{
    if(isActive){onActivate(null);return;}
    if(scanning)return;
    setScanning(true);
    setTimeout(()=>{setScanning(false);onActivate(card.slug);},480);
  },[isActive,scanning,card.slug,onActivate]);
  const tilt=hover||isActive?'rotateX(0deg) rotateY(0deg)':'rotateX(5deg) rotateY(-4deg)';
  return(
    <div style={{perspective:'600px',cursor:'pointer',userSelect:'none'}} onClick={handleClick} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}>
      <div style={{position:'relative',borderRadius:'10px',background:'rgba(255,255,255,0.025)',backdropFilter:'blur(10px)',WebkitBackdropFilter:'blur(10px)',border:isActive?'1px solid rgba(64,232,255,0.5)':'1px solid rgba(255,255,255,0.08)',boxShadow:`0 0 18px ${rc}50,0 8px 28px rgba(0,0,0,0.7),inset 0 0 22px ${rc}18`,transform:tilt,transformStyle:'preserve-3d',transition:'transform 0.4s ease,box-shadow 0.3s ease,border-color 0.3s',overflow:'hidden',aspectRatio:'0.73',animation:(!hover&&!isActive)?'galFloat 4s ease-in-out infinite':undefined}}>
        <img src={card.pictureUrl||''} alt={card.name} loading='lazy' style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} onError={(e:any)=>{e.target.style.display='none';}}/>
        <div style={{position:'absolute',top:0,left:0,right:0,height:'3px',background:`linear-gradient(to right,transparent,${rc},transparent)`,opacity:0.85}}/>
        <div style={{position:'absolute',bottom:0,left:0,right:0,background:'linear-gradient(to top,rgba(0,0,0,0.92) 0%,transparent 100%)',padding:'1.2rem 0.5rem 0.45rem'}}>
          <p style={{margin:0,fontSize:'0.65rem',fontWeight:900,color:'#fff',letterSpacing:'0.06em',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{(card.anyPlayer?.lastName||'').toUpperCase()}</p>
          <p style={{margin:'1px 0 0',fontSize:'0.48rem',color:rc,letterSpacing:'0.12em',fontFamily:'Courier New,monospace'}}>{card.rarityTyped.replace(/_/g,' ').toUpperCase()}</p>
        </div>
        {isActive&&(<svg style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',zIndex:10,pointerEvents:'none',overflow:'visible'}}><rect x='0' y='0' width='100%' height='100%' rx='10' pathLength='1000' fill='none' stroke='#40e8ff' strokeWidth='2' style={{filter:'drop-shadow(0 0 6px rgba(64,232,255,0.9))',strokeDasharray:'1000',strokeDashoffset:'1000',animation:'galTrace 1.2s ease-in-out 0.3s both'}}/></svg>)}
        {scanning&&(<div style={{position:'absolute',left:0,right:0,height:'3px',top:0,background:'linear-gradient(to right,transparent,#00ffff 30%,#00ffff 70%,transparent)',boxShadow:'0 0 16px 6px rgba(0,255,255,0.65)',animation:'galScan 0.48s ease-in-out forwards',pointerEvents:'none',zIndex:20}}/>)}
      </div>
    </div>
  );
});
GalleryPod.displayName='GalleryPod';

const GalleryHUD=memo(({card,onClose,closing}:any)=>{
  const rc=RARITY_COLOR[card.rarityTyped]||'#9ca3af';
  const{season,serial}=parseCard(card.name);
  const ln=(card.anyPlayer?.lastName||'').toUpperCase();
  const sn=card.anyPlayer?.shirtNumber;
  const bonus=card.power?('+'+Math.round((parseFloat(card.power)-1)*100)+'%'):null;
  const avg=card.averageScore!=null?parseFloat(String(card.averageScore)):null;
  const nbaSeasonStr=card.seasonYear?String(card.seasonYear)+'-'+String(card.seasonYear+1).slice(2):'2025-26';
  const team=card.anyTeam?.name||'—';
  const xp=card.xp?card.xp.toLocaleString():'—';
  const edition=card.specialEdition?card.specialEdition.replace(/_/g,' ').toUpperCase():'STANDARD';
  const raw=(card.anyPlayer?.playerGameScores||[]).map((s:any)=>s.score).filter((s:any)=>s!=null) as number[];
  const scores=[...raw].reverse();
  const W=170,H=36,n=scores.length;
  const mn=Math.min(...(n?scores:[0]),0),mx=Math.max(...(n?scores:[1]),1),rng=mx-mn||1;
  const sx=(i:number)=>((i/Math.max(n-1,1))*(W-8)+4).toFixed(1);
  const sy=(s:number)=>(H-4-((s-mn)/rng)*(H-8)).toFixed(1);
  const pts=n>1?scores.map((s,i)=>`${sx(i)},${sy(s)}`).join(' '):'';
  const gid='gh'+card.slug.slice(-4);
  const CY='#40e8ff';const CYS='0 0 8px rgba(64,232,255,0.5)';const LK='🔒';
  const [typedName,setTypedName]=useState('');
  const [nbaStats,setNbaStats]=useState<any>(null);
  const [nbaLoading,setNbaLoading]=useState(false);
  const [vis,setVis]=useState([false,false,false]);
  useEffect(()=>{let i=0;let iv:any;const t=setTimeout(()=>{iv=setInterval(()=>{i++;setTypedName(ln.slice(0,i));if(i>=ln.length)clearInterval(iv);},44);},250);return()=>{clearTimeout(t);clearInterval(iv);};},[ln]);
  useEffect(()=>{const ts=[setTimeout(()=>setVis(v=>[true,v[1],v[2]]),200),setTimeout(()=>setVis(v=>[v[0],true,v[2]]),480),setTimeout(()=>setVis(v=>[v[0],v[1],true]),760)];return()=>ts.forEach(clearTimeout);},[]);
  useEffect(()=>{if(!card.anyPlayer?.lastName)return;setNbaLoading(true);fetch(`/api/player-stats?name=${encodeURIComponent(card.anyPlayer.lastName)}&season=${card.seasonYear||0}`).then(r=>r.json()).then(d=>{if(!d.error)setNbaStats(d);}).catch(()=>{}).finally(()=>setNbaLoading(false));},[]);
  const fv=(v:any,t:string)=>{if(v==null)return '—';const n=Number(v);if(t==='pct')return n.toFixed(1)+'%';if(t==='pm')return(n>=0?'+':'')+n.toFixed(1);return n.toFixed(1);};
  const cT={margin:'0 0 0.25rem',fontSize:'0.42rem',fontWeight:900,color:'rgba(64,232,255,0.65)',letterSpacing:'0.22em',textTransform:'uppercase',borderBottom:'1px solid rgba(64,232,255,0.14)',paddingBottom:'0.12rem'};
  const cS=(i:number)=>({display:'flex',flexDirection:'column' as const,overflow:'hidden',opacity:vis[i]?1:0,transform:vis[i]?'translateY(0)':'translateY(8px)',transition:'opacity 0.4s ease,transform 0.4s ease'});
  return(
    <div style={{position:'fixed',right:'1.5%',top:'8%',width:'34%',height:'84%',zIndex:200,background:'rgba(2,8,20,0.94)',border:'1px solid rgba(64,232,255,0.45)',boxShadow:'0 0 50px rgba(64,232,255,0.12),inset 0 0 60px rgba(0,0,0,0.5)',backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',clipPath:closing?undefined:'polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px)',fontFamily:'Courier New,Consolas,monospace',animation:closing?'galHudClose 0.55s cubic-bezier(0.8,0,1,0.8) both':'galHudOpen 0.5s ease-out both',display:'flex',flexDirection:'column' as const,overflow:'hidden',padding:'0.8rem'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',borderBottom:'1px solid rgba(64,232,255,0.18)',paddingBottom:'0.45rem',marginBottom:'0.45rem',flexShrink:0}}>
        <div>
          <p style={{margin:0,fontSize:'0.5rem',color:'rgba(64,232,255,0.5)',fontWeight:700,letterSpacing:'0.2em',textTransform:'uppercase'}}>myNFTlocker · GALLERY</p>
          <p style={{margin:'3px 0 2px',fontSize:'1.05rem',fontWeight:900,color:CY,letterSpacing:'0.07em',textShadow:CYS,minHeight:'1.3em'}}>{typedName}{typedName.length<ln.length?'▊':''}</p>
          <p style={{margin:0,fontSize:'0.56rem',color:'rgba(64,232,255,0.35)'}}>{sn!=null?'#'+sn+' · ':''}{season}</p>
        </div>
        <button onClick={onClose} style={{background:'transparent',border:'1px solid rgba(64,232,255,0.3)',borderRadius:'50%',width:'20px',height:'20px',color:CY,cursor:'pointer',fontSize:'0.55rem',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:'2px'}}>✕</button>
      </div>
      <div style={{flex:1,display:'grid',gridTemplateColumns:'1fr 1px 1fr 1px 1fr',minHeight:0,overflow:'hidden'}}>
        <div style={cS(0)}>
          <p style={cT}>SORARE</p>
          <div style={{textAlign:'center',margin:'0.1rem 0 0.22rem'}}>
            <p style={{margin:0,fontSize:'1.9rem',fontWeight:900,color:CY,lineHeight:1,textShadow:'0 0 20px '+CY}}>{avg!=null?avg.toFixed(1):'—'}</p>
            <p style={{margin:0,fontSize:'0.36rem',color:'rgba(64,232,255,0.55)',letterSpacing:'0.2em',textTransform:'uppercase'}}>MOY. L10</p>
          </div>
          {bonus&&<div style={{textAlign:'center',padding:'0.16rem',border:'1px solid rgba(64,232,255,0.25)',borderRadius:'0.2rem',background:'rgba(64,232,255,0.06)',marginBottom:'0.18rem'}}><span style={{fontSize:'0.56rem',fontWeight:800,color:CY,textShadow:CYS}}>{bonus}</span><span style={{fontSize:'0.35rem',color:'rgba(64,232,255,0.45)',marginLeft:'0.18rem'}}>BONUS</span></div>}
          <div style={{textAlign:'center',padding:'0.14rem',border:'1px solid '+rc+'50',borderRadius:'0.2rem',background:rc+'0c',marginBottom:'0.2rem'}}><span style={{fontSize:'0.46rem',fontWeight:900,color:rc,letterSpacing:'0.1em',textShadow:'0 0 6px '+rc}}>{card.rarityTyped.replace(/_/g,' ').toUpperCase()}</span></div>
          {(['BEAT L10','GW','RÉCOMP.'] as string[]).map(l=>(<div key={l} style={{display:'flex',justifyContent:'space-between',marginBottom:'0.08rem'}}><span style={{fontSize:'0.38rem',color:'rgba(64,232,255,0.3)'}}>{l}</span><span style={{fontSize:'0.36rem',color:'rgba(64,232,255,0.18)'}}>{LK}</span></div>))}
          {n>1&&<div style={{marginTop:'auto',paddingTop:'0.15rem'}}>
            <p style={{margin:'0 0 0.08rem',fontSize:'0.34rem',color:'rgba(64,232,255,0.42)',letterSpacing:'0.1em',textTransform:'uppercase'}}>↗  10 MATCHS</p>
            <svg width='100%' viewBox={`0 0 ${W} ${H}`} style={{display:'block',overflow:'visible'}}>
              <defs><linearGradient id={gid} x1='0' y1='0' x2='0' y2='1'><stop offset='0%' stopColor={rc} stopOpacity='0.28'/><stop offset='100%' stopColor={rc} stopOpacity='0'/></linearGradient></defs>
              <polygon points={`4,${H-4} ${pts} ${sx(n-1)},${H-4}`} fill={`url(#${gid})`}/>
              <polyline points={pts} fill='none' stroke={rc} strokeWidth='1.6' strokeLinejoin='round'/>
            </svg>
          </div>}
        </div>
        <div style={{background:'rgba(64,232,255,0.14)'}}/>
        <div style={cS(1)}>
          <p style={cT}>NBA · {nbaSeasonStr}</p>
          {nbaLoading&&<p style={{margin:0,fontSize:'0.54rem',color:'rgba(64,232,255,0.4)',letterSpacing:'0.1em'}}>SCAN...</p>}
          {!nbaLoading&&nbaStats&&(
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.1rem'}}>
              {([[' PPG',nbaStats.pts,'dec'],[' APG',nbaStats.ast,'dec'],[' RPG',nbaStats.reb,'dec'],[' STL',nbaStats.stl,'dec'],[' BLK',nbaStats.blk,'dec'],[' TOV',nbaStats.tov,'dec'],[' MIN',nbaStats.min,'dec'],[' FG%',nbaStats.fgp,'pct'],[' 3P%',nbaStats.tp,'pct'],[' FT%',nbaStats.ftp,'pct'],[' FTA',nbaStats.fta,'dec'],[' +/-',nbaStats.pm,'pm']] as any[]).map(([l,v,t]:any)=>(<div key={l} style={{display:'flex',justifyContent:'space-between',borderBottom:'1px solid rgba(64,232,255,0.07)',paddingBottom:'0.04rem'}}><span style={{fontSize:'0.37rem',color:'rgba(64,232,255,0.42)',letterSpacing:'0.05em'}}>{l}</span><span style={{fontSize:'0.42rem',fontWeight:700,color:CY,textShadow:'0 0 4px rgba(64,232,255,0.28)'}}>{fv(v,t)}</span></div>))}
            </div>
          )}
          {!nbaLoading&&!nbaStats&&<p style={{margin:0,fontSize:'0.5rem',color:'rgba(64,232,255,0.25)'}}>non disponibles</p>}
        </div>
        <div style={{background:'rgba(64,232,255,0.14)'}}/>
        <div style={cS(2)}>
          <p style={cT}>WEB 3.0</p>
          {([['ÉQUIPE',team],['SAISON',season],['SÉRIE',serial],['XP',xp],['ÉDITION',edition]] as [string,string][]).map(([l,v])=>(
            <div key={l} style={{marginBottom:'0.18rem',minWidth:0}}>
              <span style={{display:'block',fontSize:'0.34rem',color:'rgba(64,232,255,0.38)',letterSpacing:'0.1em',textTransform:'uppercase'}}>{l}</span>
              <span style={{display:'block',fontSize:'0.56rem',fontWeight:700,color:CY,textShadow:'0 0 5px rgba(64,232,255,0.25)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{v}</span>
            </div>
          ))}
          <div style={{marginTop:'auto',borderTop:'1px solid rgba(64,232,255,0.1)',paddingTop:'0.2rem'}}>
            {([['PRIX','-- ETH'],['OWNER','--']] as [string,string][]).map(([l,v])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',marginBottom:'0.08rem'}}><span style={{fontSize:'0.38rem',color:'rgba(64,232,255,0.3)',letterSpacing:'0.08em'}}>{l}</span><span style={{fontSize:'0.42rem',color:'rgba(64,232,255,0.18)'}}>{v} {LK}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
GalleryHUD.displayName='GalleryHUD';

export default function GalleryView({cards}:{cards:any[]}){
  const [activeSlug,setActiveSlug]=useState<string|null>(null);
  const [closingSlug,setClosingSlug]=useState<string|null>(null);
  const handleActivate=useCallback((slug:string|null)=>{
    if(!slug){setClosingSlug(activeSlug);setTimeout(()=>{setActiveSlug(null);setClosingSlug(null);},650);}
    else{setActiveSlug(slug);setClosingSlug(null);}
  },[activeSlug]);
  const activeCard=cards.find(c=>c.slug===activeSlug);
  const isClosing=closingSlug!=null&&closingSlug===activeSlug;
  return(
    <>
      <style>{`
        @keyframes galScan{0%{top:-4px;opacity:0}8%{opacity:1}92%{opacity:1}100%{top:calc(100% + 4px);opacity:0}}
        @keyframes galFloat{0%,100%{transform:rotateX(5deg) rotateY(-4deg) translateY(0px)}50%{transform:rotateX(5deg) rotateY(-4deg) translateY(-5px)}}
        @keyframes galTrace{0%{stroke-dashoffset:1000}100%{stroke-dashoffset:0}}
        @keyframes galHudOpen{0%{opacity:0;clip-path:inset(0 100% 0 0);transform:perspective(900px) rotateY(-6deg) translateX(20px)}40%{opacity:0.8}100%{opacity:1;clip-path:inset(0 0% 0 0);transform:perspective(900px) rotateY(0deg) translateX(0)}}
        @keyframes galHudClose{0%{clip-path:inset(0 0 0 0);opacity:1;filter:brightness(1)}25%{clip-path:inset(8% 12% 8% 12%);filter:brightness(1.5)}55%{clip-path:inset(30% 35% 30% 35%);filter:brightness(3)}78%{clip-path:inset(46% 48% 46% 48%);filter:brightness(6)}88%{clip-path:inset(49% 0 49% 0);filter:brightness(9)}96%{clip-path:inset(49.5% 44% 49.5% 44%);filter:brightness(12)}100%{clip-path:inset(50% 50% 50% 50%);opacity:0;filter:brightness(0)}}
        .gal-scroll::-webkit-scrollbar{width:3px}.gal-scroll::-webkit-scrollbar-track{background:transparent}.gal-scroll::-webkit-scrollbar-thumb{background:rgba(64,232,255,0.2);border-radius:2px}
      `}</style>
      <div style={{padding:'1.2rem',minHeight:'100%',boxSizing:'border-box'}}>
        {cards.length===0?(
          <div style={{display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'center',height:'55vh',color:'rgba(64,232,255,0.28)',fontFamily:'Courier New,monospace',gap:'0.5rem'}}>
            <p style={{fontSize:'2rem',margin:0}}>⬡</p>
            <p style={{fontSize:'0.7rem',letterSpacing:'0.25em',textTransform:'uppercase',margin:0}}>Aucune carte</p>
          </div>
        ):(
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:'1.4rem',perspective:'1400px'}}>
            {cards.map(c=>(<GalleryPod key={c.slug} card={c} isActive={activeSlug===c.slug} onActivate={handleActivate}/>))}
          </div>
        )}
      </div>
      {activeCard&&(<GalleryHUD key={activeCard.slug} card={activeCard} onClose={()=>handleActivate(null)} closing={isClosing}/>)}
    </>
  );
}