// Constantes et fonctions pures sur les cartes (extrait de page.tsx)
export const RARITY_GLOW: Record<string,string> = {
  common:'0 0 16px 5px rgba(220,220,255,0.45)',
  limited:'0 0 22px 7px rgba(234,179,8,0.75)',
  rare:'0 0 26px 8px rgba(239,68,68,0.9)',
  super_rare:'0 0 30px 10px rgba(59,130,246,0.85)',
  unique:'0 0 36px 12px rgba(168,85,247,0.95)',
};
export const RARITY_COLOR: Record<string,string> = {
  common:'#9ca3af',limited:'#eab308',rare:'#ef4444',super_rare:'#3b82f6',unique:'#a855f7',
};
export const RARITY_FILL: Record<string,string> = {
  common:'#a8a8b5',limited:'#b48a14',rare:'#a82a2a',super_rare:'#1e4ba8',unique:'#7e3fc4',
};
export const RARITY_ORDER: Record<string,number> = { unique:0, super_rare:1, rare:2, limited:3, common:4 };
export const HOF_KEY = '__HOF__';

// Regroupe une specialEdition en famille (ex: stellar_holo_base -> STELLAR)
export const editionGroup=(se:string):string=>{
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
export const specialLabel=(v:string)=>editionGroup(v);
export const STANDARD_EDITIONS=new Set(['stellar_standard_base','colors_standard_base','legacy']);
export const isSpecialCard=(c:any)=>{ const se=c.specialEdition; if(!se)return false; if(STANDARD_EDITIONS.has(se))return false; return editionGroup(se)!=='standard'; };
export const playerKey=(c:any)=>(c.anyPlayer?.lastName||c.slug.split('-')[0])+'|'+(c.anyPlayer?.shirtNumber??'');
export const dedupeByPlayer=(list:any[])=>{
  const better=(a:any,b:any)=>{ const sa=isSpecialCard(a)?1:0, sb=isSpecialCard(b)?1:0; if(sa!==sb) return sa>sb?a:b; return (a.xp??0)>=(b.xp??0)?a:b; };
  const byPlayer:Record<string,any>={};
  for(const c of list){ const k=playerKey(c); byPlayer[k]=byPlayer[k]?better(byPlayer[k],c):c; }
  return Object.values(byPlayer);
};

export const isNBA=(c:any)=>c?.__typename==='NBACard';
export const parseCard=(name:string)=>{
  const parts=name.split('•');const left=parts[0].trim();const right=(parts[1]||'').trim();
  const sm=left.match(/(\d{4}-\d{2})/);const season=sm?sm[1]:'';
  const pn=left.replace(/\d{4}-\d{2}/,'').trim();
  const ln=pn.split(' ').pop()!.toUpperCase();
  const sr=right.match(/(\d+\/\d+)/);
  return {playerName:pn,lastName:ln,season,serial:sr?sr[1]:null};
};
export const nameFontSize=(l:number)=>l<=5?'2rem':l<=7?'1.65rem':l<=9?'1.35rem':l<=11?'1.1rem':'0.9rem';


export const NBA_CONF:Record<string,string>={
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
