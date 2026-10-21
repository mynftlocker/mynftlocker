'use client';
import { memo, useState, useEffect, useLayoutEffect, useRef, useId } from 'react';
import { getManager, cardLink } from '../lib-share';

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

// Etoiles foot (traces repris de Sorare). 5 etoiles = entourees (cadre dore) + etincelles qui scintillent.
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

// Mesure (poids 900) de la largeur du nom pour remplir la case nom du verso via SVG -> jamais tronque.
let _cbCtx:CanvasRenderingContext2D|null=null;
function cbNatW(txt:string){
  if(typeof document==='undefined')return Math.max(1,txt.length*0.56);
  if(!_cbCtx){try{_cbCtx=document.createElement('canvas').getContext('2d');}catch(e){_cbCtx=null;}}
  if(!_cbCtx)return Math.max(1,txt.length*0.56);
  _cbCtx.font='900 100px system-ui, sans-serif';
  return Math.max(1,_cbCtx.measureText(txt).width/100);
}
export const CardBack=memo(({card,rc,mobile}:any)=>{
  const rid=useId().replace(/[^a-zA-Z0-9]/g,'');
  const sz=(remStr:string,px:number)=>mobile?(Math.round(px/115*10000)/100)+'cqw':remStr;
  const nfsCard=(l:number)=>mobile?(l<=5?'19cqw':l<=7?'15.5cqw':l<=8?'13.6cqw':l<=9?'12.4cqw':l<=10?'11cqw':l<=11?'9.9cqw':l<=12?'9.1cqw':l<=13?'8.4cqw':'7.4cqw'):nfs(l);
  const {season,serial}=parseCard(card.name);
  const ln=(card.anyPlayer?.lastName||parseCard(card.name).lastName).toUpperCase();
  const [cbW,setCbW]=useState(()=>Math.max(1,ln.length*0.56)*100);
  useEffect(()=>{setCbW(cbNatW(ln)*100);},[ln]);
  const sn=card.anyPlayer?.shirtNumber??null;
  const bonus=card.power?('+'+Math.round((parseFloat(card.power)-1)*100)+'%'):null;
  const score=card.averageScore!=null?String(card.averageScore):null;
  const sv=card.anyPlayer?.gameplayTierStars;
  const stars=(sv==null||isNaN(Number(sv)))?null:Math.max(0,Math.min(5,Number(sv)));
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
  return(
    <div style={{position:'absolute',inset:0,backfaceVisibility:'hidden',WebkitBackfaceVisibility:'hidden',transform:'rotateY(180deg)',borderRadius:'0.4rem',overflow:'hidden',background:'radial-gradient(ellipse 130% 90% at 50% 0%,#191b24 0%,#0c0d14 60%,#06070d 100%)',display:'flex',flexDirection:'column' as const,border:'1px solid '+rc+'44'}}>
      <div style={{height:'3px',background:'linear-gradient(90deg,transparent,'+rc+',transparent)'}}></div>
      <div style={{padding:sz('0.45rem',7.2)+' '+sz('0.42rem',6.7)+' '+sz('0.38rem',6),textAlign:'center',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <p style={{margin:0,fontSize:sz('0.6rem',9.6),color:'#e3c074',fontWeight:900,letterSpacing:'0.08em'}}>myNFTlocker</p>
        <p style={{margin:'1px 0 0',fontSize:sz('0.48rem',7.68),color:'#9aa3b2',fontWeight:600,letterSpacing:'0.1em'}}>{isNBA(card)?'NBA':'FOOT'} {'•'} {season}</p>
      </div>
      <div style={{flex:1,minHeight:0,display:'flex',flexDirection:'column' as const,alignItems:'center',padding:sz('0.5rem',8)+' '+sz('0.42rem',6.7)+' '+sz('0.3rem',4.8),overflow:'hidden'}}>
        <div style={{width:'100%',marginTop:sz('0.35rem',5.6),textAlign:'center' as const}}>
          <div style={{width:'100%',height:sz('1.15rem',18.4),display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg viewBox={'0 0 '+cbW+' 100'} preserveAspectRatio='xMidYMid meet' style={{width:'100%',height:'100%',display:'block',overflow:'visible'}}>
              <text x={cbW/2} y='80' textAnchor='middle' fontSize='100' fontWeight='900' fontFamily='system-ui, sans-serif' fill='#fff' style={{filter:'drop-shadow(0 0 8px '+rc+'99)'}}>{ln}</text>
            </svg>
          </div>
          <p style={{margin:sz('0.3rem',4.8)+' 0 0',fontSize:sz('0.5rem',8),color:'#9aa3b2',fontWeight:700,letterSpacing:'0.05em'}}>{sn!==null?('#'+sn):''}{(sn!==null&&serial)?('  '+'·'+'  '):''}{serial||''}</p>
        </div>
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
        <span style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',height:'1.05rem',borderRadius:'0.3rem',border:'1px solid '+rc+'55',background:'rgba(0,0,0,0.4)',fontSize:sz('0.46rem',7.36),fontWeight:700,color:rc,textTransform:'uppercase',letterSpacing:'0.02em',whiteSpace:'nowrap'}}>{card.rarityTyped==='common'?'SET':card.rarityTyped.replace('_',' ')}</span>
      </div>
    </div>
  );
});
CardBack.displayName='CardBack';

// Note en etoiles reutilisable (tableau noir) : pentagone NBA / rangee foot.
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

// ===== PARTAGE : cadre "PARTAGER" du tableau de stats (galerie + vestiaire). L'image est preparee en arriere-plan a l'ouverture,
// pour que les clics soient immediats (les navigateurs n'autorisent le partage natif qu'apres un clic de l'utilisateur). =====
function ShareBlock({card,box,lab}:{card:any;box:React.CSSProperties;lab:React.CSSProperties}){
  const [img,setImg]=useState<{blob:Blob,file:File,fname:string}|null>(null);
  const [state,setState]=useState<'prep'|'ready'|'error'>('prep');
  const [msg,setMsg]=useState('');
  const [canShare,setCanShare]=useState(false);
  const [canCopy,setCanCopy]=useState(false);
  useEffect(()=>{
    let dead=false;
    try{
      const n:any=navigator;
      setCanCopy(!!(n.clipboard&&n.clipboard.write&&typeof (window as any).ClipboardItem!=='undefined'));
    }catch(e){}
    const t=setTimeout(async()=>{
      try{
        const {exportCardImage}=await import('./GalleryView');
        const r=await exportCardImage(card);
        if(dead)return;
        setImg(r);setState('ready');
        try{const n:any=navigator;setCanShare(typeof n.canShare==='function'&&n.canShare({files:[r.file]}));}catch(e){}
      }catch(e){console.error('share prep failed',e);if(!dead)setState('error');}
    },900);
    return()=>{dead=true;clearTimeout(t);};
  },[card.slug]);
  const flash=(m:string)=>{setMsg(m);setTimeout(()=>setMsg(''),2500);};
  const doShare=async()=>{if(!img)return;try{const lk=cardLink(card.slug);await (navigator as any).share({files:[img.file],title:card.name,text:(getManager()?getManager()+' · ':'')+card.name+(lk?' — voir la carte : '+lk:'')});}catch(e:any){if(!e||e.name!=='AbortError')flash('Partage impossible');}};
  const doDownload=()=>{if(!img)return;const a=document.createElement('a');a.href=URL.createObjectURL(img.blob);a.download=img.fname;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);flash('Image téléchargée');};
  const doCopy=async()=>{if(!img)return;try{await (navigator as any).clipboard.write([new (window as any).ClipboardItem({'image/png':img.blob})]);flash('Image copiée');}catch(e){flash('Copie impossible');}};
  const ready=state==='ready';
  const btn:React.CSSProperties={flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:'0.3em',padding:'0.5em 0.2em',borderRadius:'0.3em',border:'1px solid rgba(64,232,255,0.5)',background:'rgba(64,232,255,0.06)',color:'#ffffff',fontSize:'0.58em',fontWeight:800,letterSpacing:'0.08em',cursor:ready?'pointer':'wait',opacity:ready?1:0.45,fontFamily:'inherit',whiteSpace:'nowrap'};
  const ico=(d:React.ReactNode)=>(<svg viewBox='0 0 24 24' style={{width:'1.2em',height:'1.2em',flexShrink:0}} fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>{d}</svg>);
  return(
    <div style={{...box,flexShrink:0,borderColor:'rgba(64,232,255,0.4)',background:'rgba(64,232,255,0.06)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',gap:'0.5em'}}><p style={lab}>PARTAGER LA CARTE</p><span style={{fontSize:'0.5em',letterSpacing:'0.08em',color:state==='error'?'#fca5a5':'rgba(64,232,255,0.7)',whiteSpace:'nowrap'}}>{msg||(state==='prep'?'Préparation de l’image…':state==='error'?'Image indisponible':'')}</span></div>
      <div style={{display:'flex',gap:'0.4em'}}>
        {canShare&&<button type='button' className='stat-link-btn' disabled={!ready} onClick={doShare} style={btn}>{ico(<><circle cx='18' cy='5' r='3'/><circle cx='6' cy='12' r='3'/><circle cx='18' cy='19' r='3'/><path d='M8.6 13.5l6.8 4M15.4 6.5l-6.8 4'/></>)}PARTAGER</button>}
        <button type='button' className='stat-link-btn' disabled={!ready} onClick={doDownload} style={btn}>{ico(<><path d='M12 3v12'/><path d='M8 11l4 4 4-4'/><path d='M5 21h14'/></>)}TÉLÉCHARGER</button>
        {canCopy&&<button type='button' className='stat-link-btn' disabled={!ready} onClick={doCopy} style={btn}>{ico(<><rect x='9' y='9' width='12' height='12' rx='2'/><path d='M5 15V5a2 2 0 012-2h10'/></>)}COPIER</button>}
      </div>
    </div>
  );
}

export const StatPanel=memo(({card,onClose,isClosing=false,placement='scene'}:any)=>{
  const rc=RARITY_COLOR[card.rarityTyped]||'#9ca3af';
  const {season,serial}=parseCard(card.name);
  const ln=(card.anyPlayer?.lastName||parseCard(card.name).lastName).toUpperCase();
  const sn=card.anyPlayer?.shirtNumber;
  const bonus=card.power?('+'+(Math.round((parseFloat(card.power)-1)*100))+'%'):null;
  const avgNum=card.averageScore!=null?parseFloat(String(card.averageScore)):null;
  const team=card.anyTeam?.name||'—';
  const xp=card.xp?card.xp.toLocaleString():'—';
  const edition=card.specialEdition?card.specialEdition.replace(/_(base|overflow)$/i,'').replace(/_/g,' ').toUpperCase():'STANDARD';
  const [typedName,setTypedName]=useState('');
  const [countedAvg,setCountedAvg]=useState('0');
  const [nbaStats,setNbaStats]=useState<any>(null);
  const [nbaLoading,setNbaLoading]=useState(false);
  const [footStats,setFootStats]=useState<any>(null);
  const [footLoading,setFootLoading]=useState(false);
  const [sales,setSales]=useState<any>(null);
  const [salesLoading,setSalesLoading]=useState(false);
  const [owner,setOwner]=useState<any>(null);
  const [beat,setBeat]=useState<any>(null);
  const panelRef=useRef<HTMLDivElement>(null);
  const contentRef=useRef<HTMLDivElement>(null);

  useEffect(()=>{let i=0;let iv:any;const t=setTimeout(()=>{iv=setInterval(()=>{i++;setTypedName(ln.slice(0,i));if(i>=ln.length)clearInterval(iv);},45);},600);return()=>{clearTimeout(t);clearInterval(iv);};},[ln]);
  useEffect(()=>{if(avgNum==null)return;let step=0;let iv:any;const t=setTimeout(()=>{iv=setInterval(()=>{step++;const cur=Math.min((avgNum/20)*step,avgNum);setCountedAvg(cur%1===0?String(Math.round(cur)):cur.toFixed(1));if(step>=20)clearInterval(iv);},40);},700);return()=>{clearTimeout(t);clearInterval(iv);};},[avgNum]);

  useEffect(()=>{if(!isNBA(card))return;const pslug=card.anyPlayer?.slug||card.slug.split('-').filter((_:any,i:number,a:any)=>i<a.length-3).join('-');if(!pslug)return;setNbaLoading(true);fetch(`/api/player-stats?slug=${encodeURIComponent(pslug)}`).then(r=>r.json()).then(d=>{if(d&&(d.pts!=null||d.reb!=null||d.ast!=null))setNbaStats(d);}).catch(()=>{}).finally(()=>setNbaLoading(false));},[]);
  useEffect(()=>{if(isNBA(card))return;const pslug=card.anyPlayer?.slug||card.slug.split('-').filter((_:any,i:number,a:any)=>i<a.length-3).join('-');if(!pslug)return;setFootLoading(true);fetch(`/api/player-stats-foot?slug=${encodeURIComponent(pslug)}`).then(r=>r.json()).then(d=>{if(d&&(d.goals!=null||d.mins!=null||d.matches!=null||d.cleanSheet!=null))setFootStats(d);}).catch(()=>{}).finally(()=>setFootLoading(false));},[]);
  useEffect(()=>{if(!card.slug||!card.rarityTyped)return;setSalesLoading(true);fetch(`/api/card-sales?slug=${encodeURIComponent(card.slug)}&rarity=${encodeURIComponent(card.rarityTyped)}`).then(r=>r.json()).then(d=>setSales(d)).catch(()=>{}).finally(()=>setSalesLoading(false));},[]);
  useEffect(()=>{if(!card.slug)return;fetch(`/api/card-ownership?slug=${encodeURIComponent(card.slug)}`).then(r=>r.json()).then(d=>setOwner(d)).catch(()=>{});},[]);
  useEffect(()=>{if(!card.slug)return;fetch(`/api/beat-l10?slug=${encodeURIComponent(card.slug)}`).then(r=>r.json()).then(d=>setBeat(d)).catch(()=>{});},[]);
  // Auto-ajustement : la taille de police s'adapte pour que TOUT le contenu tienne sans scroll, quelle que soit la hauteur ecran.
  useLayoutEffect(()=>{
    const c=contentRef.current; if(!c) return;
    const fit=()=>{
      const base=(placement==='overlay'||placement==='scene')?19:14;
      c.style.fontSize=base+'px';
      const ch=c.clientHeight, sh=c.scrollHeight;
      let px=base;
      if(sh>ch && ch>0) px=Math.max(8,Math.min(base,base*(ch/sh)*0.985));
      c.style.fontSize=px+'px';
    };
    fit();
    const ro=new ResizeObserver(fit);
    if(panelRef.current) ro.observe(panelRef.current);
    return ()=>ro.disconnect();
  },[placement,nbaStats,footStats,beat,owner,sales,ln]);

  const CY='#40e8ff';const CYS='0 0 8px rgba(64,232,255,0.5)';
  const sep:React.CSSProperties={borderBottom:'1px solid rgba(64,232,255,0.16)',paddingBottom:'0.42em',marginBottom:'0.42em',flexShrink:0};
  const box:React.CSSProperties={border:'1px solid rgba(64,232,255,0.18)',borderRadius:'0.4em',padding:'0.5em 0.55em',marginBottom:'0.5em',background:'rgba(64,232,255,0.03)',minWidth:0};
  const lab:React.CSSProperties={margin:'0 0 0.32em',fontSize:'0.58em',fontWeight:900,color:'rgba(64,232,255,0.6)',letterSpacing:'0.16em',textTransform:'uppercase'};
  const WV='#eaf2ff';const CYL='rgba(64,232,255,0.5)';
  const fv=(v:any,t:string)=>{if(v==null)return '—';const n=Number(v);if(t==='pct')return n.toFixed(1)+'%';if(t==='pm')return(n>=0?'+':'')+n.toFixed(1);if(t==='int')return String(Math.round(n));return n.toFixed(1);};
  const fmtSale=(g:any)=>salesLoading?'…':(g&&g.avg!=null?(Number(g.avg).toFixed(2).replace('.',',')+' € ('+g.count+')'):'—');
  const isOverlay=placement==='overlay';
  const isMobile=placement==='mobile';
  const isGalleryMobile=placement==='galleryMobile';
  const isInline=placement==='inline'; // lien direct vers une carte : panneau dans le flux, sous la carte
  const posStyle:React.CSSProperties=isOverlay
    ? {position:'fixed',right:'1%',top:'5%',width:'38vw',maxHeight:'90vh',zIndex:200}
    : isMobile
    ? {position:'absolute',left:'4%',right:'4%',top:'3%',maxHeight:'94%',zIndex:80}
    : isInline
    ? {position:'relative',width:'100%',zIndex:1}
    : isGalleryMobile
    ? {position:'fixed',left:'4%',right:'4%',top:'8%',maxHeight:'84%',zIndex:200}
    : {position:'absolute',right:'1%',top:'5%',width:'42%',maxHeight:'90%',zIndex:50};
  const deployDelay=isOverlay?'0.1s':'0.45s';
  const big=isOverlay||placement==='scene';
  const colStyle:React.CSSProperties={flex:big?'1 1 0':'0 0 auto',minWidth:0,display:'flex',flexDirection:'column' as const};
  return(
    <div key={card.slug} ref={panelRef} style={{...posStyle,background:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(64,232,255,0.03) 2px,rgba(64,232,255,0.03) 3px),linear-gradient(rgba(2,10,22,0.95),rgba(2,10,22,0.95))',border:'1px solid rgba(64,232,255,0.5)',boxShadow:'0 0 40px rgba(64,232,255,0.15),inset 0 0 60px rgba(0,0,0,0.5)',clipPath:isClosing?'none':'polygon(14px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px)',display:'flex',flexDirection:'column' as const,overflow:'hidden',containerType:'inline-size' as any,animation:isClosing?'mnflClose 0.45s cubic-bezier(0.7,0,0.95,1) both':('mnflDeploy 0.55s ease-out '+deployDelay+' backwards'),fontFamily:'Courier New,Consolas,monospace',backdropFilter:isClosing?'none':'blur(12px)',WebkitBackdropFilter:isClosing?'none':'blur(12px)'}}>
      <div ref={contentRef} style={{flex:1,minHeight:0,display:'flex',flexDirection:'column' as const,padding:'0.8em 0.8em',overflow:'hidden'}}>
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
        <div style={{minWidth:0}}>
          <p style={{margin:0,fontSize:'0.55em',color:'rgba(64,232,255,0.5)',fontWeight:700,letterSpacing:'0.18em',textTransform:'uppercase'}}>myNFTlocker {'·'} STATS</p>
          <p style={{margin:'0.25em 0 0.12em',fontSize:'1.15em',fontWeight:900,color:CY,letterSpacing:'0.06em',textShadow:CYS,minHeight:'1.3em',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{typedName}{typedName.length<ln.length?'▊':''}</p>
          <p style={{margin:0,fontSize:'0.6em',color:'rgba(64,232,255,0.38)',letterSpacing:'0.04em'}}>{sn!=null?'#'+sn+' · ':''}{season}</p>
        </div>
        <button onClick={!isClosing?onClose:undefined} style={{background:'transparent',border:'1px solid rgba(64,232,255,0.35)',borderRadius:'50%',width:'1.3em',height:'1.3em',color:CY,cursor:'pointer',fontSize:'0.7em',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,opacity:isClosing?0:1,marginTop:'0.15em'}}>{'✕'}</button>
      </div>
      <div style={{...sep,display:'flex',alignItems:'stretch'}}>
        <div style={{width:'52%',textAlign:'center',display:'flex',flexDirection:'column' as const,justifyContent:'center',borderRight:'1px solid rgba(64,232,255,0.1)',paddingRight:'0.5em'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'0.4em'}}>
            <span style={{fontSize:'2.4em',fontWeight:900,color:CY,lineHeight:1,textShadow:'0 0 22px '+CY}}>{countedAvg}</span>
            <StarRating card={card} box={big?52:34}/>
          </div>
          <p style={{margin:'0.3em 0 0',fontSize:'0.55em',color:'rgba(64,232,255,0.6)',letterSpacing:'0.2em',textTransform:'uppercase'}}>MOY. L10</p>
        </div>
        <div style={{width:'48%',display:'flex',flexDirection:'column' as const,gap:'0.3em',paddingLeft:'0.5em',justifyContent:'center'}}>
          {bonus&&<div style={{padding:'0.3em 0.45em',border:'1px solid rgba(64,232,255,0.28)',borderRadius:'0.3em',background:'rgba(64,232,255,0.07)',display:'flex',justifyContent:'space-between',alignItems:'baseline'}}><span style={{fontSize:'0.55em',color:'rgba(64,232,255,0.55)',letterSpacing:'0.1em'}}>BONUS</span><span style={{fontSize:'0.78em',fontWeight:800,color:CY,textShadow:CYS}}>{bonus}</span></div>}
          <div style={{padding:'0.35em 0.45em',border:'1px solid '+rc+'55',borderRadius:'0.3em',background:rc+'0d',textAlign:'center'}}><span style={{fontSize:'0.72em',fontWeight:900,color:rc,letterSpacing:'0.1em',textShadow:'0 0 7px '+rc}}>{card.rarityTyped==='common'?'SET':card.rarityTyped.replace(/_/g,' ').toUpperCase()}</span></div>
        </div>
      </div>
      <div style={{display:'flex',flexDirection:big?'row':'column',gap:big?'0.7em':'0',alignItems:'stretch'}}>
        <div style={colStyle}>
          <div style={box}>
            <p style={lab}>CARTE</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.18em 0.6em'}}>
              {([['ÉQUIPE',team],['SÉRIE',serial],['SAISON',season],['XP',xp],['ÉDITION',edition]] as [string,string][]).map(([l,v])=>(
                <div key={l} style={{minWidth:0}}>
                  <span style={{display:'block',fontSize:'0.52em',color:CYL,letterSpacing:'0.1em',textTransform:'uppercase'}}>{l}</span>
                  <span style={{display:'block',fontSize:'0.74em',fontWeight:700,color:WV,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={box}>
            <p style={lab}>ACHAT</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.18em 0.6em'}}>
              <div style={{minWidth:0}}>
                <span style={{display:'block',fontSize:'0.52em',color:CYL,letterSpacing:'0.1em',textTransform:'uppercase'}}>Prix d{'’'}achat</span>
                <span style={{display:'block',fontSize:'0.8em',fontWeight:800,color:WV,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{owner&&owner.price!=null?(Number(owner.price).toFixed(2).replace('.',',')+' €'):(owner?'—':'…')}{owner&&owner.type?(<span style={{color:CYL,fontWeight:600}}> ({owner.type})</span>):null}</span>
              </div>
              <div style={{minWidth:0}}>
                <span style={{display:'block',fontSize:'0.52em',color:CYL,letterSpacing:'0.1em',textTransform:'uppercase'}}>Acquise le</span>
                <span style={{display:'block',fontSize:'0.74em',fontWeight:700,color:WV}}>{owner&&owner.date?new Date(owner.date).toLocaleDateString('fr-FR'):'—'}</span>
              </div>
              <div style={{minWidth:0,gridColumn:'1 / span 2'}}>
                <span style={{display:'block',fontSize:'0.52em',color:CYL,letterSpacing:'0.1em',textTransform:'uppercase'}}>Dernier d{'é'}tenteur</span>
                <span style={{display:'block',fontSize:'0.74em',fontWeight:700,color:WV,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{owner&&owner.lastHolder?owner.lastHolder:'— (1ʳᵉ main)'}</span>
              </div>
            </div>
          </div>
          <div style={box}>
            <p style={lab}>Moyenne des 5 derni{'è'}res ventes</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.18em 0.6em'}}>
              <div style={{minWidth:0}}>
                <span style={{display:'block',fontSize:'0.52em',color:CYL,letterSpacing:'0.1em',textTransform:'uppercase'}}>In-season</span>
                <span style={{display:'block',fontSize:'0.78em',fontWeight:800,color:'#f5d76e',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{fmtSale(sales?.inSeason)}</span>
              </div>
              <div style={{minWidth:0}}>
                <span style={{display:'block',fontSize:'0.52em',color:CYL,letterSpacing:'0.1em',textTransform:'uppercase'}}>Classic</span>
                <span style={{display:'block',fontSize:'0.78em',fontWeight:800,color:CY,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{fmtSale(sales?.classic)}</span>
              </div>
            </div>
          </div>
        </div>
        <div style={colStyle}>
          <div style={box}>
            <p style={lab}>BEAT L10</p>
            {beat&&beat.pct!=null?(
              <div style={{display:'flex',alignItems:'center',gap:'0.6em'}}>
                <span style={{fontSize:'2em',fontWeight:900,lineHeight:1,color:beat.pct>=50?'#4ade80':'#ef4444',textShadow:'0 0 16px '+(beat.pct>=50?'rgba(74,222,128,0.5)':'rgba(239,68,68,0.5)')}}>{beat.pct}%</span>
                <span style={{fontSize:'0.62em',color:'rgba(234,242,255,0.82)',lineHeight:1.35}}>a battu son L10 sur <b style={{color:WV}}>{beat.pct}%</b> de ses matchs <span style={{color:CYL}}>({beat.beatL10}/{beat.gw} GW{beat.highest!=null?(' · record '+beat.highest):''})</span></span>
              </div>
            ):(beat&&beat.beatL10!=null?(
              <div style={{display:'flex',alignItems:'center',gap:'0.6em'}}>
                <span style={{fontSize:'1.7em',fontWeight:900,lineHeight:1,color:CY,textShadow:CYS}}>{beat.beatL10}</span>
                <span style={{fontSize:'0.62em',color:'rgba(234,242,255,0.82)',lineHeight:1.35}}>GW au-dessus du L10 <span style={{color:CYL}}>(compteur Sorare{beat.highest!=null?(' · record '+beat.highest):''})</span></span>
              </div>
            ):(<p style={{margin:0,fontSize:'0.62em',color:'rgba(64,232,255,0.3)',letterSpacing:'0.06em'}}>{beat?'—':'…'}</p>))}
          </div>
          <div style={{...box,overflow:'hidden'}}>
            {isNBA(card)?(
              <>
                <p style={lab}>NBA {'·'} 10 derniers matchs</p>
                {nbaLoading&&<p style={{margin:0,fontSize:'0.62em',color:'rgba(64,232,255,0.42)',letterSpacing:'0.14em'}}>CHARGEMENT...</p>}
                {!nbaLoading&&nbaStats&&(
                  <div style={{width:'100%'}}>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'0.2em'}}>
                      {([['PTS',nbaStats.pts,'dec'],['REB',nbaStats.reb,'dec'],['AST',nbaStats.ast,'dec'],['STL',nbaStats.stl,'dec'],['BLK',nbaStats.blk,'dec'],['MIN',nbaStats.min,'dec'],['TOV',nbaStats.tov,'dec'],['3PM',nbaStats.tpm,'dec'],['EFF',nbaStats.eff,'dec'],['DD',nbaStats.dd,'int'],['TD',nbaStats.td,'int'],['MJ',nbaStats.gp,'int']] as any[]).map(([l,v,t]:any)=>(<div key={l} style={{textAlign:'center',padding:'0.22em 0.08em',border:'1px solid rgba(64,232,255,0.14)',borderRadius:'0.25em',background:'rgba(64,232,255,0.04)'}}><span style={{display:'block',fontSize:'0.5em',color:'rgba(64,232,255,0.72)',letterSpacing:'0.04em',fontWeight:700,textTransform:'uppercase'}}>{l}</span><span style={{display:'block',fontSize:'0.82em',fontWeight:900,color:WV,lineHeight:1.15}}>{fv(v,t)}</span></div>))}
                    </div>
                    <p style={{margin:'0.3em 0 0',fontSize:'0.42em',color:'rgba(64,232,255,0.3)',letterSpacing:'0.04em',textAlign:'right'}}>align{'é'} L10 {'·'} source Sorare</p>
                  </div>
                )}
                {!nbaLoading&&!nbaStats&&<p style={{margin:0,fontSize:'0.58em',color:'rgba(64,232,255,0.28)',letterSpacing:'0.06em'}}>stats non disponibles</p>}
              </>
            ):(
              <>
                <p style={lab}>FOOT {'·'} 15 derniers matchs</p>
                {footLoading&&<p style={{margin:0,fontSize:'0.62em',color:'rgba(64,232,255,0.42)',letterSpacing:'0.14em'}}>CHARGEMENT...</p>}
                {!footLoading&&footStats&&(
                  <div style={{width:'100%'}}>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'0.2em'}}>
                      {([['⚽','Buts',footStats.goals],['👟','Passes décisives',footStats.assists],['🎯','Tirs cadrés',footStats.shots],['➡️','Passes réussies',footStats.passes],['🏟','Matchs joués',footStats.matches],['👕','Titularisations',footStats.starts],['🧤','Clean sheets',footStats.cleanSheet],['💪','Duels gagnés',footStats.duelWon],['🛡️','Ballons récupérés',footStats.recov],['🟨','Cartons jaunes',footStats.yellow],['🟥','Cartons rouges',footStats.red],['⏱','Minutes jouées',footStats.mins]] as [string,string,any][]).map(([pic,labx,v])=>(
                        <div key={labx} title={labx} style={{textAlign:'center',padding:'0.22em 0.08em',border:'1px solid rgba(64,232,255,0.14)',borderRadius:'0.25em',background:'rgba(64,232,255,0.04)'}}>
                          <span style={{display:'block',fontSize:'0.9em',lineHeight:1.1}}>{pic}</span>
                          <span style={{display:'block',fontSize:'0.82em',fontWeight:900,color:WV,lineHeight:1.25}}>{v==null?'—':(labx==='Minutes jouées'?Math.round(Number(v)):v)}</span>
                        </div>
                      ))}
                    </div>
                    <p style={{margin:'0.3em 0 0',fontSize:'0.42em',color:'rgba(64,232,255,0.3)',letterSpacing:'0.04em',textAlign:'right'}}>align{'é'} L10 {'·'} source Sorare</p>
                  </div>
                )}
                {!footLoading&&!footStats&&<p style={{margin:0,fontSize:'0.58em',color:'rgba(64,232,255,0.28)',letterSpacing:'0.06em'}}>stats non disponibles</p>}
              </>
            )}
          </div>
        </div>
      </div>
      <ShareBlock card={card} box={box} lab={lab}/>
      <div style={{display:'flex',gap:'0.4em',marginTop:'0.15em',marginBottom:'0.2em',flexShrink:0}}>
        {card.slug&&(
          <a href={isNBA(card)?('https://sorare.com/fr/nba/players/'+(card.anyPlayer?.slug||card.slug.split('-').filter((_:any,i:number,a:any)=>i<a.length-3).join('-'))+'?sale=true'):('https://sorare.com/fr/football/players/'+(card.anyPlayer?.slug||card.slug.split('-').filter((_:any,i:number,a:any)=>i<a.length-3).join('-'))+'?sale=true')}
            target='_blank' rel='noopener noreferrer' className='stat-link-btn'
            style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:'0.3em',padding:'0.45em 0',borderRadius:'0.3em',border:'1px solid rgba(64,232,255,0.5)',background:'rgba(64,232,255,0.06)',color:'#ffffff',fontSize:'0.6em',fontWeight:800,letterSpacing:'0.1em',textDecoration:'none',cursor:'pointer'}}>
            <img src="/sorare-logo.png" alt="S" style={{width:'1.1em',height:'1.1em',borderRadius:'50%',objectFit:'cover'}} onError={(e:any)=>{e.target.style.display='none';}}/> SORARE
          </a>
        )}
      </div>
      </div>
    </div>
  );
});
StatPanel.displayName='StatPanel';
