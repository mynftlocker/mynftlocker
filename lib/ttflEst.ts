// Estimation du score TTFL d'un joueur pour une nuit, a partir de la projection myNFTlocker (70 % projection Sorare du match, 10 % L5, 20 % L10, comme le Cup Builder).
// Calage du 04/11/2026 (311 matchs, validation croisee par joueur) : TTFL ~ 3.77 + 0.75 x projection myNFTlocker. A recaler avec le journal.
export const TTFL_A = 3.77, TTFL_B = 0.75;
export function myProj(proj: number, l5: number | null, l10: number | null, inj: string | null): number {
  const m = 0.7 * proj + 0.1 * (l5 ?? proj) + 0.2 * (l10 ?? proj);
  return inj === 'GTD' ? m * 0.88 : m;
}
export const ttflEst = (proj: number, l5: number | null, l10: number | null, inj: string | null) => TTFL_A + TTFL_B * myProj(proj, l5, l10, inj);
