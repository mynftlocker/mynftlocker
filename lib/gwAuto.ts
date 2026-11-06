import type { Cand, GP } from './gwLineup';

// Moteur du GW Builder : compos de Game Week dans l'ORDRE choisi par l'utilisateur. Une carte = une seule compo ; quand une carte convient
// a plusieurs compos, celle qui est plus haut dans l'ordre la prend. Calcul pur (navigateur ou serveur).

export type RoomKind = 'is-champ' | 'is-cont' | 'cl-champ' | 'cl-cont' | 'cup' | 'arena';
export type Room = {
  id: string; kind: RoomKind; label: string;
  cap: number;        // plafond d'etoiles
  minIS: number;      // cartes In-Season minimum
  bonus: boolean;     // le bonus (XP) de la carte compte (faux en Arena)
  perTeam: number;    // max de joueurs par equipe
  night?: string;     // Cup : seule la nuit demandee compte (YYYY-MM-DD, date Paris)
  pins: string[];     // cartes imposees (ids de cartes)
  auto: boolean;      // true = le moteur complete ; false = seulement les cartes choisies
  minAge?: number;    // Arena Veterans : age minimum
  maxAge?: number;    // Arena U23 : age maximum
  essence?: number;   // cout d'entree Arena (Essence)
  rar?: string[];     // raretes autorisees pour l'auto (defaut : limited)
};

export const PRESETS: { kind: RoomKind; label: string; cap: number; minIS: number; bonus: boolean }[] = [
  { kind: 'is-champ', label: 'In-Season Champion', cap: 16, minIS: 4, bonus: true },
  { kind: 'is-cont', label: 'In-Season Contender', cap: 11, minIS: 4, bonus: true },
  { kind: 'cl-champ', label: 'Classic Champion', cap: 16, minIS: 0, bonus: true },
  { kind: 'cl-cont', label: 'Classic Contender', cap: 11, minIS: 0, bonus: true },
  { kind: 'cup', label: 'Emirates NBA Cup', cap: 16, minIS: 2, bonus: true },
  { kind: 'arena', label: 'Arena', cap: 16, minIS: 0, bonus: false },
];
// Paliers de la Cup : cartes In-Season minimum (cap 16 etoiles)
export const CUP_TIERS = [{ n: 1, pts: 230, is: 1 }, { n: 2, pts: 250, is: 1 }, { n: 3, pts: 270, is: 2 }, { n: 4, pts: 280, is: 3 }, { n: 5, pts: 300, is: 4 }];

export type Card = { id: string; p: GP; is: boolean; pw: number; pic: string | null; rar?: string; buy?: { eur: number; url: string } };
export const RARITIES = [{ k: 'limited', l: 'Limited' }, { k: 'rare', l: 'Rare' }, { k: 'super_rare', l: 'Super Rare' }, { k: 'unique', l: 'Unique' }];
// Arena Rooms NBA 27 (regles officielles Sorare) : plafond, age, entree en Essence
export const ARENAS = [
  { k: 'unc', label: 'Arena Uncapped', cap: 99, essence: 200 },
  { k: 'champ', label: 'Arena Champion', cap: 16, essence: 150 },
  { k: 'cont', label: 'Arena Contender', cap: 11, essence: 75 },
  { k: 'vet', label: 'Arena Veterans', cap: 16, essence: 150, minAge: 30 },
  { k: 'u23', label: 'Arena U23', cap: 11, essence: 150, maxAge: 23 },
] as const;
export const ageOk = (p: GP, r: Room) => (r.minAge == null || (p.age != null && p.age >= r.minAge)) && (r.maxAge == null || (p.age != null && p.age <= r.maxAge));
export const roomRar = (r: Room) => r.rar && r.rar.length ? r.rar : ['limited'];

const parisDay = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date(iso));
export const gtdMul = (_p: GP) => 1; // le malus GTD (-3) est deja dans la projection de la GW

// Valeur d'une carte dans une compo : projection Sorare (GW, ou matchs de la nuit pour la Cup) x bonus de la carte x malus GTD
export function cardValue(c: Card, r: Room): number {
  let base = c.p.proj;
  if (r.night) {
    const g = c.p.opp.filter(o => parisDay(o.d) === r.night);
    if (!g.length) return 0;
    base = Math.max(...g.map(o => o.pj ?? c.p.proj)); // seul le meilleur match compte
  }
  return base * (r.bonus ? c.pw : 1) * gtdMul(c.p);
}
export const toCand = (c: Card, r: Room): Cand => ({ id: c.id, p: c.p, v: cardValue(c, r), cost: Math.round(c.p.stars * 2), pw: c.pw, is: c.is, pic: c.pic, real: !!c.pic });

// Meilleure compo de 5 cartes (une carte par joueur, plafond d'etoiles, max par equipe, minimum In-Season), avec des cartes imposees
export function solve(cands: Cand[], r: Room, locked: Cand[] = []): Cand[] {
  const cap = Math.round(r.cap * 2), maxNonIs = 5 - r.minIS;
  const lockedCost = locked.reduce((s, c) => s + c.cost, 0);
  const lockedPl = new Set(locked.map(c => c.p.slug));
  const lockedIds = new Set(locked.map(c => c.id));
  const ok = cands.filter(c => !lockedPl.has(c.p.slug) && !lockedIds.has(c.id) && c.v > 0);
  const top = (a: Cand[], n: number, f: (c: Cand) => number) => [...a].sort((x, y) => f(y) - f(x)).slice(0, n);
  const isOnly = ok.filter(c => c.is);
  const pool = [...new Set([
    ...top(ok, 45, c => c.v), ...top(ok, 45, c => c.v / Math.max(1, c.cost)),
    ...top(isOnly, 35, c => c.v), ...top(isOnly, 35, c => c.v / Math.max(1, c.cost)),
  ])].sort((a, b) => b.v - a.v);
  const need0 = 5 - locked.length;
  if (need0 <= 0) return locked.slice(0, 5);
  let bestV = -1, bestSet: Cand[] = [];
  const cur: Cand[] = []; const cnt: Record<string, number> = {}; locked.forEach(c => { cnt[c.p.team] = (cnt[c.p.team] || 0) + 1; });
  const used = new Set(lockedPl);
  let nonIs = locked.filter(c => !c.is).length;
  const rec = (i: number, cost: number, v: number) => {
    if (cur.length === need0) { if (v > bestV) { bestV = v; bestSet = [...cur]; } return; }
    const need = need0 - cur.length;
    if (pool.length - i < need) return;
    if (v + pool[i].v * need <= bestV) return;
    const c = pool[i];
    if (cost + c.cost <= cap && (cnt[c.p.team] || 0) < r.perTeam && (c.is || nonIs < maxNonIs) && !used.has(c.p.slug)) {
      cur.push(c); used.add(c.p.slug); cnt[c.p.team] = (cnt[c.p.team] || 0) + 1; if (!c.is) nonIs++;
      rec(i + 1, cost + c.cost, v + c.v);
      cur.pop(); used.delete(c.p.slug); cnt[c.p.team]--; if (!c.is) nonIs--;
    }
    rec(i + 1, cost, v);
  };
  rec(0, lockedCost, 0);
  return [...locked, ...bestSet].sort((a, b) => b.v - a.v);
}

export type RoomResult = { room: Room; lineup: Cand[]; total: number; stars: number; nIS: number; maxTeam: number; issues: string[] };

export function check(lineup: Cand[], r: Room): string[] {
  const out: string[] = [];
  const cost = lineup.reduce((s, c) => s + c.cost, 0) / 2; if (cost > r.cap) out.push(`${cost}★ > ${r.cap}★`);
  const nIS = lineup.filter(c => c.is).length;
  if (lineup.length === 5 && nIS < r.minIS) out.push(`${nIS}/${r.minIS} In-Season`);
  const t: Record<string, number> = {}; lineup.forEach(c => { t[c.p.team] = (t[c.p.team] || 0) + 1; });
  if (Math.max(0, ...Object.values(t)) > r.perTeam) out.push(`> ${r.perTeam} joueurs d'une même équipe`);
  if (new Set(lineup.map(c => c.p.slug)).size < lineup.length) out.push('Joueur en double');
  if (lineup.length < 5) out.push(`${5 - lineup.length} carte(s) à choisir`);
  return out;
}

// Toutes les compos, dans l'ordre. Les cartes imposees (pins) de TOUTES les compos sont reservees d'avance.
export function allocate(rooms: Room[], cards: Card[]): RoomResult[] {
  const byId = new Map(cards.map(c => [c.id, c]));
  const pinned = new Set(rooms.flatMap(r => r.pins));
  const taken = new Set<string>();
  return rooms.map(r => {
    const locked = r.pins.map(id => byId.get(id)).filter(Boolean).map(c => toCand(c as Card, r)).slice(0, 5);
    locked.forEach(c => taken.add(c.id));
    let lineup = locked;
    if (r.auto && locked.length < 5) {
      const rr = roomRar(r);
      const free = cards.filter(c => !taken.has(c.id) && !pinned.has(c.id) && rr.includes(c.rar || 'limited') && ageOk(c.p, r)).map(c => toCand(c, r));
      lineup = solve(free, r, locked);
    }
    lineup.forEach(c => taken.add(c.id));
    const total = lineup.reduce((s, c) => s + c.v, 0);
    const nIS = lineup.filter(c => c.is).length;
    const t: Record<string, number> = {}; lineup.forEach(c => { t[c.p.team] = (t[c.p.team] || 0) + 1; });
    return { room: r, lineup, total, stars: lineup.reduce((s, c) => s + c.cost, 0) / 2, nIS, maxTeam: Math.max(0, ...Object.values(t)), issues: check(lineup, r) };
  });
}

// Potentiel d'une compo = meilleure compo possible avec TOUS les joueurs de la GW (hors collection) : sert de reference pour classer
export function idealTotal(players: GP[], r: Room): number {
  const fake: Card[] = players.filter(p => p.games > 0 && ageOk(p, r)).map(p => ({ id: 'i' + p.slug, p, is: true, pw: 1.1, pic: null }));
  const lu = solve(fake.map(c => toCand(c, { ...r, minIS: 0 })), { ...r, minIS: 0 });
  return lu.reduce((s, c) => s + c.v, 0);
}

// Classement automatique : a chaque tour on prend la compo qui atteint la plus grande part de son potentiel avec les cartes restantes
// (ratio total / potentiel, ou total / palier pour la Cup). Les compos les plus prometteuses passent en premier.
export function rankRooms(rooms: Room[], cards: Card[], players: GP[]): Room[] {
  const ideal = new Map<string, number>();
  const pot = (r: Room) => { const k = `${r.kind}|${r.cap}|${r.minAge ?? ''}|${r.maxAge ?? ''}|${r.night ?? ''}`; if (!ideal.has(k)) ideal.set(k, idealTotal(players, r) || 1); return ideal.get(k)!; };
  const left = [...rooms], out: Room[] = [], taken = new Set<string>();
  const pinned = new Set(rooms.flatMap(r => r.pins));
  while (left.length) {
    let bi = 0, bs = -1;
    left.forEach((r, i) => {
      const rr = roomRar(r);
      const free = cards.filter(c => !taken.has(c.id) && !pinned.has(c.id) && rr.includes(c.rar || 'limited') && ageOk(c.p, r)).map(c => toCand(c, r));
      const lu = solve(free, r, []);
      const tot = lu.reduce((s, c) => s + c.v, 0);
      const cup = r.kind === 'cup' ? CUP_TIERS.find(t => r.label.includes('palier ' + t.n)) : null;
      const sc = lu.length < 5 ? -1 : cup ? tot / cup.pts : tot / pot(r);
      if (sc > bs) { bs = sc; bi = i; }
    });
    const r = left.splice(bi, 1)[0]; out.push(r);
    const rr = roomRar(r);
    const free = cards.filter(c => !taken.has(c.id) && !pinned.has(c.id) && rr.includes(c.rar || 'limited') && ageOk(c.p, r)).map(c => toCand(c, r));
    solve(free, r, []).forEach(c => taken.add(c.id));
  }
  return out;
}
