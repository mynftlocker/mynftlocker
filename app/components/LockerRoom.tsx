'use client';
import { memo, useState, useRef, useEffect } from 'react';
import { TEAM_BY_API, FALLBACK_IMG } from '../lib-teams';
import { t as tr, useLang } from '../i18n';
import { StatPanel, CardBack, RARITY_GLOW, RARITY_COLOR, RARITY_FILL, parseCard } from './StatPanel';
import LockerShareModal from './LockerShareModal';
import type { LockerShareOpts } from '../lib/lockerShare';
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

const plateFs=(l:number)=>l<=7?'0.8vw':l<=9?'0.72vw':l<=11?'0.64vw':l<=13?'0.5vw':'0.44vw';
// Nom sur la plaque : reduit automatiquement si le nom depasse la largeur de la plaque (ex. CUNNINGHAM)
const PlateName=({text,fs}:{text:string;fs:string})=>{
  const ref=useRef<HTMLSpanElement>(null);
  const [k,setK]=useState(1);
  useEffect(()=>{
    const el=ref.current,p=el?.parentElement; if(!el||!p)return;
    const fit=()=>{const w=el.offsetWidth,pw=p.clientWidth; setK(w>0&&w>pw?Math.max(0.45,(pw-2)/w):1);};
    fit(); window.addEventListener('resize',fit);
    return()=>window.removeEventListener('resize',fit);
  },[text,fs]);
  return <span ref={ref} style={{display:'inline-block',fontSize:fs,fontWeight:900,color:'#1a0d00',letterSpacing:'0.03em',textTransform:'uppercase',fontFamily:'Georgia,serif',textShadow:'0 1px 1px rgba(255,230,150,0.55),0 -1px 0 rgba(0,0,0,0.25)',whiteSpace:'nowrap',transform:'scale('+k+')',transformOrigin:'center'}}>{text}</span>;
};

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
// ===== POSITIONS FOOT (decor locker-foot.png, casiers mesures sur 2688px) =====
const SLOTS_FOOT = [
  {left:23.8, w:10.5},
  {left:37.2, w:10.5},
  {left:50.7, w:10.5},
  {left:63.9, w:10.5},
  {left:77.3, w:10.5},
];
const PLATE_X_FOOT = [22.9, 36.7, 50.6, 64.4, 78.2];
// ===== HAUTEURS FOOT INDEPENDANTES (NE PAS lier a la NBA) =====
const CARD_TOP_FOOT = 31.7;   // hauteur haut des cartes foot. Augmenter = descend.
const PLATE_TOP_FOOT = 71.0;  // hauteur des noms foot. Augmenter = descend, diminuer = monte.
const TEAM_X = 50.0;
const TEAM_Y = 15.4;


const LockerCard=memo(({card,isFlipped,isStarred,isPinned,onFlip,onStar,onPin,mobile}:any)=>{
  useLang();
  const [hover,setHover]=useState(false);
  const clickTimer=useRef<any>(null);
  const active = hover;
  const glow=RARITY_GLOW[card.rarityTyped]||RARITY_GLOW.common;
  const fill=RARITY_FILL[card.rarityTyped]||RARITY_FILL.common;
  const rc=RARITY_COLOR[card.rarityTyped]||'#9ca3af';
  return(
    <div style={{perspective:'900px',cursor:'pointer',width:'100%',containerType:'inline-size',touchAction:'manipulation',...(mobile&&!isFlipped?{animation:'mnflIdleFloat 5s ease-in-out infinite'}:{})}} onClick={()=>{ if(!mobile){ onFlip(card.slug); return; } if(clickTimer.current){ clearTimeout(clickTimer.current); clickTimer.current=null; onPin(card.slug); } else { clickTimer.current=setTimeout(()=>{ clickTimer.current=null; onFlip(card.slug); },230); } }} onMouseEnter={()=>{if(!mobile)setHover(true);}} onMouseLeave={()=>{if(!mobile)setHover(false);}}>
      <div style={{position:'relative',transformStyle:'preserve-3d',transition:'transform 0.4s cubic-bezier(0.2,0.8,0.3,1),box-shadow 0.3s ease',transform:(isFlipped?'rotateY(180deg)':'rotateY(0deg)')+((active&&!isFlipped&&!mobile)?' translateY(-12px) scale(1.035)':''),boxShadow:isFlipped?'0 0 12px 3px rgba(64,232,255,0.45),0 0 24px 6px rgba(64,232,255,0.2)':((active&&!isFlipped)?glow+', 0 22px 40px -8px rgba(0,0,0,0.7)':glow),borderRadius:'0.4rem',background:fill,...({['--rc']:rc,animation:isFlipped?'mnflCyanPulse 2.2s ease-in-out infinite':undefined} as any)}}>
        <div style={{backfaceVisibility:'hidden',WebkitBackfaceVisibility:'hidden',borderRadius:'0.4rem',overflow:'hidden'}}>
          <button title={tr('Titulaire du 5 majeur')} style={{position:'absolute',top:'5px',left:'5px',background:isPinned?'#c9a227dd':'#00000088',border:'none',borderRadius:'50%',width:mobile?'30px':'22px',height:mobile?'30px':'22px',cursor:'pointer',fontSize:mobile?'15px':'11px',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10,opacity:((!mobile&&active)||isPinned)?1:0,transition:'opacity 0.2s',pointerEvents:((!mobile&&active)||isPinned)?'auto':'none'}}
            onClick={e=>{e.stopPropagation();onPin(card.slug);}}>📌</button>
          <button style={{position:'absolute',top:'5px',right:'5px',background:isStarred?'#7c3aedcc':'#00000088',border:'none',borderRadius:'50%',width:mobile?'30px':'22px',height:mobile?'30px':'22px',cursor:'pointer',fontSize:mobile?'15px':'11px',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10,opacity:(mobile||active||isStarred)?1:0,transition:'opacity 0.2s',pointerEvents:(mobile||active||isStarred)?'auto':'none'}}
            onClick={e=>{e.stopPropagation();onStar(card.slug);}}>
            {isStarred?'⭐':'☆'}
          </button>
          <img src={card.pictureUrl} alt={card.name} style={{width:'100%',height:'auto',display:'block'}}/>
        </div>
        <CardBack card={card} rc={rc} mobile={mobile}/>
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
  sport?:string;
  onTeamChange:(api:string)=>void;
}

export default function LockerRoomScene({cards=[],startIndex,hof=[],flippedSlug,onFlip,onStar,onPin,pinnedSlugs=[],onPrev,onNext,total,teamApi,teamList=[],onTeamChange,sport='nba'}:Props){
  useLang();
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
  const isFoot=sport==='foot';
  const SL = isFoot?SLOTS_FOOT:SLOTS;
  const PLX = isFoot?PLATE_X_FOOT:PLATE_X;
  const CT = isFoot?CARD_TOP_FOOT:CARD_TOP;
  const PT = isFoot?PLATE_TOP_FOOT:PLATE_TOP;
  const img=isHofView?(isFoot?'locker-foot.png':'locker-hof.png'):(isFoot?'locker-foot.png':(info?info.img:FALLBACK_IMG));
  const displayName=isHofView?'HALL OF FAME':(info?info.display:teamApi);
  const nameLines=isHofView?['HALL OF','FAME']:(CITY_CLUB[teamApi]||[displayName,'']);
  // index equipe courante pour fleches equipe
  const teamIdx=teamList.findIndex(t=>t.api===teamApi);
  const prevTeam=teamIdx>0?teamList[teamIdx-1]:null;
  const nextTeam=teamIdx<teamList.length-1?teamList[teamIdx+1]:null;
  const [listOpen,setListOpen]=useState(false);
  const [slideDir,setSlideDir]=useState<'left'|'right'|null>(null);
  const [slideKey,setSlideKey]=useState(0);
  // Clavier : fleches gauche/droite = defilement du vestiaire (ignore si on tape dans un champ)
  const goPrev=()=>{setSlideDir('right');setSlideKey(k=>k+1);onPrev();};
  const goNext=()=>{setSlideDir('left');setSlideKey(k=>k+1);onNext();};
  const kbRef=useRef({hasPrev,hasNext,goPrev,goNext});
  kbRef.current={hasPrev,hasNext,goPrev,goNext};
  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      const el=e.target as HTMLElement|null;const tag=el?el.tagName:'';
      if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||(el&&el.isContentEditable))return;
      if(e.metaKey||e.ctrlKey||e.altKey)return;
      if(e.key==='ArrowLeft'&&kbRef.current.hasPrev){e.preventDefault();kbRef.current.goPrev();}
      else if(e.key==='ArrowRight'&&kbRef.current.hasNext){e.preventDefault();kbRef.current.goNext();}
    };
    window.addEventListener('keydown',h);
    return()=>window.removeEventListener('keydown',h);
  },[]);
  // Fleches foot : bouton rond sombre + or vif (invisibles sur le fond bois clair sinon)
  const ARF:React.CSSProperties=isFoot?{background:'rgba(8,10,16,0.6)',border:'1px solid rgba(255,215,94,0.65)',borderRadius:'50%',width:'2.6rem',height:'2.6rem',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 0 0.25rem 0',fontSize:'1.9rem',color:'#ffd75e',boxShadow:'0 0 10px rgba(0,0,0,0.6)'}:{};
  const carouselRef = useRef<HTMLDivElement>(null);
  const [mobileIdx, setMobileIdx] = useState(0);
  useEffect(() => { setMobileIdx(0); if(carouselRef.current) carouselRef.current.scrollLeft=0; }, [teamApi]); // SWIPE CONTINU: reset uniquement au changement d'equipe
  useEffect(() => {
    const el = carouselRef.current; if (!el) return;
    let raf: number;
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setMobileIdx(Math.round(el.scrollLeft / (window.innerWidth||1)))); };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { el.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);
  const mobileGoto = (dir: number) => { const el = carouselRef.current; if (!el) return; el.scrollBy({ left: dir * window.innerWidth, behavior: 'smooth' }); };
  const [mobileStatsSlug, setMobileStatsSlug] = useState<string|null>(null);
  const [mobileStatsClosing, setMobileStatsClosing] = useState(false);
  const startMobileStatsClose = () => { setMobileStatsClosing(true); setTimeout(() => { setMobileStatsSlug(null); setMobileStatsClosing(false); }, 600); };
  const mobileStatsCard = mobileStatsSlug ? (cards.find(c=>c.slug===mobileStatsSlug) || null) : null;

  const teamLbl=(t:any)=>{const d=TEAM_BY_API[t.api];const n=d?d.display:(t.api==='__HOF__'?'\uD83C\uDFC6 HALL OF FAME':t.api);return n+' ('+t.count+')';};
  const curTeam=teamList.find(t=>t.api===teamApi);
  // ===== PARTAGE DU VESTIAIRE : photo figee des 5 cartes visibles (sur mobile : a partir de la carte affichee) =====
  const [shareData,setShareData]=useState<LockerShareOpts|null>(null);
  const openShare=()=>{
    const mob=typeof window!=='undefined'&&window.innerWidth<768;
    const st=mob?Math.max(0,Math.min(mobileIdx,cards.length-5)):startIndex;
    const cs=cards.slice(st,st+5);
    setShareData({cards:cs,names:cs.map((c:any)=>c.anyPlayer?.lastName||parseCard(c.name).lastName),bg:'/'+img,title:[nameLines[0]||'',nameLines[1]||''],showTeamTitle:!isFoot,caption:isHofView?'HALL OF FAME':displayName,layout:{slots:SL,cardTop:CT,plateX:PLX,plateTop:PT,teamX:TEAM_X,teamY:TEAM_Y}});
  };
  const shareBtn=(pos:React.CSSProperties)=>(
    <button type='button' title={tr('Partager le vestiaire')} aria-label={tr('Partager le vestiaire')} onClick={openShare} style={{position:'absolute',width:'38px',height:'38px',borderRadius:'50%',background:'rgba(8,11,16,0.78)',border:'1.5px solid rgba(64,232,255,0.6)',boxShadow:'0 0 12px rgba(64,232,255,0.35)',color:'#40e8ff',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',padding:0,zIndex:20,...pos}}>
      <svg viewBox='0 0 24 24' style={{width:'18px',height:'18px'}} fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><circle cx='18' cy='5' r='3'/><circle cx='6' cy='12' r='3'/><circle cx='18' cy='19' r='3'/><path d='M8.6 13.5l6.8 4M15.4 6.5l-6.8 4'/></svg>
    </button>
  );

  return(
    <div>
      {shareData&&<LockerShareModal opts={shareData} onClose={()=>setShareData(null)}/>}
      {/* ===== BANDEAU TITRE (unifie NBA + Foot, navigation via sidebar) ===== */}
      <div className='mnfl-title-banner' style={{display:'flex',alignItems:'center',justifyContent:'center',width:'520px',maxWidth:'92%',overflow:'hidden',margin:'0 auto 0.5rem',position:'relative',padding:'0.4rem 1.5rem 0.5rem',borderRadius:'0.4rem',background:'linear-gradient(180deg,rgba(12,16,22,0.85),rgba(8,10,14,0.6))',border:'1px solid rgba(245,215,110,0.22)',borderBottom:'1px solid rgba(245,215,110,0.4)',boxShadow:'0 8px 22px -10px rgba(0,0,0,0.7),0 0 18px -6px rgba(245,200,90,0.18)'}}>
        <div style={{textAlign:'center',fontSize:'1.15rem',fontWeight:900,letterSpacing:'0.12em',color:'#f5d76e',fontFamily:'Georgia,serif',textShadow:'0 0 16px rgba(245,200,90,0.5),0 2px 5px rgba(0,0,0,0.8)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',textTransform:'uppercase'}}>
          {isHofView?'\uD83C\uDFC6 HALL OF FAME':displayName}{curTeam?(' ('+curTeam.count+')'):''}
        </div>
      </div>

      {/* ===== SCENE VESTIAIRE DESKTOP (masquee <768px) ===== */}
      <div className='mnfl-desktop-scene' style={{position:'relative',width:'100%',maxWidth:'min(calc((100vh - 110px) * 1.792), 100vw - 16px)',aspectRatio:'1376 / 768',margin:'0 auto',overflow:'hidden',background:'#0a0503',borderRadius:'18px',border:'1px solid rgba(255,255,255,0.05)',boxShadow:'0 30px 90px rgba(0,0,0,0.85), 0 0 0 1px rgba(0,0,0,0.6), inset 0 0 130px rgba(0,0,0,0.5)'}}>
        <img src={'/'+img} alt='vestiaire' onError={(e)=>{(e.target as HTMLImageElement).src='/'+FALLBACK_IMG;}}
          style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',objectFit:'fill'}}
        />

        {/* PARTICULES (poussiere dans les faisceaux) */}
        <div style={{position:'absolute',inset:0,zIndex:5,pointerEvents:'none',overflow:'hidden'}}>
          {[...Array(14)].map((_,i)=>{const lx=(i*67)%96+2;const sz=1.5+(i%3);const dur=7+(i%5)*2;const dl=(i%7);const tp=8+((i*53)%58);return <div key={i} style={{position:'absolute',left:lx+'%',top:tp+'%',width:sz+'px',height:sz+'px',borderRadius:'50%',background:'rgba(255,238,200,0.7)',filter:'blur(0.5px)',boxShadow:'0 0 4px rgba(255,230,180,0.6)',animation:'mnflFloat '+dur+'s ease-in-out '+dl+'s infinite'}}/>;})}
        </div>

        {/* NOM EQUIPE — 2 lignes ville/club (NBA uniquement : le decor foot n'a pas de zone titre) */}
        {!isFoot&&(
        <div style={{position:'absolute',left:TEAM_X+'%',top:TEAM_Y+'%',transform:'translate(-50%,-50%)',zIndex:15,textAlign:'center',width:'27%',lineHeight:1.05}}>
          <div style={{fontSize:'1.7vw',fontWeight:900,letterSpacing:'0.12em',textTransform:'uppercase',fontFamily:'Georgia,serif',color:'#ffd060',textShadow:'0 0 8px rgba(255,200,60,0.9),0 0 20px rgba(255,160,0,0.7)',whiteSpace:'nowrap'}}>
            {nameLines[0]}
          </div>
          <div style={{fontSize:'1.7vw',fontWeight:900,letterSpacing:'0.12em',textTransform:'uppercase',fontFamily:'Georgia,serif',color:'#ffd060',textShadow:'0 0 10px rgba(255,200,60,0.95),0 0 30px rgba(255,160,0,0.85),0 0 60px rgba(255,120,0,0.5)',whiteSpace:'nowrap'}}>
            {nameLines[1]}
          </div>
        </div>
        )}

        {/* RAIL JOUEURS : glisse au changement de page/equipe */}
        <div style={{position:'absolute',inset:0,zIndex:10}}>
        {/* CARTES */}
        {visible.map((card,i)=>(
          <div key={card.slug} style={{position:'absolute',left:SL[i].left+'%',top:CT+'%',width:SL[i].w+'%',transform:'translateX(-50%)',zIndex:10,filter:'drop-shadow(0 16px 11px rgba(0,0,0,0.6))',transition:'left 0.45s cubic-bezier(0.2,0.8,0.3,1),top 0.45s',animation:'mnflBuild 0.85s ease-out backwards',animationDelay:(i*0.06)+'s'}}>
            <LockerCard card={card} isFlipped={flippedSlug===card.slug} isStarred={hof.includes(card.slug)} isPinned={pinnedSlugs.includes(card.slug)} onFlip={handleCardFlip} onStar={onStar} onPin={onPin}/>
            {flippedSlug===card.slug&&(<svg style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',zIndex:22,pointerEvents:'none',overflow:'visible'}}><rect x='0' y='0' width='100%' height='100%' rx='6' pathLength='1000' fill='none' stroke='#40e8ff' strokeWidth='2.5' style={{filter:'drop-shadow(0 0 9px rgba(64,232,255,0.9))',strokeDasharray:'1000',strokeDashoffset:'1000',animation:'mnflCardTrace 1.4s ease-in-out 0.5s both'}}/></svg>)}
          </div>
        ))}

        {/* NOMS PLAQUES */}
        {visible.map((card,i)=>(
          <div key={'p'+card.slug} style={{position:'absolute',left:PLX[i]+'%',top:PT+'%',width:'7%',transform:'translate(-50%,-50%)',zIndex:15,textAlign:'center',overflow:'hidden',transition:'left 0.45s cubic-bezier(0.2,0.8,0.3,1)'}}>
            <PlateName text={(card.anyPlayer?.lastName||parseCard(card.name).lastName).toUpperCase()} fs={plateFs((card.anyPlayer?.lastName||parseCard(card.name).lastName).length)}/>
          </div>
        ))}
        </div>
        {flippedSlug&&laserSlot>=0&&!isClosing&&(
          <div key={'lsr'+flippedSlug} style={{position:'absolute',left:SL[laserSlot].left+'%',top:'2%',transform:'translateX(-50%)',width:'4px',zIndex:25,background:'linear-gradient(to bottom,rgba(64,232,255,0.95),rgba(0,100,200,0.1))',boxShadow:'0 0 10px 3px rgba(64,232,255,0.55)',borderRadius:'2px',pointerEvents:'none',animation:'mnflLaser 0.7s ease-out both'}}/>
        )}
        {flippedSlug&&laserSlot>=0&&isClosing&&(
          <div key={'ice'+flippedSlug} style={{position:'absolute',left:'84%',top:'49%',transform:'translate(-50%,-50%)',width:'31%',height:'6px',background:'linear-gradient(to right,transparent 0%,rgba(0,255,255,0.5) 15%,#00ffff 40%,#ffffff 50%,#00ffff 60%,rgba(0,255,255,0.5) 85%,transparent 100%)',filter:'blur(0.8px)',zIndex:55,pointerEvents:'none',animation:'mnflIcebreaker 0.75s ease-out 0.62s both'}}/>
        )}
        {/* Icebreaker trace ci-dessus */}
        {flippedSlug&&panelCard&&<StatPanel key={panelCard.slug} card={panelCard} isClosing={isClosing} onClose={startClose} placement='scene'/>}

        {/* FLECHES CARTES (navigation dans l'equipe) */}
        {hasPrev&&<button onClick={()=>{setSlideDir('right');setSlideKey(k=>k+1);onPrev();}} style={{position:'absolute',left:'0.6%',top:'43%',transform:'translateY(-50%)',background:'transparent',border:'none',color:'rgba(232,196,86,0.55)',fontSize:'2.4rem',lineHeight:1,cursor:'pointer',padding:'0.5rem',zIndex:20,transition:'all 0.15s',textShadow:'0 0 8px rgba(0,0,0,0.8)',...ARF}} onMouseEnter={e=>{const t=e.currentTarget as HTMLElement;t.style.color='#ffd75e';t.style.textShadow='0 0 16px rgba(245,200,90,0.9)';}} onMouseLeave={e=>{const t=e.currentTarget as HTMLElement;t.style.color=isFoot?'#ffd75e':'rgba(232,196,86,0.55)';t.style.textShadow='0 0 8px rgba(0,0,0,0.8)';}}>‹</button>}
        {hasNext&&<button onClick={()=>{setSlideDir('left');setSlideKey(k=>k+1);onNext();}} style={{position:'absolute',right:'0.6%',top:'43%',transform:'translateY(-50%)',background:'transparent',border:'none',color:'rgba(232,196,86,0.55)',fontSize:'2.4rem',lineHeight:1,cursor:'pointer',padding:'0.5rem',zIndex:20,transition:'all 0.15s',textShadow:'0 0 8px rgba(0,0,0,0.8)',...ARF}} onMouseEnter={e=>{const t=e.currentTarget as HTMLElement;t.style.color='#ffd75e';t.style.textShadow='0 0 16px rgba(245,200,90,0.9)';}} onMouseLeave={e=>{const t=e.currentTarget as HTMLElement;t.style.color=isFoot?'#ffd75e':'rgba(232,196,86,0.55)';t.style.textShadow='0 0 8px rgba(0,0,0,0.8)';}}>›</button>}

        {total>0&&shareBtn({top:'2.5%',right:'1.2%'})}

        {/* COMPTEUR */}
        <div style={{position:'absolute',bottom:'1.5%',left:'50%',transform:'translateX(-50%)',color:'rgba(255,220,100,0.85)',fontSize:'0.75rem',letterSpacing:'0.15em',zIndex:10,textShadow:'0 1px 4px rgba(0,0,0,0.9)'}}>
          {from}-{to} / {total}
        </div>
      </div>

      {/* ===== SCENE VESTIAIRE MOBILE (carrousel 1 carte, visible <768px) ===== */}
      {/* TODO: remplacer locker-foot.png par un vrai decor foot vertical quand pret */}
      <div className='mnfl-mobile-scene' style={{display:'none',position:'fixed',top:'84px',bottom:'70px',left:0,right:0,zIndex:30}}>
        <div style={{position:'relative',height:'100%',width:'100vw',maxWidth:'100vw',overflow:'hidden',background:'#0a0503'}}>
        <div ref={carouselRef} className='mnfl-carousel' style={{display:'flex',width:'100vw',maxWidth:'100vw',height:'100%',overflowX:'auto',overflowY:'hidden',overflowAnchor:'none',scrollSnapType:'x mandatory',scrollBehavior:'smooth',WebkitOverflowScrolling:'touch',touchAction:'pan-x'}}>
          {cards.map((card,i)=>{
            const mobileImg = isFoot?'locker-foot-mobile.png':'locker-NBA-mobile.png';
            const lastName = (card.anyPlayer?.lastName||parseCard(card.name).lastName).toUpperCase();
            return(
              <div key={'m'+card.slug} style={{flex:'0 0 100vw',width:'100vw',scrollSnapAlign:'center',position:'relative',height:'100%',background:'#0a0503'}}>
                <img src={'/'+mobileImg} alt='vestiaire' onError={(e)=>{(e.target as HTMLImageElement).src='/'+FALLBACK_IMG;}}
                  style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',objectFit:'fill'}}
                />
                <div style={{position:'absolute',left:'50%',top:'16%',width:'46%',transform:'translateX(-50%)',zIndex:10}}>
                  <LockerCard card={card} isFlipped={flippedSlug===card.slug} isStarred={hof.includes(card.slug)} isPinned={pinnedSlugs.includes(card.slug)} onFlip={handleCardFlip} onStar={onStar} onPin={onPin} mobile={true}/>
                </div>
                <div style={{position:'absolute',left:'50%',top:'81%',width:'40%',transform:'translate(-50%,-50%)',zIndex:15,textAlign:'center'}}>
                  <span style={{fontSize:'0.95rem',fontWeight:900,color:'#1a0d00',letterSpacing:'0.03em',fontFamily:'Georgia,serif',textShadow:'0 1px 1px rgba(255,230,150,0.55)',whiteSpace:'nowrap'}}>{lastName}</span>
                </div>
              </div>
            );
          })}
        </div>
        {cards.length>0&&shareBtn({top:'2%',right:'4%'})}
        {mobileIdx>0&&<button onClick={()=>mobileGoto(-1)} style={{position:'absolute',left:'2%',top:'46%',transform:'translateY(-50%)',background:'transparent',border:'none',color:'rgba(232,196,86,0.65)',fontSize:'2.2rem',lineHeight:1,cursor:'pointer',padding:'0.5rem',zIndex:20,textShadow:'0 0 8px rgba(0,0,0,0.8)'}}>‹</button>}
        {mobileIdx<cards.length-1&&<button onClick={()=>mobileGoto(1)} style={{position:'absolute',right:'2%',top:'46%',transform:'translateY(-50%)',background:'transparent',border:'none',color:'rgba(232,196,86,0.65)',fontSize:'2.2rem',lineHeight:1,cursor:'pointer',padding:'0.5rem',zIndex:20,textShadow:'0 0 8px rgba(0,0,0,0.8)'}}>›</button>}
        <div style={{position:'absolute',bottom:'1%',left:'50%',transform:'translateX(-50%)',color:'rgba(255,220,100,0.85)',fontSize:'0.7rem',letterSpacing:'0.15em',zIndex:20}}>{mobileIdx+1} / {cards.length}</div>
        {!mobileStatsCard&&<button title='Stats' onClick={()=>setMobileStatsSlug(cards[mobileIdx]?.slug||null)} style={{position:'absolute',right:'5%',bottom:'2%',width:'56px',height:'56px',borderRadius:'50%',background:'rgba(8,11,16,0.82)',border:'1.5px solid rgba(64,232,255,0.6)',boxShadow:'0 0 14px rgba(64,232,255,0.45)',color:'#40e8ff',fontSize:'1.55rem',display:'flex',alignItems:'center',justifyContent:'center',zIndex:22,cursor:'pointer'}}>📊</button>}
        {!mobileStatsCard&&<button title={tr('Retourner la carte')} onClick={()=>handleCardFlip(cards[mobileIdx]?.slug)} style={{position:'absolute',left:'5%',bottom:'2%',width:'56px',height:'56px',borderRadius:'50%',background:'rgba(8,11,16,0.82)',border:'1.5px solid rgba(64,232,255,0.6)',boxShadow:'0 0 14px rgba(64,232,255,0.45)',color:'#40e8ff',fontSize:'1.7rem',display:'flex',alignItems:'center',justifyContent:'center',zIndex:22,cursor:'pointer'}}>⇄</button>}
        {mobileStatsCard&&<StatPanel key={mobileStatsCard.slug} card={mobileStatsCard} isClosing={mobileStatsClosing} onClose={startMobileStatsClose} placement='mobile'/>}
        </div>
      </div>
    </div>
  );
}