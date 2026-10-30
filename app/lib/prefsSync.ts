// Synchronisation des preferences du compte (HoF, 5 majeur, equipe par defaut, managers favoris, modes).
// Source = localStorage (rapide, hors connexion). Quand un utilisateur est connecte, on les recopie dans son compte (Redis) pour les retrouver partout.
const KEY_RE=/^(mynftlocker_hof|mynftlocker_default_team_|mynftlocker_lineup|mnfl_arcade|mnfl_gameplay|mnfl_favs|mnfl_open_sport)/;
export const isPrefKey=(k:string)=>KEY_RE.test(k);

export const collectPrefs=():Record<string,string>=>{
  const o:Record<string,string>={};
  try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&KEY_RE.test(k)){const v=localStorage.getItem(k);if(v!=null)o[k]=v;}}}catch{}
  return o;
};
// Recupere les preferences du compte et les applique en local (le compte l'emporte). Retourne null si echec, sinon true si quelque chose a change.
export const pullPrefs=async():Promise<boolean|null>=>{
  try{
    const r=await fetch('/api/prefs');
    if(!r.ok)return null;
    const d=await r.json();
    const prefs:Record<string,string>=d?.prefs||{};
    let changed=false;
    for(const k of Object.keys(prefs)){
      if(KEY_RE.test(k)&&typeof prefs[k]==='string'&&localStorage.getItem(k)!==prefs[k]){localStorage.setItem(k,prefs[k]);changed=true;}
    }
    return changed;
  }catch{return null;}
};
export const pushPrefs=async(prefs:Record<string,string>):Promise<boolean>=>{
  try{
    const r=await fetch('/api/prefs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prefs})});
    return r.ok;
  }catch{return false;}
};
