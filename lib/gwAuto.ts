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
  arena?: 'unc' | 'champ' | 'cont' | 'vet' | 'u23'; // type d'Arena (seuils de rentabilite)
  minAge?: number;    // Arena Veterans : age minimum
  maxAge?: number;    // Arena U23 : age maximum
  essence?: number;   // cout d'entree Arena (Essence)
  rar?: string[];     // raretes autorisees pour l'auto (defaut : limited)
  minProj?: number;   // seuil mini de projection : en dessous, la compo n'est pas jouee
  done?: boolean;     // compo validee : figee (cartes verrouillees) et rangee dans « Mes equipes »
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

// Cup : calendrier independant des GW. Pour une nuit donnee, on remplace le joueur de chaque carte par sa version « nuit » (match du soir, projection de la nuit)
export type CupMap = Record<string, Record<string, GP>>;
export function cardsFor(cards: Card[], r: Room, cup?: CupMap): Card[] {
  if (r.kind !== 'cup' || !r.night || !cup?.[r.night]) return cards;
  const m = cup[r.night];
  return cards.filter(c => m[c.p.slug]).map(c => ({ ...c, p: m[c.p.slug] }));
}
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
export function allocate(rooms: Room[], cards: Card[], cup?: CupMap): RoomResult[] {
  const pinned = new Set(rooms.flatMap(r => r.pins));
  const taken = new Set<string>();
  return rooms.map(r => {
    const rc = cardsFor(cards, r, cup), byId = new Map(rc.map(c => [c.id, c]));
    const locked = r.pins.map(id => byId.get(id)).filter(Boolean).map(c => toCand(c as Card, r)).slice(0, 5);
    locked.forEach(c => taken.add(c.id));
    let lineup = locked;
    if (r.auto && locked.length < 5) {
      const rr = roomRar(r);
      const free = rc.filter(c => !taken.has(c.id) && !pinned.has(c.id) && rr.includes(c.rar || 'limited') && ageOk(c.p, r)).map(c => toCand(c, r));
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
export function rankRooms(rooms: Room[], cards: Card[], players: GP[], cup?: CupMap): Room[] {
  const ideal = new Map<string, number>();
  const pot = (r: Room) => { const k = `${r.kind}|${r.cap}|${r.minAge ?? ''}|${r.maxAge ?? ''}|${r.night ?? ''}`; if (!ideal.has(k)) ideal.set(k, idealTotal(players, r) || 1); return ideal.get(k)!; };
  const left = [...rooms], out: Room[] = [], taken = new Set<string>();
  const pinned = new Set(rooms.flatMap(r => r.pins));
  while (left.length) {
    let bi = 0, bs = -1;
    left.forEach((r, i) => {
      const rr = roomRar(r);
      const free = cardsFor(cards, r, cup).filter(c => !taken.has(c.id) && !pinned.has(c.id) && rr.includes(c.rar || 'limited') && ageOk(c.p, r)).map(c => toCand(c, r));
      const lu = solve(free, r, []);
      const tot = lu.reduce((s, c) => s + c.v, 0);
      const ct = r.kind === 'cup' ? CUP_TIERS.find(t => r.label.includes('palier ' + t.n)) : null;
      const sc = lu.length < 5 ? -1 : ct ? tot / ct.pts : tot / pot(r);
      if (sc > bs) { bs = sc; bi = i; }
    });
    const r = left.splice(bi, 1)[0]; out.push(r);
    const rr = roomRar(r);
    const free = cardsFor(cards, r, cup).filter(c => !taken.has(c.id) && !pinned.has(c.id) && rr.includes(c.rar || 'limited') && ageOk(c.p, r)).map(c => toCand(c, r));
    solve(free, r, []).forEach(c => taken.add(c.id));
  }
  return out;
}

// ===== Tout generer automatiquement =====
// Cree le MAXIMUM de compos viables avec toutes les cartes possedees (toutes raretes), en respectant les regles Sorare
// (5 joueurs differents, plafond d'etoiles, max par equipe, minimum In-Season, une rarete par compo, Classic 3 max par type et rarete, ages Arena).
// Etape A (gratuit) : Cup deja prevue, In-Season, Classic ; on prend a chaque tour la compo qui atteint la plus grande part de son potentiel.
// Etape B (Essence) : Arena, avec les cartes restantes, et SEULEMENT celles dont la projection passe le seuil de la 5e place (donnees reelles des GW terminees).
export type AutoParams = {
  cards: Card[]; players: GP[]; cup?: CupMap; keepCup: Room[];
  arena: (r: Room, total: number) => { ok: boolean; ratio: number } | null;   // null = seuils inconnus
  mk: (kind: RoomKind, o: Partial<Room>) => Room;
  minProj: Record<string, number>;       // seuil mini par type : isc, isk, clc, clk, ar
  floor?: number;                        // part minimale du potentiel pour une compo In-Season / Classic
  budget?: number;                       // budget Arena en Essence (0 / absent = illimite)
  done?: Room[];                         // compos deja validees : leurs cartes sont reservees, elles comptent dans les limites et le budget
};
export type AutoOut = { rooms: Room[]; arenaSkipped: number; arenaUnknown: boolean; essence: number; overBudget: number };
type Cd = { proto: Room; tier: 'A' | 'B'; limit: number; made: number; once: boolean; cache: { lu: Cand[]; total: number } | null; base: string; rar: string; mkey: string };

export function autoAll(P: AutoParams): AutoOut {
  const floor = P.floor ?? 0.5, taken = new Set<string>(), out: Room[] = [];
  const ideal = new Map<string, number>();
  const pot = (r: Room) => { const k = `${r.kind}|${r.cap}|${r.minAge ?? ''}|${r.maxAge ?? ''}`; if (!ideal.has(k)) ideal.set(k, idealTotal(P.players, r) || 1); return ideal.get(k)!; };
  const have = new Set(P.cards.map(c => c.rar || 'limited'));
  const rars = RARITIES.filter(r => have.has(r.k));
  const suf = (k: string) => (k === 'limited' ? '' : ' ' + (RARITIES.find(r => r.k === k)?.l || k));
  const cands: Cd[] = [];
  for (const c of P.keepCup) cands.push({ proto: { ...c, pins: [], auto: true }, tier: 'A', limit: 1, made: 0, once: true, cache: null, base: c.label, rar: roomRar(c)[0], mkey: 'cup' });
  const T: [RoomKind, string, string, number][] = [['is-champ', 'In-Season Champion', 'isc', 99], ['is-cont', 'In-Season Contender', 'isk', 99], ['cl-champ', 'Classic Champion', 'clc', 3], ['cl-cont', 'Classic Contender', 'clk', 3]];
  for (const ra of rars) for (const [kind, base, mkey, lim] of T) cands.push({ proto: P.mk(kind, { rar: [ra.k], label: base + suf(ra.k), minProj: P.minProj[mkey] || undefined }), tier: 'A', limit: lim, made: 0, once: false, cache: null, base: base + suf(ra.k), rar: ra.k, mkey });
  for (const ra of rars.filter(r => r.k !== 'unique')) for (const a of ARENAS) cands.push({ proto: P.mk('arena', { rar: [ra.k], label: a.label + suf(ra.k), cap: a.cap, essence: a.essence, arena: a.k, minAge: 'minAge' in a ? a.minAge : undefined, maxAge: 'maxAge' in a ? a.maxAge : undefined, minProj: P.minProj['ar-' + a.k] || undefined }), tier: 'B', limit: 99, made: 0, once: false, cache: null, base: a.label + suf(ra.k), rar: ra.k, mkey: 'ar-' + a.k });

  const compute = (c: Cd) => {
    const rr = roomRar(c.proto);
    const free = cardsFor(P.cards, c.proto, P.cup).filter(x => !taken.has(x.id) && rr.includes(x.rar || 'limited') && ageOk(x.p, c.proto)).map(x => toCand(x, c.proto));
    const lu = solve(free, c.proto, []);
    c.cache = { lu, total: lu.reduce((s, x) => s + x.v, 0) };
  };
  const score = (c: Cd): number => {
    const k = c.cache!; if (k.lu.length < 5 || check(k.lu, c.proto).length) return -1;
    if (c.proto.minProj && k.total < c.proto.minProj) return -1;
    if (c.tier === 'B') { const q = P.arena(c.proto, k.total); return q && q.ok ? q.ratio : -1; }
    if (c.proto.kind === 'cup') { const t = CUP_TIERS.find(z => c.proto.label.includes('palier ' + z.n)); return t ? k.total / t.pts : 1; }
    const sh = k.total / pot(c.proto); return sh >= floor ? sh : -1;
  };
  let spent = 0;
  for (const d of P.done || []) {   // compos validees : cartes reservees + comptees dans les limites (Classic 3 max) et le budget Essence
    d.pins.forEach(id => taken.add(id));
    const c = cands.find(z => z.tier === (d.kind === 'arena' ? 'B' : 'A') && z.proto.kind === d.kind && roomRar(z.proto)[0] === roomRar(d)[0] && (d.kind !== 'arena' || z.proto.arena === d.arena));
    if (c) c.made++;
    if (d.kind === 'arena') spent += d.essence || 0;
  }
  for (const tier of ['A', 'B'] as const) {
    const cs = cands.filter(c => c.tier === tier);
    for (;;) {
      let best: Cd | null = null, bs = -1;
      for (const c of cs) {
        if (c.made >= c.limit) continue;
        if (tier === 'B' && P.budget && spent + (c.proto.essence || 0) > P.budget) continue;   // hors budget Essence
        if (!c.cache || c.cache.lu.some(x => taken.has(x.id))) compute(c);   // recalcul seulement si une de ses cartes a ete prise
        const sc = score(c); if (sc > bs) { bs = sc; best = c; }
      }
      if (!best) break;
      best.made++;
      const room: Room = best.once ? best.proto : { ...best.proto, id: P.mk(best.proto.kind, {}).id, label: `${best.base} ${best.made}` };
      out.push(room); best.cache!.lu.forEach(x => taken.add(x.id)); if (tier === 'B') spent += best.proto.essence || 0;
    }
  }
  let arenaSkipped = 0, arenaUnknown = false, overBudget = 0;
  for (const c of cands.filter(z => z.tier === 'B')) { compute(c); const k = c.cache!; if (k.lu.length === 5) { const q = P.arena(c.proto, k.total); if (!q) arenaUnknown = true; else if (!q.ok) arenaSkipped++; else if (P.budget && spent + (c.proto.essence || 0) > P.budget) overBudget++; } }
  return { rooms: out, arenaSkipped, arenaUnknown, essence: spent, overBudget };
}
