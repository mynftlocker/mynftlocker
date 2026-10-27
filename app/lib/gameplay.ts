// ===== MODE ARCADE =====
// Une carte est "Arcade" si son edition speciale l'indique (ex. football : glitch_standard_base, glitch_holo_base...).
// Le 30/10 : lire les vraies cartes NBA Arcade dans l'API et completer ce test si leur edition a un autre nom.
export const isArcadeCard=(c:any):boolean=>/arcade|glitch/i.test(String(c?.specialEdition||''));
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
export const losesStar=(c:any):boolean=>c?.gain!=null&&Number(c.gain)<0;
