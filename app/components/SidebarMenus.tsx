'use client';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { t as tr, useLang } from '../i18n';
// Menus et interrupteurs de la sidebar (extrait de page.tsx)
export const FilterMenu=({title,options,current,onSelect}:any)=>{
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
export const ToggleRow=({title,hint,on,onToggle}:any)=>{
  useLang();
  return(<div style={{padding:'0.35rem 0.5rem',marginBottom:'0.15rem'}}>
    <button type='button' role='switch' aria-checked={on} onClick={onToggle} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'0.5rem',background:'transparent',border:'none',padding:0,cursor:'pointer',textAlign:'left'}}>
      <span><span style={{display:'block',fontSize:'0.64rem',fontWeight:800,letterSpacing:'0.14em',textTransform:'uppercase',color:'#eaf2ff'}}>{title}</span>{hint&&<span style={{display:'block',fontSize:'0.62rem',color:'#7a8898',marginTop:'0.05rem'}}>{hint}</span>}</span>
      <span style={{flexShrink:0,width:'2rem',height:'1.05rem',borderRadius:'1rem',position:'relative',background:on?'linear-gradient(90deg,#00b4d8,#40e8ff)':'rgba(255,255,255,0.12)',boxShadow:on?'0 0 8px rgba(64,232,255,0.45)':'none',transition:'all 0.15s'}}><span style={{position:'absolute',top:'0.1rem',left:on?'1.05rem':'0.1rem',width:'0.85rem',height:'0.85rem',borderRadius:'50%',background:on?'#04121a':'#9fb0c4',transition:'left 0.15s'}}/></span>
    </button>
  </div>);
};

export const COUNTRY_FR: Record<string,string> = {
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
export const countryFR=(slug:string)=>tr(slug==='__NATIONAL__'?'Sélection nationale':(COUNTRY_FR[slug]||'Autres pays'));

export const FootTeamMenu=({countries,teamsByCountry,country,team,onPickCountry,onPickTeam}:any)=>{
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
  const label=team==='__HOF__'?'Hall of Fame':team!=='all'?team:(country!=='all'?countryFR(country):tr('Tous les championnats'));
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
