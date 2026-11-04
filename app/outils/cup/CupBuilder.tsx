'use client';
import { useEffect, useMemo, useState } from 'react';

// Paliers Emirates NBA Cup (Sorare) : cible de points, nb min de cartes In-Season. Cap 16 etoiles, 5 cartes Limited+.
const TIERS = [
  { n: 1, pts: 230, is: 1 }, { n: 2, pts: 250, is: 1 }, { n: 3, pts: 270, is: 2 }, { n: 4, pts: 280, is: 3 }, { n: 5, pts: 300, is: 4 },
];
const CAP = 32; // 16 etoiles en demi-etoiles
type P = { slug: string; name: string; team: string; opp: string; home: boolean; time: string; stars: number; proj: number; l5: number | null; l10: number | null; sd: number | null; max: number | null; sc?: number[]; n: number; inj: string | null };
type Metric = 'proj' | 'mix';
type Goal = 'proba' | 'pts'; // objectif des compos automatiques : meilleure probabilite d'atteindre le palier / meilleur total de points
const EMPTY_OWNED: Record<string, 0 | 1 | 2> = {}; // plus de correction manuelle : tout vient de Sorare
const LSP = 'mnl_cup_pseudo_v1';

const ymd = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(d);
const lab = (s: string) => new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(s + 'T12:00:00Z'));
const erf = (x: number) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
const cdf = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2));

type Opt = { v: number; c: number; i: number; is: boolean; buy?: boolean; pw?: number };
function best<T extends Opt>(pool: T[], need: number, maxBuy = 0, k = 5, cap = CAP): { total: number; idx: number[]; sel: T[] } {
  // sac a dos par groupes (1 option max par joueur) : au plus k joueurs, somme des demi-etoiles <= cap, >= `need` cartes In-Season, <= `maxBuy` achats
  const S = need + 1, B = maxBuy + 1;
  const mk = <U,>(f: () => U) => Array.from({ length: k + 1 }, () => Array.from({ length: cap + 1 }, () => Array.from({ length: S }, () => Array.from({ length: B }, f))));
  let dp = mk(() => -1); let pick = mk(() => [] as number[]);
  for (let c = 0; c <= cap; c++) dp[0][c][0][0] = 0;
  const groups = new Map<number, number[]>();
  pool.forEach((it, ix) => { if (it.buy && maxBuy === 0) return; const g = groups.get(it.i); if (g) g.push(ix); else groups.set(it.i, [ix]); });
  for (const opts of groups.values()) {
    const nd = dp.map(a1 => a1.map(a2 => a2.map(a3 => a3.slice()))); const np = pick.map(a1 => a1.map(a2 => a2.map(a3 => a3.slice())));
    for (const ix of opts) {
      const it = pool[ix];
      for (let j = k; j >= 1; j--) for (let c = cap; c >= it.c; c--) for (let t = 0; t < S; t++) for (let u = 0; u < B; u++) {
        const prev = dp[j - 1][c - it.c][t][u];
        if (prev < 0) continue;
        const nu = u + (it.buy ? 1 : 0); if (nu >= B) continue;
        const nt = Math.min(need, t + (it.is ? 1 : 0));
        if (prev + it.v > nd[j][c][nt][nu]) { nd[j][c][nt][nu] = prev + it.v; np[j][c][nt][nu] = [...pick[j - 1][c - it.c][t][u], ix]; }
      }
    }
    dp = nd; pick = np;
  }
  let bt = 0, bi: number[] = [];
  for (let j = 0; j <= k; j++) for (let c = 0; c <= cap; c++) for (let u = 0; u < B; u++) if (dp[j][c][need][u] > bt) { bt = dp[j][c][need][u]; bi = pick[j][c][need][u]; }
  return { total: bt, idx: bi.map(ix => pool[ix].i), sel: bi.map(ix => pool[ix]) };
}

export default function CupBuilder() {
  const today = useMemo(() => new Date(), []);
  const nights = useMemo(() => Array.from({ length: 8 }, (_, i) => ymd(new Date(today.getTime() + i * 86400000))), [today]);
  const [night, setNight] = useState(nights[1]);
  const [tier, setTier] = useState(2);
  const [metric, setMetric] = useState<Metric>('mix');
  const [goal, setGoal] = useState<Goal>('proba');
  const [noOut, setNoOut] = useState(true);
  const [data, setData] = useState<P[]>([]);
  const [games, setGames] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const owned = EMPTY_OWNED;
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string[]>([]); // builder : joueurs choisis
  const [lsort, setLsort] = useState<{ k: string; dir: 1 | -1 }>({ k: 'est', dir: -1 });
  const [onlyMine, setOnlyMine] = useState(false);
  const [onlyIS, setOnlyIS] = useState(false);
  const [onlyNew, setOnlyNew] = useState(false); // cartes non possedees (a acheter)
  useEffect(() => { setSel([]); }, [night]);
  const [pseudo, setPseudo] = useState('memejacquet1998');
  const [col, setCol] = useState<Record<string, 1 | 2>>({}); // detecte depuis la galerie Sorare : 1 = Limited+ classic, 2 = Limited+ In-Season
  const [pw, setPw] = useState<Record<string, { c?: number; i?: number }>>({}); // meilleur bonus (power) parmi les cartes libres : c = classic, i = In-Season
  const [colSt, setColSt] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [colInfo, setColInfo] = useState('');
  const [locked, setLocked] = useState<Record<string, true>>({}); // joueurs dont toutes les cartes Limited+ sont deja alignees
  const [usedInfo, setUsedInfo] = useState('');

  useEffect(() => { try { const p = localStorage.getItem(LSP); if (p) setPseudo(p); } catch {} }, []);
  const loadGallery = async (pp: string, nt: string = night) => {
    const slug = pp.trim().toLowerCase();
    if (!slug) return;
    setColSt('loading'); setColInfo('');
    try { localStorage.setItem(LSP, slug); } catch {}
    try {
      const r = await fetch('/api/collection?slug=' + encodeURIComponent(slug));
      if (!r.ok || !r.body) throw new Error('http ' + r.status);
      const rd = r.body.getReader(); const dec = new TextDecoder(); let buf = ''; const cards: any[] = [];
      for (;;) {
        const { done, value } = await rd.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl; while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1); if (!line) continue;
          const o = JSON.parse(line);
          if (o.error) throw new Error(o.error);
          if (o.cards) cards.push(...o.cards);
        }
      }
      // cartes deja alignees dans une compo de la GW (API Sorare, jeton serveur) : exclues
      let usedMap: Record<string, string[]> = {}; let usedOk = false;
      try { const ru = await fetch('/api/outils/cup-used?night=' + nt); if (ru.ok) { const ju = await ru.json(); usedMap = ju.used || {}; usedOk = !!ju.fixture; } } catch {}
      const m: Record<string, 1 | 2> = {}; const pwm: Record<string, { c?: number; i?: number }> = {}; const lk: Record<string, true> = {}; const any: Record<string, true> = {}; let nb = 0, nis = 0, nu = 0;
      for (const c of cards) {
        if (c.__typename !== 'NBACard') continue;
        const rar = String(c.rarityTyped || '').toLowerCase();
        if (!rar || rar === 'common') continue; // Cup : Limited ou plus
        const ps = c.anyPlayer?.slug; if (!ps) continue;
        nb++; any[ps] = true;
        if (usedMap[c.slug]) { nu++; continue; } // deja alignee : indisponible
        const pv = Number(c.power) || 1; const e = (pwm[ps] ||= {});
        if (c.inSeasonEligible) { m[ps] = 2; nis++; e.i = Math.max(e.i ?? 0, pv); } else { if (!m[ps]) m[ps] = 1; e.c = Math.max(e.c ?? 0, pv); }
      }
      for (const ps of Object.keys(any)) if (!m[ps]) lk[ps] = true;
      setCol(m); setPw(pwm); setLocked(lk); setColSt('ok');
      setColInfo(`${nb} cartes NBA Limited+ détectées (${nis} In-Season disponibles)`);
      setUsedInfo(usedOk ? `${nu} de tes cartes Limited+ sont déjà alignées dans une compo de cette GW : exclues` : 'Cartes déjà alignées : lecture Sorare indisponible, aucune exclusion appliquée.');
    } catch (e: any) { setColSt('err'); setColInfo('Galerie introuvable : ' + String(e?.message || e)); }
  };
  useEffect(() => { loadGallery(typeof window !== 'undefined' && localStorage.getItem(LSP) || 'memejacquet1998', night); }, [night]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    let off = false; setLoading(true); setErr('');
    fetch('/api/outils/cup?night=' + night).then(r => r.json()).then(j => {
      if (off) return; if (j.error) { setErr(j.error); setData([]); } else { setData(j.players || []); setGames(j.games || 0); }
    }).catch(e => !off && setErr(String(e))).finally(() => !off && setLoading(false));
    return () => { off = true; };
  }, [night]);

  const T = TIERS[tier - 1];
  const val = (p: P) => {
    const l5 = p.l5 ?? p.proj, l10 = p.l10 ?? p.proj;
    const b = metric === 'proj' ? p.proj : 0.7 * p.proj + 0.1 * l5 + 0.2 * l10;
    return p.inj === 'GTD' ? b * 0.88 : b;
  };
  const pool = useMemo(() => data.filter(p => !(noOut && p.inj && p.inj !== 'GTD')).map((p, i) => ({ p, v: val(p), c: Math.round(p.stars * 2), i })), [data, metric, noOut]); // eslint-disable-line react-hooks/exhaustive-deps
  const own = (slug: string): 0 | 1 | 2 => (owned[slug] !== undefined ? (owned[slug] as number) : (col[slug] || 0)) as 0 | 1 | 2;
  const ownedPool = useMemo(() => pool.filter(x => own(x.p.slug)), [pool, owned, col]); // eslint-disable-line react-hooks/exhaustive-deps
  // options par joueur possede : une par type de carte libre (Classic / In-Season), avec le bonus (power) reel de la carte
  const ownedItems = useMemo(() => pool.flatMap(x => {
    const sl = x.p.slug, e = pw[sl] || {}, ov = owned[sl];
    const out: (typeof x & { is: boolean; pw: number; buy?: boolean })[] = [];
    if (ov !== undefined) { if (ov) { const w = (ov === 2 ? e.i : e.c) ?? e.i ?? e.c ?? 1; out.push({ ...x, v: x.v * w, is: ov === 2, pw: w }); } return out; }
    if (e.c !== undefined && col[sl]) out.push({ ...x, v: x.v * e.c, is: false, pw: e.c });
    if (e.i !== undefined) out.push({ ...x, v: x.v * e.i, is: true, pw: e.i });
    return out;
  }), [pool, owned, col, pw]);
  // Plafond : tes vraies cartes + des cartes hypothetiques (In-Season a +5 % minimum, Classic au bonus max observe +13 %) => toujours >= aux autres compos
  const freeItems = useMemo(() => [
    ...ownedItems,
    ...pool.flatMap(x => [{ ...x, v: x.v * 1.05, is: true, buy: true, pw: 1.05 }, { ...x, is: false, buy: true, pw: 1 }]),
  ], [pool, ownedItems]);
  const buyItems = useMemo(() => pool.filter(x => !own(x.p.slug)).flatMap(x => [{ ...x, v: x.v * 1.05, is: true, buy: true, pw: 1.05 }, { ...x, is: false, buy: true, pw: 1 }]), [pool, owned, col]); // achat : In-Season +5 %, Classic +0 % // eslint-disable-line react-hooks/exhaustive-deps

  const stat = (list: { p: P; v: number; pw?: number }[]) => {
    const mean = list.reduce((s, x) => s + x.v, 0);
    if (list.length !== 5) return { mean, prob: 0 };
    // Probabilite : simulation sur les VRAIS scores recents de chaque joueur (capte les joueurs a pics), recentres sur l'estimation
    if (list.every(x => (x.p.sc?.length ?? 0) >= 5)) {
      let seed = 1234567; for (const x of list) for (let i = 0; i < x.p.slug.length; i++) seed = (seed * 31 + x.p.slug.charCodeAt(i)) >>> 0;
      const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      const N = 4000; let ok = 0;
      for (let k = 0; k < N; k++) {
        let tot = 0;
        for (const x of list) { const sc = x.p.sc as number[]; const m10 = sc.reduce((a, b) => a + b, 0) / sc.length; tot += Math.max(0, x.v + (sc[Math.floor(rnd() * sc.length)] - m10) * (x.pw ?? 1)); }
        if (tot >= T.pts) ok++;
      }
      return { mean, prob: ok / N };
    }
    const sd = Math.sqrt(list.reduce((s, x) => s + (x.p.sd ?? 14) ** 2, 0));
    return { mean, prob: 1 - cdf((T.pts - mean) / sd) };
  };
  // Objectif = PROBABILITE d'atteindre le palier (pas la moyenne) : on teste plusieurs "gouts du risque" (valeur + k x ecart-type du joueur)
  // et on garde la compo dont la simulation donne la meilleure probabilite. Palier loin => joueurs a pics ; palier proche => joueurs reguliers.
  const bestP = <T extends Opt & { p: P; pw?: number }>(pool: T[], need: number, maxBuy = 0) => {
    if (goal === 'pts') return best(pool, need, maxBuy);
    let top: { total: number; idx: number[]; sel: T[] } | null = null, bp = -1;
    for (const k of [0, 0.25, 0.5, 0.8, 1.2]) {
      const r = best(pool.map(x => ({ ...x, v: x.v + k * (x.p.sd ?? 10) * (x.pw ?? 1) })), need, maxBuy);
      const sel = r.idx.map(i => pool.find(x => x.i === i && r.sel.some(y => y.i === i && y.is === x.is && !!y.buy === !!x.buy))).filter(Boolean) as T[];
      if (sel.length !== 5) continue;
      const pr = stat(sel).prob;
      if (pr > bp + 1e-9) { bp = pr; top = { total: sel.reduce((a, x) => a + x.v, 0), idx: sel.map(x => x.i), sel }; }
    }
    return top || best(pool, need, maxBuy);
  };
  const free = useMemo(() => bestP(freeItems, T.is, 5), [freeItems, T.is, goal]); // eslint-disable-line react-hooks/exhaustive-deps
  const mine = useMemo(() => bestP(ownedItems, T.is), [ownedItems, T.is, goal]); // eslint-disable-line react-hooks/exhaustive-deps
  const baseMean = useMemo(() => best(ownedItems, T.is).total, [ownedItems, T.is]);
  // Achats : pre-selection par gain de points (rapide), puis classement par gain de PROBABILITE (meme objectif que les compos affichees)
  const gains = useMemo(() => {
    if (ownedPool.length < 5) return [];
    const m = new Map<string, { x: (typeof buyItems)[number]; g: number }>();
    for (const x of buyItems) { const g = best([...ownedItems, x], T.is, 1).total - baseMean; const c = m.get(x.p.slug); if (g > 0.05 && (!c || g > c.g)) m.set(x.p.slug, { x, g }); }
    const p0 = stat(mine.sel).prob;
    const out: { x: (typeof buyItems)[number]; g: number; p0: number; p1: number; out: string[]; inn: string[]; stars: number }[] = [];
    for (const c of [...m.values()].sort((a, b) => b.g - a.g).slice(0, 24)) {
      const r = bestP([...ownedItems, c.x], T.is, 1);
      if (!r.sel.some(y => y.p.slug === c.x.p.slug && y.buy)) continue;
      const st = stat(r.sel); const slugs0 = new Set(mine.sel.map(y => y.p.slug)), slugs1 = new Set(r.sel.map(y => y.p.slug)); out.push({ ...c, g: st.mean - mine.total, p0, p1: st.prob, out: mine.sel.filter(y => !slugs1.has(y.p.slug)).map(y => y.p.name), inn: r.sel.filter(y => !slugs0.has(y.p.slug) && y.p.slug !== c.x.p.slug).map(y => y.p.name), stars: r.sel.reduce((a, y) => a + y.p.stars, 0) }); // g = points de la compo obtenue - points de ta compo affichee (Sans achat)
    }
    return out.sort((a, b) => goal === 'pts' ? b.g - a.g : (b.p1 - b.p0) - (a.p1 - a.p0) || b.g - a.g).slice(0, 12);
  }, [buyItems, ownedItems, ownedPool, baseMean, T.is, mine, goal]); // eslint-disable-line react-hooks/exhaustive-deps
  const buy1 = useMemo(() => bestP([...ownedItems, ...buyItems], T.is, 1).sel, [ownedItems, buyItems, T.is, goal]); // eslint-disable-line react-hooks/exhaustive-deps
  const buy2 = useMemo(() => bestP([...ownedItems, ...buyItems], T.is, 2).sel, [ownedItems, buyItems, T.is, goal]); // eslint-disable-line react-hooks/exhaustive-deps
  const mineList = mine.sel, freeList = free.sel;
  const sM = stat(mineList), sF = stat(freeList), sB1 = stat(buy1), sB2 = stat(buy2);
  const stars = (l: { p: P }[]) => l.reduce((s, x) => s + x.p.stars, 0);
  // ===== BUILDER : tu choisis les joueurs, le cap de 16★ filtre la liste =====
  const poolBySlug = useMemo(() => { const m: Record<string, (typeof pool)[number]> = {}; pool.forEach(x => { m[x.p.slug] = x; }); return m; }, [pool]);
  const ownedByS = useMemo(() => { const m: Record<string, typeof ownedItems> = {}; ownedItems.forEach(x => { (m[x.p.slug] ||= []).push(x); }); return m; }, [ownedItems]);
  type Opt2 = (typeof ownedItems)[number];
  const optsFor = (x: (typeof pool)[number]): Opt2[] => ownedByS[x.p.slug]?.length ? ownedByS[x.p.slug] : [{ ...x, v: x.v * 1.05, is: true, buy: true, pw: 1.05 }, { ...x, is: false, buy: true, pw: 1 }];
  const built = useMemo(() => {
    const groups = sel.map(sl => poolBySlug[sl]).filter(Boolean).map(optsFor);
    let bestOk: Opt2[] | null = null, bestAny: Opt2[] | null = null, vOk = -1, vAny = -1;
    const rec = (i: number, cur: Opt2[], tot: number, isn: number) => {
      if (i === groups.length) { if (tot > vAny) { vAny = tot; bestAny = [...cur]; } if (isn >= T.is && tot > vOk) { vOk = tot; bestOk = [...cur]; } return; }
      for (const o of groups[i]) { cur.push(o); rec(i + 1, cur, tot + o.v, isn + (o.is ? 1 : 0)); cur.pop(); }
    };
    rec(0, [], 0, 0);
    const items = (bestOk || bestAny || []) as Opt2[];
    return { items, okIS: !!bestOk || groups.length === 0 };
  }, [sel, poolBySlug, ownedByS, T.is]); // eslint-disable-line react-hooks/exhaustive-deps
  const sBuilt = stat(built.items);
  const usedStars = built.items.reduce((s, x) => s + x.p.stars, 0);
  const nISb = built.items.filter(x => x.is).length;
  const slotsLeft = 5 - sel.length;
  const minStar = useMemo(() => pool.length ? Math.min(...pool.map(x => x.p.stars)) : 0.5, [pool]);
  const maxStarNow = 16 - usedStars - Math.max(0, slotsLeft - 1) * minStar;
  const pics = (p: P): number | null => (p.sc && p.sc.length >= 5 && p.l10 != null ? p.sc.filter(v => v >= (p.l10 as number) + 15).length : null);
  const rows = useMemo(() => {
    if (slotsLeft <= 0) return [];
    const ql = q.toLowerCase();
    return pool
      .filter(x => !sel.includes(x.p.slug) && x.p.stars <= maxStarNow + 1e-9 && (!ql || (x.p.name + x.p.team).toLowerCase().includes(ql)) && (!onlyMine || own(x.p.slug)) && (!onlyNew || !own(x.p.slug)))
      .map(x => { const os0 = optsFor(x); const os = onlyIS ? os0.filter(z => z.is) : os0; if (!os.length) return null; const o = os.reduce((a, b) => (b.v > a.v ? b : a), os[0]); return { x, o }; })
      .filter((r): r is { x: (typeof pool)[number]; o: Opt2 } => !!r)
      .sort((a, b) => {
        const g = (r: { x: (typeof pool)[number]; o: Opt2 }) => lsort.k === 'name' ? r.x.p.name : lsort.k === 'stars' ? r.x.p.stars : lsort.k === 'proj' ? r.x.p.proj : lsort.k === 'l5' ? (r.x.p.l5 ?? -1) : lsort.k === 'l10' ? (r.x.p.l10 ?? -1) : lsort.k === 'pics' ? (pics(r.x.p) ?? -1) : lsort.k === 'd5' ? (r.x.p.l5 == null ? -999 : r.x.p.proj - r.x.p.l5) : lsort.k === 'd10' ? (r.x.p.l10 == null ? -999 : r.x.p.proj - r.x.p.l10) : lsort.k === 'max' ? (r.x.p.max ?? -1) : lsort.k === 'eff' ? r.o.v / r.x.p.stars : r.o.v;
        const x = g(a), y = g(b);
        return (typeof x === 'string' ? x.localeCompare(y as string) : (x as number) - (y as number)) * lsort.dir;
      });
  }, [pool, sel, q, onlyMine, onlyNew, onlyIS, lsort, maxStarNow, slotsLeft, ownedByS, owned, col]); // eslint-disable-line react-hooks/exhaustive-deps
  // Completer : garde les joueurs deja choisis, remplit les emplacements restants au mieux (cap, In-Season, cartes possedees d'abord)
  const complete = (maxBuy: number) => {
    if (slotsLeft <= 0 || sel.length === 0) return;
    const capLeft = CAP - Math.round(usedStars * 2);
    const needLeft = Math.max(0, T.is - nISb);
    const taken = new Set(sel);
    const cands = [...ownedItems, ...(maxBuy > 0 ? buyItems : [])].filter(x => !taken.has(x.p.slug));
    const r = best(cands, needLeft, maxBuy, slotsLeft, capLeft);
    if (r.sel.length) setSel(c => [...c, ...r.sel.map(x => x.p.slug)]);
  };
  const sortBy = (k: string) => setLsort(c => (c.k === k ? { k, dir: (c.dir * -1) as 1 | -1 } : { k, dir: k === 'name' ? 1 : -1 }));
  const arrow = (k: string) => (lsort.k === k ? (lsort.dir === -1 ? ' ↓' : ' ↑') : '');


  const box: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,255,255,0.18)', borderRadius: 14, padding: '14px 16px', backdropFilter: 'blur(8px)' };
  const btn = (on: boolean): React.CSSProperties => ({ padding: '6px 12px', borderRadius: 999, border: '1px solid ' + (on ? '#00ffff' : 'rgba(255,255,255,0.2)'), background: on ? 'rgba(0,255,255,0.15)' : 'transparent', color: on ? '#00ffff' : '#ddd', cursor: 'pointer', fontSize: 13 });
  const Team = ({ s, title, sub, l }: { s: ReturnType<typeof stat>; title: string; sub: string; l: { p: P; v: number; is?: boolean; buy?: boolean; pw?: number }[] }) => {
    const nIS = l.filter(x => x.is && !x.buy).length;
    return (
    <div style={box}>
      <div style={{ fontWeight: 700, color: '#00ffff' }}>{title}</div>
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>{sub}</div>
      {l.map(x => (
        <div key={x.p.slug} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '2px 0' }}>
          <span>{x.p.name} <span style={{ opacity: 0.55 }}>· {x.p.stars}★ · {x.p.team.split(' ').pop()} {x.p.home ? 'vs' : '@'} {x.p.opp.split(' ').pop()}{x.buy ? (x.is ? ' · À ACHETER (In-Season +5%)' : ' · À ACHETER (Classic)') : (x.is ? ' · IS' : ' · Classic') + ' · bonus +' + Math.round(((x.pw ?? 1) - 1) * 100) + '%'}</span></span>
          <b>{x.v.toFixed(0)}</b>
        </div>
      ))}
      <div style={{ marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
        <span>{stars(l)}/16★ · total</span>
        <b style={{ color: s.mean >= T.pts ? '#4ade80' : '#ffb020' }}>{s.mean.toFixed(0)} / {T.pts} · {Math.round(s.prob * 100)}%</b>
      </div>
    </div>
    );
  };

  return (
    <main style={{ minHeight: '100vh', background: '#07090d', color: '#eee', padding: '20px 16px 60px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', display: 'grid', gap: 14 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>NBA Cup Builder <span style={{ opacity: 0.5, fontSize: 13 }}>· outil perso</span></h1>
        <div style={box}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {nights.map(n => <button key={n} onClick={() => setNight(n)} style={btn(n === night)}>{lab(n)}</button>)}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {TIERS.map(t => <button key={t.n} onClick={() => setTier(t.n)} style={btn(t.n === tier)}>Palier {t.n} · {t.pts} pts · {t.is} IS min</button>)}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 12, opacity: 0.7 }}>Estimation :</span>
            {([['mix', 'Projection myNFTlocker'], ['proj', 'Projection Sorare']] as [Metric, string][]).map(([m, l]) => <button key={m} onClick={() => setMetric(m)} style={btn(m === metric)}>{l}</button>)}
            <span style={{ fontSize: 12, opacity: 0.7, marginLeft: 8 }}>Compos automatiques :</span>
            {([['proba', 'Meilleure probabilité'], ['pts', 'Meilleure projection']] as [Goal, string][]).map(([g, l]) => <button key={g} onClick={() => setGoal(g)} style={btn(g === goal)} title={g === 'proba' ? 'Maximise les chances d\'atteindre le palier (favorise les joueurs à pics quand le palier est loin)' : 'Maximise le total de points estimés'}>{l}</button>)}
            <label style={{ fontSize: 13, marginLeft: 8 }}><input type="checkbox" checked={noOut} onChange={e => setNoOut(e.target.checked)} /> Exclure blessés</label>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 10 }}>
            <span style={{ fontSize: 12, opacity: 0.7 }}>Ma galerie Sorare :</span>
            <input value={pseudo} onChange={e => setPseudo(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadGallery(pseudo)} style={{ padding: '5px 8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 13, width: 170 }} />
            <button onClick={() => loadGallery(pseudo)} style={btn(false)}>Recharger</button>
            <span style={{ fontSize: 12, color: colSt === 'err' ? '#ff6b6b' : colSt === 'ok' ? '#4ade80' : '#aaa' }}>{colSt === 'loading' ? 'Détection de tes cartes…' : colInfo}</span>
            {usedInfo && <span style={{ fontSize: 12, opacity: 0.75, flexBasis: '100%' }}>{usedInfo}</span>}
          </div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 8 }}>
            {loading ? 'Chargement…' : err ? 'Erreur : ' + err : `${games} matchs · ${data.length} joueurs · cap 16★ · 5 cartes Limited+ · min ${T.is} carte(s) In-Season (contrainte appliquée : tes cartes sont détectées ; une carte « à acheter » est supposée en In-Season). Statuts blessés : OUT/GTD affichés (GTD ×0,88), à recouper (Rotowire).`}
          </div>
        </div>

        <div style={{ fontSize: 12, opacity: 0.7, padding: '0 4px' }}>
          Projection = celle de Sorare pour le match de la nuit choisie (comme sur la fiche joueur). La « Projection myNFTlocker » la tempère avec la forme récente (70 % projection Sorare, 10 % L5, 20 % L10). Chaque score est multiplié par le bonus réel de la carte (power, XP) ; une carte In-Season à acheter est comptée au bonus minimum de +5 %. Les cartes déjà alignées dans une autre compo de la GW sont exclues automatiquement.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 14 }}>
          <Team l={mineList} s={sM} title="Sans achat : ma meilleure compo" sub={ownedPool.length ? `avec tes ${ownedPool.length} joueurs Limited+ de la nuit · ${goal === 'proba' ? 'optimisée pour la probabilité d\'atteindre le palier' : 'optimisée pour le total de points'}` : 'aucune de tes cartes ne joue cette nuit (ou galerie non chargée)'} />
          {ownedPool.length > 0 && <Team l={buy1} s={sB1} title="Avec 1 achat" sub="ta meilleure compo avec 1 carte en plus (Classic si l'In-Season requis est déjà couvert)" />}
          {ownedPool.length > 0 && <Team l={buy2} s={sB2} title="Avec 2 achats" sub="ta meilleure compo avec jusqu'à 2 cartes en plus" />}
          <Team l={freeList} s={sF} title="Nothing Better" sub={`meilleure compo possible sous le cap (${goal === 'proba' ? 'la plus probable d\'atteindre le palier' : 'le plus de points'}) : tes cartes + toutes les cartes à acheter (In-Season +5 %, Classic +0 %)`} />
        </div>

        {ownedPool.length > 0 && ownedPool.length < 5 && <div style={{ ...box, fontSize: 13, opacity: 0.8 }}>Il faut au moins 5 joueurs possédés ce soir-là pour calculer les achats (aujourd'hui : {ownedPool.length}).</div>}
        {ownedPool.length >= 5 && mine.idx.length < 5 && <div style={{ ...box, fontSize: 13, color: '#ffb020' }}>Avec tes cartes, aucune compo de 5 ne respecte le cap de 16★ et les {T.is} In-Season du palier {T.n}. Les achats ci-dessous complètent l'équipe.</div>}
        {ownedPool.length >= 5 && (
          <div style={box}>
            <div style={{ fontWeight: 700, color: '#ffd24a', marginBottom: 6 }}>Cartes à acheter (gain de probabilité et de points sur ta meilleure compo)</div>
            {gains.length === 0 && <div style={{ fontSize: 13, opacity: 0.7 }}>Aucun achat n'améliore ta compo sous le cap.</div>}
            {gains.map(({ x, g, p0, p1, out: outN, inn, stars: st16 }) => (
              <div key={x.p.slug} style={{ fontSize: 14, padding: '3px 0' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{x.p.name} <span style={{ opacity: 0.55 }}>· {x.p.stars}★ · {x.p.team.split(' ').pop()} {x.p.home ? 'vs' : '@'} {x.p.opp.split(' ').pop()} · {x.is ? 'IS +5%' : 'Classic suffit'}</span></span>
                <b style={{ color: '#4ade80' }}>{Math.round(p0 * 100)} % → {Math.round(p1 * 100)} % <span style={{ opacity: 0.6, fontWeight: 400 }}>· {g >= 0 ? '+' : ''}{g.toFixed(1)} pts</span></b>
              </div><div style={{ fontSize: 12, opacity: 0.65 }}>↔ à la place de {outN.length ? outN.join(', ') : '—'}{inn.length ? ` · et entrent aussi ${inn.join(', ')}` : ''} · {st16}★ / 16★</div></div>
            ))}
          </div>
        )}

        <div style={{ ...box, borderColor: 'rgba(255,210,74,0.45)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontWeight: 700, color: '#ffd24a' }}>Mon builder</div>
            <span style={{ fontSize: 12, opacity: 0.6 }}>Charger :</span>
            {[{ l: 'Sans achat', v: mineList }, { l: '1 achat', v: buy1 }, { l: '2 achats', v: buy2 }, { l: 'Nothing Better', v: freeList }].map(o => (
              <button key={o.l} onClick={() => setSel(o.v.map(x => x.p.slug))} style={btn(false)}>{o.l}</button>
            ))}
            <button onClick={() => setSel([])} style={btn(false)}>Vider</button>
          </div>
          {sel.length > 0 && slotsLeft > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, opacity: 0.6 }}>Compléter les {slotsLeft} emplacements :</span>
              <button onClick={() => complete(0)} style={btn(true)}>Avec mes cartes</button>
              <button onClick={() => complete(1)} style={btn(false)}>Avec 1 achat max</button>
              <button onClick={() => complete(2)} style={btn(false)}>Avec 2 achats max</button>
            </div>
          )}
          {Array.from({ length: 5 }).map((_, i) => {
            const sl = sel[i]; const it = built.items.find(x => x.p.slug === sl);
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', opacity: it ? 1 : 0.35 }}>
                {it ? (<>
                  <span>{it.p.name} <span style={{ opacity: 0.55 }}>· {it.p.stars}★ · {it.p.team.split(' ').pop()} {it.p.home ? 'vs' : '@'} {it.p.opp.split(' ').pop()} · {it.buy ? (it.is ? 'À ACHETER IS' : 'À ACHETER Classic') : it.is ? 'IS' : 'Classic'} · +{Math.round(((it.pw ?? 1) - 1) * 100)}%</span></span>
                  <span><b>{it.v.toFixed(0)}</b> <button onClick={() => setSel(c => c.filter(z => z !== sl))} style={{ marginLeft: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.25)', color: '#ff8a8a', borderRadius: 6, cursor: 'pointer' }}>✕</button></span>
                </>) : <span>Emplacement {i + 1} : clique un joueur dans la liste</span>}
              </div>
            );
          })}
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ color: usedStars > 16 ? '#ff6b6b' : '#ddd' }}>{usedStars}/16★ <span style={{ opacity: 0.6 }}>· reste {Math.max(0, 16 - usedStars)}★</span> · <span style={{ color: nISb >= T.is ? '#4ade80' : '#ffb020' }}>IS {nISb}/{T.is}{nISb >= T.is ? ' ✓' : ''}</span></span>
            <b style={{ color: sBuilt.mean >= T.pts ? '#4ade80' : '#ffb020' }}>{sBuilt.mean.toFixed(0)} / {T.pts} · {sel.length === 5 ? Math.round(sBuilt.prob * 100) + ' %' : '5 joueurs requis'}</b>
          </div>
          {!built.okIS && sel.length > 0 && <div style={{ fontSize: 12, color: '#ffb020', marginTop: 4 }}>Il manque des In-Season pour ce palier : ajoute-en ou choisis des joueurs que tu possèdes en IS.</div>}
        </div>

        <div style={box}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un joueur ou une équipe" style={{ flex: 1, minWidth: 200, padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: '#fff' }} />
            <button onClick={() => { setOnlyMine(v => !v); setOnlyNew(false); }} style={btn(onlyMine)}>Mes cartes seulement</button>
            <button onClick={() => { setOnlyNew(v => !v); setOnlyMine(false); }} style={btn(onlyNew)}>Cartes non possédées</button>
            <button onClick={() => setOnlyIS(v => !v)} style={btn(onlyIS)}>In-Season seulement</button>
          </div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
            {slotsLeft <= 0 ? 'Compo complète : retire un joueur pour en ajouter un autre.' : `${rows.length} joueurs possibles : max ${maxStarNow}★ pour ce ${sel.length + 1}e emplacement. Clique pour ajouter. Clique un titre de colonne pour trier.`}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 900 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 104px 48px 48px 56px 52px 62px 52px 52px 80px 52px', gap: 4, fontSize: 11, opacity: 0.7, padding: '0 4px 4px', cursor: 'pointer', color: '#40e8ff' }}>
                <span onClick={() => sortBy('name')}>Joueur{arrow('name')}</span>
                <span onClick={() => sortBy('stars')} title="Étoiles de la carte (cap 16)">★{arrow('stars')}</span>
                <span title="Ta carte (🟣 In-Season, ✅ Classic) et son bonus, ou carte à acheter">Carte</span>
                <span onClick={() => sortBy('l5')} title="Moyenne des 5 derniers matchs">L5{arrow('l5')}</span>
                <span onClick={() => sortBy('l10')} title="Moyenne des 10 derniers matchs">L10{arrow('l10')}</span>
                <span onClick={() => sortBy('max')} title="Meilleur score sur les 10 derniers matchs">Plafond{arrow('max')}</span>
                <span onClick={() => sortBy('pics')} title="Nombre de matchs sur 10 à au moins L10 + 15 points : le joueur capable de pics" style={{ lineHeight: 1.1 }}>Pics{arrow('pics')}<br /><small style={{ fontSize: 9, opacity: 0.7 }}>≥ L10+15</small></span>
                <span onClick={() => sortBy('proj')} title="Projection Sorare pour le match de la nuit (comme sur la fiche joueur)" style={{ lineHeight: 1.1 }}>Proj.{arrow('proj')}<br /><small style={{ fontSize: 9, color: '#ffd24a' }}>Sorare</small></span>
                <span onClick={() => sortBy('d5')} title="Projection Sorare moins L5 : vert = Sorare voit mieux que sa forme récente" style={{ lineHeight: 1.1 }}>± L5{arrow('d5')}<br /><small style={{ fontSize: 9, opacity: 0.7 }}>proj−L5</small></span>
                <span onClick={() => sortBy('d10')} title="Projection Sorare moins L10" style={{ lineHeight: 1.1 }}>± L10{arrow('d10')}<br /><small style={{ fontSize: 9, opacity: 0.7 }}>proj−L10</small></span>
                <span onClick={() => sortBy('est')} title={metric === 'mix' ? 'Score estimé = projection myNFTlocker (70 % projection Sorare + 10 % L5 + 20 % L10) × bonus de la carte' : 'Score estimé = projection Sorare × bonus de la carte'} style={{ lineHeight: 1.1, color: '#4ade80' }}>Estimation{arrow('est')}<br /><small style={{ fontSize: 9 }}>{metric === 'mix' ? 'proj. myNFTlocker × bonus' : 'proj. Sorare × bonus'}</small></span>
                <span onClick={() => sortBy('eff')} title="Score estimé par étoile">Pts/★{arrow('eff')}</span>
              </div>
              {rows.slice(0, 150).map(({ x, o }) => {
                const p = x.p; const ow = own(p.slug);
                return (
                  <div key={p.slug} onClick={() => setSel(c => (c.length < 5 ? [...c, p.slug] : c))} style={{ display: 'grid', gridTemplateColumns: '1fr 40px 104px 48px 48px 56px 52px 62px 52px 52px 80px 52px', gap: 4, fontSize: 13, padding: '5px 4px', cursor: 'pointer', borderRadius: 6, background: ow ? 'rgba(0,255,255,0.08)' : 'transparent', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <span>{p.name} <span style={{ opacity: 0.5 }}>{p.team.split(' ').pop()} {p.home ? 'vs' : '@'} {p.opp.split(' ').pop()} {p.time}</span>{p.inj ? <span style={{ color: p.inj === 'GTD' ? '#ffb020' : '#ff4d4d' }}> {p.inj}</span> : null}</span>
                    <span>{p.stars}</span>
                    <span style={{ fontSize: 11, opacity: 0.9 }}>{o.buy ? 'À acheter' + (locked[p.slug] ? ' 🔒' : '') : (o.is ? '🟣 IS' : '✅ CL') + ' +' + Math.round(((o.pw ?? 1) - 1) * 100) + '%'}</span>
                    <span>{p.l5 == null ? '–' : p.l5.toFixed(0)}</span><span>{p.l10 == null ? '–' : p.l10.toFixed(0)}</span>
                    <span>{p.max == null ? '–' : p.max.toFixed(0)}</span><span>{pics(p) == null ? '–' : pics(p) + '/' + (p.sc?.length ?? 0)}</span>
                    <span style={{ color: '#ffd24a' }}>{p.proj.toFixed(0)}</span>
                    {(['l5', 'l10'] as const).map(k => { const d = p[k] == null ? null : p.proj - (p[k] as number); return <span key={k} style={{ color: d == null ? '#9aa' : d > 1 ? '#4ade80' : d < -1 ? '#ff6b6b' : '#cfd8dc' }}>{d == null ? '–' : (d > 0 ? '+' : '') + d.toFixed(0)}</span>; })}
                    <b style={{ color: '#4ade80' }}>{o.v.toFixed(0)}</b><span>{(o.v / p.stars).toFixed(1)}</span>
                  </div>
                );
              })}
              {rows.length > 150 && <div style={{ fontSize: 12, opacity: 0.6, padding: 6 }}>{rows.length - 150} autres : affine avec la recherche ou le tri.</div>}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
