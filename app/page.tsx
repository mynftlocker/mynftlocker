'use client';
import { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import GalleryView from './components/GalleryView';
import StarCanvas from './components/StarCanvas';

const LockerRoomScene = dynamic(() => import('./components/LockerRoom'), { ssr: false });

const RARITY_GLOW: Record<string,string> = {
  common:'0 0 16px 5px rgba(220,220,255,0.45)',
  limited:'0 0 22px 7px rgba(234,179,8,0.75)',
  rare:'0 0 26px 8px rgba(59,130,246,0.85)',
  super_rare:'0 0 30px 10px rgba(239,68,68,0.9)',
  unique:'0 0 36px 12px rgba(168,85,247,0.95)',
};
const RARITY_COLOR: Record<string,string> = {
  common:'#9ca3af',limited:'#eab308',rare:'#3b82f6',super_rare:'#ef4444',unique:'#a855f7',
};
const RARITY_FILL: Record<string,string> = {
  common:'#a8a8b5',limited:'#b48a14',rare:'#1e4ba8',super_rare:'#a82a2a',unique:'#7e3fc4',
};
const RARITY_ORDER: Record<string,number> = { unique:0, super_rare:1, rare:2, limited:3, common:4 };
const HOF_KEY = '__HOF__';

// Regroupe une specialEdition en famille (ex: stellar_holo_base -> STELLAR)
const editionGroup=(se:string):string=>{
  if(!se)return 'standard';
  const l=se.toLowerCase();
  if(l==='legacy')return 'standard';
  if(l.startsWith('colors_standard')||l.startsWith('stellar_standard'))return 'standard';
  if(l.startsWith('colors_'))return 'COLORS';
  if(l.startsWith('stellar_'))return 'STELLAR';
  if(l.startsWith('neon'))return 'NEON';
  if(l.startsWith('ice'))return 'ICE BREAKER';
  if(l.startsWith('early'))return 'EARLY ACCESS';
  if(l.startsWith('ballon'))return 'BALLON DOR';
  if(l.startsWith('flag'))return 'FLAG POSE';
  if(l.startsWith('horangi'))return 'HORANGI HERITAGE';
  if(l==='playoffs'||l.startsWith('postseason'))return 'PLAYOFFS';
  if(l==='showtime')return 'SHOWTIME';
  if(l==='sunset')return 'SUNSET';
  if(l==='winter')return 'WINTER';
  if(l==='ace')return 'ACE';
  if(l==='all-star'||l==='all_star')return 'ALL-STAR';
  if(l==='emirates')return 'EMIRATES';
  if(l==='rookie')return 'ROOKIE';
  if(l==='animated')return 'ANIMATED';
  if(l==='cursed')return 'CURSED';
  if(l==='halloween')return 'HALLOWEEN';
  return se.toUpperCase();
};
const specialLabel=(v:string)=>editionGroup(v);
const STANDARD_EDITIONS=new Set(['stellar_standard_base','colors_standard_base','legacy']);
const isSpecialCard=(c:any)=>{ const se=c.specialEdition; if(!se)return false; if(STANDARD_EDITIONS.has(se))return false; return editionGroup(se)!=='standard'; };
const playerKey=(c:any)=>(c.anyPlayer?.lastName||c.slug.split('-')[0])+'|'+(c.anyPlayer?.shirtNumber??'');
const dedupeByPlayer=(list:any[])=>{
  const better=(a:any,b:any)=>{ const sa=isSpecialCard(a)?1:0, sb=isSpecialCard(b)?1:0; if(sa!==sb) return sa>sb?a:b; return (a.xp??0)>=(b.xp??0)?a:b; };
  const byPlayer:Record<string,any>={};
  for(const c of list){ const k=playerKey(c); byPlayer[k]=byPlayer[k]?better(byPlayer[k],c):c; }
  return Object.values(byPlayer);
};

const isNBA=(c:any)=>c?.__typename==='NBACard';
const parseCard=(name:string)=>{
  const parts=name.split('•');const left=parts[0].trim();const right=(parts[1]||'').trim();
  const sm=left.match(/(\d{4}-\d{2})/);const season=sm?sm[1]:'';
  const pn=left.replace(/\d{4}-\d{2}/,'').trim();
  const ln=pn.split(' ').pop()!.toUpperCase();
  const sr=right.match(/(\d+\/\d+)/);
  return {playerName:pn,lastName:ln,season,serial:sr?sr[1]:null};
};
const nameFontSize=(l:number)=>l<=5?'2rem':l<=7?'1.65rem':l<=9?'1.35rem':l<=11?'1.1rem':'0.9rem';

const CardBack=memo(({ card }: { card: any }) => {
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
        <span style={{padding:'0.15rem 0.5rem',borderRadius:'999px',border:'1px solid '+rc+'66',background:rc+'15',fontSize:'0.55rem',fontWeight:700,color:rc,textTransform:'uppercase'}}>{card.rarityTyped.replace('_',' ')}</span>
      </div>
    </div>
  );
});
CardBack.displayName='CardBack';

const LockerSlot=memo(({card,isFlipped,isStarred,isHof,onFlip,onStar}:any)=>{
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
                <p style={{margin:'1px 0 0',fontSize:'0.42rem',color:'rgba(255,255,255,0.5)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.12em',fontFamily:'monospace'}}>{card.rarityTyped.replace('_',' ')} • {card.anyTeam?.name||''}</p>
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

const FilterMenu=({title,options,current,onSelect}:any)=>{
  const [open,setOpen]=useState(false);
  const [mounted,setMounted]=useState(false);
  useEffect(()=>{setMounted(true);},[]);
  const [pos,setPos]=useState({left:0,top:0,maxH:320});
  const ref=useRef<HTMLDivElement>(null);
  const cur=options.find((o:any)=>o.value===current);
  const enter=()=>{const el=ref.current;if(el){const r=el.getBoundingClientRect();const need=options.length*36+14;const avail=window.innerHeight-16;const h=Math.min(need,avail);const top=Math.max(8,Math.min(r.top,window.innerHeight-h-8));const MENU_W=200;let left=r.right;if(left+MENU_W>window.innerWidth-8){left=Math.max(8,r.left-MENU_W);if(left<8)left=window.innerWidth-MENU_W-8;}setPos({left,top,maxH:h});}setOpen(true);};
  const menuRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!open) return;
    const onOutside=(e:PointerEvent)=>{
      const t=e.target as Node;
      if(ref.current&&ref.current.contains(t)) return;
      if(menuRef.current&&menuRef.current.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown',onOutside);
    return ()=>document.removeEventListener('pointerdown',onOutside);
  },[open]);
  return(
    <div ref={ref} style={{position:'relative',marginBottom:'0.15rem'}} onMouseEnter={enter} onMouseLeave={()=>setOpen(false)}>
      {/* Declencheur pleine largeur : reste sombre, fine ligne au survol */}
      <div style={{width:'100%',padding:'0.35rem 0.5rem',borderRadius:'0.15rem',background:open?'rgba(111,195,232,0.08)':'transparent',borderLeft:open?'2px solid #6fc3e8':'2px solid transparent',cursor:'default',transition:'all 0.12s'}}>
        <p style={{fontSize:'0.64rem',fontWeight:800,letterSpacing:'0.14em',textTransform:'uppercase',color:'#eaf2ff',margin:'0 0 0.05rem',opacity:1}}>{title}</p>
        <p style={{fontSize:'0.8rem',fontWeight:500,color:open?'#6fc3e8':'#ffffff',opacity:open?1:0.6,margin:0,transition:'all 0.12s',display:'flex',alignItems:'center',justifyContent:'space-between'}}>{cur?cur.label:'—'} <span style={{fontSize:'0.7rem',opacity:0.7}}>›</span></p>
      </div>
      {open&&mounted&&createPortal(
        <div ref={menuRef} className='thin-sb' style={{position:'fixed',left:pos.left+'px',top:pos.top+'px',maxHeight:pos.maxH+'px',overflowY:'auto',minWidth:'190px',background:'#080a0e',border:'1px solid #6fc3e8',borderRadius:'0.4rem',padding:'0.3rem',boxShadow:'0 14px 38px rgba(0,0,0,0.7),0 0 14px rgba(111,195,232,0.18)',zIndex:9999}}>
            {options.map((o:any)=>(
              <button key={o.value} onClick={()=>onSelect(o.value)} style={{display:'block',width:'100%',textAlign:'left',padding:'0.4rem 0.7rem',borderRadius:'0.25rem',border:'none',borderLeft:o.value===current?'2px solid #f5d76e':'2px solid transparent',cursor:'pointer',fontSize:'0.8rem',fontWeight:o.value===current?700:500,background:o.value===current?'rgba(245,215,110,0.12)':'transparent',color:o.value===current?'#f5d76e':'#cfd8e6',transition:'background 0.1s'}} onMouseEnter={e=>{if(o.value!==current)(e.currentTarget as HTMLElement).style.background='rgba(111,195,232,0.12)';}} onMouseLeave={e=>{if(o.value!==current)(e.currentTarget as HTMLElement).style.background='transparent';}}>{o.label}</button>
            ))}
        </div>
      ,document.body)}
    </div>
  );
};

const COUNTRY_FR: Record<string,string> = {
  'be':'Belgique','ca':'Canada','de':'Allemagne','es':'Espagne',
  'fr':'France','gb-eng':'Angleterre','gb-sco':'Ecosse','gb-wls':'Pays de Galles',
  'gb-nir':'Irlande du Nord','it':'Italie','pt':'Portugal',
  'nl':'Pays-Bas','tr':'Turquie','ru':'Russie','pl':'Pologne',
  'at':'Autriche','ch':'Suisse','se':'Suede','dk':'Danemark',
  'no':'Norvege','gr':'Grece','ro':'Roumanie','hr':'Croatie',
  'rs':'Serbie','ua':'Ukraine','hu':'Hongrie','cz':'Republique Tcheque',
  'sk':'Slovaquie','bg':'Bulgarie','us':'Etats-Unis','mx':'Mexique',
  'br':'Bresil','ar':'Argentine','cl':'Chili','co':'Colombie',
  'uy':'Uruguay','pe':'Perou','ec':'Equateur','py':'Paraguay',
  'bo':'Bolivie','ve':'Venezuela','jp':'Japon','kr':'Coree du Sud',
  'cn':'Chine','au':'Australie','sa':'Arabie Saoudite',
  'ae':'Emirats Arabes Unis','ma':'Maroc','sn':'Senegal','ng':'Nigeria',
  'za':'Afrique du Sud','eg':'Egypte','cm':'Cameroun','gh':'Ghana',
  'ci':'Cote d Ivoire','tn':'Tunisie','int':'International',
};
const countryFR=(slug:string)=>slug==='__NATIONAL__'?'Selection Nationale':(COUNTRY_FR[slug]||'Autres pays');

const FootTeamMenu=({countries,teamsByCountry,country,team,onPickCountry,onPickTeam}:any)=>{
  const [open,setOpen]=useState(false);
  const [mounted,setMounted]=useState(false);
  const [hoveredCountry,setHoveredCountry]=useState<string|null>(null);
  useEffect(()=>{setMounted(true);},[]);
  const ref=useRef<HTMLDivElement>(null);
  const [posL,setPosL]=useState(220);
  const [posT,setPosT]=useState(0);
  // Monaco joue en Ligue 1 : fusionner mc dans fr
  const mergedByCountry:Record<string,string[]>={...teamsByCountry};
  if(mergedByCountry['mc']){
    mergedByCountry['fr']=[...new Set([...(mergedByCountry['fr']||[]),...mergedByCountry['mc']])].sort();
    delete mergedByCountry['mc'];
  }
  const mergedCountries=countries.filter((c:string)=>c!=='mc');
  if(mergedByCountry['fr']&&!mergedCountries.includes('fr'))mergedCountries.push('fr');
  const effectiveTeams=(c:string)=>mergedByCountry[c]||[];
  const label=team!=='all'?team:(country!=='all'?countryFR(country):'Tous les championnats');
  const sortedCountries=[...new Set<string>(mergedCountries)].sort((a:string,b:string)=>{if(a==='__NATIONAL__')return 1;if(b==='__NATIONAL__')return -1;return countryFR(a).localeCompare(countryFR(b),'fr');});
  const enter=()=>{
    const el=ref.current;
    if(el){
      const r=el.getBoundingClientRect();
      const FOOT_MENU_W=400; // cascade pays+clubs cote a cote (2 x 190px + marge)
      let left=r.right;
      if(left+FOOT_MENU_W>window.innerWidth-8){left=Math.max(8,window.innerWidth-FOOT_MENU_W-8);}
      setPosL(left);setPosT(r.top);
    }
    setOpen(true);
  };
  const btnStyle=(sel:boolean):React.CSSProperties=>({
    display:'block',width:'100%',textAlign:'left',padding:'0.4rem 0.7rem',
    borderRadius:'0.25rem',border:'none',
    borderLeft:sel?'2px solid #f5d76e':'2px solid transparent',
    cursor:'pointer',fontSize:'0.8rem',fontWeight:sel?700:500,
    background:sel?'rgba(245,215,110,0.12)':'transparent',
    color:sel?'#f5d76e':'#cfd8e6',transition:'background 0.1s',
  });
  const menuBase:React.CSSProperties={
    overflowY:'auto',minWidth:'190px',
    background:'#080a0e',border:'1px solid #6fc3e8',
    borderRadius:'0.4rem',padding:'0.3rem',
    boxShadow:'0 14px 38px rgba(0,0,0,0.7),0 0 14px rgba(111,195,232,0.18)',
    zIndex:9999,
  };
  return(
    <div ref={ref} style={{position:'relative',marginBottom:'0.15rem'}}
      onMouseEnter={enter}
      onMouseLeave={()=>{setOpen(false);setHoveredCountry(null);}}>
      <div style={{width:'100%',padding:'0.35rem 0.5rem',borderRadius:'0.15rem',background:open?'rgba(111,195,232,0.08)':'transparent',borderLeft:open?'2px solid #6fc3e8':'2px solid transparent',cursor:'default',transition:'all 0.12s'}}>
        <p style={{fontSize:'0.64rem',fontWeight:800,letterSpacing:'0.14em',textTransform:'uppercase',color:'#eaf2ff',margin:'0 0 0.05rem'}}>Equipe</p>
        <p style={{fontSize:'0.8rem',fontWeight:500,color:open?'#6fc3e8':'#ffffff',opacity:open?1:0.6,margin:0,display:'flex',alignItems:'center',justifyContent:'space-between'}}>{label} <span style={{fontSize:'0.7rem',opacity:0.7}}>›</span></p>
      </div>
      {open&&mounted&&createPortal(
        <div style={{position:'fixed',left:posL+'px',top:posT+'px',display:'flex',gap:'4px',zIndex:9999}}
          onMouseLeave={()=>{setOpen(false);setHoveredCountry(null);}}>
          <div className='thin-sb' style={{...menuBase,maxHeight:Math.min(380,window.innerHeight-posT-16)+'px'}}>
            <button style={btnStyle(country==='all'&&team==='all')}
              onClick={()=>{onPickCountry('all');onPickTeam('all');setHoveredCountry(null);}}>
              Tous les championnats
            </button>
            <button style={btnStyle(team==='__HOF__')}
              onClick={()=>{onPickTeam('__HOF__');setHoveredCountry(null);setOpen(false);}}>
              Hall of Fame
            </button>
            {sortedCountries.map((c:string)=>(
              <button key={c}
                style={{...btnStyle(country===c),display:'flex',justifyContent:'space-between',alignItems:'center'}}
                onMouseEnter={()=>setHoveredCountry(c)}
                onClick={()=>{onPickCountry(c);setHoveredCountry(c);}}>
                <span>{countryFR(c)}</span>
                <span style={{opacity:0.4,fontSize:'0.7rem',marginLeft:'0.5rem'}}>›</span>
              </button>
            ))}
          </div>
          {hoveredCountry&&effectiveTeams(hoveredCountry).length>0&&(
            <div className='thin-sb' style={{...menuBase,maxHeight:Math.min(380,window.innerHeight-posT-16)+'px'}}>
              {effectiveTeams(hoveredCountry).map((t:string)=>(
                <button key={t} style={btnStyle(team===t)}
                  onClick={()=>{onPickCountry(hoveredCountry);onPickTeam(t);}}>
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      ,document.body)}
    </div>
  );
};

const NBA_CONF:Record<string,string>={
  'Atlanta Hawks':'Est','Boston Celtics':'Est','Brooklyn Nets':'Est','Charlotte Hornets':'Est',
  'Chicago Bulls':'Est','Cleveland Cavaliers':'Est','Detroit Pistons':'Est','Indiana Pacers':'Est',
  'Miami Heat':'Est','Milwaukee Bucks':'Est','New York Knicks':'Est','Orlando Magic':'Est',
  'Philadelphia 76ers':'Est','Toronto Raptors':'Est','Washington Wizards':'Est',
  'Dallas Mavericks':'Ouest','Denver Nuggets':'Ouest','Golden State Warriors':'Ouest',
  'Houston Rockets':'Ouest','Los Angeles Clippers':'Ouest','Los Angeles Lakers':'Ouest',
  'Memphis Grizzlies':'Ouest','Minnesota Timberwolves':'Ouest','New Orleans Pelicans':'Ouest',
  'Oklahoma City Thunder':'Ouest','Phoenix Suns':'Ouest','Portland Trail Blazers':'Ouest',
  'Sacramento Kings':'Ouest','San Antonio Spurs':'Ouest','Utah Jazz':'Ouest',
};
export default function Home() {
  const [slug, setSlug] = useState('');
  const [logoFlipped, setLogoFlipped] = useState(false);
  const [acctOpen, setAcctOpen] = useState(false);
  const [cards, setCards] = useState<any[]>([]);
  const [hof, setHof] = useState<string[]>([]);
  const [hofFoot, setHofFoot] = useState<string[]>([]);
  const [flippedSlug, setFlippedSlug] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'locker'|'gallery'>('locker');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [lockerStart, setLockerStart] = useState(0);
  const [teamApi, setTeamApi] = useState('');
  // Filtres partages
  const [fRarity, setFRarity] = useState('all');
  const [fSeason, setFSeason] = useState('all');
  const [fSpecial, setFSpecial] = useState('all');
  const [fPlayer, setFPlayer] = useState('');
  // Galerie
  const [gSport,setGSport]=useState('nba');
  const [gLeague,setGLeague]=useState('all');
  const [gLeagueOpen,setGLeagueOpen]=useState(false);
  const [gClubOpen,setGClubOpen]=useState(false);
  const [gClubPos,setGClubPos]=useState({t:0,l:224});
  const [gTeamCustom,setGTeamCustom]=useState('all');
  const [gCountry,setGCountry]=useState('all');
  const [gSort,setGSort]=useState('default');
  const [openPhase,setOpenPhase]=useState(0);
  const canvasRef=useRef<HTMLCanvasElement|null>(null);
  const mouseXYRef=useRef<{x:number,y:number}>({x:0,y:0});
  const [typedIntro,setTypedIntro]=useState('');
  const INTRO_TEXT='ENTRE TON SLUG SORARE POUR COMMENCER';
  const [showFlash,setShowFlash]=useState(false);
  const fragStartedRef=useRef(false);
  const [lockerSort, setLockerSort] = useState<'majeur'|'collection'|'manual'>('majeur');
  const [lineup, setLineup] = useState<Record<string,string[]>>({});
  const [defaultTeam, setDefaultTeam] = useState('');

  useEffect(() => {
    if(!slug) return;
    const savedF=localStorage.getItem('mynftlocker_hof_foot_'+slug);
    if(savedF){try{setHofFoot(JSON.parse(savedF));}catch{}}
    const saved=localStorage.getItem('mynftlocker_hof_'+slug)||localStorage.getItem('myNFTlocker_hof_'+slug);
    if(saved){setHof(JSON.parse(saved));localStorage.setItem('mynftlocker_hof_'+slug,saved);}
  }, [slug]);

  useEffect(()=>{const h=(e:MouseEvent)=>{mouseXYRef.current={x:(e.clientX/window.innerWidth-0.5)*2,y:(e.clientY/window.innerHeight-0.5)*2};};window.addEventListener('mousemove',h);return()=>window.removeEventListener('mousemove',h);},[]);
  useEffect(()=>{let i=0;let iv:any;const t=setTimeout(()=>{iv=setInterval(()=>{i++;setTypedIntro(INTRO_TEXT.slice(0,i));if(i>=INTRO_TEXT.length)clearInterval(iv);},55);},600);return()=>{clearTimeout(t);clearInterval(iv);};},[]);
  useEffect(()=>{const cvs=canvasRef.current;if(!cvs||cards.length>0||openPhase>=3)return;const ctx=cvs.getContext('2d');if(!ctx)return;const resize=()=>{cvs.width=window.innerWidth;cvs.height=window.innerHeight;};resize();window.addEventListener('resize',resize);const stars=Array.from({length:260},(_,i)=>({x:Math.random(),y:Math.random(),sz:i<80?1.5+Math.random()*1.5:i<180?0.7+Math.random()*0.9:0.3+Math.random()*0.5,depth:i<80?3:i<180?2:1,tw:Math.random()*0.025+0.006,off:Math.random()*Math.PI*2,op:0.35+Math.random()*0.65,}));const ss:any[]=[];let lastSS=0;const asts=Array.from({length:5},()=>({x:Math.random()*2000,y:Math.random()*1200,vx:(Math.random()-0.5)*0.35,vy:Math.random()*0.18+0.08,r:Math.random()*4+2}));let raf:number;let t0=0;const draw=(ts:number)=>{if(!t0)t0=ts;const dt=ts-t0;const W=cvs.width,H=cvs.height;const mx=mouseXYRef.current.x,my=mouseXYRef.current.y;ctx.fillStyle='rgba(3,5,16,0.18)';ctx.fillRect(0,0,W,H);stars.forEach(s=>{const px=mx*s.depth*9,py=my*s.depth*9;const tw=0.5+0.5*Math.sin(dt*s.tw+s.off);const alpha=s.op*(0.55+0.45*tw);const cx2=((s.x*W+px)%W+W)%W,cy2=((s.y*H+py)%H+H)%H;ctx.beginPath();ctx.arc(cx2,cy2,s.sz*tw*0.4+s.sz*0.6,0,Math.PI*2);const col=s.depth===1?'220,235,255':s.depth===2?'235,245,255':'255,255,255';ctx.fillStyle=`rgba(${col},${alpha})`;ctx.fill();});if(ts-lastSS>1600+Math.random()*3200){lastSS=ts;ss.push({x:W*0.05+Math.random()*W*0.65,y:Math.random()*H*0.45,vx:9+Math.random()*9,vy:3+Math.random()*7,life:1.0})}for(let i=ss.length-1;i>=0;i--){const st=ss[i];st.x+=st.vx;st.y+=st.vy;st.life-=0.022;if(st.life<=0){ss.splice(i,1);continue;}const g=ctx.createLinearGradient(st.x-st.vx*10,st.y-st.vy*10,st.x,st.y);g.addColorStop(0,'rgba(200,235,255,0)');g.addColorStop(0.6,`rgba(220,245,255,${st.life*0.55})`);g.addColorStop(1,`rgba(255,255,255,${st.life})`);ctx.beginPath();ctx.strokeStyle=g;ctx.lineWidth=st.life*2;ctx.moveTo(st.x-st.vx*10,st.y-st.vy*10);ctx.lineTo(st.x,st.y);ctx.stroke();}asts.forEach(a=>{a.x=(a.x+a.vx+W)%W;a.y=(a.y+a.vy+H)%H;ctx.beginPath();ctx.arc(a.x,a.y,a.r,0,Math.PI*2);ctx.fillStyle='rgba(38,35,52,0.72)';ctx.fill();});raf=requestAnimationFrame(draw);};ctx.fillStyle='rgb(3,5,16)';ctx.fillRect(0,0,cvs.width,cvs.height);raf=requestAnimationFrame(draw);return()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',resize);}},[openPhase,loading,cards.length]);
  // Premier accEs : pre-remplir le HoF avec les 5 meilleurs L10 (sans doublon)
  useEffect(()=>{
    if(cards.length===0) return;
    if(loading) return;
    if(localStorage.getItem('mynftlocker_hof_init_'+slug)) return;
    const savedHof=localStorage.getItem('mynftlocker_hof_'+slug);
    if(savedHof && JSON.parse(savedHof).length>0){ localStorage.setItem('mynftlocker_hof_init_'+slug,'done'); return; }
    const nba=cards.filter(c=>isNBA(c));
    const top5=dedupeByPlayer(nba).sort((a:any,b:any)=>(b.averageScore??-1)-(a.averageScore??-1)).slice(0,5).map((c:any)=>c.slug);
    if(top5.length===0) return;
    setHof(top5);
    localStorage.setItem('mynftlocker_hof_'+slug,JSON.stringify(top5));
    localStorage.setItem('mynftlocker_hof_init_'+slug,'done');
    if(!localStorage.getItem('mynftlocker_default_team_'+slug)) setTeamApi(HOF_KEY);
  },[cards,loading]);

  // Init auto du HOF Foot (top 5 cartes foot par L10) — une seule fois
  useEffect(()=>{
    if(cards.length===0) return;
    if(loading) return;
    if(localStorage.getItem('mynftlocker_hoffoot_init_'+slug)) return;
    const savedF=localStorage.getItem('mynftlocker_hof_foot_'+slug);
    if(savedF && JSON.parse(savedF).length>0){ localStorage.setItem('mynftlocker_hoffoot_init_'+slug,'done'); return; }
    const foot=cards.filter(c=>!isNBA(c));
    const top5=dedupeByPlayer(foot).sort((a:any,b:any)=>(b.averageScore??-1)-(a.averageScore??-1)).slice(0,5).map((c:any)=>c.slug);
    if(top5.length===0) return;
    setHofFoot(top5);
    localStorage.setItem('mynftlocker_hof_foot_'+slug,JSON.stringify(top5));
    localStorage.setItem('mynftlocker_hoffoot_init_'+slug,'done');
  },[cards,loading]);

  const handleStar=useCallback((s:string)=>{
    const card=cards.find(c=>c.slug===s);
    const isFootCard=card?!isNBA(card):false;
    if(isFootCard){
      setHofFoot(prev=>{const next=prev.includes(s)?prev.filter(x=>x!==s):[...prev,s];localStorage.setItem('mynftlocker_hof_foot_'+slug,JSON.stringify(next));return next;});
    } else {
      setHof(prev=>{const next=prev.includes(s)?prev.filter(x=>x!==s):[...prev,s];localStorage.setItem('mynftlocker_hof_'+slug,JSON.stringify(next));return next;});
    }
  },[cards]);
  const handleFlip=useCallback((s:string)=>{setFlippedSlug(f=>f===s?null:s);},[]);
  const handlePrev=useCallback(()=>{setLockerStart(s=>Math.max(0,s-1));setFlippedSlug(null);},[]);
  const handleNext=useCallback((tot:number)=>{setLockerStart(s=>Math.min(s+1,Math.max(0,tot-5)));setFlippedSlug(null);},[]);
  const handleTeamChange=useCallback((api:string)=>{setTeamApi(api);setLockerStart(0);setFlippedSlug(null);if(api!=='__HOF__')localStorage.setItem('mnfl_team_chosen_'+slug,'1');else localStorage.removeItem('mnfl_team_chosen_'+slug);},[]);
  useEffect(()=>{ const s=localStorage.getItem('mynftlocker_lineup'); if(s){try{setLineup(JSON.parse(s));}catch{}} },[]);
  // SCROLL RESET MODE : remonte en haut a chaque changement d'onglet (Vestiaire/Galerie)
  useEffect(()=>{ window.scrollTo(0,0); const cEl=document.querySelector('.mnfl-content'); if(cEl) cEl.scrollTop=0; },[mode]);
  useEffect(()=>{ if(!slug) return; setDefaultTeam(localStorage.getItem('mynftlocker_default_team_'+slug)||''); },[slug]);
  const handleSetDefault=useCallback((api:string)=>{ localStorage.setItem('mynftlocker_default_team_'+slug,api); setDefaultTeam(api); },[slug]);
  const collectionBadge=(n:number)=>{
    if(n>=2500) return {emoji:'🐋',border:'#fff3cf',glow:'rgba(245,215,110,0.8)',bg:'radial-gradient(circle at 35% 30%,#f5d76e,#b8860b)'};
    if(n>=1500) return {emoji:'🐋',border:'#cdf5ff',glow:'rgba(64,232,255,0.75)',bg:'radial-gradient(circle at 35% 30%,#6fe0ff,#0088aa)'};
    if(n>=500) return {emoji:'🐬',border:'#cdf5ff',glow:'rgba(64,232,255,0.7)',bg:'radial-gradient(circle at 35% 30%,#6fe0ff,#0088aa)'};
    return {emoji:'🐟',border:'#cdf5ff',glow:'rgba(64,232,255,0.65)',bg:'radial-gradient(circle at 35% 30%,#6fe0ff,#0088aa)'};
  };
  const clearDefault=useCallback(()=>{ localStorage.removeItem('mynftlocker_default_team_'+slug); setDefaultTeam(''); },[slug]);
  const resetFilters=useCallback(()=>{
    setGSport('nba');setGLeague('all');setGTeamCustom('all');setGCountry('all');setFSpecial('all');
    setTeamApi(HOF_KEY);setLockerStart(0);setFlippedSlug(null);
    localStorage.removeItem('mnfl_team_chosen_'+slug);
  },[slug]);
  const handlePin=useCallback((team:string,slug:string)=>{
    setLineup(prev=>{
      const cur=prev[team]||[];
      const next=cur.includes(slug)?cur.filter(s=>s!==slug):[...cur,slug].slice(-5);
      const obj={...prev,[team]:next};
      localStorage.setItem('mynftlocker_lineup',JSON.stringify(obj));
      return obj;
    });
  },[]);

  // reset pagination vestiaire quand un filtre change
  useEffect(()=>{setLockerStart(0);},[fRarity,fSeason,fSpecial,fPlayer,teamApi,lockerSort,lineup]);

  const fetchCards=async()=>{
    if(!slug)return;
    setLoading(true);setError('');setFlippedSlug(null);setLockerStart(0);
    // Cache localStorage (TTL 1h)
    const CACHE_KEY='mnfl_v2_'+slug;
    try{
      const cached=localStorage.getItem(CACHE_KEY);
      if(cached){const{c:cc,ts}=JSON.parse(cached);if(Date.now()-ts<3600000&&cc?.length>0){setCards(cc);setLoading(false);return;}}
    }catch(e){}
    // Appel direct navigateur → Sorare (IP residentielle, bypass datacenter block)
    const all:any[]=[];let cur:string|null=null;let more=true;let pageNum=0;
    const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
    const SORARE_URL='https://api.sorare.com/federation/graphql';
    const fetchPage=async(cursor:string|null):Promise<{cards:any[],hasNextPage:boolean,cursor:string|null}|null>=>{
      const after=cursor?`, after: "${cursor}"` :'';
      const query=`query{user(slug:"${slug}"){cards(first:25${after}){nodes{__typename slug name rarityTyped pictureUrl anyPlayer{lastName shirtNumber}anyTeam{name ...on Club{country{slug}}}...on NBACard{seasonYear specialEdition power xp averageScore(type:LAST_TEN_PLAYED_SO5_AVERAGE_SCORE)}}pageInfo{hasNextPage endCursor}}}}`;
      // 1. Essai direct navigateur (IP residentielle)
      try{
        const r=await fetch(SORARE_URL,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({query}),signal:AbortSignal.timeout(20000)});
        if(r.ok){
          const j=await r.json();
          if(!j.errors&&j?.data?.user?.cards){const c=j.data.user.cards;return{cards:c.nodes,hasNextPage:c.pageInfo.hasNextPage,cursor:c.pageInfo.endCursor};}
          console.warn('[Sorare direct]',j.errors?.[0]?.message);
        }
      }catch(e){console.warn('[Sorare direct CORS/timeout]',String(e));}
      // 2. Fallback route Vercel
      const url='/api/cards?slug='+encodeURIComponent(slug)+(cursor?'&cursor='+encodeURIComponent(cursor):'');
      const r2=await fetch(url);
      if(!r2.ok)return null;
      const d=await r2.json();
      if(d.error||!d.cards)return null;
      return{cards:d.cards,hasNextPage:d.hasNextPage,cursor:d.cursor};
    };
    try{
      while(more){
        pageNum++;
        let data:any=null;
        for(let attempt=0;attempt<6;attempt++){
          if(attempt>0)await sleep(1200*attempt);
          data=await fetchPage(cur);
          if(data)break;
          console.error('Page'+pageNum+' attempt'+(attempt+1)+' failed');
        }
        if(!data){if(all.length===0){setError('Joueur introuvable');setOpenPhase(0);}break;}
        all.push(...data.cards);
        setCards([...all]);
        more=data.hasNextPage;
        cur=data.cursor;
        if(more)await sleep(80);
      }
      console.log('=== LOAD DONE === cartes:'+all.length+' pages:'+pageNum);
      if(all.length>0){try{localStorage.setItem(CACHE_KEY,JSON.stringify({c:all,ts:Date.now()}));}catch(e){}}
    }catch(e){if(all.length===0){setError('Erreur reseau');setOpenPhase(0);}}
    setLoading(false);
  };
  const handleIntroClick=useCallback(()=>{if(!slug||loading||openPhase>0)return;fragStartedRef.current=false;setOpenPhase(1);fetchCards();},[slug,loading,openPhase]);
  useEffect(()=>{if(showFlash&&error){setShowFlash(false);setOpenPhase(0);}},[showFlash,error]);
  useEffect(()=>{if(!showFlash)return;const t=setTimeout(()=>setShowFlash(false),650);return()=>clearTimeout(t);},[showFlash]);
  useEffect(()=>{if(openPhase===1&&!loading&&cards.length>0&&!fragStartedRef.current){
    fragStartedRef.current=true;
    setOpenPhase(3);setShowFlash(true);
  }},[openPhase,loading,cards.length]);

  // Options dynamiques
  const seasonOptions=useMemo(()=>{
    const s=new Set<number>();
    for(const c of cards){if(c.seasonYear)s.add(c.seasonYear);}
    return [...s].sort((a,b)=>b-a);
  },[cards]);
  const specialOptions=useMemo(()=>{
    const s=new Set<string>();
    for(const c of cards){if((gSport==='nba'?isNBA(c):!isNBA(c))&&isSpecialCard(c))s.add(editionGroup(c.specialEdition));}
    return [...s].sort();
  },[cards,gSport]);

  // Filtre cumulable applique a n'importe quelle liste
  const applyFilters=useCallback((list:any[])=>{
    return list.filter(c=>{
      if(fRarity!=='all' && c.rarityTyped!==fRarity) return false;
      if(fSeason!=='all' && c.seasonYear!==Number(fSeason)) return false;
      if(fSpecial==='standard' && isSpecialCard(c)) return false;
      if(fSpecial==='special' && !isSpecialCard(c)) return false;
      if(fSpecial!=='all'&&fSpecial!=='standard'&&fSpecial!=='special' && editionGroup(c.specialEdition||'')!==fSpecial) return false;
      if(fPlayer){
        const ln=(c.anyPlayer?.lastName||'').toLowerCase();
        if(!ln.includes(fPlayer.toLowerCase()) && !c.name.toLowerCase().includes(fPlayer.toLowerCase())) return false;
      }
      return true;
    });
  },[fRarity,fSeason,fSpecial,fPlayer]);

  // Liste equipes : ordre alphabetique par ville + Hall of Fame en tete
  const teamList=useMemo(()=>{
    const isFoot=gSport==='foot';
    const counts:Record<string,number>={};
    for(const c of cards){const match=isFoot?!isNBA(c):isNBA(c);if(match&&c.anyTeam?.name){counts[c.anyTeam.name]=(counts[c.anyTeam.name]||0)+1;}}
    const list=Object.entries(counts).map(([api,count])=>({api,display:api,count})).sort((a,b)=>a.api.localeCompare(b.api));
    const activeHof=isFoot?hofFoot:hof;
    const hofCount=cards.filter(c=>activeHof.includes(c.slug)).length;
    if(hofCount>0) list.unshift({api:HOF_KEY,display:'HALL OF FAME',count:hofCount});
    return list;
  },[cards,hof,hofFoot,gSport]);
  const leagueOptions=useMemo(()=>{if(gSport==='nba')return[{v:'all',l:'NBA'}];return[{v:'all',l:'Toutes les ligues'}];},[gSport]);
  useEffect(()=>{
    if(teamList.length===0)return;
    const hofInList=teamList.find(t=>t.api==='__HOF__');
    const savedDefault=localStorage.getItem('mynftlocker_default_team_'+slug);
    if(teamApi===''&&savedDefault&&teamList.find(t=>t.api===savedDefault)){setTeamApi(savedDefault);return;}
    if(hofInList&&teamApi!=='__HOF__'&&!localStorage.getItem('mnfl_team_chosen_'+slug)&&!savedDefault){setTeamApi('__HOF__');return;}
    if(!teamList.find(t=>t.api===teamApi)){setTeamApi(hofInList?'__HOF__':teamList[0].api);}
  },[teamList,teamApi]);

  // Vestiaire : epingles prioritaires, puis remplissage, puis TOUTES les cartes
  const lockerCards=useMemo(()=>{
    const isFoot=gSport==='foot';
    const activeHof=isFoot?hofFoot:hof;
    const pool = teamApi===HOF_KEY
      ? cards.filter(c=>activeHof.includes(c.slug))
      : applyFilters(cards.filter(c=>(isFoot?!isNBA(c):isNBA(c))&&c.anyTeam?.name===teamApi));
    const byL10=(a:any,b:any)=>(b.averageScore??-1)-(a.averageScore??-1);
    // Epingles = cartes exactes (doublons autorises), dans l'ordre d'epinglage
    const pins=lineup[teamApi]||[];
    const pinned=pins.map(s=>pool.find(c=>c.slug===s)).filter(Boolean) as any[];
    const pinnedSlugs=new Set(pinned.map((c:any)=>c.slug));
    const remaining=pool.filter(c=>!pinnedSlugs.has(c.slug));
    // Alphabetique : epingles d'abord puis tri par nom de joueur
    if(lockerSort==='collection'){ const alpha=[...remaining].sort((a,b)=>(a.anyPlayer?.lastName||a.name||'').localeCompare(b.anyPlayer?.lastName||b.name||'')); return [...pinned,...alpha]; }
    // Mon 5 : uniquement tes epingles d'abord, puis toutes les autres
    if(lockerSort==='manual'){ return [...pinned,...remaining]; }
    // 5 Majeur : 5 premieres = epingles + meilleurs L10 (joueurs uniques), puis TOUT le reste trie par L10
    const pinnedPlayers=new Set(pinned.map(playerKey));
    const fill=[...dedupeByPlayer(remaining)].sort(byL10).filter((c:any)=>!pinnedPlayers.has(playerKey(c)));
    const head=[...pinned,...fill].slice(0,5);
    const headSlugs=new Set(head.map((c:any)=>c.slug));
    const tail=pool.filter(c=>!headSlugs.has(c.slug)).sort(byL10);
    return [...head,...tail];
  },[cards,teamApi,applyFilters,lockerSort,hof,hofFoot,gSport,lineup]);

  // Galerie = sport + filtres + tri
  const footCountries=useMemo(()=>{const s=new Set<string>();let hasNational=false;cards.filter((c:any)=>!isNBA(c)).forEach((c:any)=>{const co=c.anyTeam?.country?.slug;if(co)s.add(co);else if(c.anyTeam?.name)hasNational=true;});const arr=Array.from(s).sort();if(hasNational)arr.push('__NATIONAL__');return arr;},[cards]);
  const teamsByCountry=useMemo(()=>{const m:Record<string,Set<string>>={};cards.filter((c:any)=>!isNBA(c)).forEach((c:any)=>{const co=c.anyTeam?.country?.slug;const nm=c.anyTeam?.name;if(nm){const key=co||'__NATIONAL__';(m[key]=m[key]||new Set<string>()).add(nm);}});const out:Record<string,string[]>={};for(const k in m)out[k]=Array.from(m[k]).sort();return out;},[cards]);
  const galleryTeamList=useMemo(()=>{const ts=new Set<string>();cards.filter(c=>isNBA(c)).forEach(c=>{if(!c.anyTeam?.name)return;ts.add(c.anyTeam.name);});return['all',...Array.from(ts).sort()] as string[];},[cards]);
  const filteredGallery=useMemo(()=>{let base=cards.filter((c:any)=>gSport==='nba'?isNBA(c):!isNBA(c));let r=applyFilters(base);if(gSport==='foot'&&gCountry!=='all'){if(gCountry==='__NATIONAL__')r=r.filter((c:any)=>!c.anyTeam?.country?.slug&&c.anyTeam?.name);else r=r.filter((c:any)=>c.anyTeam?.country?.slug===gCountry);}if(gTeamCustom!=='all')r=r.filter((c:any)=>(c.anyTeam?.name||'')===gTeamCustom);if(gSort==='rarity')return[...r].sort((a:any,b:any)=>(RARITY_ORDER[a.rarityTyped]??9)-(RARITY_ORDER[b.rarityTyped]??9));if(gSort==='name')return[...r].sort((a:any,b:any)=>(a.anyPlayer?.lastName||'').localeCompare(b.anyPlayer?.lastName||''));return[...r].sort((a:any,b:any)=>parseFloat(String(b.averageScore||0))-parseFloat(String(a.averageScore||0)));},[cards,applyFilters,gSport,gCountry,gTeamCustom,gSort]);

  const goldGrad='linear-gradient(160deg,#a86f15 0%,#d9a52e 22%,#f7da80 48%,#e8b84a 68%,#b8801a 100%)';
  const fBtn=(a:boolean):React.CSSProperties=>({padding:'0.4rem 0.6rem',borderRadius:'0.15rem',border:'none',borderLeft:a?'2px solid #f5d76e':'2px solid rgba(255,255,255,0.08)',background:a?'rgba(245,215,110,0.12)':'rgba(255,255,255,0.025)',color:a?'#f5d76e':'#cfd8e6',cursor:'pointer',fontSize:'0.76rem',fontWeight:a?700:500,transition:'all 0.12s'});
  const gridHof:React.CSSProperties={display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))',gap:'12px',padding:'12px'};
  const gridMain:React.CSSProperties={display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))',gap:'12px',padding:'12px'};
  const galleryBg:React.CSSProperties={background:'radial-gradient(ellipse 130% 90% at 50% -10%,#0d111a 0%,#080b10 50%,#040507 100%)',minHeight:'100vh'};

  // Barre de filtres partagee
  const labelStyle:React.CSSProperties={fontSize:'0.64rem',fontWeight:800,letterSpacing:'0.14em',textTransform:'uppercase',color:'#eaf2ff',margin:'0.5rem 0 0.3rem 0.5rem'};
  const contentBg='linear-gradient(180deg,#13151a 0%,#0c0e12 45%,#07080a 100%)';
  const sideBg='rgba(12,14,19,0.82)';

  // Bloc filtres vertical (barre laterale)
  const rarityOpts=[{value:'all',label:'Toutes les raretés'},{value:'common',label:'Common'},{value:'limited',label:'Limited'},{value:'rare',label:'Rare'},{value:'super_rare',label:'Super Rare'},{value:'unique',label:'Unique'}];
  const seasonOpts=[{value:'all',label:'Toutes saisons'},...seasonOptions.map(y=>({value:String(y),label:y+'-'+String((y+1)%100).padStart(2,'0')}))];
  const specialOpts=[{value:'all',label:'Toutes cartes'},{value:'standard',label:'STANDARD UNIQUEMENT'},{value:'special',label:'SPÉCIALES UNIQUEMENT'},...specialOptions.map(s=>({value:s,label:s}))];
  // (composant Filters retiré — filtres inlinés dans la sidebar)

  return(
    <main style={{minHeight:'100vh',background:contentBg,backgroundAttachment:'fixed',color:'white',fontFamily:'system-ui,sans-serif',display:'flex'}}>
      <style>{`aside::-webkit-scrollbar,.noscroll::-webkit-scrollbar{width:0;height:0;display:none} .noscroll{scrollbar-width:none} .thin-sb::-webkit-scrollbar{width:6px} .thin-sb::-webkit-scrollbar-thumb{background:rgba(111,195,232,0.45);border-radius:3px} .thin-sb::-webkit-scrollbar-track{background:transparent} .thin-sb{scrollbar-width:thin;scrollbar-color:rgba(111,195,232,0.45) transparent} @keyframes mnflBuild{0%{opacity:0;transform:translateX(-50%) translateY(12px);filter:blur(3.5px) brightness(1.6) saturate(0.4);box-shadow:0 0 28px 7px rgba(111,195,232,0.5)}50%{opacity:0.65;filter:blur(1.5px) brightness(1.2) saturate(0.75)}100%{opacity:1;transform:translateX(-50%) translateY(0);filter:blur(0) brightness(1) saturate(1);box-shadow:0 0 0 0 rgba(111,195,232,0)}} @keyframes mnflSlideLeft{from{opacity:0;transform:translateX(70px);filter:blur(2px)}to{opacity:1;transform:translateX(0);filter:blur(0)}} @keyframes mnflSlideRight{from{opacity:0;transform:translateX(-70px);filter:blur(2px)}to{opacity:1;transform:translateX(0);filter:blur(0)}} @keyframes mnflLaser{0%{height:0;opacity:0.95}50%{height:29%;opacity:1}75%{height:29%;opacity:0.85}100%{height:29%;opacity:0}} @keyframes mnflDeploy{0%{opacity:0;clip-path:inset(0 100% 0 0);transform:perspective(900px) rotateY(-4deg) translateX(-6px)}35%{opacity:0.6}100%{opacity:1;clip-path:inset(0 0% 0 0);transform:perspective(900px) rotateY(0deg) translateX(0)}} @keyframes mnflClose{0%{opacity:1;transform:scaleY(1);filter:brightness(1)}30%{transform:scaleY(0.84);filter:brightness(1.2)}55%{transform:scaleY(0.42);filter:brightness(1.7)}72%{transform:scaleY(0.12);filter:brightness(2.5)}80%{transform:scaleY(0.025);filter:brightness(4) blur(0.5px)}88%{transform:scaleY(0.008);filter:brightness(6);opacity:1}95%{transform:scaleY(0.003);filter:brightness(9)}100%{transform:scaleY(0);opacity:0;filter:brightness(0)}} @keyframes mnflIcebreaker{0%{opacity:0;transform:translate(-50%,-50%) scaleX(0.05) scaleY(1)}18%{opacity:1;transform:translate(-50%,-50%) scaleX(1) scaleY(1);filter:brightness(2)}52%{opacity:1;transform:translate(-50%,-50%) scaleX(1) scaleY(1)}70%{opacity:1;transform:translate(-50%,-50%) scaleX(0.14) scaleY(2.5);filter:brightness(5)}82%{opacity:1;transform:translate(-50%,-50%) scaleX(0.04) scaleY(7);filter:brightness(10)}90%{opacity:1;transform:translate(-50%,-50%) scaleX(0.01) scaleY(2);filter:brightness(4)}100%{opacity:0;transform:translate(-50%,-50%) scaleX(0) scaleY(0)}} @keyframes mnflFloat{0%{transform:translateY(8px);opacity:0}25%{opacity:0.55}75%{opacity:0.45}100%{transform:translateY(-26px);opacity:0}} @keyframes mnflPulse{0%,100%{box-shadow:0 0 9px 1px var(--rc)}50%{box-shadow:0 0 24px 6px var(--rc)}}@keyframes mnflCyanPulse{0%,100%{box-shadow:0 0 12px 3px rgba(64,232,255,0.45),0 0 22px 5px rgba(64,232,255,0.18)}50%{box-shadow:0 0 22px 6px rgba(64,232,255,0.75),0 0 40px 10px rgba(64,232,255,0.32)}}@keyframes mnflCardTrace{0%{stroke-dashoffset:1000}100%{stroke-dashoffset:0}} @keyframes mnflIdleFloat{0%,100%{transform:rotateY(-6deg) translateY(0px)}50%{transform:rotateY(6deg) translateY(-5px)}} @media(max-width:768px){.mnfl-sidebar{display:none!important} .mnfl-content{margin-left:0!important;padding-bottom:70px!important;max-width:100vw!important;overflow-x:hidden!important} .mnfl-bottombar{display:flex!important} .mnfl-filters-sheet{display:flex!important}}`}</style>
      {/* ===== BARRE LATERALE (glass sombre) ===== */}
      <aside className='mnfl-sidebar' style={{position:'fixed',left:0,top:0,width:'220px',height:'100vh',overflow:'hidden',background:sideBg,backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',borderRight:'1px solid rgba(111,195,232,0.35)',boxShadow:'1px 0 0 rgba(111,195,232,0.25), 6px 0 24px -6px rgba(111,195,232,0.22)',padding:'0.4rem 0.6rem',zIndex:50,scrollbarWidth:'none',display:'flex',flexDirection:'column' as const,gap:'0',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif"}}>

        {/* HEADER logo (x3) */}
        <div style={{textAlign:'center',marginBottom:'0.2rem'}}>
          <img src='/logo-pack.png' alt='myNFTlocker' style={{display:'inline-block',height:'126px',width:'auto',filter:'drop-shadow(0 6px 18px rgba(0,0,0,0.6))'}} onError={(e)=>{(e.target as HTMLImageElement).style.display='none';}}/>
        </div>

        {/* COMPTE */}
        <div style={{display:'flex',flexDirection:'column' as const,gap:'0.2rem',marginBottom:'0.25rem'}}>
          <div onClick={()=>setAcctOpen(o=>!o)} style={{display:'flex',alignItems:'center',gap:'0.5rem',padding:'0.3rem 0.4rem',borderRadius:'0.3rem',cursor:'pointer',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(111,195,232,0.18)',transition:'all 0.15s'}} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(111,195,232,0.08)';}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.03)';}}>
            <div style={{width:'28px',height:'28px',flexShrink:0,borderRadius:'50%',background:'radial-gradient(circle at 35% 30%,#1a1c24,#0a0b0f)',border:'1.5px solid #6fc3e8',boxShadow:'0 0 10px rgba(111,195,232,0.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.78rem',fontWeight:900,color:'#6fc3e8'}}>{(slug||'?').trim().charAt(0).toUpperCase()||'?'}</div>
            {cards.length>0&&(()=>{const b=collectionBadge(cards.length);return(<div title={cards.length+' cartes'} style={{width:'30px',height:'30px',flexShrink:0,borderRadius:'50%',background:b.bg,border:'2px solid '+b.border,boxShadow:'0 0 10px '+b.glow,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.9rem'}}>{b.emoji}</div>);})()}
            <div style={{flex:1,minWidth:0,textAlign:'left'}}>
              <p style={{margin:0,fontSize:'0.72rem',fontWeight:700,color:'#eaf2ff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{cards.length>0?'Ma collection':'Mon compte'}</p>
              <p style={{margin:0,fontSize:'0.56rem',color:'#7a8898'}}>{cards.length>0?(cards.length+' cartes'):'Identifiant Sorare'}</p>
            </div>
            <span style={{fontSize:'0.6rem',color:'#6fc3e8',opacity:0.8}}>{(acctOpen||cards.length===0)?'▲':'▼'}</span>
          </div>
          {(acctOpen||cards.length===0)&&(
            <input style={{background:'rgba(255,255,255,0.05)',color:'#cfe4fb',padding:'0.28rem 0.55rem',borderRadius:'0.15rem',border:'1px solid rgba(255,255,255,0.1)',outline:'none',fontSize:'0.76rem',boxSizing:'border-box'}} placeholder='ton-slug-sorare' value={slug} onChange={e=>setSlug(e.target.value)} onKeyDown={e=>e.key==='Enter'&&fetchCards()}/>
          )}
        </div>

        {/* NAV Vestiaire / Galerie */}
        <div style={{display:'flex',overflow:'hidden',border:'1px solid rgba(255,255,255,0.12)',marginBottom:'0.25rem',clipPath:'polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)'}}>
          <button style={{flex:1,padding:'0.26rem 0',border:'none',cursor:'pointer',fontSize:'0.72rem',fontWeight:700,background:mode==='locker'?'linear-gradient(160deg,#a86f15 0%,#d9a52e 22%,#f7da80 48%,#e8b84a 68%,#b8801a 100%)':'rgba(255,255,255,0.04)',color:mode==='locker'?'#1a0d00':'#7a8898',transition:'all 0.15s'}} onClick={()=>setMode('locker')}>Vestiaire</button>
          <div style={{width:'1px',background:'rgba(255,255,255,0.1)',flexShrink:0}}/>
          <button style={{flex:1,padding:'0.26rem 0',border:'none',cursor:'pointer',fontSize:'0.72rem',fontWeight:700,background:mode==='gallery'?'linear-gradient(160deg,#a86f15 0%,#d9a52e 22%,#f7da80 48%,#e8b84a 68%,#b8801a 100%)':'rgba(255,255,255,0.04)',color:mode==='gallery'?'#1a0d00':'#7a8898',transition:'all 0.15s'}} onClick={()=>setMode('gallery')}>Galerie</button>
        </div>

        {error&&<p style={{color:'#fca5a5',fontSize:'0.7rem',marginBottom:'0.4rem'}}>{error}</p>}

        {/* FILTRES — ordre: Sport, Joueur, Equipe, Saison, Rarete, Edition, Tri */}
        {cards.length>0&&(
          <div style={{textAlign:'left',flex:1,minHeight:0,display:'flex',flexDirection:'column' as const,gap:0,borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:'0.3rem'}}>
            <FilterMenu title='Sport' options={[{value:'nba',label:'NBA'},{value:'foot',label:'Football'}]} current={gSport} onSelect={(v:string)=>{setGSport(v as any);setGLeague('all');setGTeamCustom('all');setFSpecial('all');setTeamApi(HOF_KEY);setLockerStart(0);setFlippedSlug(null);localStorage.removeItem('mnfl_team_chosen_'+slug);}}/>
            <div style={{padding:'0.2rem 0.5rem'}}>
              <p style={{fontSize:'0.64rem',fontWeight:800,letterSpacing:'0.14em',textTransform:'uppercase',color:'#eaf2ff',margin:'0 0 0.2rem'}}>Joueur</p>
              <input style={{width:'100%',boxSizing:'border-box',background:'rgba(255,255,255,0.05)',color:'#e8eefc',padding:'0.3rem 0.5rem',borderRadius:'0.15rem',border:'1px solid rgba(255,255,255,0.12)',outline:'none',fontSize:'0.76rem'}} placeholder='Rechercher...' value={fPlayer} onChange={e=>setFPlayer(e.target.value)}/>
            </div>
            {gSport==='nba'?(
              <FilterMenu title='Équipe' options={(galleryTeamList as string[]).map((n:string)=>({value:n,label:n==='all'?'Hall of Fame':n}))} current={gTeamCustom} onSelect={(v:string)=>{setGTeamCustom(v);if(mode==='locker'){if(v==='all'){setTeamApi(HOF_KEY);localStorage.removeItem('mnfl_team_chosen_'+slug);}else{setTeamApi(v);localStorage.setItem('mnfl_team_chosen_'+slug,'1');}setLockerStart(0);setFlippedSlug(null);}}}/>
            ):(
              <FootTeamMenu countries={footCountries} teamsByCountry={teamsByCountry} country={gCountry} team={gTeamCustom} onPickCountry={(v:string)=>{setGCountry(v);setGTeamCustom('all');}} onPickTeam={(v:string)=>{if(v==='__HOF__'){setGTeamCustom('all');if(mode==='locker'){setTeamApi(HOF_KEY);setLockerStart(0);setFlippedSlug(null);localStorage.removeItem('mnfl_team_chosen_'+slug);}return;}setGTeamCustom(v);if(mode==='locker'&&v!=='all'){setTeamApi(v);setLockerStart(0);setFlippedSlug(null);localStorage.setItem('mnfl_team_chosen_'+slug,'1');}}}/>
            )}
            <FilterMenu title='Saison' options={seasonOpts} current={fSeason} onSelect={setFSeason}/>
            <FilterMenu title='Rareté' options={rarityOpts} current={fRarity} onSelect={setFRarity}/>
            <FilterMenu title='Édition de la carte' options={specialOpts} current={fSpecial} onSelect={setFSpecial}/>
            <FilterMenu title='Tri' options={mode==='locker'?[{value:'majeur',label:'L10 Max'},{value:'manual',label:'Manuel'},{value:'collection',label:'Alphabétique'}]:[{value:'default',label:'Défaut'},{value:'rarity',label:'Rareté'},{value:'score',label:'Score L10'},{value:'name',label:'Nom'}]} current={mode==='locker'?lockerSort:gSort} onSelect={(v:string)=>{if(mode==='locker'){setLockerSort(v as any);}else{setGSort(v as any);}}}/>
            {mode==='locker'&&(
              <>
              <button onClick={resetFilters} style={{width:'100%',boxSizing:'border-box' as const,padding:'0.3rem',background:'rgba(111,195,232,0.1)',border:'1px solid rgba(111,195,232,0.35)',borderRadius:'0.18rem',color:'#6fc3e8',fontSize:'0.64rem',cursor:'pointer',letterSpacing:'0.08em',marginTop:'0.5rem'}}>↺ Réinitialiser les filtres</button>
              <button onClick={()=>handleSetDefault(teamApi)} style={{width:'100%',boxSizing:'border-box' as const,padding:'0.3rem',background:'rgba(212,175,55,0.12)',border:'1px solid rgba(212,175,55,0.35)',borderRadius:'0.18rem',color:'#e8c84a',fontSize:'0.64rem',cursor:'pointer',letterSpacing:'0.08em',marginTop:'0.3rem'}}>{defaultTeam===teamApi&&teamApi?'⭐ Par defaut : '+(teamApi==='__HOF__'?'Hall of Fame':teamApi):'⭐ Définir comme équipe par défaut'}</button>
              </>
            )}
          </div>
        )}
      </aside>

      {/* ===== CONTENU ===== */}
      <div className='mnfl-content' style={{flex:1,marginLeft:'220px',minHeight:'100vh'}}>
        {openPhase<3&&!showFlash&&(
          <div style={{position:'fixed',inset:0,zIndex:100,display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
            <StarCanvas phase={openPhase} burst={false}/>
            <style>{`
              @keyframes packFloat{0%,100%{transform:translateY(0px)rotate(-0.4deg)}50%{transform:translateY(-18px)rotate(0.4deg)}}
              @keyframes packGlint{0%,62%{transform:translateX(-200%);opacity:0}72%{opacity:1}88%{transform:translateX(250%);opacity:0}100%{opacity:0}}
              @keyframes packHover{0%,100%{transform:translateY(-3px)scale(1.05)rotate(-0.2deg)}50%{transform:translateY(-20px)scale(1.05)rotate(0.2deg)}}
              @keyframes scannerLaser{from{stroke-dashoffset:0}to{stroke-dashoffset:-1000}}
              @keyframes cyanPulse{0%,100%{opacity:0.6;text-shadow:0 0 10px rgba(0,255,255,0.3)}50%{opacity:1;text-shadow:0 0 25px rgba(0,255,255,1),0 0 50px rgba(0,255,255,0.5)}}
              @keyframes introFlash{0%{opacity:0;background:rgb(1,3,10)}20%{opacity:1}80%{opacity:1}100%{opacity:0}}
              @keyframes introInputGlow{0%,100%{box-shadow:0 1px 0 rgba(64,232,255,0.3)}50%{box-shadow:0 2px 18px rgba(64,232,255,0.55)}}
              .intro-input::placeholder{color:rgba(64,232,255,0.28)}.intro-input:focus{outline:none;border-bottom-color:#40e8ff!important;box-shadow:0 2px 18px rgba(64,232,255,0.6)!important}.intro-btn:hover{background:rgba(64,232,255,0.08)!important;border-color:rgba(64,232,255,0.95)!important;color:#fff!important}
            `}</style>
            <div style={{position:'relative',zIndex:1,marginBottom:openPhase===0?'2.8rem':'1.5rem'}}
              onMouseEnter={e=>{if(openPhase!==0)return;const img=e.currentTarget.querySelector('img');if(img)(img as HTMLElement).style.animation='packHover 2s ease-in-out infinite';}}
              onMouseLeave={e=>{if(openPhase!==0)return;const img=e.currentTarget.querySelector('img');if(img)(img as HTMLElement).style.animation='packFloat 3.8s ease-in-out infinite';}}>
              <div
                onClick={()=>{if(openPhase===0||openPhase===1)setLogoFlipped(f=>!f);}}
                style={{
                  width:'280px',height:'375px',position:'relative',
                  animation:'packFloat 3.8s ease-in-out infinite',
                  cursor:(openPhase===0||openPhase===1)?'pointer':'default',
                  perspective:'1400px',
                  zIndex:1,
                }}>
                <div style={{
                  position:'relative',width:'100%',height:'100%',
                  transformStyle:'preserve-3d',
                  transition:'transform 0.7s cubic-bezier(0.4,0.15,0.2,1)',
                  transform:logoFlipped?'rotateY(180deg)':'rotateY(0deg)',
                }}>
                  {/* RECTO */}
                  <div style={{position:'absolute',inset:0,backfaceVisibility:'hidden',WebkitBackfaceVisibility:'hidden'}}>
                    <img src='/logo-pack.png' alt='myNFTlocker'
                      style={{width:'100%',height:'100%',display:'block',objectFit:'contain',background:'transparent',
                        filter:openPhase===1?'drop-shadow(0 0 24px rgba(0,225,255,0.85)) drop-shadow(0 0 48px rgba(0,225,255,0.5)) drop-shadow(0 0 85px rgba(0,225,255,0.22))':'drop-shadow(0 0 18px rgba(0,200,235,0.28))'}}
                      onError={(e)=>{(e.target as HTMLImageElement).style.display='none';}}/>
                    {openPhase===0&&(
                      <div style={{position:'absolute',inset:0,overflow:'hidden',borderRadius:'6px',pointerEvents:'none',zIndex:2}}>
                        <div style={{position:'absolute',top:'-50%',left:'-40%',width:'180%',height:'200%',background:'linear-gradient(108deg,transparent 38%,rgba(255,255,255,0.48) 50%,rgba(255,215,100,0.22) 55%,transparent 62%)',animation:'packGlint 4s ease-in-out 0.6s infinite'}}/>
                      </div>
                    )}
                  </div>
                  {/* VERSO */}
                  <div style={{position:'absolute',inset:0,backfaceVisibility:'hidden',WebkitBackfaceVisibility:'hidden',transform:'rotateY(180deg)'}}>
                    <img src='/logo-back.png' alt='myNFTlocker dos'
                      style={{width:'100%',height:'100%',display:'block',objectFit:'contain',background:'transparent',
                        filter:openPhase===1?'drop-shadow(0 0 24px rgba(0,225,255,0.85)) drop-shadow(0 0 48px rgba(0,225,255,0.5)) drop-shadow(0 0 85px rgba(0,225,255,0.22))':'drop-shadow(0 0 18px rgba(0,200,235,0.28))'}}
                      onError={(e)=>{(e.target as HTMLImageElement).style.display='none';}}/>
                  </div>
                </div>
                {/* LASER independant du flip : reste visible recto ET verso */}
                {openPhase===1&&(
                  <svg viewBox='0 0 280 375' preserveAspectRatio='none' style={{position:'absolute',inset:0,width:'100%',height:'100%',overflow:'visible',pointerEvents:'none',zIndex:5}}>
                    <rect x='8' y='-4' width='264' height='363' rx='12'
                      fill='none' stroke='#00ffff' strokeWidth='2' pathLength='1000'
                      style={{strokeDasharray:'70 930',strokeDashoffset:0,filter:'drop-shadow(0 0 5px rgba(0,225,255,0.95)) drop-shadow(0 0 10px rgba(0,225,255,0.55))',animation:'scannerLaser 2.2s linear infinite'}}/>
                  </svg>
                )}
              </div>
            </div>
            {openPhase===0&&(
              <div style={{position:'relative',zIndex:2,display:'flex',flexDirection:'column' as const,alignItems:'center'}}>
                <p style={{color:'#40e8ff',letterSpacing:'0.22em',textTransform:'uppercase',fontSize:'0.72rem',marginBottom:'2rem',fontFamily:'Courier New,monospace',textShadow:'0 0 12px rgba(0,255,255,0.45)',minHeight:'1.1em'}}>{typedIntro}<span style={{opacity:typedIntro.length<INTRO_TEXT.length?1:0,animation:'cyanPulse 0.8s ease-in-out infinite'}}>|</span></p>
                <input className='intro-input' value={slug} onChange={e=>setSlug(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleIntroClick()} placeholder='ton-slug-sorare' style={{background:'transparent',border:'none',borderBottom:'1px solid rgba(64,232,255,0.42)',color:'#40e8ff',fontSize:'0.9rem',padding:'0.4rem 0.3rem',width:'290px',maxWidth:'78vw',textAlign:'center',fontFamily:'Courier New,monospace',letterSpacing:'0.07em',marginBottom:'1.6rem',transition:'border-color 0.2s,box-shadow 0.2s',caretColor:'#40e8ff',animation:'introInputGlow 2.5s ease-in-out 1.5s infinite'}}/>
                <button className='intro-btn' onClick={handleIntroClick} disabled={!slug||loading} style={{background:'transparent',border:'1px solid rgba(64,232,255,0.45)',color:'#40e8ff',padding:'0.68rem 3rem',fontSize:'0.78rem',fontWeight:700,letterSpacing:'0.25em',textTransform:'uppercase',cursor:slug&&!loading?'pointer':'not-allowed',fontFamily:'Courier New,monospace',clipPath:'polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)',transition:'all 0.2s',opacity:slug&&!loading?1:0.35}}>{loading?'CHARGEMENT...':'▶ OUVRIR'}</button>
                {error&&<p style={{color:'#fca5a5',fontSize:'0.7rem',marginTop:'1rem',fontFamily:'Courier New,monospace'}}>{error}</p>}
              </div>
            )}
            {openPhase>=1&&(
              <div style={{position:'relative',zIndex:2,marginTop:'1rem',textAlign:'center'}}>
                {openPhase===1&&<p style={{color:'rgba(0,255,255,0.65)',fontFamily:'Courier New,monospace',letterSpacing:'0.25em',fontSize:'0.68rem',animation:'cyanPulse 0.8s ease-in-out infinite'}}>{loading?'INITIALISATION...':'SCAN EN COURS...'}</p>}
                {openPhase===2&&<p style={{color:'rgba(0,225,255,0.65)',fontFamily:'Courier New,monospace',letterSpacing:'0.22em',fontSize:'0.68rem',animation:'cyanPulse 0.4s ease-in-out infinite'}}>{loading?'SCAN EN COURS...':'DONNÉES CHARGÉES'}</p>}
              </div>
            )}
            <div style={{position:'absolute',bottom:'1.8rem',zIndex:2,display:'flex',gap:'2.5rem',alignItems:'center'}}><a href='https://sorare.com' target='_blank' rel='noreferrer' style={{color:'rgba(255,255,255,0.2)',fontSize:'0.6rem',letterSpacing:'0.14em',textTransform:'uppercase',textDecoration:'none',fontFamily:'Courier New,monospace',transition:'color 0.2s'}} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color='rgba(64,232,255,0.6)';}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.2)';}}>SORARE</a><span style={{color:'rgba(255,255,255,0.1)',fontSize:'0.5rem'}}>|</span><a href='#' style={{color:'rgba(255,255,255,0.15)',fontSize:'0.6rem',letterSpacing:'0.14em',textTransform:'uppercase',textDecoration:'none',fontFamily:'Courier New,monospace'}}>CGU</a></div>
          </div>
        )}
        {cards.length>0&&(
          <div style={{padding:'1.5rem 0 2rem'}}>
          {/* MODE VESTIAIRE */}
          {mode==='locker'&&(
            <div style={{maxWidth:'1320px',margin:'0 auto',padding:'0 1rem'}}>
              <LockerRoomScene cards={lockerCards} startIndex={lockerStart} hof={gSport==='foot'?hofFoot:hof} flippedSlug={flippedSlug} onFlip={handleFlip} onStar={handleStar} onPin={(s:string)=>handlePin(teamApi,s)} pinnedSlugs={lineup[teamApi]||[]} onPrev={handlePrev} onNext={()=>handleNext(lockerCards.length)} total={lockerCards.length} teamApi={teamApi} teamList={teamList} onTeamChange={handleTeamChange} sport={gSport}/>
            </div>
          )}

          {/* MODE GALERIE */}
          {mode==='gallery'&&(
            <div style={{...galleryBg,minHeight:'100vh'}}>
              <GalleryView cards={filteredGallery}/>
            </div>
          )}
          </div>
        )}
      {showFlash&&(<div style={{position:'fixed',inset:0,zIndex:999,background:'radial-gradient(ellipse at center,rgba(255,255,255,1) 0%,rgba(64,232,255,0.7) 40%,rgba(5,10,20,0.95) 100%)',animation:'introFlash 0.8s ease-in-out forwards',pointerEvents:'none'}}/>)}
      </div>

      {/* ===== BARRE NAV MOBILE (visible <768px) ===== */}
      <nav className='mnfl-bottombar' style={{position:'fixed',left:0,right:0,bottom:0,height:'62px',display:'none',alignItems:'stretch',justifyContent:'space-around',background:'rgba(8,11,16,0.92)',backdropFilter:'blur(14px)',WebkitBackdropFilter:'blur(14px)',borderTop:'1px solid rgba(64,232,255,0.28)',boxShadow:'0 -6px 20px -6px rgba(64,232,255,0.25)',zIndex:60}}>
        <button onClick={()=>{setMode('locker');setFiltersOpen(false);}} style={{flex:1,background:'transparent',border:'none',display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'center',gap:'3px',cursor:'pointer',color:mode==='locker'?'#40e8ff':'#7a8898'}}>
          <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><rect x='4' y='3' width='16' height='18' rx='1'/><line x1='12' y1='3' x2='12' y2='21'/><circle cx='9' cy='12' r='0.6' fill='currentColor'/><circle cx='15' cy='12' r='0.6' fill='currentColor'/></svg>
          <span style={{fontSize:'0.6rem',fontWeight:700,letterSpacing:'0.04em'}}>Vestiaire</span>
        </button>
        <button onClick={()=>{setMode('gallery');setFiltersOpen(false);}} style={{flex:1,background:'transparent',border:'none',display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'center',gap:'3px',cursor:'pointer',color:mode==='gallery'?'#40e8ff':'#7a8898'}}>
          <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><rect x='3' y='3' width='7' height='7' rx='1'/><rect x='14' y='3' width='7' height='7' rx='1'/><rect x='3' y='14' width='7' height='7' rx='1'/><rect x='14' y='14' width='7' height='7' rx='1'/></svg>
          <span style={{fontSize:'0.6rem',fontWeight:700,letterSpacing:'0.04em'}}>Galerie</span>
        </button>
        <button onClick={()=>setFiltersOpen(o=>!o)} style={{flex:1,background:'transparent',border:'none',display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'center',gap:'3px',cursor:'pointer',color:filtersOpen?'#40e8ff':'#7a8898'}}>
          <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><polygon points='3 4 21 4 14 12.5 14 19 10 21 10 12.5 3 4'/></svg>
          <span style={{fontSize:'0.6rem',fontWeight:700,letterSpacing:'0.04em'}}>Filtres</span>
        </button>
      </nav>

      {/* ===== PANNEAU FILTRES MOBILE (placeholder Etape 2, rempli Etape 3) ===== */}
      {filtersOpen&&(
        <div className='mnfl-filters-sheet' style={{position:'fixed',left:0,right:0,bottom:'62px',top:0,background:'rgba(5,7,11,0.97)',backdropFilter:'blur(10px)',zIndex:59,display:'none',flexDirection:'column' as const,padding:'0.6rem 1rem 0.6rem',overflowY:'auto'}}>
          {/* LOGO+COMPTE MOBILE : identique au sidebar desktop, absent sur mobile jusqu'ici */}
          <div style={{display:'flex',flexDirection:'column' as const,gap:'0.15rem',marginBottom:'0.35rem'}}>
            {/* LOGO+COMPTE FUSIONNES sur une seule ligne (gain de hauteur + logo plus visible) */}
            <div style={{display:'flex',alignItems:'center',gap:'0.6rem'}}>
              <img src='/logo-pack.png' alt='myNFTlocker' style={{height:'62px',width:'auto',flexShrink:0,filter:'drop-shadow(0 6px 18px rgba(0,0,0,0.6))'}} onError={(e)=>{(e.target as HTMLImageElement).style.display='none';}}/>
              <div onClick={()=>setAcctOpen(o=>!o)} style={{flex:1,minWidth:0,display:'flex',alignItems:'center',gap:'0.5rem',padding:'0.4rem 0.5rem',borderRadius:'0.3rem',cursor:'pointer',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(111,195,232,0.18)'}}>
              <div style={{width:'32px',height:'32px',flexShrink:0,borderRadius:'50%',background:'radial-gradient(circle at 35% 30%,#1a1c24,#0a0b0f)',border:'1.5px solid #6fc3e8',boxShadow:'0 0 10px rgba(111,195,232,0.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.85rem',fontWeight:900,color:'#6fc3e8'}}>{(slug||'?').trim().charAt(0).toUpperCase()||'?'}</div>
              {cards.length>0&&(()=>{const b=collectionBadge(cards.length);return(<div title={cards.length+' cartes'} style={{width:'34px',height:'34px',flexShrink:0,borderRadius:'50%',background:b.bg,border:'2px solid '+b.border,boxShadow:'0 0 10px '+b.glow,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1rem'}}>{b.emoji}</div>);})()}
              <div style={{flex:1,minWidth:0,textAlign:'left'}}>
                <p style={{margin:0,fontSize:'0.8rem',fontWeight:700,color:'#eaf2ff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{cards.length>0?'Ma collection':'Mon compte'}</p>
                <p style={{margin:0,fontSize:'0.62rem',color:'#7a8898'}}>{cards.length>0?(cards.length+' cartes'):'Identifiant Sorare'}</p>
              </div>
              <span style={{fontSize:'0.65rem',color:'#6fc3e8',opacity:0.8}}>{(acctOpen||cards.length===0)?'▲':'▼'}</span>
              </div>
            </div>
            {(acctOpen||cards.length===0)&&(
              <input style={{background:'rgba(255,255,255,0.05)',color:'#cfe4fb',padding:'0.4rem 0.6rem',borderRadius:'0.2rem',border:'1px solid rgba(255,255,255,0.1)',outline:'none',fontSize:'0.85rem',boxSizing:'border-box' as const}} placeholder='ton-slug-sorare' value={slug} onChange={e=>setSlug(e.target.value)} onKeyDown={e=>e.key==='Enter'&&fetchCards()}/>
            )}
          </div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.4rem'}}>
            <span style={{color:'#f5d76e',fontWeight:800,fontSize:'1rem',letterSpacing:'0.05em'}}>FILTRES</span>
            <button onClick={()=>setFiltersOpen(false)} style={{background:'transparent',border:'1px solid rgba(64,232,255,0.4)',color:'#40e8ff',borderRadius:'0.4rem',padding:'0.3rem 0.7rem',cursor:'pointer',fontSize:'0.8rem'}}>Fermer</button>
          </div>
          <div style={{flex:1,overflowY:'auto'}}>
          <div style={{textAlign:'left',flex:1,minHeight:0,display:'flex',flexDirection:'column' as const,gap:0,borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:'0.3rem'}}>
            <FilterMenu title='Sport' options={[{value:'nba',label:'NBA'},{value:'foot',label:'Football'}]} current={gSport} onSelect={(v:string)=>{setGSport(v as any);setGLeague('all');setGTeamCustom('all');setFSpecial('all');setTeamApi(HOF_KEY);setLockerStart(0);setFlippedSlug(null);localStorage.removeItem('mnfl_team_chosen_'+slug);}}/>
            <div style={{padding:'0.2rem 0.5rem'}}>
              <p style={{fontSize:'0.64rem',fontWeight:800,letterSpacing:'0.14em',textTransform:'uppercase',color:'#eaf2ff',margin:'0 0 0.2rem'}}>Joueur</p>
              <input style={{width:'100%',boxSizing:'border-box',background:'rgba(255,255,255,0.05)',color:'#e8eefc',padding:'0.3rem 0.5rem',borderRadius:'0.15rem',border:'1px solid rgba(255,255,255,0.12)',outline:'none',fontSize:'0.76rem'}} placeholder='Rechercher...' value={fPlayer} onChange={e=>setFPlayer(e.target.value)}/>
            </div>
            {gSport==='nba'?(
              <FilterMenu title='Équipe' options={(galleryTeamList as string[]).map((n:string)=>({value:n,label:n==='all'?'Hall of Fame':n}))} current={gTeamCustom} onSelect={(v:string)=>{setGTeamCustom(v);if(mode==='locker'){if(v==='all'){setTeamApi(HOF_KEY);localStorage.removeItem('mnfl_team_chosen_'+slug);}else{setTeamApi(v);localStorage.setItem('mnfl_team_chosen_'+slug,'1');}setLockerStart(0);setFlippedSlug(null);}}}/>
            ):(
              <FootTeamMenu countries={footCountries} teamsByCountry={teamsByCountry} country={gCountry} team={gTeamCustom} onPickCountry={(v:string)=>{setGCountry(v);setGTeamCustom('all');}} onPickTeam={(v:string)=>{if(v==='__HOF__'){setGTeamCustom('all');if(mode==='locker'){setTeamApi(HOF_KEY);setLockerStart(0);setFlippedSlug(null);localStorage.removeItem('mnfl_team_chosen_'+slug);}return;}setGTeamCustom(v);if(mode==='locker'&&v!=='all'){setTeamApi(v);setLockerStart(0);setFlippedSlug(null);localStorage.setItem('mnfl_team_chosen_'+slug,'1');}}}/>
            )}
            <FilterMenu title='Saison' options={seasonOpts} current={fSeason} onSelect={setFSeason}/>
            <FilterMenu title='Rareté' options={rarityOpts} current={fRarity} onSelect={setFRarity}/>
            <FilterMenu title='Édition de la carte' options={specialOpts} current={fSpecial} onSelect={setFSpecial}/>
            <FilterMenu title='Tri' options={mode==='locker'?[{value:'majeur',label:'L10 Max'},{value:'manual',label:'Manuel'},{value:'collection',label:'Alphabétique'}]:[{value:'default',label:'Défaut'},{value:'rarity',label:'Rareté'},{value:'score',label:'Score L10'},{value:'name',label:'Nom'}]} current={mode==='locker'?lockerSort:gSort} onSelect={(v:string)=>{if(mode==='locker'){setLockerSort(v as any);}else{setGSort(v as any);}}}/>
            {mode==='locker'&&(
              <>
              <button onClick={resetFilters} style={{width:'100%',boxSizing:'border-box' as const,padding:'0.3rem',background:'rgba(111,195,232,0.1)',border:'1px solid rgba(111,195,232,0.35)',borderRadius:'0.18rem',color:'#6fc3e8',fontSize:'0.64rem',cursor:'pointer',letterSpacing:'0.08em',marginTop:'0.5rem'}}>↺ Réinitialiser les filtres</button>
              <button onClick={()=>handleSetDefault(teamApi)} style={{width:'100%',boxSizing:'border-box' as const,padding:'0.3rem',background:'rgba(212,175,55,0.12)',border:'1px solid rgba(212,175,55,0.35)',borderRadius:'0.18rem',color:'#e8c84a',fontSize:'0.64rem',cursor:'pointer',letterSpacing:'0.08em',marginTop:'0.3rem'}}>{defaultTeam===teamApi&&teamApi?'⭐ Par defaut : '+(teamApi==='__HOF__'?'Hall of Fame':teamApi):'⭐ Définir comme équipe par défaut'}</button>
              </>
            )}
          </div>
          </div>
          <button onClick={()=>setFiltersOpen(false)} style={{marginTop:'0.8rem',width:'100%',padding:'0.8rem',background:'linear-gradient(160deg,#00b4d8,#0077b6)',border:'none',borderRadius:'0.5rem',color:'#fff',fontSize:'0.95rem',fontWeight:800,letterSpacing:'0.05em',cursor:'pointer',boxShadow:'0 0 18px rgba(64,232,255,0.4)'}}>Voir les résultats</button>
        </div>
      )}

    </main>
  );
}