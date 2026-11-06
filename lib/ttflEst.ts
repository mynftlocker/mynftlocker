// Estimation du score TTFL d'un joueur pour une nuit, a partir de la BASE UNIQUE myNFTlocker (lib/projBase.ts, partagee avec le GW Builder Sorare).
// Chaque jeu utilise SA PROPRE echelle de score : pour TTFL, forme (L10), plafond et L5 sont des scores TTFL ; la projection Sorare, seule donnee en echelle Sorare,
// est d'abord convertie en echelle TTFL (TTFL ~ TTFL_A + TTFL_B x projection Sorare, calage du 04/11/2026 sur 311 matchs).
import { baseProj, gameAdj, statusMul } from './projBase';
export const TTFL_A = 3.77, TTFL_B = 0.75;
export type Form = { l5: number | null; l10: number | null; ceil: number | null; n: number };
// Forme TTFL depuis l'historique [date, score TTFL] : moyenne des 5 / 10 derniers, plafond = meilleur des 10 derniers. Moins de 5 matchs : pas de forme fiable.
export function ttflForm(rows: { d: string; t: number }[]): Form {
  const g = rows.slice().sort((a, b) => (a.d < b.d ? -1 : 1)).map(x => x.t), l10 = g.slice(-10), l5 = g.slice(-5);
  const avg = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
  if (l10.length < 5) return { l5: null, l10: null, ceil: null, n: l10.length };
  return { l5: avg(l5), l10: avg(l10), ceil: Math.max(...l10), n: l10.length };
}
export const ttflConv = (projSorare: number) => TTFL_A + TTFL_B * projSorare;
export function ttflProj(projSorare: number, f: Form | null, inj: string | null, home?: boolean): number {
  if (!(projSorare > 0)) return 0;
  const adj = home == null ? 1 : gameAdj(undefined, home, false);
  return baseProj({ pj: ttflConv(projSorare), l10: f?.l10 ?? null, l5: f?.l5, ceil: f?.ceil, adj }) * statusMul(inj);
}
// Equivalent en echelle Sorare (pour l'affichage « projection myNFTlocker »)
export const toSorareScale = (ttfl: number) => (ttfl - TTFL_A) / TTFL_B;
// Ancienne formule (avant le 06/11/2026) : 70 % projection Sorare + 10 % L5 + 20 % L10 (formes en echelle Sorare), GTD x0,88. Sert au journal de comparaison.
export const ttflEstLegacy = (proj: number, l5: number | null, l10: number | null, inj: string | null) => TTFL_A + TTFL_B * (0.7 * proj + 0.1 * (l5 ?? proj) + 0.2 * (l10 ?? proj)) * (inj === 'GTD' ? 0.88 : 1);
