// Estimation du score TTFL d un joueur pour une nuit, a partir de la BASE UNIQUE myNFTlocker (lib/projBase.ts, partagee avec le GW Builder Sorare).
// Calage du 04/11/2026 (311 matchs, validation croisee par joueur) : TTFL ~ 3.77 + 0.75 x projection myNFTlocker. A recaler avec le journal.
import { baseProj, statusMul } from './projBase';
export const TTFL_A = 3.77, TTFL_B = 0.75;
export function myProj(proj: number, l5: number | null, l10: number | null, inj: string | null, ceil?: number | null): number {
  return baseProj({ pj: proj, l10, l5, ceil }) * statusMul(inj); // base unique partagee avec le GW Builder Sorare (lib/projBase.ts)
}
export const ttflEst = (proj: number, l5: number | null, l10: number | null, inj: string | null) => TTFL_A + TTFL_B * myProj(proj, l5, l10, inj);
