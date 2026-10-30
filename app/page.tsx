'use client';
import { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import GalleryView, { GalleryCard } from './components/GalleryView';
import AccountSection, { ChangePassword } from './components/AccountSections';
import { StatPanel } from './components/StatPanel';
// INSCRIPTIONS : fermees tant que NEXT_PUBLIC_SIGNUP_OPEN n'est pas 'true' (Vercel > Settings > Environment Variables). Les comptes existants peuvent toujours se connecter.
const SIGNUP_OPEN=process.env.NEXT_PUBLIC_SIGNUP_OPEN==='true';
import { setManager } from './lib-share';
import { isArcadeCard, ARCADE_DEFAULT, activeInjury } from './lib/gameplay';
import { collectPrefs, pullPrefs, pushPrefs } from './lib/prefsSync';
import StarCanvas from './components/StarCanvas';
import { t as tr, useLang, initLang, LangSwitch, getLang } from './i18n';
// Slug Sorare : minuscules, sans accents, caracteres speciaux remplaces par '-' (comme Sorare le fait a partir du pseudo)
const toSlug=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9_-]+/g,'-');
// Verification en direct d'un slug chez Sorare pendant la saisie (attend 0,5 s apres la derniere frappe)
type SlugState={s:'idle'|'checking'|'ok'|'missing'|'error';n?:string};
function useSlugCheck(v:string):SlugState{
  const [st,setSt]=useState<SlugState>({s:'idle'});
  useEffect(()=>{
    if(v.length<2){setSt({s:'idle'});return;}
    setSt({s:'checking'});
    const ctrl=new AbortController();
    const t=setTimeout(async()=>{
      try{
        const r=await fetch('/api/auth/slug-check?slug='+encodeURIComponent(v),{signal:ctrl.signal});
        const d=await r.json();
        setSt(d.status==='found'?{s:'ok',n:d.nickname||undefined}:d.status==='missing'?{s:'missing'}:{s:'error'});
      }catch(e){if(!ctrl.signal.aborted)setSt({s:'error'});}
    },500);
    return()=>{clearTimeout(t);ctrl.abort();};
  },[v]);
  return st;
}
const SlugHint=({st}:{st:SlugState})=>{
  if(st.s==='idle'||st.s==='error')return null;
  const txt=st.s==='checking'?tr('Vérification chez Sorare...'):st.s==='ok'?'✓ '+tr('Manager trouvé')+(st.n?' : '+st.n:''):tr('Aucun manager Sorare avec ce slug. Vérifie l’orthographe.');
  return <p style={{margin:'-0.35rem 0 0.6rem',fontSize:'0.62rem',lineHeight:1.4,color:st.s==='ok'?'#7ee0a0':st.s==='missing'?'#ff8a7a':'rgba(207,228,251,0.5)'}}>{txt}</p>;
};

const LockerRoomScene = dynamic(() => import('./components/LockerRoom'), { ssr: false });

const RARITY_GLOW: Record<string,string> = {
  common:'0 0 16px 5px rgba(220,220,255,0.45)',
  limited:'0 0 22px 7px rgba(234,179,8,0.75)',
  rare:'0 0 26px 8px rgba(239,68,68,0.9)',
  super_rare:'0 0 30px 10px rgba(59,130,246,0.85)',
  unique:'0 0 36px 12px rgba(168,85,247,0.95)',
};
const RARITY_COLOR: Record<string,string> = {
  common:'#9ca3af',limited:'#eab308',rare:'#ef4444',super_rare:'#3b82f6',unique:'#a855f7',
};
const RARITY_FILL: Record<string,string> = {
  common:'#a8a8b5',limited:'#b48a14',rare:'#a82a2a',super_rare:'#1e4ba8',unique:'#7e3fc4',
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
  // Generique (nouvelles editions): retire le suffixe technique _base/_overflow, underscores -> espaces
  return se.replace(/_(base|overflow)$/i,'').replace(/_/g,' ').toUpperCase();
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
        <span style={{padding:'0.15rem 0.5rem',borderRadius:'999px',border:'1px solid '+rc+'66',background:rc+'15',fontSize:'0.55rem',fontWeight:700,color:rc,textTransform:'uppercase'}}>{card.rarityTyped==='common'?'SET':card.rarityTyped.replace('_',' ')}</span>
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

const FilterMenu=({title,options,current,onSelect}:any)=>{
  useLang();
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

// Interrupteur de la sidebar (meme style que les menus de filtre) : Arcade, Gameplay
const ToggleRow=({title,hint,on,onToggle}:any)=>{
  useLang();
  return(<div style={{padding:'0.35rem 0.5rem',marginBottom:'0.15rem'}}>
    <button type='button' role='switch' aria-checked={on} onClick={onToggle} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'0.5rem',background:'transparent',border:'none',padding:0,cursor:'pointer',textAlign:'left'}}>
      <span><span style={{display:'block',fontSize:'0.64rem',fontWeight:800,letterSpacing:'0.14em',textTransform:'uppercase',color:'#eaf2ff'}}>{title}</span>{hint&&<span style={{display:'block',fontSize:'0.62rem',color:'#7a8898',marginTop:'0.05rem'}}>{hint}</span>}</span>
      <span style={{flexShrink:0,width:'2rem',height:'1.05rem',borderRadius:'1rem',position:'relative',background:on?'linear-gradient(90deg,#00b4d8,#40e8ff)':'rgba(255,255,255,0.12)',boxShadow:on?'0 0 8px rgba(64,232,255,0.45)':'none',transition:'all 0.15s'}}><span style={{position:'absolute',top:'0.1rem',left:on?'1.05rem':'0.1rem',width:'0.85rem',height:'0.85rem',borderRadius:'50%',background:on?'#04121a':'#9fb0c4',transition:'left 0.15s'}}/></span>
    </button>
  </div>);
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
const countryFR=(slug:string)=>tr(slug==='__NATIONAL__'?'Sélection nationale':(COUNTRY_FR[slug]||'Autres pays'));

const FootTeamMenu=({countries,teamsByCountry,country,team,onPickCountry,onPickTeam}:any)=>{
  useLang();
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
  const label=team!=='all'?team:(country!=='all'?countryFR(country):tr('Tous les championnats'));
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
        <p style={{fontSize:'0.64rem',fontWeight:800,letterSpacing:'0.14em',textTransform:'uppercase',color:'#eaf2ff',margin:'0 0 0.05rem'}}>{tr('Équipe')}</p>
        <p style={{fontSize:'0.8rem',fontWeight:500,color:open?'#6fc3e8':'#ffffff',opacity:open?1:0.6,margin:0,display:'flex',alignItems:'center',justifyContent:'space-between'}}>{label} <span style={{fontSize:'0.7rem',opacity:0.7}}>›</span></p>
      </div>
      {open&&mounted&&createPortal(
        <div style={{position:'fixed',left:posL+'px',top:posT+'px',display:'flex',gap:'4px',zIndex:9999}}
          onMouseLeave={()=>{setOpen(false);setHoveredCountry(null);}}>
          <div className='thin-sb' style={{...menuBase,maxHeight:Math.min(380,window.innerHeight-posT-16)+'px'}}>
            <button style={btnStyle(country==='all'&&team==='all')}
              onClick={()=>{onPickCountry('all');onPickTeam('all');setHoveredCountry(null);}}>
              {tr('Tous les championnats')}
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
  useLang(); // re-rendu au changement de langue
  useEffect(()=>{initLang();},[]); // langue sauvegardee / langue du navigateur
  const [slug, setSlug] = useState('');
  const [logoFlipped, setLogoFlipped] = useState(false);
  const [acctOpen, setAcctOpen] = useState(false);
  const [slugPanelOpen, setSlugPanelOpen] = useState(false);
  const [acctMenuSection, setAcctMenuSection] = useState<string|null>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [hof, setHof] = useState<string[]>([]);
  const [hofFoot, setHofFoot] = useState<string[]>([]);
  const [flippedSlug, setFlippedSlug] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);
  const [loadedCount,setLoadedCount]=useState(0); // progression du chargement (nb de cartes deja recues)
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
  const [gSort,setGSort]=useState('score');
  const [gDir,setGDir]=useState<'desc'|'asc'>('desc');
  // Modes : Arcade (set Arcade uniquement) et Gameplay (outils de composition, caches par defaut pour garder la galerie propre)
  const [arcadeOnly,setArcadeOnly]=useState(ARCADE_DEFAULT);
  const [gameplay,setGameplay]=useState(false);
  const [fComp,setFComp]=useState('all');
  const [fStars,setFStars]=useState('all');
  const [fAvail,setFAvail]=useState('all');
  const [favs,setFavs]=useState<string[]>([]); // managers favoris (slugs), synchronises avec le compte
  const slugNowRef=useRef('');
  useEffect(()=>{try{const a=localStorage.getItem('mnfl_arcade');if(a!=null)setArcadeOnly(a==='1');const g=localStorage.getItem('mnfl_gameplay');if(g!=null)setGameplay(g==='1');const f=localStorage.getItem('mnfl_favs');if(f)setFavs(JSON.parse(f));}catch{}},[]);
  const toggleArcade=()=>{const n=!arcadeOnly;setArcadeOnly(n);try{localStorage.setItem('mnfl_arcade',n?'1':'0');}catch{}setLockerStart(0);setFlippedSlug(null);};
  const toggleGameplay=()=>{const n=!gameplay;setGameplay(n);try{localStorage.setItem('mnfl_gameplay',n?'1':'0');}catch{}};
  const [openPhase,setOpenPhase]=useState(0);
  const canvasRef=useRef<HTMLCanvasElement|null>(null);
  const mouseXYRef=useRef<{x:number,y:number}>({x:0,y:0});
  const [typedIntro,setTypedIntro]=useState('');
  const INTRO_TEXT=tr('ENTRE TON SLUG SORARE POUR COMMENCER');
  const [showFlash,setShowFlash]=useState(false);
  const fragStartedRef=useRef(false);
  const teamChosenRef=useRef(false);  // choix d'equipe scope SESSION (reset au rechargement) -> l'ouverture retombe sur le HOF
  const sportAutoSetRef=useRef(false);  // auto-detection du sport apres chargement (compte 100% foot -> bascule sur Football)
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
  useEffect(()=>{let i=0;let iv:any;const t=setTimeout(()=>{iv=setInterval(()=>{i++;setTypedIntro(INTRO_TEXT.slice(0,i));if(i>=INTRO_TEXT.length)clearInterval(iv);},55);},600);return()=>{clearTimeout(t);clearInterval(iv);};},[INTRO_TEXT]);
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
  const handleTeamChange=useCallback((api:string)=>{setTeamApi(api);setLockerStart(0);setFlippedSlug(null);if(api!=='__HOF__')teamChosenRef.current=true;else teamChosenRef.current=false;},[]);
  useEffect(()=>{ const s=localStorage.getItem('mynftlocker_lineup'); if(s){try{setLineup(JSON.parse(s));}catch{}} },[]);
  // SCROLL RESET MODE : remonte en haut a chaque changement d'onglet (Vestiaire/Galerie)
  useEffect(()=>{ window.scrollTo(0,0); const cEl=document.querySelector('.mnfl-content'); if(cEl) cEl.scrollTop=0; },[mode]);
  useEffect(()=>{ if(!slug) return; setDefaultTeam(localStorage.getItem('mynftlocker_default_team_'+slug)||''); },[slug]);
  const handleSetDefault=useCallback((api:string)=>{ localStorage.setItem('mynftlocker_default_team_'+slug,api); setDefaultTeam(api); },[slug]);
  const collectionBadge=(n:number)=>{
    if(n>=2500) return {img:'picto-baleine-or.png',border:'#f5d76e',glow:'rgba(245,215,110,0.7)',bg:'radial-gradient(circle at 35% 30%,#1c1608,#0a0603)'};
    if(n>=1500) return {img:'picto-baleine-bleu.png',border:'#40e8ff',glow:'rgba(64,232,255,0.65)',bg:'radial-gradient(circle at 35% 30%,#0a1c24,#040a0d)'};
    if(n>=500) return {img:'picto-dauphin.png',border:'#40e8ff',glow:'rgba(64,232,255,0.6)',bg:'radial-gradient(circle at 35% 30%,#0a1c24,#040a0d)'};
    return {img:'picto-poisson.png',border:'#40e8ff',glow:'rgba(64,232,255,0.55)',bg:'radial-gradient(circle at 35% 30%,#0a1c24,#040a0d)'};
  };
  const clearDefault=useCallback(()=>{ localStorage.removeItem('mynftlocker_default_team_'+slug); setDefaultTeam(''); },[slug]);
  const resetFilters=useCallback(()=>{
    setGSport('nba');setGLeague('all');setGTeamCustom('all');setGCountry('all');setFSpecial('all');setFComp('all');setFStars('all');setFAvail('all');
    setTeamApi(HOF_KEY);setLockerStart(0);setFlippedSlug(null);
    teamChosenRef.current=false;
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
    setLoading(true);setLoadedCount(0);setError('');setSlugProblem(null);setFlippedSlug(null);setLockerStart(0);sportAutoSetRef.current=false;
    setManager(slug,slug); // signature de partage : pseudo Sorare une fois connu, slug en attendant
    // Cache localStorage (TTL 1h)
    const CACHE_KEY='mnfl_v4_'+slug;// v4 : force le rechargement des cartes (nouveaux champs proj/gain)
    try{
      const cached=localStorage.getItem(CACHE_KEY);
      if(cached){const{c:cc,ts,m}=JSON.parse(cached);if(Date.now()-ts<3600000&&cc?.length>0){if(m)setManager(m,slug);setCards(cc);setLoading(false);return;}}
    }catch(e){}
    // Appel direct navigateur → Sorare (IP residentielle, bypass datacenter block)
    const all:any[]=[];let cur:string|null=null;let more=true;let pageNum=0;let mgr='';
    const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
    const SORARE_URL='https://api.sorare.com/federation/graphql';
    const fetchPage=async(cursor:string|null):Promise<{cards:any[],hasNextPage:boolean,cursor:string|null}|null>=>{
      const after=cursor?`, after: "${cursor}"` :'';
      const query=`query{user(slug:"${slug}"){cards(first:50${after}){nodes{__typename slug name rarityTyped pictureUrl anyPlayer{lastName shirtNumber gameplayTierStars}anyTeam{name ...on Club{country{slug}}}...on NBACard{seasonYear specialEdition power xp averageScore(type:LAST_TEN_PLAYED_SO5_AVERAGE_SCORE)}}pageInfo{hasNextPage endCursor}}}}`;
      // CORS SKIP : l'essai direct navigateur echoue systematiquement (CORS Sorare), tente 0 fois, va direct au fallback qui marche
      // 1. Route Vercel (seule voie fonctionnelle, confirmee sur des dizaines de tests)
      const url='/api/cards?slug='+encodeURIComponent(slug)+(cursor?'&cursor='+encodeURIComponent(cursor):'');
      const r2=await fetch(url);
      if(!r2.ok)return null;
      const d=await r2.json();
      if(d.error||!d.cards)return null;
      if(d.manager){setManager(d.manager,slug);mgr=d.manager;}
      return{cards:d.cards,hasNextPage:d.hasNextPage,cursor:d.cursor};
    };
    // PERF : collection complete en flux depuis le serveur (cache partage 15 min : 2e visite / lien partage = quasi instantane).
    // Si le flux echoue, on retombe sur le chargement page par page ci-dessous (inchange).
    let notFound=false;
    const fetchCollection=async():Promise<{cards:any[],manager:string}|'notFound'|null>=>{
      try{
        const r=await fetch('/api/collection?slug='+encodeURIComponent(slug));
        if(!r.ok||!r.body)return null;
        const rd=r.body.getReader();const dec=new TextDecoder();let buf='';const got:any[]=[];let m='';let fin=false;
        for(;;){
          const {value,done}=await rd.read();if(done)break;
          buf+=dec.decode(value,{stream:true});
          let nl:number;
          while((nl=buf.indexOf('\n'))>=0){
            const line=buf.slice(0,nl).trim();buf=buf.slice(nl+1);if(!line)continue;
            const o=JSON.parse(line);
            if(o.error)return o.error==='not_found'?'notFound':null;
            if(o.cards){got.push(...o.cards);setLoadedCount(got.length);if(o.manager){m=o.manager;setManager(o.manager,slug);}}
            if(o.done){fin=true;if(o.manager)m=o.manager;}
          }
        }
        return fin&&got.length>0?{cards:got,manager:m}:null;
      }catch(e){return null;}
    };
    try{
      const viaServer=await fetchCollection();
      if(viaServer==='notFound'){notFound=true;}
      else if(viaServer){all.push(...viaServer.cards);mgr=viaServer.manager||mgr;more=false;}
      while(more){
        pageNum++;
        let data:any=null;
        for(let attempt=0;attempt<6&&!notFound;attempt++){
          if(attempt>0)await sleep(1200*attempt);
          data=await fetchPage(cur);
          if(data)break;
          console.error('Page'+pageNum+' attempt'+(attempt+1)+' failed');
        }
        if(!data){if(all.length===0){
          const u=currentUserRef.current;
          if(u&&u.sorareSlug===slug){ setSlugProblem(slug); setSlugDraft(slug); setSlugMsg(null); setError(''); setOpenPhase(3); } // slug du COMPTE introuvable : le site se charge normalement, un message (avec correction sur place) remplace vestiaire/galerie
          else{ setError(tr('Joueur introuvable')); setOpenPhase(0); }
        }break;}
        all.push(...data.cards);setLoadedCount(all.length);
        // PERF : affichage progressif mais pas a chaque page (chaque setCards recalcule filtres/tris/equipes sur toute la collection)
        if(pageNum===1||pageNum%6===0)setCards([...all]);
        more=data.hasNextPage;
        cur=data.cursor;
        // PERF : plus de pause entre les pages (les 6 tentatives avec attente en cas d'erreur 429 restent en place)
      }
      console.log('=== LOAD DONE === cartes:'+all.length+' pages:'+pageNum);
      if(all.length>0){try{localStorage.setItem(CACHE_KEY,JSON.stringify({c:all,ts:Date.now(),m:mgr}));}catch(e){}}
    }catch(e){if(all.length===0){setError(tr('Erreur réseau'));setOpenPhase(0);}}
    if(all.length>0)setCards([...all]); // PERF : etat final complet (les pages intermediaires ne sont plus toutes poussees)
    setLoading(false);
  };
  const handleIntroClick=useCallback(()=>{if(!slug||loading||openPhase>0)return;fragStartedRef.current=false;setOpenPhase(1);fetchCards();},[slug,loading,openPhase]);
  // ===== AUTH : compte myNFTlocker (inscription/connexion) =====
  const [currentUser,setCurrentUser]=useState<{pseudo:string;email:string;sorareSlug:string|null;pseudoChangedAt?:number|null;hasPassword?:boolean;accounts?:{platform:string;slug:string;verified:boolean}[];connections?:string[];profiles?:{x?:string}}|null>(null);
  const [authOpen,setAuthOpen]=useState(false);
  const [authClosing,setAuthClosing]=useState(false);
  const [authMode,setAuthMode]=useState<'signup'|'login'>('signup');
  const [authPseudo,setAuthPseudo]=useState('');
  const [authSlugField,setAuthSlugField]=useState('');
  const [authEmail,setAuthEmail]=useState('');
  const [authPassword,setAuthPassword]=useState('');
  const [authPasswordConfirm,setAuthPasswordConfirm]=useState('');
  // SLUG SORARE DU COMPTE : probleme d'ouverture (faute de frappe...) corrige sur place + edition dans Mon compte
  const [slugProblem,setSlugProblem]=useState<string|null>(null);
  const [slugEditing,setSlugEditing]=useState(false);
  const [slugDraft,setSlugDraft]=useState('');
  const [slugBusy,setSlugBusy]=useState(false);
  const [needSlug,setNeedSlug]=useState(false); // compte cree via Google : il manque encore le slug Sorare
  const [setupPseudo,setSetupPseudo]=useState(''); // ecran Bienvenue : pseudo choisi en meme temps que le slug
  // PSEUDO (1 changement / 3 mois) et E-MAIL (confirmation par lien) modifiables dans Informations personnelles
  const [pseudoEditing,setPseudoEditing]=useState(false);
  const [pseudoDraft,setPseudoDraft]=useState('');
  const [pseudoBusy,setPseudoBusy]=useState(false);
  const [pseudoMsg,setPseudoMsg]=useState<{ok:boolean;text:string}|null>(null);
  const [emailEditing,setEmailEditing]=useState(false);
  const [emailDraft,setEmailDraft]=useState('');
  const [emailPwd,setEmailPwd]=useState('');
  const [emailBusy,setEmailBusy]=useState(false);
  const [emailMsg,setEmailMsg]=useState<{ok:boolean;text:string}|null>(null);
  const [emailNotice,setEmailNotice]=useState<{ok:boolean;text:string}|null>(null);
  const [providersOn,setProvidersOn]=useState<Record<string,boolean>>({}); // reseaux dont les cles sont presentes cote serveur
  const [unlinkMsg,setUnlinkMsg]=useState<string|null>(null);
  const [xEditing,setXEditing]=useState(false);
  const [xDraft,setXDraft]=useState('');
  const [xMsg,setXMsg]=useState<string|null>(null);
  const [slugMsg,setSlugMsg]=useState<{ok:boolean;text:string}|null>(null);
  const currentUserRef=useRef<typeof currentUser>(null);
  currentUserRef.current=currentUser;
  const slugCheckSignup=useSlugCheck(authOpen&&authMode==='signup'?authSlugField:'');
  const slugCheckDraft=useSlugCheck(slugProblem||slugEditing||needSlug?slugDraft:'');
  const [authShowPassword,setAuthShowPassword]=useState(false);
  const [authVerifyPending,setAuthVerifyPending]=useState(false);
  const [authError,setAuthError]=useState('');
  const [authLoading,setAuthLoading]=useState(false);
  const [justLoggedIn,setJustLoggedIn]=useState(false);
  const [sideOpen,setSideOpen]=useState(false); // menu de gauche ouvert (tablette : replie par defaut, voir globals.css)
  // LIEN DIRECT : /?u=pseudo-sorare ouvre directement la galerie de ce manager (liens de partage / QR code)
  const urlSlugRef=useRef('');
  // LIEN DIRECT VERS UNE CARTE : /?u=pseudo&c=slug-carte -> la carte s'affiche tout de suite (une seule requete), la galerie se charge derriere
  const [sharedCard,setSharedCard]=useState<any>(null);
  const [sharedClosing,setSharedClosing]=useState(false);
  const closeShared=()=>{ setSharedClosing(true); setTimeout(()=>{ setSharedCard(null); setSharedClosing(false); },450); };
  useEffect(()=>{
    try{
      const sp=new URLSearchParams(window.location.search);
      const u=(sp.get('u')||'').trim().toLowerCase();
      const c=(sp.get('c')||'').trim().toLowerCase();
      if(/^[a-z0-9_-]{2,80}$/.test(u)){urlSlugRef.current=u;setManager('',u);setSlug(u);setJustLoggedIn(true);}
      if(/^[a-z0-9_-]{3,200}$/.test(c)){
        fetch('/api/cards?card='+encodeURIComponent(c)).then(r=>r.json()).then(d=>{ if(d&&d.card)setSharedCard(d.card); }).catch(()=>{});
      }
    }catch(e){}
  },[]);
  useEffect(()=>{
    fetch('/api/auth/providers').then(r=>r.json()).then(d=>setProvidersOn(d||{})).catch(()=>{});
    try{ const sp=new URLSearchParams(window.location.search); const oa=sp.get('oauth'); const pv=({sorare:'Sorare',discord:'Discord',x:'X',facebook:'Facebook'} as Record<string,string>)[sp.get('p')||'']||''; if(oa&&oa!=='ok'){ const T:Record<string,{ok:boolean;text:string}>={linked:{ok:true,text:pv+' : compte lié à ton compte myNFTlocker.'},notlinked:{ok:false,text:'Ce compte '+pv+' n’est lié à aucun compte myNFTlocker. Connecte-toi, puis lie-le dans Informations personnelles.'},already:{ok:false,text:'Ce compte '+pv+' est déjà lié à un autre compte myNFTlocker.'},cancelled:{ok:false,text:'Liaison annulée.'},nolink:{ok:false,text:'Connecte-toi d’abord pour lier un compte.'}}; setEmailNotice(T[oa]||{ok:false,text:'Liaison impossible, réessaie dans un instant.'}); } if(oa){ sp.delete('oauth'); sp.delete('p'); const q=sp.toString(); window.history.replaceState({},'','/'+(q?'?'+q:'')); } }catch(e){}
    try{ const em=new URLSearchParams(window.location.search).get('email'); if(em){ setEmailNotice(em==='changed'?{ok:true,text:'Adresse e-mail modifiée. Utilise-la dès maintenant pour te connecter.'}:{ok:false,text:em==='expired'?'Ce lien a expiré. Refais la demande depuis Informations personnelles.':em==='taken'?'Cette adresse est déjà utilisée par un autre compte.':'Impossible de confirmer cette adresse, réessaie.'}); window.history.replaceState({},'','/'); } }catch(e){}
    try{ const g=new URLSearchParams(window.location.search).get('google'); if(g==='error'||g==='closed'){ setAuthMode('login'); setAuthError(g==='closed'?'Les inscriptions ne sont pas encore ouvertes.':'Connexion Google impossible, réessaie.'); setAuthOpen(true); } }catch(e){}
    fetch('/api/auth/me').then(r=>r.json()).then(d=>{ if(d.loggedIn){ setCurrentUser({pseudo:d.pseudo,email:d.email,sorareSlug:d.sorareSlug,pseudoChangedAt:d.pseudoChangedAt,hasPassword:d.hasPassword,accounts:d.accounts,connections:d.connections,profiles:d.profiles}); if(new URLSearchParams(window.location.search).get('oauth')==='linked'){ setAcctMenuSection('infos'); } if(!d.sorareSlug){ setNeedSlug(true); setSlugDraft(''); setSetupPseudo(d.pseudo||''); } if(d.sorareSlug&&!urlSlugRef.current){ setSlug(d.sorareSlug); setJustLoggedIn(true); } } }).catch(()=>{});
  },[]);
  // ===== PREFERENCES DU COMPTE : recuperees a la connexion (le compte l'emporte), puis recopiees dans le compte des qu'elles changent =====
  slugNowRef.current=slug;
  const refreshPrefsState=()=>{
    try{
      const sl=slugNowRef.current;
      const rd=(k:string)=>{const v=localStorage.getItem(k);return v?JSON.parse(v):null;};
      if(sl){const h=rd('mynftlocker_hof_'+sl);if(h)setHof(h);const hf=rd('mynftlocker_hof_foot_'+sl);if(hf)setHofFoot(hf);setDefaultTeam(localStorage.getItem('mynftlocker_default_team_'+sl)||'');}
      const ln=rd('mynftlocker_lineup');if(ln)setLineup(ln);
      const a=localStorage.getItem('mnfl_arcade');if(a!=null)setArcadeOnly(a==='1');
      const g=localStorage.getItem('mnfl_gameplay');if(g!=null)setGameplay(g==='1');
      const f=rd('mnfl_favs');if(f)setFavs(f);
    }catch{}
  };
  useEffect(()=>{
    if(!currentUser)return;
    let stop=false,ready=false,last='',iv:any;
    const flush=()=>{if(!ready)return;const cur=JSON.stringify(collectPrefs());if(cur!==last){last=cur;pushPrefs(JSON.parse(cur));}};
    (async()=>{
      const changed=await pullPrefs();
      if(stop||changed===null)return; // echec de lecture : on ne pousse rien (pour ne pas ecraser le compte)
      if(changed)refreshPrefsState();
      ready=true; last='';flush(); // envoie aussi ce qui n'existait qu'en local
      iv=setInterval(flush,4000);
    })();
    const vis=()=>{if(document.visibilityState==='hidden')flush();};
    document.addEventListener('visibilitychange',vis);
    return()=>{stop=true;clearInterval(iv);document.removeEventListener('visibilitychange',vis);};
  },[currentUser]);
  useEffect(()=>{
    if(justLoggedIn&&slug&&openPhase===0){ fragStartedRef.current=false; setOpenPhase(1); fetchCards(); setJustLoggedIn(false); }
  },[justLoggedIn,slug]);
  const startAuthClose=()=>{ setAuthClosing(true); setTimeout(()=>{ setAuthOpen(false); setAuthClosing(false); setAuthError(''); setAuthVerifyPending(false); },450); };
  const submitAuth=async()=>{
    if(authMode==='signup'&&authPassword!==authPasswordConfirm){ setAuthError(tr('Les mots de passe ne correspondent pas.')); return; }
    setAuthError(''); setAuthLoading(true);
    try{
      const endpoint = authMode==='signup' ? '/api/auth/signup' : '/api/auth/login';
      const body = authMode==='signup' ? {pseudo:authPseudo,email:authEmail,password:authPassword,sorareSlug:authSlugField||undefined,lang:getLang()} : {email:authEmail,password:authPassword};
      const r = await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const d = await r.json();
      if(!r.ok){ setAuthError(d.error==='email_deja_utilise'?'Cet email est déjà utilisé.':d.error==='identifiants_invalides'?'Email ou mot de passe incorrect.':d.error==='mot_de_passe_invalide'?'Mot de passe : 10 caractères minimum, avec au moins une lettre et un chiffre.':d.error==='slug_introuvable'?'Aucun manager Sorare avec ce slug. Vérifie l’orthographe.':d.error==='slug_requis'?'Le slug Sorare est obligatoire.':tr('Une erreur est survenue.')); setAuthLoading(false); return; }
      if(d.pendingVerification){
        setAuthLoading(false);
        setAuthError('');
        setAuthPseudo(''); setAuthSlugField(''); setAuthPassword(''); setAuthPasswordConfirm('');
        setAuthVerifyPending(true);
        return;
      }
      setCurrentUser({pseudo:d.pseudo,email:d.email,sorareSlug:d.sorareSlug});
      setAuthLoading(false);
      startAuthClose();
      if(d.sorareSlug){ setSlug(d.sorareSlug); setJustLoggedIn(true); }
    }catch(e){ setAuthError(tr('Connexion au serveur impossible.')); setAuthLoading(false); }
  };
  const handleLogout=async()=>{
    try{ await fetch('/api/auth/logout',{method:'POST'}); }catch(e){}
    setCurrentUser(null);
    setAcctOpen(false);
    setAcctMenuSection(null);
  };
  useEffect(()=>{if(!acctMenuSection)return;const h=(e:KeyboardEvent)=>{if(e.key==='Escape')setAcctMenuSection(null);};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h);},[acctMenuSection]); // Echap : retour a la galerie / au vestiaire
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
      if(arcadeOnly && !isArcadeCard(c)) return false;
      if(gameplay){
        if(fComp==='inseason' && !c.inSeasonEligible) return false;
        if(fComp==='classic' && c.inSeasonEligible) return false;
        if(fStars!=='all' && Number(c.anyPlayer?.gameplayTierStars)!==Number(fStars)) return false;
        if(fAvail==='ok' && activeInjury(c)) return false;
        if(fAvail==='injured' && !activeInjury(c)) return false;
      }
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
  },[fRarity,fSeason,fSpecial,fPlayer,arcadeOnly,gameplay,fComp,fStars,fAvail]);

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
  const leagueOptions=useMemo(()=>{if(gSport==='nba')return[{v:'all',l:'NBA'}];return[{v:'all',l:tr('Toutes les ligues')}];},[gSport]);
  useEffect(()=>{
    if(loading)return; // CORRECTIF : pendant le chargement progressif la liste est partielle (pas de HoF) -> on choisissait a tort la 1re equipe (Hawks). On attend le chargement complet.
    if(teamList.length===0)return;
    const hofInList=teamList.find(t=>t.api==='__HOF__');
    const savedDefault=localStorage.getItem('mynftlocker_default_team_'+slug);
    if(teamApi===''&&savedDefault&&teamList.find(t=>t.api===savedDefault)){setTeamApi(savedDefault);return;}
    if(hofInList&&teamApi!=='__HOF__'&&!teamChosenRef.current&&!savedDefault){setTeamApi('__HOF__');return;}
    if(!teamList.find(t=>t.api===teamApi)){setTeamApi(hofInList?'__HOF__':teamList[0].api);}
  },[teamList,teamApi,loading]);
  // Auto-detection du sport apres chargement complet : si le compte n'a aucune carte NBA mais des cartes foot, on bascule sur Football.
  useEffect(()=>{
    if(loading||cards.length===0||sportAutoSetRef.current)return;
    sportAutoSetRef.current=true;
    const hasNba=cards.some((c:any)=>isNBA(c));
    const hasFoot=cards.some((c:any)=>!isNBA(c));
    if(!hasNba&&hasFoot){setGSport('foot');setTeamApi(HOF_KEY);teamChosenRef.current=false;}
  },[loading,cards]);

  // Vestiaire : epingles prioritaires, puis remplissage, puis TOUTES les cartes
  const lockerCards=useMemo(()=>{
    const isFoot=gSport==='foot';
    const activeHof=isFoot?hofFoot:hof;
    const pool = teamApi===HOF_KEY
      ? applyFilters(cards.filter(c=>activeHof.includes(c.slug))) // FIX: les filtres s'appliquent aussi au Hall of Fame
      : applyFilters(cards.filter(c=>(isFoot?!isNBA(c):isNBA(c))&&c.anyTeam?.name===teamApi));
    const byL10=(a:any,b:any)=>(b.averageScore??-1)-(a.averageScore??-1);
    // Epingles = cartes exactes (doublons autorises), dans l'ordre d'epinglage
    const pins=lineup[teamApi]||[];
    const pinned=pins.map(s=>pool.find(c=>c.slug===s)).filter(Boolean) as any[];
    const pinnedSlugs=new Set(pinned.map((c:any)=>c.slug));
    const remaining=pool.filter(c=>!pinnedSlugs.has(c.slug));
    // Alphabetique : epingles d'abord puis tri par nom de joueur
    if(lockerSort==='collection'){ let alpha=[...remaining].sort((a,b)=>(a.anyPlayer?.lastName||a.name||'').localeCompare(b.anyPlayer?.lastName||b.name||'')); if(gDir==='asc')alpha=alpha.reverse(); return [...pinned,...alpha]; }
    // Mon 5 : uniquement tes epingles d'abord, puis toutes les autres
    if(lockerSort==='manual'){ return [...pinned,...remaining]; }
    // 5 Majeur : 5 premieres = epingles + meilleurs L10 (joueurs uniques), puis TOUT le reste trie par L10
    const pinnedPlayers=new Set(pinned.map(playerKey));
    const fill=[...dedupeByPlayer(remaining)].sort(byL10).filter((c:any)=>!pinnedPlayers.has(playerKey(c)));
    const head=[...pinned,...fill].slice(0,5);
    const headSlugs=new Set(head.map((c:any)=>c.slug));
    const tail=pool.filter(c=>!headSlugs.has(c.slug)).sort(byL10);
    return [...head,...tail];
  },[cards,teamApi,applyFilters,lockerSort,hof,hofFoot,gSport,lineup,gDir]);

  // Galerie = sport + filtres + tri
  const footCountries=useMemo(()=>{const s=new Set<string>();let hasNational=false;cards.filter((c:any)=>!isNBA(c)).forEach((c:any)=>{const co=c.anyTeam?.country?.slug;if(co)s.add(co);else if(c.anyTeam?.name)hasNational=true;});const arr=Array.from(s).sort();if(hasNational)arr.push('__NATIONAL__');return arr;},[cards]);
  const teamsByCountry=useMemo(()=>{const m:Record<string,Set<string>>={};cards.filter((c:any)=>!isNBA(c)).forEach((c:any)=>{const co=c.anyTeam?.country?.slug;const nm=c.anyTeam?.name;if(nm){const key=co||'__NATIONAL__';(m[key]=m[key]||new Set<string>()).add(nm);}});const out:Record<string,string[]>={};for(const k in m)out[k]=Array.from(m[k]).sort();return out;},[cards]);
  const galleryTeamList=useMemo(()=>{const ts=new Set<string>();cards.filter(c=>isNBA(c)).forEach(c=>{if(!c.anyTeam?.name)return;ts.add(c.anyTeam.name);});return['all',...Array.from(ts).sort()] as string[];},[cards]);
  // Les tris Projection/Ecart n'existent que pour la NBA : retour au tri L10 si on passe au foot
  useEffect(()=>{if((gSport!=='nba'||!gameplay)&&(gSort==='proj'||gSort==='gain'||gSort==='projstar'))setGSort('score');},[gSport,gSort,gameplay]);
  const filteredGallery=useMemo(()=>{let base=cards.filter((c:any)=>gSport==='nba'?isNBA(c):!isNBA(c));let r=applyFilters(base);if(gSport==='foot'&&gCountry!=='all'){if(gCountry==='__NATIONAL__')r=r.filter((c:any)=>!c.anyTeam?.country?.slug&&c.anyTeam?.name);else r=r.filter((c:any)=>c.anyTeam?.country?.slug===gCountry);}if(gTeamCustom!=='all')r=r.filter((c:any)=>(c.anyTeam?.name||'')===gTeamCustom);// tri de base (toujours calcule en "desc" logique, le sens final est applique ensuite via gDir)
    let sorted:any[];
    if(gSort==='rarity')sorted=[...r].sort((a:any,b:any)=>(RARITY_ORDER[a.rarityTyped]??9)-(RARITY_ORDER[b.rarityTyped]??9));
    else if(gSort==='name')sorted=[...r].sort((a:any,b:any)=>(a.anyPlayer?.lastName||'').localeCompare(b.anyPlayer?.lastName||''));
    else if(gSort==='stars')sorted=[...r].sort((a:any,b:any)=>{const sa=Number(a.anyPlayer?.gameplayTierStars??-1),sb=Number(b.anyPlayer?.gameplayTierStars??-1);if(sb!==sa)return sb-sa;return parseFloat(String(b.averageScore||0))-parseFloat(String(a.averageScore||0));});
    else if(gSort==='record'){
      // GW Record = meilleur score de la carte sur une GW. Les cartes sans record (jamais alignees) restent TOUJOURS en bas, quel que soit le sens.
      const has=[...r].filter((c:any)=>c.gwRecord!=null).sort((a:any,b:any)=>Number(b.gwRecord)-Number(a.gwRecord));
      const none=r.filter((c:any)=>c.gwRecord==null);
      return [...(gDir==='asc'?has.reverse():has),...none];
    }
    else if(gSort==='beat'){
      // %Beat L10 sur l'historique complet de la carte (beatL10/GW alignes). Seuil mini pour qu'un 1/1=100% ne passe pas devant une carte fiable.
      const MIN_GW=10;
      const rk=(c:any)=>{const gw=c.beatGw==null?0:Number(c.beatGw);return gw>=MIN_GW?2:(gw>0?1:0);};// 2=fiable, 1=petit echantillon, 0=jamais alignee/pas de data
      sorted=[...r].sort((a:any,b:any)=>{const ta=rk(a),tb=rk(b);if(tb!==ta)return tb-ta;const pa=a.beatPct==null?-1:a.beatPct,pb=b.beatPct==null?-1:b.beatPct;if(pb!==pa)return pb-pa;return (Number(b.beatGw)||0)-(Number(a.beatGw)||0);});
    }
    else if(gSort==='proj'||gSort==='gain'||gSort==='projstar'){
      // Projection / Ecart / Projection par etoile (NBA uniquement). Les cartes sans valeur restent TOUJOURS en bas, quel que soit le sens.
      const val=(c:any):number|null=>{if(gSort==='proj')return c.proj??null;if(gSort==='gain')return c.gain??null;const st=Number(c.anyPlayer?.gameplayTierStars);return(c.proj!=null&&st>0)?c.proj/st:null;};
      const has=[...r].filter((c:any)=>val(c)!=null).sort((a:any,b:any)=>(val(b) as number)-(val(a) as number));
      const none=r.filter((c:any)=>val(c)==null);
      return [...(gDir==='asc'?has.reverse():has),...none];
    }
    else if(gSort==='score')sorted=[...r].sort((a:any,b:any)=>parseFloat(String(b.averageScore||0))-parseFloat(String(a.averageScore||0)));
    else sorted=[...r];// Defaut = ordre de la collection (acquisition Sorare), distinct du tri L10
    return gDir==='asc'?sorted.reverse():sorted;},[cards,applyFilters,gSport,gCountry,gTeamCustom,gSort,gDir]);

  const goldGrad='linear-gradient(160deg,#a86f15 0%,#d9a52e 22%,#f7da80 48%,#e8b84a 68%,#b8801a 100%)';
  const fBtn=(a:boolean):React.CSSProperties=>({padding:'0.4rem 0.6rem',borderRadius:'0.15rem',border:'none',borderLeft:a?'2px solid #f5d76e':'2px solid rgba(255,255,255,0.08)',background:a?'rgba(245,215,110,0.12)':'rgba(255,255,255,0.025)',color:a?'#f5d76e':'#cfd8e6',cursor:'pointer',fontSize:'0.76rem',fontWeight:a?700:500,transition:'all 0.12s'});
  const gridHof:React.CSSProperties={display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))',gap:'12px',padding:'12px'};
  const gridMain:React.CSSProperties={display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))',gap:'12px',padding:'12px'};
  const galleryBg:React.CSSProperties={background:'radial-gradient(ellipse 130% 90% at 50% -10%,#0d111a 0%,#080b10 50%,#040507 100%)',minHeight:'100vh'};
  // Prechauffage galerie : pendant qu'on est dans le vestiaire, on prepare la galerie en tache de fond (monte masquee + images en cache)
  const [galleryWarm,setGalleryWarm]=useState(false);
  useEffect(()=>{
    if(galleryWarm||cards.length===0) return;
    const t=setTimeout(()=>setGalleryWarm(true),1200);
    return ()=>clearTimeout(t);
  },[cards.length,galleryWarm]);
  useEffect(()=>{
    if(!galleryWarm) return;
    filteredGallery.slice(0,48).forEach((c:any,i:number)=>{if(!c.pictureUrl)return;setTimeout(()=>{const im=new Image();im.src=c.pictureUrl;},i*40);});
  },[galleryWarm,filteredGallery]);

  // Barre de filtres partagee
  const labelStyle:React.CSSProperties={fontSize:'0.64rem',fontWeight:800,letterSpacing:'0.14em',textTransform:'uppercase',color:'#eaf2ff',margin:'0.5rem 0 0.3rem 0.5rem'};
  const contentBg='linear-gradient(180deg,#13151a 0%,#0c0e12 45%,#07080a 100%)';
  const sideBg='rgba(12,14,19,0.82)';

  // Bloc filtres vertical (barre laterale)
  const rarityOpts=[{value:'all',label:tr('Toutes les raretés')},{value:'common',label:'Set'},{value:'limited',label:'Limited'},{value:'rare',label:'Rare'},{value:'super_rare',label:'Super Rare'},{value:'unique',label:'Unique'}];
  const seasonOpts=[{value:'all',label:tr('Toutes les saisons')},...seasonOptions.map(y=>({value:String(y),label:y+'-'+String((y+1)%100).padStart(2,'0')}))];
  const arcadeCount=cards.filter((c:any)=>(gSport==='nba'?isNBA(c):!isNBA(c))&&isArcadeCard(c)).length;
  const compOpts=[{value:'all',label:tr('Toutes')},{value:'inseason',label:'In-Season'},{value:'classic',label:'Classic'}];
  const starOpts=[{value:'all',label:tr('Toutes')},...[...new Set(cards.filter((c:any)=>(gSport==='nba'?isNBA(c):!isNBA(c))&&Number(c.anyPlayer?.gameplayTierStars)>0).map((c:any)=>Number(c.anyPlayer.gameplayTierStars)))].sort((a:number,b:number)=>b-a).map((v:number)=>({value:String(v),label:v+' ★'}))];
  const availOpts=[{value:'all',label:tr('Tous')},{value:'ok',label:tr('Sans blessure')},{value:'injured',label:tr('Blessés')}];
  const specialOpts=[{value:'all',label:tr('Toutes les cartes')},{value:'standard',label:tr('Standard uniquement')},{value:'special',label:tr('Spéciales uniquement')},...specialOptions.map(s=>({value:s,label:s.charAt(0)+s.slice(1).toLowerCase()}))]; // labels en "Majuscule initiale" (valeurs techniques inchangées)
  // (composant Filters retiré — filtres inlinés dans la sidebar)

  // ===== MANAGERS FAVORIS (inscrits) =====
  const saveFavs=(next:string[])=>{setFavs(next);try{localStorage.setItem('mnfl_favs',JSON.stringify(next));}catch{}};
  const openManager=(sl:string)=>{setAcctMenuSection(null);setOpenPhase(0);setCards([]);setError('');setFlippedSlug(null);setLockerStart(0);setSlugPanelOpen(false);setSlug(sl);setJustLoggedIn(true);};
  const startSlugEdit=()=>{setSlugDraft(slugProblem||currentUser?.sorareSlug||'');setSlugMsg(null);setSlugEditing(true);};
  const saveSlug=async()=>{
    if(slugBusy||slugCheckDraft.s!=='ok'||(needSlug&&setupPseudo.trim().length<2))return;
    setSlugBusy(true);setSlugMsg(null);
    try{
      const r=await fetch('/api/auth/slug',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug:slugDraft,...(needSlug?{pseudo:setupPseudo.trim()}:{})})});
      const d=await r.json().catch(()=>({}));
      if(r.ok&&d.ok){
        setCurrentUser(u=>u?{...u,sorareSlug:d.slug,pseudo:d.pseudo||u.pseudo}:u);
        setSlugEditing(false);
        if(slugProblem||needSlug){ setSlugProblem(null); setNeedSlug(false); openManager(d.slug); } // compte bloque : on ouvre directement la galerie corrigee
        else setSlugMsg({ok:true,text:tr('Slug enregistré.')});
      }else if(d.error==='pseudo_invalide')setSlugMsg({ok:false,text:tr('Choisis un pseudo de 2 à 30 caractères.')});
      else if(d.error==='slug_introuvable')setSlugMsg({ok:false,text:tr('Aucun manager Sorare avec ce slug. Vérifie l’orthographe.')});
      else setSlugMsg({ok:false,text:tr('Impossible de vérifier le slug, réessaie dans un instant.')});
    }catch(e){setSlugMsg({ok:false,text:tr('Impossible de vérifier le slug, réessaie dans un instant.')});}
    setSlugBusy(false);
  };
  const pseudoNextAt=currentUser?.pseudoChangedAt?currentUser.pseudoChangedAt+90*24*3600*1000:0;
  const pseudoLocked=pseudoNextAt>Date.now();
  const savePseudo=async()=>{
    const p=pseudoDraft.trim();
    if(pseudoBusy||p.length<2||p.length>30)return;
    setPseudoBusy(true);setPseudoMsg(null);
    try{
      const r=await fetch('/api/auth/profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pseudo:p})});
      const d=await r.json().catch(()=>({}));
      if(r.ok&&d.ok){ setCurrentUser(u=>u?{...u,pseudo:d.pseudo,pseudoChangedAt:d.pseudoChangedAt}:u); setPseudoEditing(false); setPseudoMsg({ok:true,text:tr('Pseudo enregistré.')}); }
      else if(d.error==='pseudo_trop_recent')setPseudoMsg({ok:false,text:tr('Le pseudo ne peut être modifié qu’une fois tous les 3 mois. Prochain changement possible le')+' '+new Date(d.nextAt).toLocaleDateString(getLang()==='en'?'en-GB':'fr-FR')+'.'});
      else setPseudoMsg({ok:false,text:tr('Choisis un pseudo de 2 à 30 caractères.')});
    }catch(e){setPseudoMsg({ok:false,text:tr('Impossible d’enregistrer, réessaie dans un instant.')});}
    setPseudoBusy(false);
  };
  const sendEmailChange=async()=>{
    const em=emailDraft.trim().toLowerCase();
    if(emailBusy||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em))return;
    setEmailBusy(true);setEmailMsg(null);
    try{
      const r=await fetch('/api/auth/email-change',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({newEmail:em,password:emailPwd,lang:getLang()})});
      const d=await r.json().catch(()=>({}));
      if(r.ok&&d.ok){ setEmailEditing(false); setEmailPwd(''); setEmailMsg({ok:true,text:tr('Un lien de confirmation vient d’être envoyé à')+' '+em+'. '+tr('Ton adresse actuelle ne change qu’après ton clic sur ce lien.')}); }
      else if(d.error==='mot_de_passe_invalide')setEmailMsg({ok:false,text:tr('Mot de passe incorrect.')});
      else if(d.error==='email_deja_utilise')setEmailMsg({ok:false,text:tr('Cette adresse est déjà utilisée par un autre compte.')});
      else if(d.error==='email_identique')setEmailMsg({ok:false,text:tr('C’est déjà ton adresse actuelle.')});
      else if(d.error==='trop_de_demandes')setEmailMsg({ok:false,text:tr('Trop de demandes. Réessaie dans une heure.')});
      else setEmailMsg({ok:false,text:tr('Impossible d’envoyer le lien, réessaie dans un instant.')});
    }catch(e){setEmailMsg({ok:false,text:tr('Impossible d’envoyer le lien, réessaie dans un instant.')});}
    setEmailBusy(false);
  };
  const canAddFav=cards.length>0&&!!slug&&!favs.includes(slug);
  const favOptions=[...(canAddFav?[{value:'__add__',label:'+ '+tr('Ajouter')+' '+slug}]:[]),...(slug&&favs.includes(slug)?[{value:'__rm__',label:'✕ '+tr('Retirer')+' '+slug}]:[]),...favs.map(f=>({value:f,label:f}))];
  const favMenu=currentUser?(<FilterMenu title={tr('Managers favoris')} options={favOptions.length?favOptions:[{value:'__none__',label:tr('Aucun favori pour l’instant')}]} current={slug} onSelect={(v:string)=>{if(v==='__add__')saveFavs([...favs,slug]);else if(v==='__rm__')saveFavs(favs.filter(x=>x!==slug));else if(v!=='__none__')openManager(v);}}/>):null;

  return(
    <main style={{minHeight:'100vh',background:contentBg,backgroundAttachment:'fixed',color:'white',fontFamily:'system-ui,sans-serif',display:'flex'}}>
      <style>{`.noscroll::-webkit-scrollbar{width:0;height:0;display:none} .noscroll{scrollbar-width:none} .thin-sb::-webkit-scrollbar{width:6px} .thin-sb::-webkit-scrollbar-thumb{background:rgba(111,195,232,0.45);border-radius:3px} .thin-sb::-webkit-scrollbar-track{background:transparent} .thin-sb{scrollbar-width:thin;scrollbar-color:rgba(111,195,232,0.45) transparent} @keyframes mnflBuild{0%{opacity:0;transform:translateX(-50%) translateY(12px);filter:blur(3.5px) brightness(1.6) saturate(0.4);box-shadow:0 0 28px 7px rgba(111,195,232,0.5)}50%{opacity:0.65;filter:blur(1.5px) brightness(1.2) saturate(0.75)}100%{opacity:1;transform:translateX(-50%) translateY(0);filter:blur(0) brightness(1) saturate(1);box-shadow:0 0 0 0 rgba(111,195,232,0)}} @keyframes mnflSlideLeft{from{opacity:0;transform:translateX(70px);filter:blur(2px)}to{opacity:1;transform:translateX(0);filter:blur(0)}} @keyframes mnflSlideRight{from{opacity:0;transform:translateX(-70px);filter:blur(2px)}to{opacity:1;transform:translateX(0);filter:blur(0)}} @keyframes mnflLaser{0%{height:0;opacity:0.95}50%{height:29%;opacity:1}75%{height:29%;opacity:0.85}100%{height:29%;opacity:0}} @keyframes mnflDeploy{0%{opacity:0;clip-path:inset(0 100% 0 0);transform:perspective(900px) rotateY(-4deg) translateX(-6px)}35%{opacity:0.6}100%{opacity:1;clip-path:inset(0 0% 0 0);transform:perspective(900px) rotateY(0deg) translateX(0)}} @keyframes mnflClose{0%{opacity:1;transform:scaleY(1);filter:brightness(1)}30%{transform:scaleY(0.84);filter:brightness(1.2)}55%{transform:scaleY(0.42);filter:brightness(1.7)}72%{transform:scaleY(0.12);filter:brightness(2.5)}80%{transform:scaleY(0.025);filter:brightness(4) blur(0.5px)}88%{transform:scaleY(0.008);filter:brightness(6);opacity:1}95%{transform:scaleY(0.003);filter:brightness(9)}100%{transform:scaleY(0);opacity:0;filter:brightness(0)}} @keyframes mnflIcebreaker{0%{opacity:0;transform:translate(-50%,-50%) scaleX(0.05) scaleY(1)}18%{opacity:1;transform:translate(-50%,-50%) scaleX(1) scaleY(1);filter:brightness(2)}52%{opacity:1;transform:translate(-50%,-50%) scaleX(1) scaleY(1)}70%{opacity:1;transform:translate(-50%,-50%) scaleX(0.14) scaleY(2.5);filter:brightness(5)}82%{opacity:1;transform:translate(-50%,-50%) scaleX(0.04) scaleY(7);filter:brightness(10)}90%{opacity:1;transform:translate(-50%,-50%) scaleX(0.01) scaleY(2);filter:brightness(4)}100%{opacity:0;transform:translate(-50%,-50%) scaleX(0) scaleY(0)}} @keyframes mnflFloat{0%{transform:translateY(8px);opacity:0}25%{opacity:0.55}75%{opacity:0.45}100%{transform:translateY(-26px);opacity:0}} @keyframes mnflPulse{0%,100%{box-shadow:0 0 9px 1px var(--rc)}50%{box-shadow:0 0 24px 6px var(--rc)}}@keyframes mnflCyanPulse{0%,100%{box-shadow:0 0 12px 3px rgba(64,232,255,0.45),0 0 22px 5px rgba(64,232,255,0.18)}50%{box-shadow:0 0 22px 6px rgba(64,232,255,0.75),0 0 40px 10px rgba(64,232,255,0.32)}}@keyframes mnflCardTrace{0%{stroke-dashoffset:1000}100%{stroke-dashoffset:0}} @keyframes mnflTwinkle{0%,100%{transform:scale(0) rotate(0deg);opacity:0}45%{transform:scale(1) rotate(15deg);opacity:1}70%{transform:scale(0.4) rotate(0deg);opacity:0.3}} @keyframes mnflIdleFloat{0%,100%{transform:rotateY(-6deg) translateY(0px)}50%{transform:rotateY(6deg) translateY(-5px)}} @media(max-width:768px){.mnfl-sidebar{display:none!important} .mnfl-content{margin-left:0!important;padding-bottom:70px!important;max-width:100vw!important;overflow-x:hidden!important} .mnfl-bottombar{display:flex!important} .mnfl-filters-sheet{display:flex!important} .mnfl-account-panel{left:0!important}}`}</style>
      {/* ===== BARRE LATERALE (glass sombre) ===== */}
      <button type='button' className='mnfl-side-toggle' aria-label={sideOpen?'Fermer le menu':'Ouvrir le menu'} onClick={()=>setSideOpen(o=>!o)}>{sideOpen?'✕':'☰'}</button>
      {sideOpen&&<div className='mnfl-side-backdrop' onClick={()=>setSideOpen(false)}/>}
      <aside className={'mnfl-sidebar thin-sb'+(sideOpen?' open':'')} style={{position:'fixed',left:0,top:0,width:'220px',height:'100vh',overflow:'auto',background:sideBg,backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',borderRight:'1px solid rgba(111,195,232,0.35)',boxShadow:'1px 0 0 rgba(111,195,232,0.25), 6px 0 24px -6px rgba(111,195,232,0.22)',padding:'0.4rem 0.6rem',zIndex:50,scrollbarWidth:'thin',display:'flex',flexDirection:'column' as const,gap:'0',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif"}}>

        {/* HEADER logo (x3) */}
        <div style={{textAlign:'center',marginBottom:'0.2rem'}}>
          <img src='/logo-pack.png' alt='myNFTlocker' title={tr('Retour à l\'accueil')} onClick={()=>{setOpenPhase(0);setCards([]);setSlug('');setError('');setFlippedSlug(null);setMode('locker');setFiltersOpen(false);setAcctOpen(false);setSlugPanelOpen(false);setAcctMenuSection(null);}} style={{display:'inline-block',height:'126px',width:'auto',cursor:'pointer',filter:'drop-shadow(0 6px 18px rgba(0,0,0,0.6))'}} onError={(e)=>{(e.target as HTMLImageElement).style.display='none';}}/>
        </div>

        <div style={{textAlign:'center',marginBottom:'0.3rem'}}><LangSwitch/></div>

        {/* COMPTE */}
        <div style={{display:'flex',flexDirection:'column' as const,gap:'0.2rem',marginBottom:'0.25rem'}}>
          <div style={{position:'relative'}}>
          {/* LIGNE 1 : bouton Mon compte (ouvre le menu) */}
          <div onClick={()=>setAcctOpen(o=>!o)} style={{display:'flex',alignItems:'center',gap:'0.5rem',padding:'0.35rem 0.4rem',borderRadius:'0.3rem',cursor:'pointer',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(111,195,232,0.18)',transition:'all 0.15s'}} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(111,195,232,0.08)';}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.03)';}}>
            <div style={{width:'28px',height:'28px',flexShrink:0,borderRadius:'50%',background:'radial-gradient(circle at 35% 30%,#1a1c24,#0a0b0f)',border:'1.5px solid #6fc3e8',boxShadow:'0 0 10px rgba(111,195,232,0.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.78rem',fontWeight:900,color:'#6fc3e8'}}>{(slug||'?').trim().charAt(0).toUpperCase()||'?'}</div>
            <div style={{flex:1,minWidth:0,textAlign:'left'}}>
              <p style={{margin:0,fontSize:'0.74rem',fontWeight:700,color:'#eaf2ff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{cards.length>0&&slug?((currentUser?.sorareSlug&&currentUser.pseudo&&slug.toLowerCase()===currentUser.sorareSlug.toLowerCase())?currentUser.pseudo:slug):tr('Mon compte')}</p>
            </div>
            <span style={{fontSize:'0.6rem',color:'#6fc3e8',opacity:0.85,flexShrink:0}}>{acctOpen?'▲':'▼'}</span>
          </div>
          {/* LIGNE 2 : bandeau-collection (badge + compteur + changement de galerie) */}
          {cards.length>0&&(
            <div style={{display:'flex',alignItems:'center',gap:'0.4rem',padding:'0.1rem 0.4rem'}}>
              {(()=>{const b=collectionBadge(cards.length);return(<img title={cards.length+' '+tr('cartes')} src={'/'+b.img} alt='' style={{width:'34px',height:'34px',flexShrink:0,objectFit:'contain'}} onError={(e)=>{(e.target as HTMLImageElement).style.display='none';}}/>);})()}
              <span style={{flex:1,minWidth:0,fontSize:'0.63rem',color:'#7a8898',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{cards.length+' '+tr('cartes')}</span>
              <span onClick={e=>{e.stopPropagation();setSlugPanelOpen(o=>!o);}} title={tr('Changer de galerie consultée')} style={{fontSize:'0.85rem',color:slugPanelOpen?'#f5d76e':'#6fc3e8',opacity:0.85,padding:'0.1rem 0.3rem',cursor:'pointer',flexShrink:0}}>⇄</span>
            </div>
          )}
          {(slugPanelOpen||cards.length===0)&&(
            <div style={{display:'flex',gap:'0.3rem',alignItems:'stretch'}}>
              <input style={{flex:1,minWidth:0,background:'rgba(255,255,255,0.05)',color:'#cfe4fb',padding:'0.28rem 0.55rem',borderRadius:'0.15rem',border:'1px solid rgba(255,255,255,0.1)',outline:'none',fontSize:'0.76rem',boxSizing:'border-box'}} placeholder={tr('ton-slug-sorare')} value={slug} onChange={e=>setSlug(toSlug(e.target.value))} onKeyDown={e=>e.key==='Enter'&&fetchCards()}/>
              <button onClick={()=>fetchCards()} title={tr('Valider')} disabled={!slug} style={{flexShrink:0,background:slug?'rgba(64,232,255,0.16)':'rgba(255,255,255,0.04)',border:'1px solid rgba(64,232,255,0.5)',color:'#40e8ff',borderRadius:'0.2rem',padding:'0 0.7rem',cursor:slug?'pointer':'not-allowed',opacity:slug?1:0.5,fontSize:'0.85rem',fontWeight:800}}>▶</button>
            </div>
          )}
          {favMenu}
          {acctOpen&&(
            <div className='thin-sb' style={{position:'absolute',top:'100%',left:0,right:0,marginTop:'0.3rem',background:'#0a0d12',border:'1px solid rgba(111,195,232,0.35)',borderRadius:'0.35rem',boxShadow:'0 10px 28px rgba(0,0,0,0.6)',zIndex:200,overflow:'hidden'}}>
              {[
              {key:'infos',label:tr('Informations personnelles')},
              {key:'auth',label:tr('Authentification')},
              {key:'abo',label:tr('Abonnement')},
              {key:'confidentialite',label:tr('Confidentialité & données')},
              {key:'aide',label:tr('Aide / Contact')},
              {key:'deconnexion',label:tr('Se déconnecter')},
            ].map(item=>(
                <div key={item.key} onClick={()=>{if(item.key==='deconnexion'){handleLogout();}else{setAcctMenuSection(item.key);setAcctOpen(false);}}} style={{padding:'0.5rem 0.7rem',fontSize:'0.72rem',color:item.key==='deconnexion'?'#fca5a5':'#cfe4fb',cursor:'pointer',borderBottom:'1px solid rgba(255,255,255,0.05)',transition:'background 0.12s'}} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(111,195,232,0.1)';}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='transparent';}}>{item.label}</div>
              ))}
            </div>
          )}
          </div>
        </div>

        {/* NAV Vestiaire / Galerie */}
        <div style={{display:'flex',overflow:'hidden',border:'1px solid rgba(255,255,255,0.12)',marginBottom:'0.25rem',clipPath:'polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)'}}>
          <button style={{flex:1,padding:'0.26rem 0',border:'none',cursor:'pointer',fontSize:'0.72rem',fontWeight:700,background:mode==='locker'?'linear-gradient(160deg,#a86f15 0%,#d9a52e 22%,#f7da80 48%,#e8b84a 68%,#b8801a 100%)':'rgba(255,255,255,0.04)',color:mode==='locker'?'#1a0d00':'#7a8898',transition:'all 0.15s'}} onClick={()=>{setMode('locker');setAcctMenuSection(null);}}>{tr('Vestiaire')}</button>
          <div style={{width:'1px',background:'rgba(255,255,255,0.1)',flexShrink:0}}/>
          <button style={{flex:1,padding:'0.26rem 0',border:'none',cursor:'pointer',fontSize:'0.72rem',fontWeight:700,background:mode==='gallery'?'linear-gradient(160deg,#a86f15 0%,#d9a52e 22%,#f7da80 48%,#e8b84a 68%,#b8801a 100%)':'rgba(255,255,255,0.04)',color:mode==='gallery'?'#1a0d00':'#7a8898',transition:'all 0.15s'}} onClick={()=>{setMode('gallery');setAcctMenuSection(null);}}>{tr('Galerie')}</button>
        </div>

        {error&&<p style={{color:'#fca5a5',fontSize:'0.7rem',marginBottom:'0.4rem'}}>{error}</p>}

        {/* FILTRES — ordre: Sport, Joueur, Equipe, Saison, Rarete, Edition, Tri */}
        {cards.length>0&&(
          <div style={{textAlign:'left',flex:1,minHeight:0,display:'flex',flexDirection:'column' as const,gap:0,borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:'0.3rem'}}>
            <FilterMenu title='Sport' options={[{value:'nba',label:'NBA'},{value:'foot',label:'Football'}]} current={gSport} onSelect={(v:string)=>{setGSport(v as any);setGLeague('all');setGTeamCustom('all');setFSpecial('all');setTeamApi(HOF_KEY);setLockerStart(0);setFlippedSlug(null);teamChosenRef.current=false;}}/>
            <div style={{padding:'0.2rem 0.5rem'}}>
              <p style={{fontSize:'0.64rem',fontWeight:800,letterSpacing:'0.14em',textTransform:'uppercase',color:'#eaf2ff',margin:'0 0 0.2rem'}}>{tr('Joueur')}</p>
              <input style={{width:'100%',boxSizing:'border-box',background:'rgba(255,255,255,0.05)',color:'#e8eefc',padding:'0.3rem 0.5rem',borderRadius:'0.15rem',border:'1px solid rgba(255,255,255,0.12)',outline:'none',fontSize:'0.76rem'}} name='player-filter' autoComplete='off' data-lpignore='true' data-1p-ignore='true' placeholder={tr('Rechercher...')} value={fPlayer} onChange={e=>setFPlayer(e.target.value)}/>
            </div>
            {gSport==='nba'?(
              <FilterMenu title={tr('Équipe')} options={(galleryTeamList as string[]).map((n:string)=>({value:n,label:n==='all'?'Hall of Fame':n}))} current={gTeamCustom} onSelect={(v:string)=>{setGTeamCustom(v);if(mode==='locker'){if(v==='all'){setTeamApi(HOF_KEY);teamChosenRef.current=false;}else{setTeamApi(v);teamChosenRef.current=true;}setLockerStart(0);setFlippedSlug(null);}}}/>
            ):(
              <FootTeamMenu countries={footCountries} teamsByCountry={teamsByCountry} country={gCountry} team={gTeamCustom} onPickCountry={(v:string)=>{setGCountry(v);setGTeamCustom('all');}} onPickTeam={(v:string)=>{if(v==='__HOF__'){setGTeamCustom('all');if(mode==='locker'){setTeamApi(HOF_KEY);setLockerStart(0);setFlippedSlug(null);teamChosenRef.current=false;}return;}setGTeamCustom(v);if(mode==='locker'&&v!=='all'){setTeamApi(v);setLockerStart(0);setFlippedSlug(null);teamChosenRef.current=true;}}}/>
            )}
            <FilterMenu title={tr('Saison')} options={seasonOpts} current={fSeason} onSelect={setFSeason}/>
            <FilterMenu title={tr('Rareté')} options={rarityOpts} current={fRarity} onSelect={setFRarity}/>
            <FilterMenu title={tr('Édition de la carte')} options={specialOpts} current={fSpecial} onSelect={setFSpecial}/>
            <ToggleRow title='Arcade' hint={tr('Set Arcade uniquement')} on={arcadeOnly} onToggle={toggleArcade}/>
            {arcadeOnly&&arcadeCount===0&&<p style={{fontSize:'0.62rem',color:'#f5d76e',margin:'0 0.5rem 0.3rem'}}>{tr('Aucune carte Arcade pour ce sport')}</p>}
            <ToggleRow title='Gameplay' hint={tr('Outils de composition')} on={gameplay} onToggle={toggleGameplay}/>
            {gameplay&&(<>
              <FilterMenu title={tr('Compétition')} options={compOpts} current={fComp} onSelect={setFComp}/>
              <FilterMenu title={tr('Étoiles')} options={starOpts} current={fStars} onSelect={setFStars}/>
              <FilterMenu title={tr('Disponibilité')} options={availOpts} current={fAvail} onSelect={setFAvail}/>
            </>)}
            <FilterMenu title={tr('Tri')} options={mode==='locker'?[{value:'majeur',label:'L10 Max'},{value:'manual',label:tr('Manuel')},{value:'collection',label:tr('Alphabétique')}]:[{value:'default',label:tr('Défaut')},{value:'score',label:'L10'},{value:'beat',label:'%Beat L10'},{value:'record',label:'GW Record'},{value:'stars',label:tr('Note en étoiles')},{value:'rarity',label:tr('Rareté')},...(gSport==='nba'&&gameplay?[{value:'proj',label:tr('Score prévu')},{value:'gain',label:tr('Projection vs L10')},{value:'projstar',label:tr('Proj. / ★')}]:[]),{value:'name',label:tr('Nom')}]} current={mode==='locker'?lockerSort:gSort} onSelect={(v:string)=>{if(mode==='locker'){setLockerSort(v as any);}else{setGSort(v as any);}}}/>
            {(mode==='gallery'||lockerSort==='collection')&&(
              <button onClick={()=>setGDir(d=>d==='desc'?'asc':'desc')} style={{width:'100%',boxSizing:'border-box' as const,padding:'0.3rem',marginTop:'0.45rem',background:'rgba(64,232,255,0.08)',border:'1px solid rgba(64,232,255,0.3)',borderRadius:'0.18rem',color:'#40e8ff',fontSize:'0.64rem',cursor:'pointer',letterSpacing:'0.08em',display:'flex',alignItems:'center',justifyContent:'center',gap:'0.4rem'}}>{gDir==='desc'?tr('↓ Décroissant'):tr('↑ Croissant')}</button>
            )}
            {mode==='locker'&&(
              <>
              <button onClick={resetFilters} style={{width:'100%',boxSizing:'border-box' as const,padding:'0.3rem',background:'rgba(111,195,232,0.1)',border:'1px solid rgba(111,195,232,0.35)',borderRadius:'0.18rem',color:'#6fc3e8',fontSize:'0.64rem',cursor:'pointer',letterSpacing:'0.08em',marginTop:'0.5rem'}}>{tr('↺ Réinitialiser les filtres')}</button>
              <button onClick={()=>handleSetDefault(teamApi)} style={{width:'100%',boxSizing:'border-box' as const,padding:'0.3rem',background:'rgba(212,175,55,0.12)',border:'1px solid rgba(212,175,55,0.35)',borderRadius:'0.18rem',color:'#e8c84a',fontSize:'0.64rem',cursor:'pointer',letterSpacing:'0.08em',marginTop:'0.3rem'}}>{defaultTeam===teamApi&&teamApi?tr('⭐ Par défaut : ')+(teamApi==='__HOF__'?'Hall of Fame':teamApi):tr('⭐ Définir comme équipe par défaut')}</button>
              </>
            )}
          </div>
        )}
      </aside>

      {/* ===== CONTENU ===== */}
      <div className='mnfl-content' style={{flex:1,marginLeft:'220px',minHeight:'100vh'}}>
        {acctMenuSection&&(()=>{
          const SECTIONS:Record<string,string>={infos:tr('Informations personnelles'),auth:tr('Authentification'),abo:tr('Abonnement'),confidentialite:tr('Confidentialité & données'),aide:tr('Aide / Contact')};
          const title=SECTIONS[acctMenuSection]||tr('Mon compte');
          const rowStyle:React.CSSProperties={display:'flex',justifyContent:'space-between',alignItems:'center',gap:'1rem',padding:'0.85rem 1rem',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(111,195,232,0.18)',borderRadius:'0.4rem',marginBottom:'0.6rem'};
          const labelStyle:React.CSSProperties={fontSize:'0.72rem',color:'#7a8898',letterSpacing:'0.04em',textTransform:'uppercase'};
          const valStyle:React.CSSProperties={fontSize:'0.9rem',color:'#eaf2ff',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'};
          return(
          <div style={{position:'fixed',inset:0,left:'220px',zIndex:120,background:'radial-gradient(ellipse 120% 90% at 50% -10%,#0d111a 0%,#080b10 55%,#040507 100%)',overflow:'auto',padding:'2.5rem 2rem'}} className='thin-sb mnfl-account-panel mnfl-offset'>
            <div style={{maxWidth:'620px',margin:'0 auto'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.6rem',borderBottom:'1px solid rgba(111,195,232,0.25)',paddingBottom:'1rem'}}>
                <div style={{display:'flex',flexDirection:'column' as const,gap:'0.35rem',minWidth:0}}>
                  <button onClick={()=>setAcctMenuSection(null)} style={{alignSelf:'flex-start',background:'transparent',border:'none',padding:0,cursor:'pointer',color:'#40e8ff',fontSize:'0.74rem',letterSpacing:'0.08em',textTransform:'uppercase'}}>{'← '+(mode==='gallery'?tr('Retour à la galerie'):tr('Retour au vestiaire'))}</button>
                  <h1 style={{margin:0,fontSize:'1.35rem',fontWeight:800,color:'#eaf2ff',letterSpacing:'0.02em'}}>{title}</h1>
                </div>
                <button onClick={()=>setAcctMenuSection(null)} title={tr('Fermer')} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(111,195,232,0.35)',borderRadius:'50%',width:'34px',height:'34px',color:'#6fc3e8',cursor:'pointer',fontSize:'0.85rem',flexShrink:0}}>✕</button>
              </div>
              {acctMenuSection==='infos'&&(currentUser?(
                <div>
                  {slugProblem&&<div style={{marginBottom:'1rem',padding:'0.8rem 1rem',border:'1px solid rgba(245,215,110,0.4)',borderRadius:'0.4rem',background:'rgba(245,215,110,0.06)',fontSize:'0.78rem',lineHeight:1.6,color:'#f5d76e'}}>{tr('Aucun manager Sorare ne porte le slug')} « {slugProblem} ». {tr('Corrige-le ci-dessous : ta galerie s’ouvre aussitôt.')}</div>}
                  <div style={rowStyle}><span style={labelStyle}>{tr('Pseudo')}</span>
                    {pseudoEditing?(
                      <span style={{display:'flex',alignItems:'center',gap:'0.5rem',flexWrap:'wrap' as const,justifyContent:'flex-end'}}>
                        <input value={pseudoDraft} autoFocus maxLength={30} onChange={e=>{setPseudoDraft(e.target.value);setPseudoMsg(null);}} onKeyDown={e=>e.key==='Enter'&&savePseudo()} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(64,232,255,0.4)',color:'#eaf2ff',padding:'0.35rem 0.5rem',fontSize:'0.85rem',outline:'none',width:'170px'}}/>
                        <button onClick={savePseudo} disabled={pseudoBusy||pseudoDraft.trim().length<2} style={{background:'rgba(64,232,255,0.12)',border:'1px solid rgba(64,232,255,0.5)',color:'#40e8ff',padding:'0.35rem 0.8rem',fontSize:'0.7rem',fontWeight:700,cursor:'pointer',opacity:pseudoBusy||pseudoDraft.trim().length<2?0.45:1}}>{pseudoBusy?'...':tr('Enregistrer')}</button>
                        <button onClick={()=>{setPseudoEditing(false);setPseudoMsg(null);}} style={{background:'transparent',border:'none',color:'#7a8898',fontSize:'0.7rem',cursor:'pointer',textDecoration:'underline'}}>{tr('Annuler')}</button>
                      </span>
                    ):(
                      <span style={{display:'flex',alignItems:'center',gap:'0.9rem'}}><span style={valStyle}>{currentUser.pseudo}</span>{pseudoLocked?<span title={tr('Prochain changement possible le')+' '+new Date(pseudoNextAt).toLocaleDateString(getLang()==='en'?'en-GB':'fr-FR')} style={{color:'#7a8898',fontSize:'0.66rem'}}>{tr('Modifiable le')+' '+new Date(pseudoNextAt).toLocaleDateString(getLang()==='en'?'en-GB':'fr-FR')}</span>:<span onClick={()=>{setPseudoDraft(currentUser.pseudo);setPseudoMsg(null);setPseudoEditing(true);}} style={{color:'#40e8ff',cursor:'pointer',fontSize:'0.72rem',textDecoration:'underline'}}>{tr('Modifier')}</span>}</span>
                    )}
                  </div>
                  {pseudoMsg&&<p style={{margin:'0 0 0.6rem',fontSize:'0.72rem',color:pseudoMsg.ok?'#7ee0a0':'#ff8a7a'}}>{pseudoMsg.text}</p>}
                  <div style={rowStyle}><span style={labelStyle}>{tr('Adresse email')}</span>
                    {emailEditing?(
                      <span style={{display:'flex',alignItems:'center',gap:'0.5rem',flexWrap:'wrap' as const,justifyContent:'flex-end'}}>
                        <input value={emailDraft} autoFocus type='email' autoCapitalize='none' autoCorrect='off' spellCheck={false} placeholder={tr('nouvelle adresse e-mail')} onChange={e=>{setEmailDraft(e.target.value);setEmailMsg(null);}} onKeyDown={e=>e.key==='Enter'&&sendEmailChange()} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(64,232,255,0.4)',color:'#eaf2ff',padding:'0.35rem 0.5rem',fontSize:'0.85rem',outline:'none',width:'210px'}}/>
                        {currentUser.hasPassword&&<input value={emailPwd} type='password' autoComplete='current-password' placeholder={tr('Mot de passe actuel')} onChange={e=>{setEmailPwd(e.target.value);setEmailMsg(null);}} onKeyDown={e=>e.key==='Enter'&&sendEmailChange()} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(64,232,255,0.4)',color:'#eaf2ff',padding:'0.35rem 0.5rem',fontSize:'0.85rem',outline:'none',width:'150px'}}/>}
                        <button onClick={sendEmailChange} disabled={emailBusy||!emailDraft.includes('@')||(!!currentUser.hasPassword&&!emailPwd)} style={{background:'rgba(64,232,255,0.12)',border:'1px solid rgba(64,232,255,0.5)',color:'#40e8ff',padding:'0.35rem 0.8rem',fontSize:'0.7rem',fontWeight:700,cursor:'pointer',opacity:emailBusy||!emailDraft.includes('@')||(!!currentUser.hasPassword&&!emailPwd)?0.45:1}}>{emailBusy?'...':tr('Envoyer le lien')}</button>
                        <button onClick={()=>{setEmailEditing(false);setEmailMsg(null);setEmailPwd('');}} style={{background:'transparent',border:'none',color:'#7a8898',fontSize:'0.7rem',cursor:'pointer',textDecoration:'underline'}}>{tr('Annuler')}</button>
                      </span>
                    ):(
                      <span style={{display:'flex',alignItems:'center',gap:'0.9rem'}}><span style={valStyle}>{currentUser.email||'—'}</span><span onClick={()=>{setEmailDraft('');setEmailPwd('');setEmailMsg(null);setEmailEditing(true);}} style={{color:'#40e8ff',cursor:'pointer',fontSize:'0.72rem',textDecoration:'underline'}}>{tr('Modifier')}</span></span>
                    )}
                  </div>
                  {emailMsg&&<p style={{margin:'0 0 0.6rem',fontSize:'0.72rem',lineHeight:1.5,color:emailMsg.ok?'#7ee0a0':'#ff8a7a'}}>{emailMsg.text}</p>}
                  <div style={rowStyle}><span style={labelStyle}>{tr('Mot de passe')}</span><span style={valStyle}>••••••••</span></div>
                  <div style={rowStyle}><span style={labelStyle}>{tr('Slug Sorare')}</span>
                    {slugEditing?(
                      <span style={{display:'flex',alignItems:'center',gap:'0.5rem',flexWrap:'wrap' as const,justifyContent:'flex-end'}}>
                        <input value={slugDraft} autoFocus autoCapitalize='none' autoCorrect='off' spellCheck={false} onChange={e=>{setSlugDraft(toSlug(e.target.value));setSlugMsg(null);}} onKeyDown={e=>e.key==='Enter'&&saveSlug()} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(64,232,255,0.4)',color:'#eaf2ff',padding:'0.35rem 0.5rem',fontSize:'0.85rem',outline:'none',width:'170px'}}/>
                        <button onClick={saveSlug} disabled={slugBusy||slugCheckDraft.s!=='ok'} style={{background:'rgba(64,232,255,0.12)',border:'1px solid rgba(64,232,255,0.5)',color:'#40e8ff',padding:'0.35rem 0.8rem',fontSize:'0.7rem',fontWeight:700,cursor:slugCheckDraft.s==='ok'?'pointer':'not-allowed',opacity:slugCheckDraft.s==='ok'&&!slugBusy?1:0.45}}>{slugBusy?'...':tr('Enregistrer')}</button>
                        <button onClick={()=>{setSlugEditing(false);setSlugMsg(null);}} style={{background:'transparent',border:'none',color:'#7a8898',fontSize:'0.7rem',cursor:'pointer',textDecoration:'underline'}}>{tr('Annuler')}</button>
                      </span>
                    ):(
                      <span style={{display:'flex',alignItems:'center',gap:'0.9rem'}}><span style={valStyle}>{currentUser.sorareSlug||'—'}</span><span onClick={startSlugEdit} style={{color:'#40e8ff',cursor:'pointer',fontSize:'0.72rem',textDecoration:'underline'}}>{tr('Modifier')}</span></span>
                    )}
                  </div>
                  {slugEditing&&<SlugHint st={slugCheckDraft}/>}
                  {slugMsg&&<p style={{margin:'0.4rem 0 0.2rem',fontSize:'0.72rem',color:slugMsg.ok?'#7ee0a0':'#ff8a7a'}}>{slugMsg.text}</p>}
                  {(()=>{
                    const sorare=(currentUser.accounts||[]).find(a=>a.platform==='sorare');
                    const conns=currentUser.connections||[];
                    const lnk:React.CSSProperties={color:'#40e8ff',cursor:'pointer',fontSize:'0.72rem',textDecoration:'underline',background:'none',border:'none',padding:0};
                    const nets:{id:string;label:string}[]=[{id:'discord',label:'Discord'},{id:'facebook',label:'Facebook'}].filter(n=>providersOn[n.id]||conns.includes(n.id));
                    const saveX=async()=>{ setXMsg(null); const r=await fetch('/api/auth/profile-link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({network:'x',handle:xDraft})}); const d=await r.json().catch(()=>({})); if(r.ok&&d.ok){ setCurrentUser(u=>u?{...u,profiles:{...(u.profiles||{}),x:d.handle||undefined}}:u); setXEditing(false); } else setXMsg(d.error==='handle_invalide'?tr('Pseudo X invalide (lettres, chiffres et _ , 15 max).'):tr('Impossible d’enregistrer, réessaie dans un instant.')); };
                    const unlink=async(id:string)=>{ setUnlinkMsg(null); const r=await fetch('/api/auth/oauth/unlink',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider:id})}); const d=await r.json().catch(()=>({})); if(r.ok){ setCurrentUser(u=>u?{...u,connections:(u.connections||[]).filter(c=>c!==id)}:u); } else setUnlinkMsg(d.error==='dernier_acces'?tr('Impossible : ce serait ton dernier moyen de te connecter.'):tr('Impossible de délier, réessaie.')); };
                    return (<div style={{marginTop:'1.4rem'}}>
                      <p style={{margin:'0 0 0.6rem',fontSize:'0.72rem',fontWeight:800,letterSpacing:'0.14em',textTransform:'uppercase' as const,color:'#eaf2ff'}}>{tr('Comptes liés')}</p>
                      <div style={rowStyle}><span style={labelStyle}>Sorare</span>
                        <span style={{display:'flex',alignItems:'center',gap:'0.9rem'}}>
                          {sorare&&<span style={valStyle}>{sorare.slug}</span>}
                          {sorare?.verified?<span style={{color:'#7ee0a0',fontSize:'0.72rem'}}>✓ {tr('Vérifié')}</span>:(providersOn.sorare?<a href='/api/auth/oauth/sorare/start?link=1' style={lnk}>{tr('Vérifier avec Sorare')}</a>:<span style={{color:'#7a8898',fontSize:'0.7rem'}}>{tr('Non vérifié')}</span>)}
                        </span></div>
                      <div style={rowStyle}><span style={labelStyle}>Google</span><span style={{fontSize:'0.72rem',color:conns.includes('google')?'#7ee0a0':'#7a8898'}}>{conns.includes('google')?'✓ '+tr('Lié'):tr('Non lié')}</span></div>
                      {nets.map(n=>(<div key={n.id} style={rowStyle}><span style={labelStyle}>{n.label}</span>
                        {conns.includes(n.id)?<span style={{display:'flex',alignItems:'center',gap:'0.9rem'}}><span style={{color:'#7ee0a0',fontSize:'0.72rem'}}>✓ {tr('Lié')}</span><button onClick={()=>unlink(n.id)} style={{...lnk,color:'#7a8898'}}>{tr('Délier')}</button></span>
                        :<a href={'/api/auth/oauth/'+n.id+'/start?link=1'} style={lnk}>{tr('Lier')}</a>}
                      </div>))}
                      <div style={rowStyle}><span style={labelStyle}>X</span>
                        {xEditing?(
                          <span style={{display:'flex',alignItems:'center',gap:'0.5rem',flexWrap:'wrap' as const,justifyContent:'flex-end'}}>
                            <input value={xDraft} autoFocus autoCapitalize='none' autoCorrect='off' spellCheck={false} placeholder='@pseudo' onChange={e=>{setXDraft(e.target.value);setXMsg(null);}} onKeyDown={e=>e.key==='Enter'&&saveX()} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(64,232,255,0.4)',color:'#eaf2ff',padding:'0.35rem 0.5rem',fontSize:'0.85rem',outline:'none',width:'150px'}}/>
                            <button onClick={saveX} style={{background:'rgba(64,232,255,0.12)',border:'1px solid rgba(64,232,255,0.5)',color:'#40e8ff',padding:'0.35rem 0.8rem',fontSize:'0.7rem',fontWeight:700,cursor:'pointer'}}>{tr('Enregistrer')}</button>
                            <button onClick={()=>{setXEditing(false);setXMsg(null);}} style={{background:'transparent',border:'none',color:'#7a8898',fontSize:'0.7rem',cursor:'pointer',textDecoration:'underline'}}>{tr('Annuler')}</button>
                          </span>
                        ):(
                          <span style={{display:'flex',alignItems:'center',gap:'0.9rem'}}>
                            {currentUser.profiles?.x&&<a href={'https://x.com/'+currentUser.profiles.x} target='_blank' rel='noopener noreferrer' style={{...valStyle,textDecoration:'none'}}>@{currentUser.profiles.x}</a>}
                            <button onClick={()=>{setXDraft(currentUser.profiles?.x?'@'+currentUser.profiles.x:'');setXMsg(null);setXEditing(true);}} style={lnk}>{currentUser.profiles?.x?tr('Modifier'):tr('Ajouter mon profil')}</button>
                          </span>
                        )}
                      </div>
                      {xMsg&&<p style={{margin:'0 0 0.4rem',fontSize:'0.72rem',color:'#ff8a7a'}}>{xMsg}</p>}
                      {unlinkMsg&&<p style={{margin:'0 0 0.4rem',fontSize:'0.72rem',color:'#ff8a7a'}}>{unlinkMsg}</p>}
                      <p style={{margin:'0.2rem 0 0',fontSize:'0.68rem',lineHeight:1.5,color:'#7a8898'}}>{tr('Un compte lié peut aussi servir à te connecter.')}</p>
                    </div>);
                  })()}
                  <div style={{marginTop:'1.2rem'}}><ChangePassword/></div>
                  <p style={{fontSize:'0.72rem',color:'#7a8898',marginTop:'1rem',lineHeight:1.6}}>{tr('Le pseudo peut être modifié une fois tous les 3 mois. Pour l’adresse e-mail, un lien de confirmation est envoyé à la nouvelle adresse.')}</p>
                </div>
              ):(
                <div style={{textAlign:'center',padding:'2.5rem 1rem'}}>
                  <p style={{color:'#cfe4fb',fontSize:'0.95rem',marginBottom:'1.4rem'}}>{tr('Tu n\'es pas connecté à un compte myNFTlocker.')}</p>
                  <button onClick={()=>{setAcctMenuSection(null);setAuthMode('login');setAuthOpen(true);}} style={{background:'rgba(64,232,255,0.12)',border:'1px solid rgba(64,232,255,0.5)',color:'#40e8ff',padding:'0.6rem 2rem',fontSize:'0.78rem',fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',cursor:'pointer',borderRadius:'3px'}}>{tr('Se connecter')}</button>
                </div>
              ))}
              {acctMenuSection!=='infos'&&(<AccountSection section={acctMenuSection} user={currentUser} onLogin={()=>{setAcctMenuSection(null);setAuthMode('login');setAuthOpen(true);}} onDeleted={()=>{setCurrentUser(null);setAcctOpen(false);setAcctMenuSection(null);}}/>)}
            </div>
          </div>
          );
        })()}
        {openPhase<3&&!showFlash&&(
          <div style={{position:'fixed',inset:0,zIndex:100,display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'safe center',overflow:'auto'}} className='thin-sb'>
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
            <div style={{position:'relative',zIndex:1,marginBottom:openPhase===0?'1.6rem':'1.5rem'}}
              onMouseEnter={e=>{if(openPhase!==0)return;const img=e.currentTarget.querySelector('img');if(img)(img as HTMLElement).style.animation='packHover 2s ease-in-out infinite';}}
              onMouseLeave={e=>{if(openPhase!==0)return;const img=e.currentTarget.querySelector('img');if(img)(img as HTMLElement).style.animation='packFloat 3.8s ease-in-out infinite';}}>
              <div
                onClick={()=>{if(openPhase===0||openPhase===1)setLogoFlipped(f=>!f);}}
                style={{
                  width:'min(320px,38.4vh)',height:'min(428px,51.4vh)',position:'relative',
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
                <p style={{color:'#40e8ff',letterSpacing:'0.22em',textTransform:'uppercase',fontSize:'0.62rem',marginBottom:'1rem',fontFamily:'Courier New,monospace',textShadow:'0 0 12px rgba(0,255,255,0.45)',minHeight:'1.1em'}}>{typedIntro}<span style={{opacity:typedIntro.length<INTRO_TEXT.length?1:0,animation:'cyanPulse 0.8s ease-in-out infinite'}}>|</span></p>
                <input className='intro-input' value={slug} autoCapitalize='none' autoCorrect='off' spellCheck={false} onChange={e=>setSlug(toSlug(e.target.value))} onKeyDown={e=>e.key==='Enter'&&handleIntroClick()} placeholder={tr('ton-slug-sorare')} style={{background:'transparent',border:'none',borderBottom:'1px solid rgba(64,232,255,0.42)',color:'#40e8ff',fontSize:'0.9rem',padding:'0.3rem 0.3rem',width:'230px',maxWidth:'78vw',textAlign:'center',fontFamily:'Courier New,monospace',letterSpacing:'0.07em',marginBottom:'1rem',transition:'border-color 0.2s,box-shadow 0.2s',caretColor:'#40e8ff',animation:'introInputGlow 2.5s ease-in-out 1.5s infinite'}}/>
                <button className='intro-btn' onClick={handleIntroClick} disabled={!slug||loading} style={{background:'transparent',border:'1px solid rgba(64,232,255,0.45)',color:'#40e8ff',padding:'0.5rem 2.2rem',fontSize:'0.7rem',fontWeight:700,letterSpacing:'0.22em',textTransform:'uppercase',cursor:slug&&!loading?'pointer':'not-allowed',fontFamily:'Courier New,monospace',clipPath:'polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)',transition:'all 0.2s',opacity:slug&&!loading?1:0.35}}>{loading?'CHARGEMENT...':tr('▶ OUVRIR')}</button>
                {error&&<p style={{color:'#fca5a5',fontSize:'0.7rem',marginTop:'1rem',fontFamily:'Courier New,monospace'}}>{error}</p>}
                {!currentUser&&(
                  <>
                    <span onClick={()=>{if(loading)return;setSlug('memejacquet1998');setJustLoggedIn(true);}} style={{marginTop:'1.1rem',color:'#f5d76e',cursor:loading?'default':'pointer',fontFamily:'Courier New,monospace',fontSize:'0.62rem',letterSpacing:'0.16em',textTransform:'uppercase',textShadow:'0 0 10px rgba(245,215,110,0.35)'}}>{'▶ '+tr('Voir une démo')}</span>
                    <div style={{display:'flex',alignItems:'center',gap:'0.8rem',marginTop:'0.9rem',fontFamily:'Courier New,monospace',fontSize:'0.6rem',letterSpacing:'0.14em'}}>
                      <span onClick={()=>{setAuthMode('login');setAuthOpen(true);}} style={{color:'#40e8ff',cursor:'pointer',textTransform:'uppercase',borderBottom:'1px solid rgba(64,232,255,0.45)',paddingBottom:'1px'}}>{tr('Connexion')}</span>
                      <span style={{color:'rgba(207,228,251,0.25)'}}>|</span>
                      {SIGNUP_OPEN?(<span onClick={()=>{setAuthMode('signup');setAuthSlugField(slug||'');setAuthOpen(true);}} style={{color:'rgba(64,232,255,0.7)',cursor:'pointer',textTransform:'uppercase',borderBottom:'1px solid rgba(64,232,255,0.3)',paddingBottom:'1px'}}>{tr('Créer un compte')}</span>):(<span style={{color:'rgba(207,228,251,0.4)'}}>{tr('Inscriptions bientôt ouvertes')}</span>)}
                    </div>
                  </>
                )}
              </div>
            )}
            {openPhase>=1&&(
              <div style={{position:'relative',zIndex:2,marginTop:'1rem',textAlign:'center'}}>
                {openPhase===1&&<p style={{color:'rgba(0,255,255,0.65)',fontFamily:'Courier New,monospace',letterSpacing:'0.25em',fontSize:'0.68rem',animation:'cyanPulse 0.8s ease-in-out infinite'}}>{loading?(loadedCount>0?tr('CHARGEMENT')+' · '+loadedCount+' '+tr('CARTES'):tr('INITIALISATION...')):tr('SCAN EN COURS...')}</p>}
                {openPhase===2&&<p style={{color:'rgba(0,225,255,0.65)',fontFamily:'Courier New,monospace',letterSpacing:'0.22em',fontSize:'0.68rem',animation:'cyanPulse 0.4s ease-in-out infinite'}}>{loading?(loadedCount>0?tr('CHARGEMENT')+' · '+loadedCount+' '+tr('CARTES'):tr('SCAN EN COURS...')):tr('DONNÉES CHARGÉES')}</p>}
              </div>
            )}
            <div style={{position:'fixed',bottom:'1rem',left:'50%',transform:'translateX(-50%)',zIndex:2,display:'flex',gap:'2.5rem',alignItems:'center'}}><a href='https://sorare.com' target='_blank' rel='noreferrer' style={{color:'rgba(255,255,255,0.5)',fontSize:'0.6rem',letterSpacing:'0.14em',textTransform:'uppercase',textDecoration:'none',fontFamily:'Courier New,monospace',transition:'color 0.2s',pointerEvents:'auto'}} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color='rgba(64,232,255,0.95)';}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.5)';}}>SORARE</a><span style={{color:'rgba(255,255,255,0.28)',fontSize:'0.5rem'}}>|</span><a href='/cgu' target='_blank' rel='noopener noreferrer' style={{color:'rgba(255,255,255,0.5)',fontSize:'0.6rem',letterSpacing:'0.14em',textTransform:'uppercase',textDecoration:'none',fontFamily:'Courier New,monospace',pointerEvents:'auto',transition:'color 0.2s'}} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color='rgba(64,232,255,0.95)';}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.5)';}}>{tr('CGU')}</a><span style={{color:'rgba(255,255,255,0.28)',fontSize:'0.5rem'}}>|</span><LangSwitch/></div>
          </div>
        )}
        {emailNotice&&(
          <div onClick={()=>setEmailNotice(null)} style={{position:'fixed',top:'1rem',left:'50%',transform:'translateX(-50%)',zIndex:400,maxWidth:'90vw',padding:'0.7rem 1.2rem',background:'rgba(4,10,22,0.94)',border:'1px solid '+(emailNotice.ok?'rgba(126,224,160,0.6)':'rgba(255,138,122,0.6)'),borderRadius:'0.4rem',color:emailNotice.ok?'#7ee0a0':'#ff8a7a',fontSize:'0.78rem',cursor:'pointer',boxShadow:'0 6px 24px rgba(0,0,0,0.5)'}}>{tr(emailNotice.text)}</div>
        )}
        {needSlug&&!slugProblem&&cards.length===0&&!loading&&(
          <div style={{position:'fixed',inset:0,zIndex:150,display:'flex',alignItems:'center',justifyContent:'center',padding:'2rem 1.2rem',boxSizing:'border-box' as const,overflow:'auto'}}>
            <StarCanvas phase={0} burst={false}/>
            <div style={{position:'relative',zIndex:1,width:'100%',maxWidth:'440px',textAlign:'center' as const,padding:'2rem 1.6rem',background:'rgba(4,10,22,0.72)',backdropFilter:'blur(6px)',border:'1px solid rgba(64,232,255,0.35)',borderRadius:'0.5rem'}}>
              <p style={{margin:'0 0 0.8rem',fontSize:'0.85rem',fontWeight:800,letterSpacing:'0.14em',textTransform:'uppercase' as const,color:'#40e8ff'}}>{tr('Bienvenue sur myNFTlocker !')}</p>
              <p style={{margin:'0 0 1.1rem',fontSize:'0.8rem',lineHeight:1.6,color:'#cfe4fb'}}>{tr('Dernière étape : choisis ton pseudo et indique ton slug Sorare (ton pseudo Sorare, en minuscules). Ta galerie s’ouvre aussitôt.')}</p>
              <input value={setupPseudo} maxLength={30} onChange={e=>{setSetupPseudo(e.target.value);setSlugMsg(null);}} placeholder={tr('Ton pseudo sur myNFTlocker')} style={{width:'100%',boxSizing:'border-box' as const,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(64,232,255,0.4)',color:'#eaf2ff',padding:'0.55rem 0.7rem',fontSize:'0.9rem',outline:'none',marginBottom:'0.6rem',textAlign:'center' as const}}/>
              <input value={slugDraft} autoFocus autoCapitalize='none' autoCorrect='off' spellCheck={false} onChange={e=>{setSlugDraft(toSlug(e.target.value));setSlugMsg(null);}} onKeyDown={e=>e.key==='Enter'&&saveSlug()} placeholder={tr('ton-slug-sorare')} style={{width:'100%',boxSizing:'border-box' as const,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(64,232,255,0.4)',color:'#eaf2ff',padding:'0.55rem 0.7rem',fontSize:'0.9rem',outline:'none',marginBottom:'0.6rem',textAlign:'center' as const}}/>
              <SlugHint st={slugCheckDraft}/>
              {slugMsg&&<p style={{margin:'0 0 0.6rem',fontSize:'0.7rem',color:slugMsg.ok?'#7ee0a0':'#ff8a7a'}}>{slugMsg.text}</p>}
              <button onClick={saveSlug} disabled={slugBusy||slugCheckDraft.s!=='ok'||setupPseudo.trim().length<2} style={{background:'rgba(64,232,255,0.12)',border:'1px solid rgba(64,232,255,0.5)',color:'#40e8ff',padding:'0.6rem 1.6rem',fontSize:'0.74rem',fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase' as const,cursor:slugCheckDraft.s==='ok'&&setupPseudo.trim().length>=2?'pointer':'not-allowed',opacity:slugCheckDraft.s==='ok'&&setupPseudo.trim().length>=2&&!slugBusy?1:0.45}}>{slugBusy?'...':tr('Valider et ouvrir')}</button>
              <p style={{margin:'0.9rem 0 0',fontSize:'0.66rem',color:'rgba(207,228,251,0.6)'}}><a href='https://sorare.com/fr/settings/account' target='_blank' rel='noopener noreferrer' style={{color:'#40e8ff'}}>{tr('Retrouve-le sur Sorare')}</a> · <span onClick={()=>setNeedSlug(false)} style={{cursor:'pointer',textDecoration:'underline'}}>{tr('Plus tard')}</span></p>
            </div>
          </div>
        )}
        {slugProblem&&cards.length===0&&!loading&&(
          <div className='mnfl-slugfix mnfl-offset' style={{position:'fixed',top:0,right:0,bottom:0,left:'220px',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:'2rem 1.2rem',boxSizing:'border-box' as const,clipPath:'inset(0)',overflow:'auto'}}>
            <style>{`@media(max-width:768px){.mnfl-slugfix{left:0!important;bottom:60px!important}}`}</style>
            <StarCanvas phase={0} burst={false}/>
            <div style={{position:'relative',zIndex:1,width:'100%',maxWidth:'440px',textAlign:'center' as const,padding:'2rem 1.6rem',background:'rgba(4,10,22,0.72)',backdropFilter:'blur(6px)',border:'1px solid rgba(245,215,110,0.35)',borderRadius:'0.5rem'}}>
              <p style={{margin:'0 0 0.8rem',fontSize:'0.85rem',fontWeight:800,letterSpacing:'0.14em',textTransform:'uppercase' as const,color:'#f5d76e'}}>{tr('Oups, on ne trouve pas ton vestiaire')}</p>
              <p style={{margin:'0 0 0.5rem',fontSize:'0.8rem',lineHeight:1.6,color:'#cfe4fb'}}>{tr('Tu as dû te tromper dans ton slug Sorare')} <b style={{color:'#40e8ff'}}>« {slugProblem} »</b>. {tr('Rien de grave : vérifie-le et corrige-le en un clic, ta galerie s’ouvrira aussitôt.')}</p>
              <button onClick={()=>{startSlugEdit();setAcctMenuSection('infos');}} style={{margin:'1rem 0 0.9rem',background:'rgba(64,232,255,0.12)',border:'1px solid rgba(64,232,255,0.5)',color:'#40e8ff',padding:'0.6rem 1.6rem',fontSize:'0.74rem',fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase' as const,cursor:'pointer'}}>{tr('Vérifier et modifier mon slug')}</button>
              <p style={{margin:0,fontSize:'0.68rem',lineHeight:1.6,color:'rgba(207,228,251,0.6)'}}>{tr('Tu ne sais plus ton slug ?')} <a href='https://sorare.com' target='_blank' rel='noopener noreferrer' style={{color:'#40e8ff'}}>{tr('Retrouve-le sur Sorare')}</a> {tr('(c’est ton pseudo, dans l’adresse de ton profil).')}</p>
            </div>
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
    
      {(mode==='gallery'||galleryWarm)&&(
            <div style={{...galleryBg,minHeight:'100vh',display:mode==='gallery'?'block':'none'}}>
              <GalleryView cards={filteredGallery} badgeSort={mode==='gallery'?gSort:undefined} gameplay={gameplay}/>
            </div>
          )}
          </div>
        )}
      {authOpen&&(
        <div style={{position:'fixed',inset:0,zIndex:99999,display:'flex',alignItems:'center',justifyContent:'center',background:authClosing?'transparent':'rgba(0,0,0,0.6)',backdropFilter:authClosing?'none':'blur(4px)',transition:'background 0.3s'}} onClick={()=>!authClosing&&startAuthClose()}>
          <div onClick={e=>e.stopPropagation()} style={{width:'320px',maxWidth:'88vw',background:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(64,232,255,0.03) 2px,rgba(64,232,255,0.03) 3px),linear-gradient(rgba(2,10,22,0.97),rgba(2,10,22,0.97))',border:'1px solid rgba(64,232,255,0.5)',boxShadow:'0 0 40px rgba(64,232,255,0.15),inset 0 0 60px rgba(0,0,0,0.5)',clipPath:authClosing?'none':'polygon(14px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px)',padding:'1.3rem 1.2rem',fontFamily:'Courier New,Consolas,monospace',animation:authClosing?'mnflClose 0.45s cubic-bezier(0.7,0,0.95,1) both':'mnflDeploy 0.55s ease-out backwards',backdropFilter:authClosing?'none':'blur(12px)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
              <span style={{color:'#40e8ff',fontSize:'0.85rem',fontWeight:700,letterSpacing:'0.1em'}}>{authMode==='signup'?tr('CRÉER UN COMPTE'):tr('SE CONNECTER')}</span>
              <button onClick={startAuthClose} style={{background:'transparent',border:'1px solid rgba(64,232,255,0.35)',borderRadius:'50%',width:'20px',height:'20px',color:'#40e8ff',cursor:'pointer',fontSize:'0.55rem'}}>✕</button>
            </div>
            {authMode==='signup'&&(<div style={{margin:'0 0 0.9rem',padding:'0.6rem 0.7rem',border:'1px solid rgba(245,215,110,0.35)',borderRadius:'0.3rem',background:'rgba(245,215,110,0.06)'}}>
              <p style={{margin:'0 0 0.35rem',fontSize:'0.66rem',fontWeight:800,letterSpacing:'0.1em',textTransform:'uppercase',color:'#f5d76e'}}>{tr('Pourquoi créer un compte ?')}</p>
              {['Ton Hall of Fame et ton 5 majeur gardés en mémoire','Ton équipe par défaut : le vestiaire s’ouvre où tu veux','Tes managers favoris : leurs galeries en un clic','Tes réglages (Arcade, Gameplay) retrouvés sur tous tes appareils'].map(x=>(<p key={x} style={{margin:'0 0 0.2rem',fontSize:'0.66rem',lineHeight:1.45,color:'#cfe4fb'}}><span style={{color:'#40e8ff'}}>✓ </span>{tr(x)}</p>))}
            </div>)}
            <form onSubmit={e=>{e.preventDefault();submitAuth();}}>
            {authMode==='signup'&&<input value={authPseudo} name='nickname' autoComplete='nickname' onChange={e=>setAuthPseudo(e.target.value)} placeholder={tr('Pseudo')} style={{width:'100%',boxSizing:'border-box' as const,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(64,232,255,0.3)',color:'#cfe4fb',padding:'0.5rem 0.6rem',fontSize:'0.8rem',marginBottom:'0.6rem',fontFamily:'Courier New,monospace',outline:'none'}}/>}
            {authMode==='signup'&&<input value={authSlugField} autoComplete='off' autoCapitalize='none' autoCorrect='off' spellCheck={false} onChange={e=>setAuthSlugField(toSlug(e.target.value))} placeholder={tr('Slug Sorare (ex: pseudo-email-com)')} style={{width:'100%',boxSizing:'border-box' as const,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(64,232,255,0.3)',color:'#cfe4fb',padding:'0.5rem 0.6rem',fontSize:'0.8rem',marginBottom:'0.6rem',fontFamily:'Courier New,monospace',outline:'none'}}/>}
            {authMode==='signup'&&<SlugHint st={slugCheckSignup}/>}
            <input value={authEmail} name='email' autoComplete='username' onChange={e=>setAuthEmail(e.target.value)} placeholder='Email' type='email' style={{width:'100%',boxSizing:'border-box' as const,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(64,232,255,0.3)',color:'#cfe4fb',padding:'0.5rem 0.6rem',fontSize:'0.8rem',marginBottom:'0.6rem',fontFamily:'Courier New,monospace',outline:'none'}}/>
            <div style={{position:'relative',marginBottom:authMode==='signup'?'0.3rem':'0.8rem'}}>
              <input value={authPassword} name='password' autoComplete={authMode==='signup'?'new-password':'current-password'} onChange={e=>setAuthPassword(e.target.value)} placeholder={tr('Mot de passe')} type={authShowPassword?'text':'password'} style={{width:'100%',boxSizing:'border-box' as const,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(64,232,255,0.3)',color:'#cfe4fb',padding:'0.5rem 2rem 0.5rem 0.6rem',fontSize:'0.8rem',fontFamily:'Courier New,monospace',outline:'none'}}/>
              <span
                onMouseDown={()=>setAuthShowPassword(true)}
                onMouseUp={()=>setAuthShowPassword(false)}
                onMouseLeave={()=>setAuthShowPassword(false)}
                onTouchStart={()=>setAuthShowPassword(true)}
                onTouchEnd={()=>setAuthShowPassword(false)}
                style={{position:'absolute',right:'0.6rem',top:'50%',transform:'translateY(-50%)',cursor:'pointer',fontSize:'1.15rem',color:'rgba(64,232,255,0.85)',userSelect:'none' as const}}>👁</span>
            </div>
            {authMode==='signup'&&<input value={authPasswordConfirm} name='confirm-password' autoComplete='new-password' onChange={e=>setAuthPasswordConfirm(e.target.value)} placeholder={tr('Confirmer le mot de passe')} type={authShowPassword?'text':'password'} style={{width:'100%',boxSizing:'border-box' as const,background:'rgba(255,255,255,0.05)',border:'1px solid '+(authPasswordConfirm&&authPassword!==authPasswordConfirm?'rgba(252,165,165,0.6)':'rgba(64,232,255,0.3)'),color:'#cfe4fb',padding:'0.5rem 0.6rem',fontSize:'0.8rem',marginBottom:'0.3rem',fontFamily:'Courier New,monospace',outline:'none'}}/>}
            {authMode==='signup'&&<p style={{fontSize:'0.58rem',color:'rgba(207,228,251,0.45)',marginBottom:'0.7rem',lineHeight:1.4}}>{tr('10 caractères minimum, avec au moins une lettre et un chiffre.')}</p>}
            {authError&&<p style={{color:'#fca5a5',fontSize:'0.66rem',marginBottom:'0.6rem'}}>{tr(authError)}</p>}
            {authVerifyPending&&<p style={{color:'#7dd3fc',fontSize:'0.68rem',marginBottom:'0.7rem',lineHeight:1.5}}>{tr('Compte créé ! Vérifie ta boîte mail (et les spams) pour confirmer ton adresse avant de te connecter.')}</p>}
            <button type='submit' disabled={authLoading||authVerifyPending||(authMode==='signup'&&(slugCheckSignup.s==='missing'||slugCheckSignup.s==='checking'))} style={{width:'100%',background:'rgba(64,232,255,0.12)',border:'1px solid rgba(64,232,255,0.5)',color:'#40e8ff',padding:'0.55rem',fontSize:'0.72rem',fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',cursor:authLoading?'not-allowed':'pointer',fontFamily:'Courier New,monospace',opacity:authLoading?0.5:1}}>{authLoading?'...':(authMode==='signup'?tr("S'inscrire"):tr('Se connecter'))}</button>
            </form>
            {(SIGNUP_OPEN||authMode==='login')&&(<>
              <div style={{display:'flex',alignItems:'center',gap:'0.6rem',margin:'0.9rem 0 0.7rem',color:'rgba(207,228,251,0.4)',fontSize:'0.6rem'}}><span style={{flex:1,height:'1px',background:'rgba(255,255,255,0.12)'}}/>{tr('ou')}<span style={{flex:1,height:'1px',background:'rgba(255,255,255,0.12)'}}/></div>
              <a href='/api/auth/google/start' style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'0.6rem',width:'100%',boxSizing:'border-box' as const,background:'#fff',color:'#1f1f1f',padding:'0.55rem',fontSize:'0.74rem',fontWeight:600,textDecoration:'none',borderRadius:'0.2rem'}}>
                <svg width='16' height='16' viewBox='0 0 48 48'><path fill='#EA4335' d='M24 9.5c3.5 0 6.6 1.2 9.1 3.5l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z'/><path fill='#4285F4' d='M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z'/><path fill='#FBBC05' d='M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.200.8-4.700l-7.900-6.100C.9 16.400 0 20.100 0 24s.9 7.600 2.600 10.800l7.900-6.100z'/><path fill='#34A853' d='M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.700-6c-2.200 1.500-4.900 2.300-8.200 2.300-6.300 0-11.600-4.100-13.500-9.800l-7.900 6.100C6.500 42.600 14.600 48 24 48z'/></svg>
                {tr('Continuer avec Google')}
              </a>
              {authMode==='login'&&Object.keys(providersOn).some(k=>providersOn[k])&&(
                <p style={{margin:'0.7rem 0 0',fontSize:'0.66rem',textAlign:'center' as const,color:'rgba(207,228,251,0.55)',lineHeight:1.9}}>{tr('Compte déjà lié :')} {[['sorare','Sorare'],['discord','Discord'],['x','X'],['facebook','Facebook']].filter(([k])=>providersOn[k]).map(([k,l],i)=>(<span key={k}>{i>0?' · ':' '}<a href={'/api/auth/oauth/'+k+'/start'} style={{color:'#40e8ff',textDecoration:'underline'}}>{l}</a></span>))}</p>
              )}
            </>)}
            {(SIGNUP_OPEN||authMode==='signup')&&(
            <p style={{textAlign:'center',marginTop:'0.8rem',fontSize:'0.66rem',color:'rgba(207,228,251,0.6)'}}>
              {authMode==='signup'?tr('Déjà un compte ? '):tr('Pas encore de compte ? ')}
              <span onClick={()=>{setAuthMode(authMode==='signup'?'login':'signup');setAuthError('');}} style={{color:'#40e8ff',cursor:'pointer',textDecoration:'underline'}}>{authMode==='signup'?tr('Se connecter'):tr("S'inscrire")}</span>
            </p>
            )}
          </div>
        </div>
      )}
      {showFlash&&(<div style={{position:'fixed',inset:0,zIndex:999,background:'radial-gradient(ellipse at center,rgba(255,255,255,1) 0%,rgba(64,232,255,0.7) 40%,rgba(5,10,20,0.95) 100%)',animation:'introFlash 0.8s ease-in-out forwards',pointerEvents:'none'}}/>)}
      </div>

      {/* ===== BARRE NAV MOBILE (visible <768px) ===== */}
      <nav className='mnfl-bottombar' style={{position:'fixed',left:0,right:0,bottom:0,height:'62px',display:'none',alignItems:'stretch',justifyContent:'space-around',background:'rgba(8,11,16,0.92)',backdropFilter:'blur(14px)',WebkitBackdropFilter:'blur(14px)',borderTop:'1px solid rgba(64,232,255,0.28)',boxShadow:'0 -6px 20px -6px rgba(64,232,255,0.25)',zIndex:60}}>
        <button onClick={()=>{setMode('locker');setFiltersOpen(false);setAcctMenuSection(null);}} style={{flex:1,background:'transparent',border:'none',display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'center',gap:'3px',cursor:'pointer',color:mode==='locker'?'#40e8ff':'#7a8898'}}>
          <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><rect x='4' y='3' width='16' height='18' rx='1'/><line x1='12' y1='3' x2='12' y2='21'/><circle cx='9' cy='12' r='0.6' fill='currentColor'/><circle cx='15' cy='12' r='0.6' fill='currentColor'/></svg>
          <span style={{fontSize:'0.6rem',fontWeight:700,letterSpacing:'0.04em'}}>{tr('Vestiaire')}</span>
        </button>
        <button onClick={()=>{setMode('gallery');setFiltersOpen(false);setAcctMenuSection(null);}} style={{flex:1,background:'transparent',border:'none',display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'center',gap:'3px',cursor:'pointer',color:mode==='gallery'?'#40e8ff':'#7a8898'}}>
          <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><rect x='3' y='3' width='7' height='7' rx='1'/><rect x='14' y='3' width='7' height='7' rx='1'/><rect x='3' y='14' width='7' height='7' rx='1'/><rect x='14' y='14' width='7' height='7' rx='1'/></svg>
          <span style={{fontSize:'0.6rem',fontWeight:700,letterSpacing:'0.04em'}}>{tr('Galerie')}</span>
        </button>
        <button onClick={()=>setFiltersOpen(o=>!o)} style={{flex:1,background:'transparent',border:'none',display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'center',gap:'3px',cursor:'pointer',color:filtersOpen?'#40e8ff':'#7a8898'}}>
          <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><polygon points='3 4 21 4 14 12.5 14 19 10 21 10 12.5 3 4'/></svg>
          <span style={{fontSize:'0.6rem',fontWeight:700,letterSpacing:'0.04em'}}>{tr('Filtres')}</span>
        </button>
      </nav>

      {/* ===== PANNEAU FILTRES MOBILE (placeholder Etape 2, rempli Etape 3) ===== */}
      {filtersOpen&&(
        <div className='mnfl-filters-sheet' style={{position:'fixed',left:0,right:0,bottom:'62px',top:0,background:'rgba(5,7,11,0.97)',backdropFilter:'blur(10px)',zIndex:59,display:'none',flexDirection:'column' as const,padding:'0.6rem 1rem 0.6rem',overflowY:'auto'}}>
          <div style={{textAlign:'right'}}><LangSwitch/></div>
          {/* LOGO+COMPTE MOBILE : identique au sidebar desktop, absent sur mobile jusqu'ici */}
          <div style={{display:'flex',flexDirection:'column' as const,gap:'0.15rem',marginBottom:'0.35rem'}}>
            {/* LOGO+COMPTE FUSIONNES sur une seule ligne (gain de hauteur + logo plus visible) */}
            <div style={{display:'flex',alignItems:'center',gap:'0.6rem'}}>
              <img src='/logo-pack.png' alt='myNFTlocker' title={tr('Retour à l\'accueil')} onClick={()=>{setOpenPhase(0);setCards([]);setSlug('');setError('');setFlippedSlug(null);setMode('locker');setFiltersOpen(false);setAcctOpen(false);setSlugPanelOpen(false);setAcctMenuSection(null);}} style={{height:'62px',width:'auto',flexShrink:0,cursor:'pointer',filter:'drop-shadow(0 6px 18px rgba(0,0,0,0.6))'}} onError={(e)=>{(e.target as HTMLImageElement).style.display='none';}}/>
              <div onClick={()=>setAcctOpen(o=>!o)} style={{flex:1,minWidth:0,display:'flex',alignItems:'center',gap:'0.5rem',padding:'0.4rem 0.5rem',borderRadius:'0.3rem',cursor:'pointer',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(111,195,232,0.18)'}}>
              <div style={{width:'44px',height:'44px',flexShrink:0,borderRadius:'50%',background:'radial-gradient(circle at 35% 30%,#1a1c24,#0a0b0f)',border:'1.5px solid #6fc3e8',boxShadow:'0 0 10px rgba(111,195,232,0.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.1rem',fontWeight:900,color:'#6fc3e8'}}>{(slug||'?').trim().charAt(0).toUpperCase()||'?'}</div>
              <div style={{flex:1,minWidth:0,textAlign:'left'}}>
                <p style={{margin:0,fontSize:'0.8rem',fontWeight:700,color:'#eaf2ff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{cards.length>0&&slug?((currentUser?.sorareSlug&&currentUser.pseudo&&slug.toLowerCase()===currentUser.sorareSlug.toLowerCase())?currentUser.pseudo:slug):tr('Mon compte')}</p>
                <p style={{margin:0,fontSize:'0.62rem',color:'#7a8898'}}>{cards.length>0?(cards.length+' '+tr('cartes')):'Identifiant Sorare'}</p>
              </div>
              {/* BADGE REPOSITIONNE : plus grand, sans cercle, juste avant le chevron */}
              {cards.length>0&&(()=>{const b=collectionBadge(cards.length);return(<img title={cards.length+' '+tr('cartes')} src={'/'+b.img} alt='' style={{width:'46px',height:'46px',flexShrink:0,objectFit:'contain'}} onError={(e)=>{(e.target as HTMLImageElement).style.display='none';}}/>);})()}
              <span onClick={e=>{e.stopPropagation();setSlugPanelOpen(o=>!o);}} title={tr('Changer de galerie consultée')} style={{fontSize:'1.5rem',lineHeight:1,color:slugPanelOpen?'#f5d76e':'#6fc3e8',opacity:0.95,padding:'0.35rem 0.5rem',borderRadius:'0.35rem',border:'1px solid rgba(111,195,232,0.35)',background:'rgba(111,195,232,0.06)',cursor:'pointer',flexShrink:0}}>⇄</span>
              <span style={{fontSize:'1.1rem',color:'#6fc3e8',opacity:0.9,flexShrink:0,padding:'0.2rem'}}>{acctOpen?'▲':'▼'}</span>
              </div>
            </div>
            {favMenu}
            {acctOpen&&(
              <div style={{background:'#0a0d12',border:'1px solid rgba(111,195,232,0.35)',borderRadius:'0.35rem',overflow:'hidden',marginTop:'0.1rem'}}>
                {[
                  {key:'infos',label:tr('Informations personnelles')},
                  {key:'auth',label:tr('Authentification')},
                  {key:'abo',label:tr('Abonnement')},
                  {key:'confidentialite',label:tr('Confidentialité & données')},
                  {key:'aide',label:tr('Aide / Contact')},
                  {key:'deconnexion',label:tr('Se déconnecter')},
                ].map(item=>(
                  <div key={item.key} onClick={()=>{if(item.key==='deconnexion'){handleLogout();setFiltersOpen(false);}else{setAcctMenuSection(item.key);setAcctOpen(false);setFiltersOpen(false);}}} style={{padding:'0.6rem 0.7rem',fontSize:'0.8rem',color:item.key==='deconnexion'?'#fca5a5':'#cfe4fb',cursor:'pointer',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>{item.label}</div>
                ))}
              </div>
            )}
            {(slugPanelOpen||cards.length===0)&&(
              <div style={{display:'flex',gap:'0.4rem',alignItems:'stretch'}}>
                <input style={{flex:1,minWidth:0,background:'rgba(255,255,255,0.05)',color:'#cfe4fb',padding:'0.5rem 0.6rem',borderRadius:'0.2rem',border:'1px solid rgba(255,255,255,0.1)',outline:'none',fontSize:'0.9rem',boxSizing:'border-box' as const}} placeholder={tr('ton-slug-sorare')} value={slug} onChange={e=>setSlug(toSlug(e.target.value))} onKeyDown={e=>e.key==='Enter'&&fetchCards()}/>
                <button onClick={()=>fetchCards()} title={tr('Valider')} disabled={!slug} style={{flexShrink:0,minWidth:'52px',background:slug?'rgba(64,232,255,0.18)':'rgba(255,255,255,0.04)',border:'1px solid rgba(64,232,255,0.55)',color:'#40e8ff',borderRadius:'0.3rem',padding:'0 0.9rem',cursor:slug?'pointer':'not-allowed',opacity:slug?1:0.5,fontSize:'1.1rem',fontWeight:800}}>▶</button>
              </div>
            )}
          </div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.4rem'}}>
            <span style={{color:'#f5d76e',fontWeight:800,fontSize:'1rem',letterSpacing:'0.05em'}}>{tr('FILTRES')}</span>
            <button onClick={()=>setFiltersOpen(false)} style={{background:'transparent',border:'1px solid rgba(64,232,255,0.4)',color:'#40e8ff',borderRadius:'0.4rem',padding:'0.3rem 0.7rem',cursor:'pointer',fontSize:'0.8rem'}}>{tr('Fermer')}</button>
          </div>
          <div style={{flex:1,overflowY:'auto'}}>
          <div style={{textAlign:'left',flex:1,minHeight:0,display:'flex',flexDirection:'column' as const,gap:0,borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:'0.3rem'}}>
            <FilterMenu title='Sport' options={[{value:'nba',label:'NBA'},{value:'foot',label:'Football'}]} current={gSport} onSelect={(v:string)=>{setGSport(v as any);setGLeague('all');setGTeamCustom('all');setFSpecial('all');setTeamApi(HOF_KEY);setLockerStart(0);setFlippedSlug(null);teamChosenRef.current=false;}}/>
            <div style={{padding:'0.2rem 0.5rem'}}>
              <p style={{fontSize:'0.64rem',fontWeight:800,letterSpacing:'0.14em',textTransform:'uppercase',color:'#eaf2ff',margin:'0 0 0.2rem'}}>{tr('Joueur')}</p>
              <input style={{width:'100%',boxSizing:'border-box',background:'rgba(255,255,255,0.05)',color:'#e8eefc',padding:'0.3rem 0.5rem',borderRadius:'0.15rem',border:'1px solid rgba(255,255,255,0.12)',outline:'none',fontSize:'0.76rem'}} name='player-filter' autoComplete='off' data-lpignore='true' data-1p-ignore='true' placeholder={tr('Rechercher...')} value={fPlayer} onChange={e=>setFPlayer(e.target.value)}/>
            </div>
            {gSport==='nba'?(
              <FilterMenu title={tr('Équipe')} options={(galleryTeamList as string[]).map((n:string)=>({value:n,label:n==='all'?'Hall of Fame':n}))} current={gTeamCustom} onSelect={(v:string)=>{setGTeamCustom(v);if(mode==='locker'){if(v==='all'){setTeamApi(HOF_KEY);teamChosenRef.current=false;}else{setTeamApi(v);teamChosenRef.current=true;}setLockerStart(0);setFlippedSlug(null);}}}/>
            ):(
              <FootTeamMenu countries={footCountries} teamsByCountry={teamsByCountry} country={gCountry} team={gTeamCustom} onPickCountry={(v:string)=>{setGCountry(v);setGTeamCustom('all');}} onPickTeam={(v:string)=>{if(v==='__HOF__'){setGTeamCustom('all');if(mode==='locker'){setTeamApi(HOF_KEY);setLockerStart(0);setFlippedSlug(null);teamChosenRef.current=false;}return;}setGTeamCustom(v);if(mode==='locker'&&v!=='all'){setTeamApi(v);setLockerStart(0);setFlippedSlug(null);teamChosenRef.current=true;}}}/>
            )}
            <FilterMenu title={tr('Saison')} options={seasonOpts} current={fSeason} onSelect={setFSeason}/>
            <FilterMenu title={tr('Rareté')} options={rarityOpts} current={fRarity} onSelect={setFRarity}/>
            <FilterMenu title={tr('Édition de la carte')} options={specialOpts} current={fSpecial} onSelect={setFSpecial}/>
            <ToggleRow title='Arcade' hint={tr('Set Arcade uniquement')} on={arcadeOnly} onToggle={toggleArcade}/>
            {arcadeOnly&&arcadeCount===0&&<p style={{fontSize:'0.62rem',color:'#f5d76e',margin:'0 0.5rem 0.3rem'}}>{tr('Aucune carte Arcade pour ce sport')}</p>}
            <ToggleRow title='Gameplay' hint={tr('Outils de composition')} on={gameplay} onToggle={toggleGameplay}/>
            {gameplay&&(<>
              <FilterMenu title={tr('Compétition')} options={compOpts} current={fComp} onSelect={setFComp}/>
              <FilterMenu title={tr('Étoiles')} options={starOpts} current={fStars} onSelect={setFStars}/>
              <FilterMenu title={tr('Disponibilité')} options={availOpts} current={fAvail} onSelect={setFAvail}/>
            </>)}
            <FilterMenu title={tr('Tri')} options={mode==='locker'?[{value:'majeur',label:'L10 Max'},{value:'manual',label:tr('Manuel')},{value:'collection',label:tr('Alphabétique')}]:[{value:'default',label:tr('Défaut')},{value:'score',label:'L10'},{value:'beat',label:'%Beat L10'},{value:'record',label:'GW Record'},{value:'stars',label:tr('Note en étoiles')},{value:'rarity',label:tr('Rareté')},...(gSport==='nba'&&gameplay?[{value:'proj',label:tr('Score prévu')},{value:'gain',label:tr('Projection vs L10')},{value:'projstar',label:tr('Proj. / ★')}]:[]),{value:'name',label:tr('Nom')}]} current={mode==='locker'?lockerSort:gSort} onSelect={(v:string)=>{if(mode==='locker'){setLockerSort(v as any);}else{setGSort(v as any);}}}/>
            {(mode==='gallery'||lockerSort==='collection')&&(
              <button onClick={()=>setGDir(d=>d==='desc'?'asc':'desc')} style={{width:'100%',boxSizing:'border-box' as const,padding:'0.3rem',marginTop:'0.45rem',background:'rgba(64,232,255,0.08)',border:'1px solid rgba(64,232,255,0.3)',borderRadius:'0.18rem',color:'#40e8ff',fontSize:'0.64rem',cursor:'pointer',letterSpacing:'0.08em',display:'flex',alignItems:'center',justifyContent:'center',gap:'0.4rem'}}>{gDir==='desc'?tr('↓ Décroissant'):tr('↑ Croissant')}</button>
            )}
            {mode==='locker'&&(
              <>
              <button onClick={resetFilters} style={{width:'100%',boxSizing:'border-box' as const,padding:'0.3rem',background:'rgba(111,195,232,0.1)',border:'1px solid rgba(111,195,232,0.35)',borderRadius:'0.18rem',color:'#6fc3e8',fontSize:'0.64rem',cursor:'pointer',letterSpacing:'0.08em',marginTop:'0.5rem'}}>{tr('↺ Réinitialiser les filtres')}</button>
              <button onClick={()=>handleSetDefault(teamApi)} style={{width:'100%',boxSizing:'border-box' as const,padding:'0.3rem',background:'rgba(212,175,55,0.12)',border:'1px solid rgba(212,175,55,0.35)',borderRadius:'0.18rem',color:'#e8c84a',fontSize:'0.64rem',cursor:'pointer',letterSpacing:'0.08em',marginTop:'0.3rem'}}>{defaultTeam===teamApi&&teamApi?tr('⭐ Par défaut : ')+(teamApi==='__HOF__'?'Hall of Fame':teamApi):tr('⭐ Définir comme équipe par défaut')}</button>
              </>
            )}
          </div>
          </div>
          <button onClick={()=>setFiltersOpen(false)} style={{marginTop:'0.8rem',width:'100%',padding:'0.8rem',background:'linear-gradient(160deg,#00b4d8,#0077b6)',border:'none',borderRadius:'0.5rem',color:'#fff',fontSize:'0.95rem',fontWeight:800,letterSpacing:'0.05em',cursor:'pointer',boxShadow:'0 0 18px rgba(64,232,255,0.4)'}}>{tr('Voir les résultats')}</button>
        </div>
      )}

      {sharedCard&&(
        <div onClick={closeShared} style={{position:'fixed',inset:0,zIndex:9500,background:'rgba(2,6,14,0.88)',backdropFilter:'blur(6px)',WebkitBackdropFilter:'blur(6px)',overflowY:'auto',opacity:sharedClosing?0:1,transition:'opacity 0.45s ease'}}>
          <div onClick={(e)=>e.stopPropagation()} style={{maxWidth:'520px',margin:'0 auto',padding:'22px 16px 30px',display:'flex',flexDirection:'column' as const,alignItems:'center',gap:'18px'}}>
            <div style={{width:'min(62vw,250px)'}}><GalleryCard card={sharedCard} isFlipped={false} onFlip={()=>{}} glowScale={1}/></div>
            <div style={{width:'100%'}}><StatPanel key={sharedCard.slug} card={sharedCard} isClosing={sharedClosing} onClose={closeShared} placement='inline'/></div>
            <button onClick={closeShared} style={{width:'100%',padding:'0.8rem',background:'linear-gradient(160deg,#00b4d8,#0077b6)',border:'none',borderRadius:'0.5rem',color:'#fff',fontSize:'0.8rem',fontWeight:800,letterSpacing:'0.12em',cursor:'pointer'}}>{urlSlugRef.current?'VOIR LA GALERIE COMPLÈTE':tr('FERMER')}</button>
          </div>
        </div>
      )}

    </main>
  );
}