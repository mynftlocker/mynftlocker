'use client';
import { memo, useState, useEffect } from 'react';

export const RARITY_GLOW: Record<string,string> = {
  common:'0 0 9px 1px rgba(220,220,255,0.55)',
  limited:'0 0 11px 1px rgba(234,179,8,0.95)',
  rare:'0 0 12px 1px rgba(59,130,246,0.95)',
  super_rare:'0 0 13px 2px rgba(239,68,68,0.97)',
  unique:'0 0 15px 2px rgba(168,85,247,1)',
};
export const RARITY_COLOR: Record<string,string> = {
  common:'#9ca3af',limited:'#eab308',rare:'#3b82f6',super_rare:'#ef4444',unique:'#a855f7',
};
export const RARITY_FILL: Record<string,string> = {
  common:'#a8a8b5',limited:'#b48a14',rare:'#1e4ba8',super_rare:'#a82a2a',unique:'#7e3fc4',
};
export const isNBA=(c:any)=>c?.__typename==='NBACard';
export const parseCard=(name:string)=>{
  const parts=name.split('•');const left=parts[0].trim();const right=(parts[1]||'').trim();
  const sm=left.match(/(\d{4}-\d{2})/);const season=sm?sm[1]:'';
  const pn=left.replace(/\d{4}-\d{2}/,'').trim();
  const lastName=pn.split(' ').pop()!.toUpperCase();
  const sr=right.match(/(\d+\/\d+)/);
  return {lastName,season,serial:sr?sr[1]:null};
};
export const nfs=(l:number)=>l<=5?'1.45rem':l<=7?'1.2rem':l<=9?'1rem':l<=11?'0.82rem':l<=13?'0.7rem':'0.6rem';

export const CardBack=memo(({card,rc}:any)=>{
  const {season,serial}=parseCard(card.name);
  const ln=(card.anyPlayer?.lastName||parseCard(card.name).lastName).toUpperCase();
  const sn=card.anyPlayer?.shirtNumber??null;
  const bonus=card.power?('+'+Math.round((parseFloat(card.power)-1)*100)+'%'):null;
  const score=card.averageScore!=null?String(card.averageScore):null;
  const stats:any[]=[['L10',score||'—',true],['Beat L10','🔒',false],['GW','🔒',false],['Récomp.','🔒',false]];
  const fv=(v:any,t:string)=>{if(v==null)return '—';const n=Number(v);if(t==='pct')return n.toFixed(1)+'%';if(t==='pm')return(n>=0?'+':'')+n.toFixed(1);return n.toFixed(1);};
  return(
    <div style={{position:'absolute',inset:0,backfaceVisibility:'hidden',WebkitBackfaceVisibility:'hidden',transform:'rotateY(180deg)',borderRadius:'0.4rem',overflow:'hidden',background:'radial-gradient(ellipse 130% 90% at 50% 0%,#191b24 0%,#0c0d14 60%,#06070d 100%)',display:'flex',flexDirection:'column' as const,border:'1px solid '+rc+'44'}}>
      <div style={{height:'3px',background:'linear-gradient(90deg,transparent,'+rc+',transparent)'}}></div>
      <div style={{padding:'0.35rem 0.4rem 0.3rem',textAlign:'center',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <p style={{margin:0,fontSize:'0.6rem',color:'#e3c074',fontWeight:900,letterSpacing:'0.08em'}}>myNFTlocker</p>
        <p style={{margin:'1px 0 0',fontSize:'0.48rem',color:'#9aa3b2',fontWeight:600,letterSpacing:'0.1em'}}>{isNBA(card)?'NBA':'FOOT'} • {season}</p>
      </div>
      <div style={{flex:1,minHeight:0,display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'center',padding:'0.2rem 0.3rem',overflow:'hidden'}}>
        <p style={{margin:0,width:'100%',fontSize:nfs(ln.length),fontWeight:900,color:'#fff',lineHeight:1.05,textAlign:'center',textShadow:'0 0 14px '+rc+'aa',overflow:'hidden'}}>{ln}</p>
        <p style={{margin:'2px 0 0',fontSize:'0.5rem',color:'#9aa3b2',fontWeight:700,letterSpacing:'0.05em'}}>{sn!==null?('#'+sn):''}{(sn!==null&&serial)?'  ·  ':''}{serial||''}</p>
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
        <span style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',height:'1.05rem',borderRadius:'0.3rem',border:'1px solid '+rc+'55',background:rc+'15',fontSize:'0.46rem',fontWeight:800,color:rc,letterSpacing:'0.02em',whiteSpace:'nowrap'}}>BONUS {bonus||'—'}</span>
        <span style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',height:'1.05rem',borderRadius:'0.3rem',border:'1px solid '+rc+'55',background:'rgba(0,0,0,0.4)',fontSize:'0.46rem',fontWeight:700,color:rc,textTransform:'uppercase',letterSpacing:'0.02em',whiteSpace:'nowrap'}}>{card.rarityTyped.replace('_',' ')}</span>
      </div>
    </div>
  );
});
CardBack.displayName='CardBack';

export const StatPanel=memo(({card,onClose,isClosing=false,placement='scene'}:any)=>{
  const rc=RARITY_COLOR[card.rarityTyped]||'#9ca3af';
  const {season,serial}=parseCard(card.name);
  const ln=(card.anyPlayer?.lastName||parseCard(card.name).lastName).toUpperCase();
  const sn=card.anyPlayer?.shirtNumber;
  const bonus=card.power?('+'+(Math.round((parseFloat(card.power)-1)*100))+'%'):null;
  const avgNum=card.averageScore!=null?parseFloat(String(card.averageScore)):null;
  const team=card.anyTeam?.name||'—';
  const xp=card.xp?card.xp.toLocaleString():'—';
  const edition=card.specialEdition?card.specialEdition.replace(/_/g,' ').toUpperCase():'STANDARD';
  const nbaSeasonStr=card.seasonYear&&card.seasonYear>2000?String(card.seasonYear)+'-'+String(card.seasonYear+1).slice(2):'2025-26';
  const raw=(card.anyPlayer?.playerGameScores||[]).map((s:any)=>s.score).filter((s:any)=>s!=null) as number[];
  const scores=[...raw].reverse();
  const [typedName,setTypedName]=useState('');
  const [countedAvg,setCountedAvg]=useState('0');
  const [nbaStats,setNbaStats]=useState<any>(null);
  const [nbaLoading,setNbaLoading]=useState(false);
  const [footStats,setFootStats]=useState<any>(null);
  const [footLoading,setFootLoading]=useState(false);
  const _full=(card.name.split('•')[0]||'').replace(/\d{4}-\d{2}/,'').trim();
  useEffect(()=>{let i=0;let iv:any;const t=setTimeout(()=>{iv=setInterval(()=>{i++;setTypedName(ln.slice(0,i));if(i>=ln.length)clearInterval(iv);},45);},600);return()=>{clearTimeout(t);clearInterval(iv);};},[ln]);
  useEffect(()=>{if(avgNum==null)return;let step=0;let iv:any;const t=setTimeout(()=>{iv=setInterval(()=>{step++;const cur=Math.min((avgNum/20)*step,avgNum);setCountedAvg(cur%1===0?String(Math.round(cur)):cur.toFixed(1));if(step>=20)clearInterval(iv);},40);},700);return()=>{clearTimeout(t);clearInterval(iv);};},[avgNum]);

  useEffect(()=>{if(!card.anyPlayer?.lastName)return;setNbaLoading(true);fetch(`/api/player-stats?name=${encodeURIComponent(_full||card.anyPlayer.lastName)}&season=${card.seasonYear||0}`).then(r=>r.json()).then(d=>{if(!d.error)setNbaStats(d);}).catch(()=>{}).finally(()=>setNbaLoading(false));},[]);
  useEffect(()=>{if(isNBA(card)||!card.anyPlayer?.lastName)return;setFootLoading(true);const tm=encodeURIComponent(_full||card.anyPlayer.lastName);const te=encodeURIComponent(card.anyTeam?.name||'');fetch(`/api/player-stats-foot?name=${tm}&team=${te}&season=${card.seasonYear||0}`).then(r=>r.json()).then(d=>{if(d&&!d.error)setFootStats(d);}).catch(()=>{}).finally(()=>setFootLoading(false));},[]);

  const W=240,H=46,n=scores.length;
  const mn=Math.min(...(n?scores:[0]),0),mx=Math.max(...(n?scores:[1]),1),rng=mx-mn||1;
  const sx=(i:number)=>((i/Math.max(n-1,1))*(W-10)+5).toFixed(1);
  const sy=(s:number)=>(H-5-((s-mn)/rng)*(H-10)).toFixed(1);
  const pts=n>1?scores.map((s,i)=>`${sx(i)},${sy(s)}`).join(' '):'';
  const gid='sg'+card.slug.slice(-4);
  const CY='#40e8ff';const CYS='0 0 8px rgba(64,232,255,0.5)';
  const sep:React.CSSProperties={borderBottom:'1px solid rgba(64,232,255,0.16)',paddingBottom:'0.42rem',marginBottom:'0.42rem',flexShrink:0};
  const fv=(v:any,t:string)=>{if(v==null)return '—';const n=Number(v);if(t==='pct')return n.toFixed(1)+'%';if(t==='pm')return(n>=0?'+':'')+n.toFixed(1);if(t==='int')return String(Math.round(n));return n.toFixed(1);};
  const isOverlay=placement==='overlay';
  const posStyle:React.CSSProperties=isOverlay
    ? {position:'fixed',right:'1%',top:'5vh',width:'30%',minWidth:'320px',maxWidth:'420px',height:'89vh',zIndex:200}
    : {position:'absolute',right:'1%',top:'5%',width:'30%',height:'89%',zIndex:50};
  const deployDelay=isOverlay?'0.1s':'0.45s';
  return(
    <div key={card.slug} style={{...posStyle,background:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(64,232,255,0.03) 2px,rgba(64,232,255,0.03) 3px),linear-gradient(rgba(2,10,22,0.95),rgba(2,10,22,0.95))',border:'1px solid rgba(64,232,255,0.5)',boxShadow:'0 0 40px rgba(64,232,255,0.15),inset 0 0 60px rgba(0,0,0,0.5)',clipPath:isClosing?'none':'polygon(14px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px)',padding:'0.8rem 0.75rem',display:'flex',flexDirection:'column' as const,overflow:'hidden',animation:isClosing?'mnflClose 0.45s cubic-bezier(0.7,0,0.95,1) both':('mnflDeploy 0.55s ease-out '+deployDelay+' backwards'),fontFamily:'Courier New,Consolas,monospace',backdropFilter:isClosing?'none':'blur(12px)',WebkitBackdropFilter:isClosing?'none':'blur(12px)'}}>
      <div style={{...sep,display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div>
          <p style={{margin:0,fontSize:'0.55rem',color:'rgba(64,232,255,0.5)',fontWeight:700,letterSpacing:'0.18em',textTransform:'uppercase'}}>myNFTlocker · STATS</p>
          <p style={{margin:'4px 0 2px',fontSize:'1.1rem',fontWeight:900,color:CY,letterSpacing:'0.06em',textShadow:CYS,minHeight:'1.35em'}}>{typedName}{typedName.length<ln.length?'▊':''}</p>
          <p style={{margin:0,fontSize:'0.6rem',color:'rgba(64,232,255,0.38)',letterSpacing:'0.04em'}}>{sn!=null?'#'+sn+' · ':''}{season}</p>
        </div>
        <button onClick={!isClosing?onClose:undefined} style={{background:'transparent',border:'1px solid rgba(64,232,255,0.35)',borderRadius:'50%',width:'20px',height:'20px',color:CY,cursor:'pointer',fontSize:'0.55rem',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,opacity:isClosing?0:1,marginTop:'2px'}}>✕</button>
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
        <p style={{margin:'0 0 0.2rem',fontSize:'0.5rem',color:'rgba(64,232,255,0.48)',letterSpacing:'0.14em',textTransform:'uppercase'}}>↗  10 DERNIERS MATCHS</p>
        <svg width='100%' viewBox={`0 0 ${W} ${H}`} style={{display:'block',overflow:'visible'}}>
          <defs><linearGradient id={gid} x1='0' y1='0' x2='0' y2='1'><stop offset='0%' stopColor={rc} stopOpacity='0.28'/><stop offset='100%' stopColor={rc} stopOpacity='0'/></linearGradient></defs>
          <polygon points={`5,${H-5} ${pts} ${sx(n-1)},${H-5}`} fill={`url(#${gid})`}/>
          <polyline points={pts} fill='none' stroke={rc} strokeWidth='1.8' strokeLinejoin='round' strokeLinecap='round'/>
          {scores.map((s:number,i:number)=>i%2===0?<circle key={i} cx={sx(i)} cy={sy(s)} r='2.5' fill={rc} opacity='0.9'/>:null)}
        </svg>
      </div>}
      <div style={{...sep}}>
        <p style={{margin:'0 0 0.3rem',fontSize:'0.52rem',fontWeight:900,color:'rgba(64,232,255,0.6)',letterSpacing:'0.2em',textTransform:'uppercase'}}>CARTE</p>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.18rem 0.6rem'}}>
          {([[' ÉQUIPE',team],[' SÉRIE',serial],[' SAISON',season],[' XP',xp],[' ÉDITION',edition]] as [string,string][]).map(([l,v])=>(
            <div key={l} style={{minWidth:0}}>
              <span style={{display:'block',fontSize:'0.5rem',color:'rgba(64,232,255,0.4)',letterSpacing:'0.1em',textTransform:'uppercase'}}>{l}</span>
              <span style={{display:'block',fontSize:'0.72rem',fontWeight:700,color:CY,textShadow:'0 0 5px rgba(64,232,255,0.3)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{...sep,flex:1,minHeight:0,overflow:'hidden'}}>
        {isNBA(card)?(
          <>
            <p style={{margin:'0 0 0.3rem',fontSize:'0.52rem',fontWeight:900,color:'rgba(64,232,255,0.6)',letterSpacing:'0.2em',textTransform:'uppercase'}}>NBA STATS · {nbaStats?.season||nbaSeasonStr}</p>
            {nbaLoading&&<p style={{margin:0,fontSize:'0.62rem',color:'rgba(64,232,255,0.42)',letterSpacing:'0.14em'}}>CHARGEMENT...</p>}
            {!nbaLoading&&nbaStats&&(
              <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'0.18rem'}}>
                {([[' PTS',nbaStats.pts,'dec'],[' AST',nbaStats.ast,'dec'],[' REB',nbaStats.reb,'dec'],[' STL',nbaStats.stl,'dec'],[' BLK',nbaStats.blk,'dec'],[' TOV',nbaStats.tov,'dec'],[' MIN',nbaStats.min,'dec'],[' FG%',nbaStats.fgp,'pct'],[' 3P%',nbaStats.tp,'pct'],[' FT%',nbaStats.ftp,'pct'],[' DD',nbaStats.dd,'int'],[' TD',nbaStats.td,'int']] as any[]).map(([l,v,t]:any)=>(<div key={l} style={{textAlign:'center',padding:'0.16rem 0.08rem',border:'1px solid rgba(64,232,255,0.14)',borderRadius:'0.2rem',background:'rgba(64,232,255,0.04)'}}><span style={{display:'block',fontSize:'0.4rem',color:'rgba(64,232,255,0.5)',letterSpacing:'0.04em',textTransform:'uppercase'}}>{l}</span><span style={{display:'block',fontSize:'0.76rem',fontWeight:900,color:CY,textShadow:CYS,lineHeight:1.15}}>{fv(v,t)}</span></div>))}
              </div>
            )}
            {!nbaLoading&&!nbaStats&&<p style={{margin:0,fontSize:'0.58rem',color:'rgba(64,232,255,0.28)',letterSpacing:'0.06em'}}>stats non disponibles</p>}
          </>
        ):(
          <>
            <p style={{margin:'0 0 0.3rem',fontSize:'0.52rem',fontWeight:900,color:'rgba(64,232,255,0.6)',letterSpacing:'0.2em',textTransform:'uppercase'}}>CLUB STATS · {card.seasonYear&&card.seasonYear>2000?String(card.seasonYear)+'-'+String(card.seasonYear+1).slice(2):'2025-26'}</p>
            {footLoading&&<p style={{margin:0,fontSize:'0.62rem',color:'rgba(64,232,255,0.42)',letterSpacing:'0.14em'}}>CHARGEMENT...</p>}
            {!footLoading&&footStats&&footStats.gp!=null&&(
              <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'0.18rem'}}>
                {([[' GP',footStats.gp,'int'],[' G',footStats.goals,'int'],[' A',footStats.assists,'int'],[' MIN',footStats.minutes,'int'],[' YC',footStats.yc,'int'],[' RC',footStats.rc,'int']] as any[]).map(([l,v,t]:any)=>(<div key={l} style={{textAlign:'center',padding:'0.16rem 0.08rem',border:'1px solid rgba(64,232,255,0.14)',borderRadius:'0.2rem',background:'rgba(64,232,255,0.04)'}}><span style={{display:'block',fontSize:'0.4rem',color:'rgba(64,232,255,0.5)',letterSpacing:'0.04em',textTransform:'uppercase'}}>{l}</span><span style={{display:'block',fontSize:'0.76rem',fontWeight:900,color:CY,textShadow:CYS,lineHeight:1.15}}>{fv(v,t)}</span></div>))}
              </div>
            )}
            {!footLoading&&(!footStats||footStats.gp==null)&&<p style={{margin:0,fontSize:'0.58rem',color:'rgba(64,232,255,0.28)',letterSpacing:'0.06em'}}>stats non disponibles</p>}
          </>
        )}
      </div>
      <div style={{display:'flex',gap:'0.4rem',marginBottom:'0.3rem',flexShrink:0}}>
        {(nbaStats?._id||!isNBA(card))&&(
          <a href={isNBA(card)?('https://sorare.com/fr/nba/players/'+card.slug.split('-').filter((_:any,i:number,a:any)=>i<a.length-3).join('-')+'?sale=true'):('https://sorare.com/fr/football/players/'+card.slug.split('-').filter((_:any,i:number,a:any)=>i<a.length-3).join('-')+'?sale=true')}
            target='_blank' rel='noopener noreferrer'
            style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:'0.3rem',padding:'0.3rem 0',borderRadius:'0.25rem',border:'1px solid rgba(64,232,255,0.5)',background:'rgba(64,232,255,0.06)',color:'#ffffff',fontSize:'0.55rem',fontWeight:800,letterSpacing:'0.1em',textDecoration:'none',cursor:'pointer'}}>
            <img src="/sorare-logo.png" alt="S" style={{width:'14px',height:'14px',borderRadius:'50%',objectFit:'cover'}} onError={(e:any)=>{e.target.style.display='none';}}/> SORARE
          </a>
        )}
        {isNBA(card)&&nbaStats?._id&&(
          <a href={'https://www.espn.com/nba/player/_/id/'+nbaStats._id+'/'+(_full||card.anyPlayer?.lastName||'').toLowerCase().replace(/\s+/g,'-')}
            target='_blank' rel='noopener noreferrer'
            style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:'0.3rem',padding:'0.3rem 0',borderRadius:'0.25rem',border:'1px solid rgba(64,232,255,0.5)',background:'rgba(64,232,255,0.06)',color:'#e05050',fontSize:'0.55rem',fontWeight:800,letterSpacing:'0.1em',textDecoration:'none',cursor:'pointer'}}>
            <img src="https://a.espncdn.com/favicon.ico" alt="E" style={{width:'14px',height:'14px',objectFit:'contain'}}/> ESPN
          </a>
        )}
        {!isNBA(card)&&(
          <a href={'https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query='+encodeURIComponent(_full||card.anyPlayer?.lastName||'')}
            target='_blank' rel='noopener noreferrer'
            style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:'0.3rem',padding:'0.3rem 0',borderRadius:'0.25rem',border:'1px solid rgba(64,232,255,0.5)',background:'rgba(64,232,255,0.06)',color:'#ffffff',fontSize:'0.55rem',fontWeight:800,letterSpacing:'0.1em',textDecoration:'none',cursor:'pointer'}}>
            <span style={{fontSize:'0.75rem',fontWeight:900,color:'#1d6fa4'}}>TM</span> TRANSFERMARKT
          </a>
        )}
      </div>
      <div style={{flexShrink:0,marginTop:'auto',paddingTop:'0.3rem',borderTop:'1px solid rgba(64,232,255,0.14)'}}>
        <div style={{display:'flex',gap:'0.3rem',marginBottom:'0.22rem'}}>
          {['BEAT L10','GW','RÉCOMP.'].map((l:string)=>(
            <div key={l} style={{flex:1,padding:'0.16rem 0',border:'1px solid rgba(64,232,255,0.1)',borderRadius:'0.2rem',textAlign:'center',background:'rgba(64,232,255,0.025)'}}><span style={{fontSize:'0.5rem',color:'rgba(64,232,255,0.28)',letterSpacing:'0.03em'}}>{l} 🔒</span></div>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.3rem',marginTop:'0.15rem'}}>
          {([['PRIX','-- ETH'],['OWNER','--']] as [string,string][]).map(([l,v])=>(
            <div key={l} style={{background:'rgba(0,0,0,0.3)',border:'1px solid rgba(64,232,255,0.12)',borderRadius:'0.25rem',padding:'0.28rem 0.4rem',display:'flex',flexDirection:'column' as const,gap:'0.1rem'}}><span style={{fontSize:'0.42rem',color:'rgba(64,232,255,0.4)',letterSpacing:'0.1em',textTransform:'uppercase'}}>{l} 🔒</span><span style={{fontSize:'0.62rem',color:'rgba(64,232,255,0.28)',fontWeight:600}}>{v}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
});
StatPanel.displayName='StatPanel';
