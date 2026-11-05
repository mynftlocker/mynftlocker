// Calcul pur des compos de GW NBA (utilise cote serveur et cote navigateur) : 5 joueurs, plafond d'etoiles, max N joueurs par equipe.
export type GP = { slug: string; name: string; team: string; teamName: string; games: number; opp: string[]; stars: number; proj: number; l10: number | null; inj: string | null; pic: string | null };
export type Cand = { id: string; p: GP; v: number; cost: number; pw: number; is: boolean; pic: string | null; real: boolean };
export const CAPS = { champ: 16, cont: 11 } as const; // etoiles max : Champion 16, Contender 11

export function best(cands: Cand[], cap: number, perTeam: number): Cand[] {
  const pool = [...cands].sort((a, b) => b.v - a.v).slice(0, 80);
  let bestV = -1, bestSet: Cand[] = [];
  const cur: Cand[] = []; const cnt: Record<string, number> = {};
  const rec = (i: number, cost: number, v: number) => {
    if (cur.length === 5) { if (v > bestV) { bestV = v; bestSet = [...cur]; } return; }
    const need = 5 - cur.length;
    if (pool.length - i < need) return;
    if (v + pool[i].v * need <= bestV) return;
    const c = pool[i];
    if (cost + c.cost <= cap && (cnt[c.p.team] || 0) < perTeam && !cur.some(x => x.p.slug === c.p.slug)) {
      cur.push(c); cnt[c.p.team] = (cnt[c.p.team] || 0) + 1;
      rec(i + 1, cost + c.cost, v + c.v);
      cur.pop(); cnt[c.p.team]--;
    }
    rec(i + 1, cost, v);
  };
  rec(0, 0, 0);
  return bestSet.sort((a, b) => b.v - a.v);
}

// Vraies cartes Limited du marche par joueur (une par edition/saison) et choix d'editions variees dans une compo (rendu plus realiste)
export type MCard = { pic: string; year: number; is: boolean };
export function vary(set: Cand[], cards: Record<string, MCard[]>): Cand[] {
  const used: Record<number, number> = {};
  return set.map(c => {
    const opts = cards[c.p.slug];
    if (!opts?.length) return c;
    const pick = [...opts].sort((a, b) => (used[a.year] || 0) - (used[b.year] || 0) || Number(b.is) - Number(a.is))[0];
    used[pick.year] = (used[pick.year] || 0) + 1;
    return { ...c, pic: pick.pic, real: true };
  });
}
