'use client';
import { useState, useEffect } from 'react';
import { t as tr } from '../i18n';
// Saisie du slug Sorare : normalisation + verification en direct (extrait de page.tsx)
export const toSlug=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9_-]+/g,'-');
// Verification en direct d'un slug chez Sorare pendant la saisie (attend 0,5 s apres la derniere frappe)
export type SlugState={s:'idle'|'checking'|'ok'|'missing'|'error';n?:string};
export function useSlugCheck(v:string):SlugState{
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
export const SlugHint=({st}:{st:SlugState})=>{
  if(st.s==='idle'||st.s==='error')return null;
  const txt=st.s==='checking'?tr('Vérification chez Sorare...'):st.s==='ok'?'✓ '+tr('Manager trouvé')+(st.n?' : '+st.n:''):tr('Aucun manager Sorare avec ce slug. Vérifie l’orthographe.');
  return <p style={{margin:'-0.35rem 0 0.6rem',fontSize:'0.62rem',lineHeight:1.4,color:st.s==='ok'?'#7ee0a0':st.s==='missing'?'#ff8a7a':'rgba(207,228,251,0.5)'}}>{txt}</p>;
};
