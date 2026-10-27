// Fragment GraphQL : detail du score du meilleur match d'une carte (pour pouvoir le recalculer).
export const BEST_APPEARANCE_FRAG=`bestSo5Appearance{ score playerGameScore{ score detailedScore{ stat statValue totalScore } } }`;
// Bareme officiel Sorare NBA (help.sorare.com : "How are player scores calculated in Sorare NBA?")
const STD:Record<string,number>={points:1,rebounds:1.2,assists:1.5,blocks:3,steals:3,turnovers:-2,three_points_made:1,double_double:1,triple_double:1,mins_played:0};
// Record GW fiable : Sorare renvoie parfois un detail de score corrompu (ex. points x5, rebonds x8).
// Si le total ne correspond pas au bareme officiel, on recalcule depuis les stats brutes, puis on reapplique le bonus de la carte.
export const gwRecordOf=(b:any):number|null=>{
  const sc=b?.score; if(sc==null||!(Number(sc)>0))return null;
  const pg=b?.playerGameScore, det:any[]=pg?.detailedScore;
  if(!pg||!Array.isArray(det)||!det.length||!(Number(pg.score)>0))return Number(sc);
  let raw=0;
  for(const d of det){
    if(!(d.stat in STD)){ if(Number(d.totalScore)!==0)return Number(sc); continue; } // stat inconnue : on ne touche a rien
    raw+=STD[d.stat]*Number(d.statValue||0);
  }
  if(Math.abs(raw-Number(pg.score))<0.15)return Number(sc); // detail coherent : valeur Sorare conservee
  const bonus=Number(sc)/Number(pg.score);                  // bonus de carte (ex. 1.07)
  return raw>0?Math.round(raw*bonus*1000)/1000:null;
};
