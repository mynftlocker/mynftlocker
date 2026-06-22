'use client';
import { memo, useState } from 'react';
import { TEAM_BY_API, FALLBACK_IMG } from '../lib-teams';
import { StatPanel, CardBack, RARITY_GLOW, RARITY_COLOR, RARITY_FILL, parseCard } from './StatPanel';
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
// ===== POSITIONS FOOT (decor locker-foot.jpg, casiers mesures sur 2688px) =====
const SLOTS_FOOT = [
  {left:23.8, w:10.5},
  {left:37.2, w:10.5},
  {left:50.7, w:10.5},
  {left:64.2, w:10.5},
  {left:77.6, w:10.5},
];
const PLATE_X_FOOT = [22.9, 36.7, 50.6, 64.4, 78.2];
// ===== HAUTEURS FOOT INDEPENDANTES (NE PAS lier a la NBA) =====
const CARD_TOP_FOOT = 31.7;   // hauteur haut des cartes foot. Augmenter = descend.
const PLATE_TOP_FOOT = 71.0;  // hauteur des noms foot. Augmenter = descend, diminuer = monte.
const TEAM_X = 50.0;
const TEAM_Y = 15.4;


const LockerCard=memo(({card,isFlipped,isStarred,isPinned,onFlip,onStar,onPin}:any)=>{
  const [hover,setHover]=useState(false);
  const glow=RARITY_GLOW[card.rarityTyped]||RARITY_GLOW.common;
  const fill=RARITY_FILL[card.rarityTyped]||RARITY_FILL.common;
  const rc=RARITY_COLOR[card.rarityTyped]||'#9ca3af';
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
  sport?:string;
  onTeamChange:(api:string)=>void;
}

export default function LockerRoomScene({cards=[],startIndex,hof=[],flippedSlug,onFlip,onStar,onPin,pinnedSlugs=[],onPrev,onNext,total,teamApi,teamList=[],onTeamChange,sport='nba'}:Props){
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
  const img=isHofView?(isFoot?'locker-foot.jpg':'locker-hof.png'):(isFoot?'locker-foot.jpg':(info?info.img:FALLBACK_IMG));
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

  return(
    <div>
      {/* ===== BANDEAU TITRE (unifie NBA + Foot, navigation via sidebar) ===== */}
      <div className='mnfl-title-banner' style={{display:'flex',alignItems:'center',justifyContent:'center',width:'520px',maxWidth:'92%',margin:'0 auto 0.5rem',position:'relative',padding:'0.4rem 1.5rem 0.5rem',borderRadius:'0.4rem',background:'linear-gradient(180deg,rgba(12,16,22,0.85),rgba(8,10,14,0.6))',border:'1px solid rgba(245,215,110,0.22)',borderBottom:'1px solid rgba(245,215,110,0.4)',boxShadow:'0 8px 22px -10px rgba(0,0,0,0.7),0 0 18px -6px rgba(245,200,90,0.18)'}}>
        <div style={{textAlign:'center',fontSize:'1.15rem',fontWeight:900,letterSpacing:'0.12em',color:'#f5d76e',fontFamily:'Georgia,serif',textShadow:'0 0 16px rgba(245,200,90,0.5),0 2px 5px rgba(0,0,0,0.8)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',textTransform:'uppercase'}}>
          {isHofView?'\uD83C\uDFC6 HALL OF FAME':displayName}{curTeam?(' ('+curTeam.count+')'):''}
        </div>
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
            <span style={{fontSize:plateFs((card.anyPlayer?.lastName||parseCard(card.name).lastName).length),fontWeight:900,color:'#1a0d00',letterSpacing:'0.03em',textTransform:'uppercase',fontFamily:'Georgia,serif',textShadow:'0 1px 1px rgba(255,230,150,0.55),0 -1px 0 rgba(0,0,0,0.25)',whiteSpace:'nowrap'}}>
              {(card.anyPlayer?.lastName||parseCard(card.name).lastName).toUpperCase()}
            </span>
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
        {flippedSlug&&panelCard&&<StatPanel card={panelCard} isClosing={isClosing} onClose={startClose} placement='scene'/>}

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