'use client';
import { memo, useState, useEffect, useId } from 'react';

export const RARITY_GLOW: Record<string,string> = {
  common:'0 0 18px 3px rgba(225,228,255,0.75), 0 0 36px 8px rgba(190,200,255,0.35)',
  limited:'0 0 20px 4px rgba(234,179,8,0.95), 0 0 42px 10px rgba(234,179,8,0.45)',
  rare:'0 0 20px 4px rgba(239,68,68,0.97), 0 0 44px 11px rgba(239,68,68,0.5)',
  super_rare:'0 0 20px 4px rgba(59,130,246,0.97), 0 0 44px 11px rgba(59,130,246,0.5)',
  unique:'0 0 24px 5px rgba(168,85,247,1), 0 0 50px 12px rgba(168,85,247,0.55)',
};
export const RARITY_COLOR: Record<string,string> = {
  common:'#9ca3af',limited:'#eab308',rare:'#3b82f6',super_rare:'#ef4444',unique:'#a855f7',
};
export const RARITY_FILL: Record<string,string> = {
  common:'#a8a8b5',limited:'#b48a14',rare:'#1e4ba8',super_rare:'#a82a2a',unique:'#7e3fc4',
};
export const isNBA=(c:any)=>c?.__typename==='NBACard';

// Etoiles foot (tracés repris exactement de Sorare). 5 etoiles = entourees (cadre dore) + etincelles qui scintillent,
// reutilise partout ou s'affichent des etoiles foot (stat panel, dos de carte, badge gradage galerie). s = taille d'une etoile (px ou cqw).
const STAR16='M7.00001 0H9.00001L10.4871 4.57681L15.2994 4.57681L15.9175 6.47892L12.0242 9.30754L13.5113 13.8843L11.8933 15.0599L8.00002 12.2313L4.10677 15.0599L2.48873 13.8843L3.97581 9.30756L0.0825195 6.47893L0.700554 4.57682L5.51292 4.57681L7.00001 0Z';
const SPARK184='M92 0C92 0 96 63.4731 108.263 75.7365C120.527 88 184 92 184 92C184 92 118.527 98 108.263 108.263C98 118.527 92 184 92 184C92 184 86.4731 119 75.7365 108.263C65 97.5269 0 92 0 92C0 92 63.9731 87.5 75.7365 75.7365C87.5 63.9731 92 0 92 0Z';
const FOOT_SPARKS=[{l:'4%',t:'-22%',k:0.72,d:2.2,dl:0},{l:'34%',t:'60%',k:0.5,d:2.8,dl:0.5},{l:'60%',t:'-16%',k:0.64,d:2.4,dl:0.9},{l:'86%',t:'52%',k:0.5,d:2.6,dl:1.3},{l:'50%',t:'16%',k:0.4,d:3.0,dl:1.7}];
export const FootStars=({n,s}:{n:number;s:string})=>{
  const uid=useId().replace(/[^a-zA-Z0-9]/g,'');
  const cnt=Math.max(1,Math.min(5,Math.round(n)));
  const defs=(<svg width='0' height='0' aria-hidden style={{position:'absolute'}}><defs><linearGradient id={'fg'+uid} x1='0' y1='0' x2='0' y2='1'><stop offset='0' stopColor='#fff3b0'/><stop offset='0.5' stopColor='#ffd914'/><stop offset='1' stopColor='#c9870f'/></linearGradient></defs></svg>);
  const row=Array.from({length:cnt}).map((_,i)=>(<svg key={i} viewBox='0 0 16 16' style={{width:s,height:s,display:'block',flexShrink:0}}><path d={STAR16} fill={'url(#fg'+uid+')'}/></svg>));
  if(cnt<5){
    return(<span style={{display:'inline-flex',alignItems:'center',gap:'calc('+s+' / 8)',lineHeight:0}}>{defs}{row}</span>);
  }
  return(<span style={{position:'relative',display:'inline-flex',alignItems:'center',gap:'calc('+s+' / 5)',lineHeight:0,padding:'calc('+s+' / 4) calc('+s+' / 2)',borderRadius:'999px',border:'1px solid rgba(255,217,20,0.45)',background:'radial-gradient(120% 140% at 50% 20%,rgba(255,217,20,0.14),rgba(255,217,20,0.03) 70%,transparent)',boxShadow:'0 0 10px -2px rgba(255,217,20,0.35),inset 0 0 6px -2px rgba(255,217,20,0.3)'}}>
    {defs}{row}
    {FOOT_SPARKS.map((o,i)=>(<span key={'sp'+i} style={{position:'absolute',left:o.l,top:o.t,color:'#fff',pointerEvents:'none',lineHeight:0,filter:'drop-shadow(0 0 2px rgba(255,236,150,0.9))',transform:'scale(0)',animation:'mnflTwinkle '+o.d+'s ease-in-out '+o.dl+'s infinite'}}><svg viewBox='0 0 184 184' style={{width:'calc('+s+' * '+o.k+')',height:'calc('+s+' * '+o.k+')',display:'block'}}><path fill='currentColor' d={SPARK184}/></svg></span>))}
  </span>);
};
export const parseCard=(name:string)=>{
  const parts=name.split('•');const left=parts[0].trim();const right=(parts[1]||'').trim();
  const sm=left.match(/(\d{4}-\d{2})/);const season=sm?sm[1]:'';
  const pn=left.replace(/\d{4}-\d{2}/,'').trim();
  const lastName=pn.split(' ').pop()!.toUpperCase();
  const sr=right.match(/(\d+\/\d+)/);
  return {lastName,season,serial:sr?sr[1]:null};
};
export const nfs=(l:number)=>l<=5?'1.45rem':l<=7?'1.2rem':l<=9?'1rem':l<=11?'0.82rem':l<=13?'0.7rem':'0.6rem';

export const CardBack=memo(({card,rc,mobile}:any)=>{
  const rid=useId().replace(/[^a-zA-Z0-9]/g,'');
  const sz=(remStr:string,px:number)=>mobile?(Math.round(px/115*10000)/100)+'cqw':remStr;
  const nfsCard=(l:number)=>mobile?(l<=5?'19cqw':l<=7?'15.5cqw':l<=8?'13.6cqw':l<=9?'12.4cqw':l<=10?'11cqw':l<=11?'9.9cqw':l<=12?'9.1cqw':l<=13?'8.4cqw':'7.4cqw'):nfs(l);
  const {season,serial}=parseCard(card.name);
  const ln=(card.anyPlayer?.lastName||parseCard(card.name).lastName).toUpperCase();
  const sn=card.anyPlayer?.shirtNumber??null;
  const bonus=card.power?('+'+Math.round((parseFloat(card.power)-1)*100)+'%'):null;
  const score=card.averageScore!=null?String(card.averageScore):null;
  // ETOILES Sorare : vraie note "gameplayTierStars" (Float 1-5 par demi-crans) recuperee sur la fiche joueur.
  const sv=card.anyPlayer?.gameplayTierStars;
  const stars=(sv==null||isNaN(Number(sv)))?null:Math.max(0,Math.min(5,Number(sv)));
  // Pentagone d'etoiles facon Sorare : arrangement par tier + couleur hexagone selon le tier (orange bas -> cyan haut).
  const starN=stars==null?0:Math.min(5,Math.max(1,Math.ceil(stars)));
  const starFull=stars==null?0:Math.floor(stars);
  const STAR_LAYOUTS:Record<number,number[][]>={1:[[50,50]],2:[[34,50],[66,50]],3:[[33,36],[67,36],[50,67]],4:[[34,35],[66,35],[34,67],[66,67]],5:[[32,33],[68,33],[32,69],[68,69],[50,51]]};
  const starPos:number[][]=stars==null?[]:(STAR_LAYOUTS[starN]||[]);
  const STAR_PATH='M12 1.6l2.95 7.03 7.6.62-5.78 4.96 1.75 7.42L12 17.7l-6.52 3.93 1.75-7.42L1.45 9.25l7.6-.62z';
  const starUid='s'+rid+starN;
  const lerp=(a:number,b:number,t:number)=>Math.round(a+(b-a)*t);
  const tT=stars==null?0:Math.max(0,Math.min(1,(stars-1)/4));
  const tierCol='rgb('+lerp(255,0,tT)+','+lerp(126,243,tT)+','+lerp(52,235,tT)+')';
  const starFrac=(i:number)=>stars==null?0:(i<starFull?1:((stars-starFull)>=0.5?0.5:1));
  const fv=(v:any,t:string)=>{if(v==null)return '—';const n=Number(v);if(t==='pct')return n.toFixed(1)+'%';if(t==='pm')return(n>=0?'+':'')+n.toFixed(1);return n.toFixed(1);};
  return(
    <div style={{position:'absolute',inset:0,backfaceVisibility:'hidden',WebkitBackfaceVisibility:'hidden',transform:'rotateY(180deg)',borderRadius:'0.4rem',overflow:'hidden',background:'radial-gradient(ellipse 130% 90% at 50% 0%,#191b24 0%,#0c0d14 60%,#06070d 100%)',display:'flex',flexDirection:'column' as const,border:'1px solid '+rc+'44'}}>
      <div style={{height:'3px',background:'linear-gradient(90deg,transparent,'+rc+',transparent)'}}></div>
      <div style={{padding:sz('0.45rem',7.2)+' '+sz('0.42rem',6.7)+' '+sz('0.38rem',6),textAlign:'center',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <p style={{margin:0,fontSize:sz('0.6rem',9.6),color:'#e3c074',fontWeight:900,letterSpacing:'0.08em'}}>myNFTlocker</p>
        <p style={{margin:'1px 0 0',fontSize:sz('0.48rem',7.68),color:'#9aa3b2',fontWeight:600,letterSpacing:'0.1em'}}>{isNBA(card)?'NBA':'FOOT'} • {season}</p>
      </div>
      <div style={{flex:1,minHeight:0,display:'flex',flexDirection:'column' as const,alignItems:'center',padding:sz('0.5rem',8)+' '+sz('0.42rem',6.7)+' '+sz('0.3rem',4.8),overflow:'hidden'}}>
        {/* nom en haut de la zone */}
        <div style={{width:'100%',marginTop:sz('0.35rem',5.6),textAlign:'center' as const}}>
          <p style={{margin:0,width:'100%',fontSize:nfsCard(ln.length),fontWeight:900,color:'#fff',lineHeight:1.05,textAlign:'center',textShadow:'0 0 14px '+rc+'aa',overflow:'hidden',whiteSpace:'nowrap' as const,textOverflow:'ellipsis'}}>{ln}</p>
          <p style={{margin:sz('0.3rem',4.8)+' 0 0',fontSize:sz('0.5rem',8),color:'#9aa3b2',fontWeight:700,letterSpacing:'0.05em'}}>{sn!==null?('#'+sn):''}{(sn!==null&&serial)?'  ·  ':''}{serial||''}</p>
        </div>
        {/* bloc L10 + etoiles : recentre dans l'espace restant (entre le nom et le bas) */}
        <div style={{margin:'auto 0',textAlign:'center' as const}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:sz('0.45rem',7.2),lineHeight:1}}>
            <span style={{fontSize:sz('1.4rem',22.4),fontWeight:900,color:'#fff',lineHeight:1,textShadow:score?('0 0 14px '+rc+'aa'):'none'}}>{score||'—'}</span>
            {stars!=null&&isNBA(card)&&(
              <svg viewBox='0 0 100 100' style={{width:sz('2rem',32),height:sz('2rem',32),flexShrink:0,overflow:'visible'}}>
                <defs>
                  <linearGradient id={'gold'+starUid} x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='0' stopColor='#fff6b0'/><stop offset='0.45' stopColor='#f5d76e'/><stop offset='1' stopColor='#c9870f'/>
                  </linearGradient>
                </defs>
                <polygon points='50,3 92,27 92,73 50,97 8,73 8,27' fill={tierCol} fillOpacity='0.22' stroke={tierCol} strokeWidth='4' strokeOpacity='0.9'/>
                {starPos.map((p,i)=>{
                  const f=starFrac(i);const sc=1.15;const off=12*sc;const cid='c'+starUid+i;
                  return(<g key={i} transform={'translate('+(p[0]-off)+','+(p[1]-off)+') scale('+sc+')'}>
                    <path d={STAR_PATH} fill='rgba(255,255,255,0.16)'/>
                    <clipPath id={cid}><rect x='0' y='0' width={24*f} height='24'/></clipPath>
                    <path d={STAR_PATH} fill={'url(#gold'+starUid+')'} clipPath={'url(#'+cid+')'} style={{filter:'drop-shadow(0 0 1.5px rgba(245,215,110,0.7))'}}/>
                  </g>);
                })}
              </svg>
            )}
            {stars!=null&&!isNBA(card)&&(
              <FootStars n={Math.round(stars)} s={sz('0.9rem',14.4)}/>
            )}
          </div>
          <p style={{margin:sz('0.3rem',4.8)+' 0 0',fontSize:sz('0.42rem',6.72),color:rc,textTransform:'uppercase',fontWeight:800,letterSpacing:'0.1em'}}>MOYENNE L10</p>
        </div>
      </div>
      <div style={{display:'flex',gap:'0.3rem',padding:sz('0.4rem',6.4)+' '+sz('0.5rem',8)+' '+sz('0.5rem',8)}}>
        <span style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',height:'1.05rem',borderRadius:'0.3rem',border:'1px solid '+rc+'55',background:rc+'15',fontSize:sz('0.46rem',7.36),fontWeight:800,color:rc,letterSpacing:'0.02em',whiteSpace:'nowrap'}}>BONUS {bonus||'—'}</span>
        <span style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',height:'1.05rem',borderRadius:'0.3rem',border:'1px solid '+rc+'55',background:'rgba(0,0,0,0.4)',fontSize:sz('0.46rem',7.36),fontWeight:700,color:rc,textTransform:'uppercase',letterSpacing:'0.02em',whiteSpace:'nowrap'}}>{card.rarityTyped.replace('_',' ')}</span>
      </div>
    </div>
  );
});
CardBack.displayName='CardBack';

// Note en etoiles reutilisable (tableau noir) : pentagone NBA / rangee foot, meme donnee gameplayTierStars.
export const StarRating=({card,box}:{card:any;box:number})=>{
  const rid=useId().replace(/[^a-zA-Z0-9]/g,'');
  const sv=card?.anyPlayer?.gameplayTierStars;
  const stars=(sv==null||isNaN(Number(sv)))?null:Math.max(0,Math.min(5,Number(sv)));
  if(stars==null)return null;
  const PATH='M12 1.6l2.95 7.03 7.6.62-5.78 4.96 1.75 7.42L12 17.7l-6.52 3.93 1.75-7.42L1.45 9.25l7.6-.62z';
  const uid='r'+rid;
  const grad=(id:string)=>(<linearGradient id={id} x1='0' y1='0' x2='0' y2='1'><stop offset='0' stopColor='#fff6b0'/><stop offset='0.45' stopColor='#f5d76e'/><stop offset='1' stopColor='#c9870f'/></linearGradient>);
  if(isNBA(card)){
    const starN=Math.min(5,Math.max(1,Math.ceil(stars)));
    const starFull=Math.floor(stars);
    const LAY:Record<number,number[][]>={1:[[50,50]],2:[[34,50],[66,50]],3:[[33,36],[67,36],[50,67]],4:[[34,35],[66,35],[34,67],[66,67]],5:[[32,33],[68,33],[32,69],[68,69],[50,51]]};
    const pos=LAY[starN]||[];
    const lerp=(a:number,b:number,t:number)=>Math.round(a+(b-a)*t);
    const tT=Math.max(0,Math.min(1,(stars-1)/4));
    const tierCol='rgb('+lerp(255,0,tT)+','+lerp(126,243,tT)+','+lerp(52,235,tT)+')';
    const frac=(i:number)=>(i<starFull?1:((stars-starFull)>=0.5?0.5:1));
    return(<svg viewBox='0 0 100 100' style={{width:box,height:box,flexShrink:0,overflow:'visible'}}>
      <defs>{grad('g'+uid)}</defs>
      <polygon points='50,3 92,27 92,73 50,97 8,73 8,27' fill={tierCol} fillOpacity='0.22' stroke={tierCol} strokeWidth='4' strokeOpacity='0.9'/>
      {pos.map((p,i)=>{const f=frac(i);const sc=1.15;const off=12*sc;const cid='c'+uid+i;return(<g key={i} transform={'translate('+(p[0]-off)+','+(p[1]-off)+') scale('+sc+')'}><path d={PATH} fill='rgba(255,255,255,0.16)'/><clipPath id={cid}><rect x='0' y='0' width={24*f} height='24'/></clipPath><path d={PATH} fill={'url(#g'+uid+')'} clipPath={'url(#'+cid+')'} style={{filter:'drop-shadow(0 0 1.5px rgba(245,215,110,0.7))'}}/></g>);})}
    </svg>);
  }
  return(<FootStars n={Math.round(stars)} s={Math.round(box/2.2)+'px'}/>);
};

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
  const [typedName,setTypedName]=useState('');
  const [countedAvg,setCountedAvg]=useState('0');
  const [nbaStats,setNbaStats]=useState<any>(null);
  const [nbaLoading,setNbaLoading]=useState(false);
  const [footStats,setFootStats]=useState<any>(null);
  const [footLoading,setFootLoading]=useState(false);
  const [sales,setSales]=useState<any>(null);
  const [salesLoading,setSalesLoading]=useState(false);

  useEffect(()=>{let i=0;let iv:any;const t=setTimeout(()=>{iv=setInterval(()=>{i++;setTypedName(ln.slice(0,i));if(i>=ln.length)clearInterval(iv);},45);},600);return()=>{clearTimeout(t);clearInterval(iv);};},[ln]);
  useEffect(()=>{if(avgNum==null)return;let step=0;let iv:any;const t=setTimeout(()=>{iv=setInterval(()=>{step++;const cur=Math.min((avgNum/20)*step,avgNum);setCountedAvg(cur%1===0?String(Math.round(cur)):cur.toFixed(1));if(step>=20)clearInterval(iv);},40);},700);return()=>{clearTimeout(t);clearInterval(iv);};},[avgNum]);

  useEffect(()=>{if(!isNBA(card))return;const pslug=card.anyPlayer?.slug||card.slug.split('-').filter((_:any,i:number,a:any)=>i<a.length-3).join('-');if(!pslug)return;setNbaLoading(true);fetch(`/api/player-stats?slug=${encodeURIComponent(pslug)}`).then(r=>r.json()).then(d=>{if(d&&(d.pts!=null||d.reb!=null||d.ast!=null))setNbaStats(d);}).catch(()=>{}).finally(()=>setNbaLoading(false));},[]);
  useEffect(()=>{if(isNBA(card))return;const pslug=card.anyPlayer?.slug||card.slug.split('-').filter((_:any,i:number,a:any)=>i<a.length-3).join('-');if(!pslug)return;setFootLoading(true);fetch(`/api/player-stats-foot?slug=${encodeURIComponent(pslug)}`).then(r=>r.json()).then(d=>{if(d&&(d.goals!=null||d.mins!=null||d.matches!=null||d.cleanSheet!=null))setFootStats(d);}).catch(()=>{}).finally(()=>setFootLoading(false));},[]);
  // Moyenne des 5 dernieres ventes de la carte (historique de propriete Sorare)
  useEffect(()=>{if(!card.slug||!card.rarityTyped)return;setSalesLoading(true);fetch(`/api/card-sales?slug=${encodeURIComponent(card.slug)}&rarity=${encodeURIComponent(card.rarityTyped)}`).then(r=>r.json()).then(d=>setSales(d)).catch(()=>{}).finally(()=>setSalesLoading(false));},[]);
;

  const CY='#40e8ff';const CYS='0 0 8px rgba(64,232,255,0.5)';
  const sep:React.CSSProperties={borderBottom:'1px solid rgba(64,232,255,0.16)',paddingBottom:'0.42rem',marginBottom:'0.42rem',flexShrink:0};
  const fv=(v:any,t:string)=>{if(v==null)return '—';const n=Number(v);if(t==='pct')return n.toFixed(1)+'%';if(t==='pm')return(n>=0?'+':'')+n.toFixed(1);if(t==='int')return String(Math.round(n));return n.toFixed(1);};
  const fmtSale=(g:any)=>salesLoading?'…':(g&&g.avg!=null?(Number(g.avg).toFixed(2).replace('.',',')+' € ('+g.count+')'):'—');
  const isOverlay=placement==='overlay';
  const isMobile=placement==='mobile';
  const isGalleryMobile=placement==='galleryMobile';
  const posStyle:React.CSSProperties=isOverlay
    ? {position:'fixed',right:'1%',top:'5%',width:'22.2vw',maxHeight:'89vh',zIndex:200}
    : isMobile
    ? {position:'absolute',left:'4%',right:'4%',top:'3%',maxHeight:'94%',zIndex:80}
    : isGalleryMobile
    ? {position:'fixed',left:'4%',right:'4%',top:'8%',maxHeight:'84%',zIndex:200}
    : {position:'absolute',right:'1%',top:'5%',width:'30%',maxHeight:'89%',zIndex:50};
  const deployDelay=isOverlay?'0.1s':'0.45s';
  return(
    <div key={card.slug} style={{...posStyle,background:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(64,232,255,0.03) 2px,rgba(64,232,255,0.03) 3px),linear-gradient(rgba(2,10,22,0.95),rgba(2,10,22,0.95))',border:'1px solid rgba(64,232,255,0.5)',boxShadow:'0 0 40px rgba(64,232,255,0.15),inset 0 0 60px rgba(0,0,0,0.5)',clipPath:isClosing?'none':'polygon(14px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px)',padding:'0.8rem 0.75rem',display:'flex',flexDirection:'column' as const,overflow:'hidden',animation:isClosing?'mnflClose 0.45s cubic-bezier(0.7,0,0.95,1) both':('mnflDeploy 0.55s ease-out '+deployDelay+' backwards'),fontFamily:'Courier New,Consolas,monospace',backdropFilter:isClosing?'none':'blur(12px)',WebkitBackdropFilter:isClosing?'none':'blur(12px)'}}>
      <style>{`
        .stat-link-btn{transition:box-shadow 0.22s ease,border-color 0.22s ease,background 0.22s ease;}
        .stat-link-btn:hover{
          border-color:#40e8ff !important;
          background:rgba(64,232,255,0.14) !important;
          box-shadow:0 0 12px rgba(64,232,255,0.7),0 0 22px rgba(64,232,255,0.45),inset 0 0 10px rgba(64,232,255,0.25) !important;
        }
        .stat-link-btn:hover *{text-shadow:0 0 8px rgba(64,232,255,0.6);}
      `}</style>
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
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'0.4rem'}}>
            <span style={{fontSize:'2.2rem',fontWeight:900,color:CY,lineHeight:1,textShadow:'0 0 22px '+CY}}>{countedAvg}</span>
            <StarRating card={card} box={34}/>
          </div>
          <p style={{margin:'4px 0 0',fontSize:'0.52rem',color:'rgba(64,232,255,0.6)',letterSpacing:'0.2em',textTransform:'uppercase'}}>MOY. L10</p>
        </div>
        <div style={{width:'50%',display:'flex',flexDirection:'column' as const,gap:'0.24rem',paddingLeft:'0.5rem',justifyContent:'center'}}>
          {bonus&&<div style={{padding:'0.22rem 0.4rem',border:'1px solid rgba(64,232,255,0.28)',borderRadius:'0.25rem',background:'rgba(64,232,255,0.07)',display:'flex',justifyContent:'space-between',alignItems:'baseline'}}><span style={{fontSize:'0.52rem',color:'rgba(64,232,255,0.55)',letterSpacing:'0.1em'}}>BONUS</span><span style={{fontSize:'0.72rem',fontWeight:800,color:CY,textShadow:CYS}}>{bonus}</span></div>}
          <div style={{padding:'0.22rem 0.4rem',border:'1px solid '+rc+'55',borderRadius:'0.25rem',background:rc+'0d',textAlign:'center'}}><span style={{fontSize:'0.65rem',fontWeight:900,color:rc,letterSpacing:'0.1em',textShadow:'0 0 7px '+rc}}>{card.rarityTyped.replace(/_/g,' ').toUpperCase()}</span></div>
        </div>
      </div>
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
      <div style={{...sep}}>
        <p style={{margin:'0 0 0.3rem',fontSize:'0.52rem',fontWeight:900,color:'rgba(64,232,255,0.6)',letterSpacing:'0.2em',textTransform:'uppercase'}}>VENTES {String(card.rarityTyped||'').replace(/_/g,' ')} · MOY. 5</p>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.18rem 0.6rem'}}>
          <div style={{minWidth:0}}>
            <span style={{display:'block',fontSize:'0.5rem',color:'rgba(64,232,255,0.4)',letterSpacing:'0.1em',textTransform:'uppercase'}}>In-season</span>
            <span style={{display:'block',fontSize:'0.72rem',fontWeight:800,color:'#f5d76e',textShadow:'0 0 5px rgba(245,215,110,0.3)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{fmtSale(sales?.inSeason)}</span>
          </div>
          <div style={{minWidth:0}}>
            <span style={{display:'block',fontSize:'0.5rem',color:'rgba(64,232,255,0.4)',letterSpacing:'0.1em',textTransform:'uppercase'}}>Classic</span>
            <span style={{display:'block',fontSize:'0.72rem',fontWeight:800,color:CY,textShadow:'0 0 5px rgba(64,232,255,0.3)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{fmtSale(sales?.classic)}</span>
          </div>
        </div>
      </div>
      <div style={{...sep,overflow:'hidden'}}>
        {isNBA(card)?(
          <>
            <p style={{margin:'0 0 0.3rem',fontSize:'0.52rem',fontWeight:900,color:'rgba(64,232,255,0.6)',letterSpacing:'0.2em',textTransform:'uppercase'}}>NBA · 10 DERNIERS MATCHS</p>
            {nbaLoading&&<p style={{margin:0,fontSize:'0.62rem',color:'rgba(64,232,255,0.42)',letterSpacing:'0.14em'}}>CHARGEMENT...</p>}
            {!nbaLoading&&nbaStats&&(
              <div style={{width:'100%'}}>
                <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'0.18rem'}}>
                  {([[' PTS',nbaStats.pts,'dec'],[' REB',nbaStats.reb,'dec'],[' AST',nbaStats.ast,'dec'],[' STL',nbaStats.stl,'dec'],[' BLK',nbaStats.blk,'dec'],[' MIN',nbaStats.min,'dec'],[' TOV',nbaStats.tov,'dec'],[' 3PM',nbaStats.tpm,'dec'],[' EFF',nbaStats.eff,'dec'],[' DD',nbaStats.dd,'int'],[' TD',nbaStats.td,'int'],[' MJ',nbaStats.gp,'int']] as any[]).map(([l,v,t]:any)=>(<div key={l} style={{textAlign:'center',padding:'0.16rem 0.08rem',border:'1px solid rgba(64,232,255,0.14)',borderRadius:'0.2rem',background:'rgba(64,232,255,0.04)'}}><span style={{display:'block',fontSize:'0.4rem',color:'rgba(64,232,255,0.5)',letterSpacing:'0.04em',textTransform:'uppercase'}}>{l}</span><span style={{display:'block',fontSize:'0.76rem',fontWeight:900,color:CY,textShadow:CYS,lineHeight:1.15}}>{fv(v,t)}</span></div>))}
                </div>
                <p style={{margin:'0.3rem 0 0',fontSize:'0.38rem',color:'rgba(64,232,255,0.3)',letterSpacing:'0.04em',textAlign:'right'}}>aligné L10 · source Sorare</p>
              </div>
            )}
            {!nbaLoading&&!nbaStats&&<p style={{margin:0,fontSize:'0.58rem',color:'rgba(64,232,255,0.28)',letterSpacing:'0.06em'}}>stats non disponibles</p>}
          </>
        ):(
          <>
            <p style={{margin:'0 0 0.3rem',fontSize:'0.52rem',fontWeight:900,color:'rgba(64,232,255,0.6)',letterSpacing:'0.2em',textTransform:'uppercase'}}>FOOT · 15 DERNIERS MATCHS</p>
            {footLoading&&<p style={{margin:0,fontSize:'0.62rem',color:'rgba(64,232,255,0.42)',letterSpacing:'0.14em'}}>CHARGEMENT...</p>}
            {!footLoading&&footStats&&(
              <div style={{width:'100%'}}>
                <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'0.18rem'}}>
                  {([['⚽','Buts',footStats.goals],['👟','Passes décisives',footStats.assists],['🎯','Tirs cadrés',footStats.shots],['➡️','Passes réussies',footStats.passes],['🏟','Matchs joués',footStats.matches],['👕','Titularisations',footStats.starts],['🧤','Clean sheets',footStats.cleanSheet],['💪','Duels gagnés',footStats.duelWon],['🛡️','Ballons récupérés',footStats.recov],['🟨','Cartons jaunes',footStats.yellow],['🟥','Cartons rouges',footStats.red],['⏱','Minutes jouées',footStats.mins]] as [string,string,any][]).map(([pic,lab,v])=>(
                    <div key={lab} title={lab} style={{textAlign:'center',padding:'0.2rem 0.08rem',border:'1px solid rgba(64,232,255,0.14)',borderRadius:'0.2rem',background:'rgba(64,232,255,0.04)'}}>
                      <span style={{display:'block',fontSize:'0.8rem',lineHeight:1.1}}>{pic}</span>
                      <span style={{display:'block',fontSize:'0.82rem',fontWeight:900,color:CY,textShadow:CYS,lineHeight:1.25}}>{v==null?'—':(lab==='Minutes jouées'?Math.round(Number(v)):v)}</span>
                    </div>
                  ))}
                </div>
                <p style={{margin:'0.3rem 0 0',fontSize:'0.38rem',color:'rgba(64,232,255,0.3)',letterSpacing:'0.04em',textAlign:'right'}}>aligné L10 · source Sorare</p>
              </div>
            )}
            {!footLoading&&!footStats&&<p style={{margin:0,fontSize:'0.58rem',color:'rgba(64,232,255,0.28)',letterSpacing:'0.06em'}}>stats non disponibles</p>}
          </>
        )}
      </div>
      <div style={{display:'flex',gap:'0.4rem',marginBottom:'0.3rem',flexShrink:0}}>
        {card.slug&&(
          <a href={isNBA(card)?('https://sorare.com/fr/nba/players/'+(card.anyPlayer?.slug||card.slug.split('-').filter((_:any,i:number,a:any)=>i<a.length-3).join('-'))+'?sale=true'):('https://sorare.com/fr/football/players/'+(card.anyPlayer?.slug||card.slug.split('-').filter((_:any,i:number,a:any)=>i<a.length-3).join('-'))+'?sale=true')}
            target='_blank' rel='noopener noreferrer' className='stat-link-btn'
            style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:'0.3rem',padding:'0.3rem 0',borderRadius:'0.25rem',border:'1px solid rgba(64,232,255,0.5)',background:'rgba(64,232,255,0.06)',color:'#ffffff',fontSize:'0.55rem',fontWeight:800,letterSpacing:'0.1em',textDecoration:'none',cursor:'pointer'}}>
            <img src="/sorare-logo.png" alt="S" style={{width:'14px',height:'14px',borderRadius:'50%',objectFit:'cover'}} onError={(e:any)=>{e.target.style.display='none';}}/> SORARE
          </a>
        )}
      </div>

    </div>
  );
});
StatPanel.displayName='StatPanel';
