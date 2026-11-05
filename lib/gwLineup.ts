// Calcul pur des compos de GW NBA (utilise cote serveur et cote navigateur) : 5 joueurs, plafond d'etoiles, max N joueurs par equipe.
export type GP = { slug: string; name: string; team: string; teamName: string; games: number; opp: { d: string; o: string; h: boolean; pj: number | null }[]; stars: number; proj: number; l10: number | null; inj: string | null; pic: string | null };
export type Cand = { id: string; p: GP; v: number; cost: number; pw: number; is: boolean; pic: string | null; real: boolean };
export const BONUS_IS = 1.05; // bonus par defaut d'une carte In-Season pour la compo du builder
export const MAX_PER_TEAM = 4; // regle Sorare Limited Champion / Contender : max 4 joueurs de chaque equipe
export const CAPS = { champ: 16, cont: 11 } as const; // etoiles max : Champion 16, Contender 11

export function best(cands: Cand[], cap: number, perTeam: number, maxNonIs = 5): Cand[] {
  const pool = [...cands].sort((a, b) => b.v - a.v).slice(0, 80);
  let bestV = -1, bestSet: Cand[] = [];
  const cur: Cand[] = []; const cnt: Record<string, number> = {}; let nonIs = 0;
  const rec = (i: number, cost: number, v: number) => {
    if (cur.length === 5) { if (v > bestV) { bestV = v; bestSet = [...cur]; } return; }
    const need = 5 - cur.length;
    if (pool.length - i < need) return;
    if (v + pool[i].v * need <= bestV) return;
    const c = pool[i];
    if (cost + c.cost <= cap && (cnt[c.p.team] || 0) < perTeam && (c.is || nonIs < maxNonIs) && !cur.some(x => x.p.slug === c.p.slug)) {
      cur.push(c); cnt[c.p.team] = (cnt[c.p.team] || 0) + 1; if (!c.is) nonIs++;
      rec(i + 1, cost + c.cost, v + c.v);
      cur.pop(); cnt[c.p.team]--; if (!c.is) nonIs--;
    }
    rec(i + 1, cost, v);
  };
  rec(0, 0, 0);
  return bestSet.sort((a, b) => b.v - a.v);
}

// Vraies cartes Limited du marche par joueur et choix d'une carte In-Season (variee d'un joueur a l'autre) pour le rendu
export type MCard = { pic: string; year: number; is: boolean };
export function vary(set: Cand[], cards: Record<string, MCard[]>): Cand[] {
  return set.map((c, i) => {
    const all = cards[c.p.slug] || [];
    const opts = all.filter(x => x.is); // builder : cartes In-Season uniquement
    if (!opts.length) return c;
    return { ...c, pic: opts[i % opts.length].pic, real: true };
  });
}
