// ===== MODE ARCADE =====
// Arcade = les cartes COMMON de la serie (Set) EN COURS. Verifie a la source le 30/10/2026 :
// les cartes Divination (foot et NBA) ont l'edition divination_standard_base / divination_shiny_base, rarete common.
// RESET A CHAQUE NOUVEAU SET : changer ARCADE_SET (ex. 'divination' -> prefixe de la nouvelle edition).
// Les cartes de l'ancien Set (ex. glitch_*) redeviennent des communes normales, hors du filtre Arcade.
export const ARCADE_SET='divination';
export const isArcadeCard=(c:any):boolean=>String(c?.rarityTyped||'').toLowerCase()==='common'&&String(c?.specialEdition||'').toLowerCase().startsWith(ARCADE_SET+'_');
// Au lancement public : passer a true -> le visiteur arrive sur Arcade, le site complet reste accessible via l'interrupteur.
export const ARCADE_DEFAULT=false;

// ===== MODE GAMEPLAY =====
// Blessure active = date de fin attendue pas encore depassee (Sorare laisse des entrees perimees dans l'historique).
export const activeInjury=(c:any):{status:string|null;end:string}|null=>{
  const list:any[]=c?.anyPlayer?.injuries||[];
  const now=Date.now()-6*3600*1000;
  let best:any=null;
  for(const i of list){
    const t=i?.expectedEndDate?Date.parse(i.expectedEndDate):NaN;
    if(isFinite(t)&&t>=now&&(!best||t>Date.parse(best.expectedEndDate)))best=i;
  }
  return best?{status:best.status||null,end:best.expectedEndDate}:null;
};
// "Va perdre une etoile" : la projection Sorare est sous le minimum du palier actuel (ecart negatif). NBA uniquement.
export const losesStar=(c:any):boolean=>c?.gain!=null&&Number(c.gain)<0&&!(Number(c?.anyPlayer?.gameplayTierStars)<=1);
