'use client';
import { memo, useState, useEffect } from 'react';
import { TEAM_BY_API, FALLBACK_IMG } from '../lib-teams';
const CITY_CLUB: Record<string,[string,string]> = {
  'Atlanta Hawks':['ATLANTA','HAWKS'],
  'Boston Celtics':['BOSTON','CELTICS'],
  'Brooklyn Nets':['BROOKLYN','NETS'],
  'Charlotte Hornets':['CHARLOTTE','HORNETS'],
  'Chicago Bulls':['CHICAGO','BULLS'],
  'Cleveland Cavaliers':['CLEVELAND','CAVALIERS'],
  'Dallas Mavericks':['DALLAS','MAVERICKS'],
  'Denver Nuggets':['DENVER','NUGGETS'],
  'Detroit Pistons':['DETROIT','PISTONS'],
  'Golden State Warriors':['GOLDEN STATE','WARRIORS'],
  'Houston Rockets':['HOUSTON','ROCKETS'],
  'Indiana Pacers':['INDIANA','PACERS'],
  'LA Clippers':['LOS ANGELES','CLIPPERS'],
  'Los Angeles Lakers':['LOS ANGELES','LAKERS'],
  'Memphis Grizzlies':['MEMPHIS','GRIZZLIES'],
  'Miami Heat':['MIAMI','HEAT'],
  'Milwaukee Bucks':['MILWAUKEE','BUCKS'],
  'Minnesota Timberwolves':['MINNESOTA','TIMBERWOLVES'],
  'New Orleans Pelicans':['NEW ORLEANS','PELICANS'],
  'New York Knicks':['NEW YORK','KNICKS'],
  'Oklahoma City Thunder':['OKLAHOMA CITY','THUNDER'],
  'Orlando Magic':['ORLANDO','MAGIC'],
  'Philadelphia 76ers':['PHILADELPHIA','76ERS'],
  'Phoenix Suns':['PHOENIX','SUNS'],
  'Portland Trail Blazers':['PORTLAND','TRAIL BLAZERS'],
  'Sacramento Kings':['SACRAMENTO','KINGS'],
  'San Antonio Spurs':['SAN ANTONIO','SPURS'],
  'Toronto Raptors':['TORONTO','RAPTORS'],
  'Utah Jazz':['UTAH','JAZZ'],
  'Washington Wizards':['WASHINGTON','WIZARDS'],
};

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
const isNBA=(slug:string)=>/\d{8}/.test(slug);
const parseCard=(name:string)=>{
  const parts=name.split('•');const left=parts[0].trim();const right=(parts[1]||'').trim();
  const sm=left.match(/(\d{4}-\d{2})/);const season=sm?sm[1]:'';
  const pn=left.replace(/\d{4}-\d{2}/,'').trim();
  const lastName=pn.split(' ').pop()!.toUpperCase();
  const sr=right.match(/(\d+\/\d+)/);
  return {lastName,season,serial:sr?sr[1]:null};
};
const nfs=(l:number)=>l<=5?'1.45rem':l<=7?'1.2rem':l<=9?'1rem':l<=11?'0.82rem':l<=13?'0.7rem':'0.6rem';
const plateFs=(l:number)=>l<=7?'0.8vw':l<=9?'0.7vw':l<=11?'0.58vw':l<=13?'0.5vw':'0.44vw';

// ===== POSITIONS VALIDEES (NE PAS TOUCHER) =====
const CARD_TOP = 31.7;
const SLOTS = [
  {left:20.8, w:10.5},
  {left:35.4, w:10.5},
  {left:50.0, w:10.5},
  {left:64.7, w:10.5},
  {left:79.2, w:10.5},
];
const PLATE_TOP = 73.0;
const PLATE_X = [20.6, 35.2, 49.9, 64.6, 79.3];
const TEAM_X = 50.0;
const TEAM_Y = 15.4;

const CardBack=memo(({card,rc}:any)=>{
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
        <p style={{margin:'1px 0 0',fontSize:'0.48rem',color:'#9aa3b2',fontWeight:600,letterSpacing:'0.1em'}}>{isNBA(card.slug)?'NBA':'FOOT'} • {season}</p>
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

const LockerCard=memo(({card,isFlipped,isStarred,isPinned,onFlip,onStar,onPin}:any)=>{
  const [hover,setHover]=useState(false);
  const glow=RARITY_GLOW[card.rarityTyped]||RARITY_GLOW.common;
  const fill=RARITY_FILL[card.rarityTyped]||RARITY_FILL.common;
  const rc=RARITY_COLOR[card.rarityTyped]||'#9ca3af';
  const fv=(v:any,t:string)=>{if(v==null)return '—';const n=Number(v);if(t==='pct')return n.toFixed(1)+'%';if(t==='pm')return(n>=0?'+':'')+n.toFixed(1);return n.toFixed(1);};
  return(
    <div style={{perspective:'900px',cursor:'pointer',width:'100%'}} onClick={()=>onFlip(card.slug)} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}>
      <div style={{position:'relative',transformStyle:'preserve-3d',transition:'transform 0.4s cubic-bezier(0.2,0.8,0.3,1),box-shadow 0.3s ease',transform:(isFlipped?'rotateY(180deg)':'rotateY(0deg)')+((hover&&!isFlipped)?' translateY(-12px) scale(1.035)':''),boxShadow:isFlipped?'0 0 12px 3px rgba(64,232,255,0.45),0 0 24px 6px rgba(64,232,255,0.2)':((hover&&!isFlipped)?glow+', 0 22px 40px -8px rgba(0,0,0,0.7)':glow),borderRadius:'0.4rem',background:fill,...({['--rc']:rc,animation:isFlipped?'mnflCyanPulse 2.2s ease-in-out infinite':undefined} as any)}}>
        <div style={{backfaceVisibility:'hidden',WebkitBackfaceVisibility:'hidden',borderRadius:'0.4rem',overflow:'hidden'}}>
          <button title='Titulaire du 5 majeur' style={{position:'absolute',top:'5px',left:'5px',background:isPinned?'#c9a227dd':'#00000088',border:'none',borderRadius:'50%',width:'22px',height:'22px',cursor:'pointer',fontSize:'11px',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10,opacity:(hover||isPinned)?1:0,transition:'opacity 0.2s',pointerEvents:(hover||isPinned)?'auto':'none'}}
            onClick={e=>{e.stopPropagation();onPin(card.slug);}}>📌</button>
          <button style={{position:'absolute',top:'5px',right:'5px',background:isStarred?'#7c3aedcc':'#00000088',border:'none',borderRadius:'50%',width:'22px',height:'22px',cursor:'pointer',fontSize:'11px',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10,opacity:(hover||isStarred)?1:0,transition:'opacity 0.2s',pointerEvents:(hover||isStarred)?'auto':'none'}}
            onClick={e=>{e.stopPropagation();onStar(card.slug);}}>
            {isStarred?'⭐':'☆'}
          </button>
          <img src={card.pictureUrl} alt={card.name} style={{width:'100%',height:'auto',display:'block'}}/>
        </div>
        <CardBack card={card} rc={rc}/>
      </div>
    </div>
  );
});
LockerCard.displayName='LockerCard';

interface Props{
  cards:any[]; startIndex:number; hof:string[]; flippedSlug:string|null;
  onFlip:(s:string)=>void; onStar:(s:string)=>void; onPin:(s:string)=>void;
  pinnedSlugs:string[];
  onPrev:()=>void; onNext:()=>void; total:number;
  teamApi:string; teamList:{api:string;display:string;count:number}[];
  onTeamChange:(api:string)=>void;
}

const StatPanel=memo(({card,onClose,isClosing=false}:any)=>{
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
  useEffect(()=>{let i=0;let iv:any;const t=setTimeout(()=>{iv=setInterval(()=>{i++;setTypedName(ln.slice(0,i));if(i>=ln.length)clearInterval(iv);},45);},600);return()=>{clearTimeout(t);clearInterval(iv);};},[ln]);
  useEffect(()=>{if(avgNum==null)return;let step=0;let iv:any;const t=setTimeout(()=>{iv=setInterval(()=>{step++;const cur=Math.min((avgNum/20)*step,avgNum);setCountedAvg(cur%1===0?String(Math.round(cur)):cur.toFixed(1));if(step>=20)clearInterval(iv);},40);},700);return()=>{clearTimeout(t);clearInterval(iv);};},[avgNum]);
  useEffect(()=>{if(!card.anyPlayer?.lastName)return;setNbaLoading(true);fetch(`/api/player-stats?name=${encodeURIComponent(card.anyPlayer.lastName)}&season=${card.seasonYear||0}`).then(r=>r.json()).then(d=>{if(!d.error)setNbaStats(d);}).catch(()=>{}).finally(()=>setNbaLoading(false));},[]);
  const W=240,H=46,n=scores.length;
  const mn=Math.min(...(n?scores:[0]),0),mx=Math.max(...(n?scores:[1]),1),rng=mx-mn||1;
  const sx=(i:number)=>((i/Math.max(n-1,1))*(W-10)+5).toFixed(1);
  const sy=(s:number)=>(H-5-((s-mn)/rng)*(H-10)).toFixed(1);
  const pts=n>1?scores.map((s,i)=>`${sx(i)},${sy(s)}`).join(' '):'';
  const gid='sg'+card.slug.slice(-4);
  const CY='#40e8ff';const CYS='0 0 8px rgba(64,232,255,0.5)';
  const sep:React.CSSProperties={borderBottom:'1px solid rgba(64,232,255,0.16)',paddingBottom:'0.42rem',marginBottom:'0.42rem',flexShrink:0};
  const fv=(v:any,t:string)=>{if(v==null)return '—';const n=Number(v);if(t==='pct')return n.toFixed(1)+'%';if(t==='pm')return(n>=0?'+':'')+n.toFixed(1);return n.toFixed(1);};
  return(
    <div key={card.slug} style={{position:'absolute',right:'1%',top:'5%',width:'30%',height:'89%',zIndex:50,background:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(64,232,255,0.03) 2px,rgba(64,232,255,0.03) 3px),linear-gradient(rgba(2,10,22,0.95),rgba(2,10,22,0.95))',border:'1px solid rgba(64,232,255,0.5)',boxShadow:'0 0 40px rgba(64,232,255,0.15),inset 0 0 60px rgba(0,0,0,0.5)',clipPath:isClosing?'none':'polygon(14px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px)',padding:'0.8rem 0.75rem',display:'flex',flexDirection:'column' as const,overflow:'hidden',animation:isClosing?'mnflClose 0.45s cubic-bezier(0.7,0,0.95,1) both':'mnflDeploy 0.55s ease-out 0.45s backwards',fontFamily:'Courier New,Consolas,monospace',backdropFilter:isClosing?'none':'blur(12px)',WebkitBackdropFilter:isClosing?'none':'blur(12px)'}}>
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
        <p style={{margin:'0 0 0.3rem',fontSize:'0.52rem',fontWeight:900,color:'rgba(64,232,255,0.6)',letterSpacing:'0.2em',textTransform:'uppercase'}}>NBA STATS · {nbaStats?.season||nbaSeasonStr}</p>
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
export default function LockerRoomScene({cards=[],startIndex,hof=[],flippedSlug,onFlip,onStar,onPin,pinnedSlugs=[],onPrev,onNext,total,teamApi,teamList=[],onTeamChange}:Props){
  const visible=cards.slice(startIndex,startIndex+5);
  const panelCard=flippedSlug?(cards.find((c:any)=>c.slug===flippedSlug)||null):null;
  const laserSlot=flippedSlug?visible.findIndex((c:any)=>c.slug===flippedSlug):-1;
  const [isClosing,setIsClosing]=useState(false);
  const startClose=()=>{const slug=flippedSlug;setIsClosing(true);setTimeout(()=>{if(slug)onFlip(slug);setIsClosing(false);},600);};
  const handleCardFlip=(slug:string)=>{if(slug===flippedSlug){startClose();}else{onFlip(slug);}};
  const hasPrev=startIndex>0;const hasNext=startIndex+5<total;
  const from=total===0?0:startIndex+1;const to=Math.min(startIndex+5,total);
  const isHofView = teamApi==='__HOF__';
  const info=TEAM_BY_API[teamApi];
  const img=isHofView?'locker-hof.png':(info?info.img:FALLBACK_IMG);
  const displayName=isHofView?'HALL OF FAME':(info?info.display:teamApi);
  const nameLines=isHofView?['HALL OF','FAME']:(CITY_CLUB[teamApi]||[displayName,'']);
  // index equipe courante pour fleches equipe
  const teamIdx=teamList.findIndex(t=>t.api===teamApi);
  const prevTeam=teamIdx>0?teamList[teamIdx-1]:null;
  const nextTeam=teamIdx<teamList.length-1?teamList[teamIdx+1]:null;
  const [listOpen,setListOpen]=useState(false);
  const [slideDir,setSlideDir]=useState<'left'|'right'|null>(null);
  const [slideKey,setSlideKey]=useState(0);
  const teamLbl=(t:any)=>{const d=TEAM_BY_API[t.api];const n=d?d.display:(t.api==='__HOF__'?'\uD83C\uDFC6 HALL OF FAME':t.api);return n+' ('+t.count+')';};
  const curTeam=teamList.find(t=>t.api===teamApi);

  const fv=(v:any,t:string)=>{if(v==null)return '—';const n=Number(v);if(t==='pct')return n.toFixed(1)+'%';if(t==='pm')return(n>=0?'+':'')+n.toFixed(1);return n.toFixed(1);};
  return(
    <div>
      {/* ===== SELECTEUR EQUIPE (Variante B minimaliste) ===== */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',width:'440px',maxWidth:'90%',margin:'0 auto 0.5rem',position:'relative',paddingBottom:'0.35rem',borderBottom:'1px solid rgba(111,195,232,0.22)',boxShadow:'0 8px 16px -10px rgba(111,195,232,0.5)'}}>
        <button disabled={!prevTeam} onClick={()=>{if(prevTeam){setSlideDir('right');setSlideKey(k=>k+1);onTeamChange(prevTeam.api);}}} style={{flex:'0 0 auto',background:'transparent',border:'none',color:prevTeam?'#e8c456':'#39495c',fontSize:'2.1rem',lineHeight:1,cursor:prevTeam?'pointer':'default',padding:'0 0.4rem',transition:'all 0.15s',textShadow:prevTeam?'0 0 8px rgba(245,200,90,0.35)':'none'}} onMouseEnter={e=>{if(prevTeam)(e.currentTarget as HTMLElement).style.textShadow='0 0 16px rgba(245,200,90,0.9)';}} onMouseLeave={e=>{if(prevTeam)(e.currentTarget as HTMLElement).style.textShadow='0 0 8px rgba(245,200,90,0.35)';}}>‹</button>
        <div onClick={()=>setListOpen(o=>!o)} style={{flex:1,minWidth:0,textAlign:'center',cursor:'pointer',fontSize:'1.1rem',fontWeight:900,letterSpacing:'0.1em',color:listOpen?'#ffe27a':'#f5d76e',fontFamily:'Georgia,serif',textShadow:'0 0 16px rgba(245,200,90,0.5),0 2px 5px rgba(0,0,0,0.7)',transition:'color 0.15s',userSelect:'none',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',textTransform:'uppercase'}} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color='#ffe27a';}} onMouseLeave={e=>{if(!listOpen)(e.currentTarget as HTMLElement).style.color='#f5d76e';}}>
          {curTeam?teamLbl(curTeam):teamApi} <span style={{fontSize:'0.7rem',opacity:0.7}}>{listOpen?'▲':'▼'}</span>
        </div>
        <button disabled={!nextTeam} onClick={()=>{if(nextTeam){setSlideDir('left');setSlideKey(k=>k+1);onTeamChange(nextTeam.api);}}} style={{flex:'0 0 auto',background:'transparent',border:'none',color:nextTeam?'#e8c456':'#39495c',fontSize:'2.1rem',lineHeight:1,cursor:nextTeam?'pointer':'default',padding:'0 0.4rem',transition:'all 0.15s',textShadow:nextTeam?'0 0 8px rgba(245,200,90,0.35)':'none'}} onMouseEnter={e=>{if(nextTeam)(e.currentTarget as HTMLElement).style.textShadow='0 0 16px rgba(245,200,90,0.9)';}} onMouseLeave={e=>{if(nextTeam)(e.currentTarget as HTMLElement).style.textShadow='0 0 8px rgba(245,200,90,0.35)';}}>›</button>
        {listOpen&&(
          <div onMouseLeave={()=>setListOpen(false)} className='thin-sb' style={{position:'absolute',top:'100%',left:'50%',transform:'translateX(-50%)',marginTop:'8px',width:'270px',maxHeight:'62vh',overflowY:'auto',background:'#080a0e',border:'1px solid #6fc3e8',borderRadius:'0.5rem',padding:'0.3rem',zIndex:200,boxShadow:'0 16px 44px rgba(0,0,0,0.8),0 0 16px rgba(111,195,232,0.2)'}}>
            {teamList.map(t=>(
              <button key={t.api} onClick={()=>{setSlideDir('left');setSlideKey(k=>k+1);onTeamChange(t.api);setListOpen(false);}} style={{display:'block',width:'100%',textAlign:'center',padding:'0.42rem 0.6rem',borderRadius:'0.25rem',border:'none',cursor:'pointer',fontSize:'0.82rem',fontWeight:t.api===teamApi?700:500,background:t.api===teamApi?'rgba(245,215,110,0.12)':'transparent',color:t.api===teamApi?'#f5d76e':'#cfd8e6',fontFamily:'Georgia,serif',marginBottom:'1px'}} onMouseEnter={e=>{if(t.api!==teamApi)(e.currentTarget as HTMLElement).style.background='rgba(111,195,232,0.12)';}} onMouseLeave={e=>{if(t.api!==teamApi)(e.currentTarget as HTMLElement).style.background='transparent';}}>{teamLbl(t)}</button>
            ))}
          </div>
        )}
      </div>

      {/* ===== SCENE VESTIAIRE ===== */}
      <div style={{position:'relative',width:'100%',maxWidth:'calc((100vh - 110px) * 1.792)',aspectRatio:'1376 / 768',margin:'0 auto',overflow:'hidden',background:'#0a0503',borderRadius:'18px',border:'1px solid rgba(255,255,255,0.05)',boxShadow:'0 30px 90px rgba(0,0,0,0.85), 0 0 0 1px rgba(0,0,0,0.6), inset 0 0 130px rgba(0,0,0,0.5)'}}>
        <img src={'/'+img} alt='vestiaire' onError={(e)=>{(e.target as HTMLImageElement).src='/'+FALLBACK_IMG;}}
          style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',objectFit:'fill'}}
        />

        {/* PARTICULES (poussiere dans les faisceaux) */}
        <div style={{position:'absolute',inset:0,zIndex:5,pointerEvents:'none',overflow:'hidden'}}>
          {[...Array(14)].map((_,i)=>{const lx=(i*67)%96+2;const sz=1.5+(i%3);const dur=7+(i%5)*2;const dl=(i%7);const tp=8+((i*53)%58);return <div key={i} style={{position:'absolute',left:lx+'%',top:tp+'%',width:sz+'px',height:sz+'px',borderRadius:'50%',background:'rgba(255,238,200,0.7)',filter:'blur(0.5px)',boxShadow:'0 0 4px rgba(255,230,180,0.6)',animation:'mnflFloat '+dur+'s ease-in-out '+dl+'s infinite'}}/>;})}
        </div>

        {/* NOM EQUIPE — 2 lignes ville/club */}
        <div style={{position:'absolute',left:TEAM_X+'%',top:TEAM_Y+'%',transform:'translate(-50%,-50%)',zIndex:15,textAlign:'center',width:'27%',lineHeight:1.05}}>
          <div style={{fontSize:'1.7vw',fontWeight:900,letterSpacing:'0.12em',textTransform:'uppercase',fontFamily:'Georgia,serif',color:'#ffd060',textShadow:'0 0 8px rgba(255,200,60,0.9),0 0 20px rgba(255,160,0,0.7)',whiteSpace:'nowrap'}}>
            {nameLines[0]}
          </div>
          <div style={{fontSize:'1.7vw',fontWeight:900,letterSpacing:'0.12em',textTransform:'uppercase',fontFamily:'Georgia,serif',color:'#ffd060',textShadow:'0 0 10px rgba(255,200,60,0.95),0 0 30px rgba(255,160,0,0.85),0 0 60px rgba(255,120,0,0.5)',whiteSpace:'nowrap'}}>
            {nameLines[1]}
          </div>
        </div>

        {/* RAIL JOUEURS : glisse au changement de page/equipe */}
        <div style={{position:'absolute',inset:0,zIndex:10}}>
        {/* CARTES */}
        {visible.map((card,i)=>(
          <div key={card.slug} style={{position:'absolute',left:SLOTS[i].left+'%',top:CARD_TOP+'%',width:SLOTS[i].w+'%',transform:'translateX(-50%)',zIndex:10,filter:'drop-shadow(0 16px 11px rgba(0,0,0,0.6))',transition:'left 0.45s cubic-bezier(0.2,0.8,0.3,1),top 0.45s',animation:'mnflBuild 0.85s ease-out backwards',animationDelay:(i*0.06)+'s'}}>
            <LockerCard card={card} isFlipped={flippedSlug===card.slug} isStarred={hof.includes(card.slug)} isPinned={pinnedSlugs.includes(card.slug)} onFlip={handleCardFlip} onStar={onStar} onPin={onPin}/>
            {flippedSlug===card.slug&&(<svg style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',zIndex:22,pointerEvents:'none',overflow:'visible'}}><rect x='0' y='0' width='100%' height='100%' rx='6' pathLength='1000' fill='none' stroke='#40e8ff' strokeWidth='2.5' style={{filter:'drop-shadow(0 0 9px rgba(64,232,255,0.9))',strokeDasharray:'1000',strokeDashoffset:'1000',animation:'mnflCardTrace 1.4s ease-in-out 0.5s both'}}/></svg>)}
          </div>
        ))}

        {/* NOMS PLAQUES */}
        {visible.map((card,i)=>(
          <div key={'p'+card.slug} style={{position:'absolute',left:PLATE_X[i]+'%',top:PLATE_TOP+'%',width:'7%',transform:'translate(-50%,-50%)',zIndex:15,textAlign:'center',overflow:'hidden',transition:'left 0.45s cubic-bezier(0.2,0.8,0.3,1)'}}>
            <span style={{fontSize:plateFs((card.anyPlayer?.lastName||parseCard(card.name).lastName).length),fontWeight:900,color:'#1a0d00',letterSpacing:'0.03em',textTransform:'uppercase',fontFamily:'Georgia,serif',textShadow:'0 1px 1px rgba(255,230,150,0.55),0 -1px 0 rgba(0,0,0,0.25)',whiteSpace:'nowrap'}}>
              {(card.anyPlayer?.lastName||parseCard(card.name).lastName).toUpperCase()}
            </span>
          </div>
        ))}
        </div>
        {flippedSlug&&laserSlot>=0&&!isClosing&&(
          <div key={'lsr'+flippedSlug} style={{position:'absolute',left:SLOTS[laserSlot].left+'%',top:'2%',transform:'translateX(-50%)',width:'4px',zIndex:25,background:'linear-gradient(to bottom,rgba(64,232,255,0.95),rgba(0,100,200,0.1))',boxShadow:'0 0 10px 3px rgba(64,232,255,0.55)',borderRadius:'2px',pointerEvents:'none',animation:'mnflLaser 0.7s ease-out both'}}/>
        )}
        {flippedSlug&&laserSlot>=0&&isClosing&&(
          <div key={'ice'+flippedSlug} style={{position:'absolute',left:'84%',top:'49%',transform:'translate(-50%,-50%)',width:'31%',height:'6px',background:'linear-gradient(to right,transparent 0%,rgba(0,255,255,0.5) 15%,#00ffff 40%,#ffffff 50%,#00ffff 60%,rgba(0,255,255,0.5) 85%,transparent 100%)',filter:'blur(0.8px)',zIndex:55,pointerEvents:'none',animation:'mnflIcebreaker 0.75s ease-out 0.62s both'}}/>
        )}
        {/* Icebreaker trace ci-dessus */}
        {flippedSlug&&panelCard&&<StatPanel card={panelCard} isClosing={isClosing} onClose={startClose}/>}

        {/* FLECHES CARTES (navigation dans l'equipe) */}
        {hasPrev&&<button onClick={()=>{setSlideDir('right');setSlideKey(k=>k+1);onPrev();}} style={{position:'absolute',left:'0.6%',top:'43%',transform:'translateY(-50%)',background:'transparent',border:'none',color:'rgba(232,196,86,0.55)',fontSize:'2.4rem',lineHeight:1,cursor:'pointer',padding:'0.5rem',zIndex:20,transition:'all 0.15s',textShadow:'0 0 8px rgba(0,0,0,0.8)'}} onMouseEnter={e=>{const t=e.currentTarget as HTMLElement;t.style.color='#ffd75e';t.style.textShadow='0 0 16px rgba(245,200,90,0.9)';}} onMouseLeave={e=>{const t=e.currentTarget as HTMLElement;t.style.color='rgba(232,196,86,0.55)';t.style.textShadow='0 0 8px rgba(0,0,0,0.8)';}}>‹</button>}
        {hasNext&&<button onClick={()=>{setSlideDir('left');setSlideKey(k=>k+1);onNext();}} style={{position:'absolute',right:'0.6%',top:'43%',transform:'translateY(-50%)',background:'transparent',border:'none',color:'rgba(232,196,86,0.55)',fontSize:'2.4rem',lineHeight:1,cursor:'pointer',padding:'0.5rem',zIndex:20,transition:'all 0.15s',textShadow:'0 0 8px rgba(0,0,0,0.8)'}} onMouseEnter={e=>{const t=e.currentTarget as HTMLElement;t.style.color='#ffd75e';t.style.textShadow='0 0 16px rgba(245,200,90,0.9)';}} onMouseLeave={e=>{const t=e.currentTarget as HTMLElement;t.style.color='rgba(232,196,86,0.55)';t.style.textShadow='0 0 8px rgba(0,0,0,0.8)';}}>›</button>}

        {/* COMPTEUR */}
        <div style={{position:'absolute',bottom:'1.5%',left:'50%',transform:'translateX(-50%)',color:'rgba(255,220,100,0.85)',fontSize:'0.75rem',letterSpacing:'0.15em',zIndex:10,textShadow:'0 1px 4px rgba(0,0,0,0.9)'}}>
          {from}-{to} / {total}
        </div>
      </div>
    </div>
  );
}