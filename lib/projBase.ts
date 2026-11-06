// BASE UNIQUE des projections myNFTlocker (TTFL ET GW Builder Sorare). Une seule formule, versionnee : on la fait evoluer ici, partout en meme temps.
// Seule la conversion finale change selon le jeu : Sorare = la base telle quelle ; TTFL = TTFL_A + TTFL_B x base (lib/ttflEst.ts).
// v1 (06/11/2026) : 50 % projection Sorare du match + 30 % forme (moyenne des 10 derniers, ajustee domicile/exterieur/back-to-back)
//                   + 15 % plafond (meilleur des 10) + 5 % L5 ; statut : questionable/GTD -10 %, doubtful -15 %.
export const BASE_VERSION = 1;
export const W = { pj: 0.5, form: 0.3, ceil: 0.15, l5: 0.05 };
export const statusMul = (inj: string | null | undefined) => (inj === 'DOUBT' ? 0.85 : inj === 'QUEST' || inj === 'GTD' ? 0.9 : 1);
export type Splits = { home: number; away: number; b2b: number };
// Ajustement du match : ecarts du joueur (historique) ou valeurs par defaut quand on n'a pas encore assez d'historique
export const gameAdj = (sp: Splits | undefined, home: boolean, b2b: boolean) => (sp ? (home ? sp.home : sp.away) * (b2b ? sp.b2b : 1) : (home ? 1.02 : 0.98) * (b2b ? 0.96 : 1));
export function baseProj(x: { pj: number; l10: number | null; l5?: number | null; ceil?: number | null; adj?: number }): number {
  if (!(x.pj > 0)) return 0;
  if (x.l10 == null) return x.pj;
  return W.pj * x.pj + W.form * x.l10 * (x.adj ?? 1) + W.ceil * (x.ceil ?? x.l10) + W.l5 * (x.l5 ?? x.l10);
}

// ===== Projection Sorare v2 (GW Builder, 06/11/2026) : calibree par backtest sur les GW 111 a 115 (2 602 matchs, 1 690 joueur-GW) =====
// Constat du backtest : la formule v1 (50 % Rotowire + 30 % forme + 15 % plafond + 5 % L5) faisait MOINS bien que Rotowire seul (erreur moy. 8,43 contre 8,00 sur le meilleur match de la GW)
// et sous-estimait les stars. v2 = (1) moyenne attendue du match : 0,708 x Rotowire + 0,322 x forme (L10 sur les matchs JOUES) ; (2) esperance du MEILLEUR match de la GW
// (bruit reel mesure + risque de ne pas jouer par niveau de projection), car seul le meilleur score compte : un joueur a 2 matchs vaut plus que sa moyenne.
// Validation croisee (chaque GW predite sans l'avoir vue) : erreur moy. 7,64 (Rotowire 8,00), biais +0,1 (Rotowire -0,5), correlation 0,786 (0,764).
export const GW2 = {
  a: 0.708, c: 0.322, b: -0.779,            // moyenne du match avec forme
  a0: 0.896, b0: 1.618,                     // sans historique (recrue)
  Q: [0.173, 0.338, 0.458, 0.54, 0.62, 0.691, 0.756, 0.825, 0.891, 0.945, 0.997, 1.058, 1.12, 1.187, 1.259, 1.332, 1.426, 1.543, 1.737, 2.256],   // quantiles du ratio score reel / moyenne attendue (joueurs ayant joue)
  bins: [0, 8, 12, 16, 22, 100], p0: [0.41, 0.227, 0.076, 0.05, 0.01],   // proba de ne pas jouer par tranche de projection Rotowire
  lam: 0.75,                                // part de l'avantage "plusieurs matchs" conservee (corrige un leger sur-calcul mesure par validation croisee)
};
export const gameMean = (pj: number, l10: number | null | undefined) => (pj > 0 ? Math.max(1, l10 != null ? GW2.a * pj + GW2.c * l10 + GW2.b : GW2.a0 * pj + GW2.b0) : 0);
function emax(games: { m: number; pj: number }[]): number {
  const dists = games.map(g => {
    const i = GW2.bins.slice(1, -1).filter(t => g.pj >= t).length;   // tranche de projection
    const p = GW2.p0[i], w = (1 - p) / GW2.Q.length;
    return [[0, p] as [number, number], ...GW2.Q.map(q => [g.m * q, w] as [number, number])].sort((x, y) => x[0] - y[0]);
  });
  const xs = [...new Set(dists.flatMap(d => d.map(x => x[0])))].sort((x, y) => x - y);
  let prev = 0, e = 0;
  for (const x of xs) { let F = 1; for (const d of dists) { let s = 0; for (const [v, w] of d) if (v <= x) s += w; F *= s; } e += x * (F - prev); prev = F; }
  return e;
}
// Esperance du meilleur score de la GW (ou de la nuit) pour un joueur a partir de ses matchs : [{ pj: projection Rotowire du match, l10: forme }]
export function gwBest(games: { pj: number; l10: number | null | undefined }[]): number {
  const g = games.filter(x => x.pj > 0).map(x => ({ pj: x.pj, m: gameMean(x.pj, x.l10) }));
  if (!g.length) return 0;
  const top = g.reduce((a, b) => (b.m > a.m ? b : a));
  const full = emax(g), single = g.length > 1 ? emax([top]) : full;
  return single + GW2.lam * (full - single);
}
