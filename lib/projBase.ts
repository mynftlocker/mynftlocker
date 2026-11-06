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
