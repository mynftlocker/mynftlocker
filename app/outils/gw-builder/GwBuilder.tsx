'use client';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { GP } from '../../../lib/gwLineup';
import { PRESETS, ARENAS, RARITIES, roomRar, rankRooms, autoAll, idealTotal, check, cardsFor, ageOk, solve, type CupMap, CUP_TIERS, allocate, cardValue, toCand, type Card, type Room, type RoomKind } from '../../../lib/gwAuto';
import { baseProj, gameAdj, statusMul } from '../../../lib/projBase';
import StarBg from '../../components/StarBg';
import type { Cand } from '../../../lib/gwLineup';
import { Slab, HexStars } from '../gw/Slab';
import { TEAMS } from '../../../lib/rotowire';

// GW Builder : toutes les compos de la Game Week dans l'ORDRE que tu choisis. Une carte = une seule compo : la compo la plus haut dans l'ordre la prend.
// Mode Auto (le moteur complete, tu peux imposer des cartes avec l'epingle) ou Manuel (seulement tes cartes).
const pillLink: React.CSSProperties = { fontSize: 12, padding: '4px 12px', borderRadius: 999, border: '1px solid rgba(255,255,255,.13)', background: 'rgba(255,255,255,.04)', color: 'rgba(255,255,255,.86)', textDecoration: 'none', whiteSpace: 'nowrap' };
const LSP = 'mnl_cup_pseudo_v1', LSR = 'mnl_gwb_rooms_v1';
const c = { cy: '#00ffff', gold: '#e5b94e', dim: 'rgba(255,255,255,.62)', line: 'rgba(255,255,255,.13)', card: 'rgba(8,12,28,.74)', red: '#ff6b6b', green: '#4ade80' };
const parisDay = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date(iso));
const dayLab = (s: string) => new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(s + 'T12:00:00Z'));
let seq = 0; const rid = () => 'r' + Date.now().toString(36) + (seq++);

const makeRoom = (kind: RoomKind, extra: Partial<Room> = {}): Room => {
  const p = PRESETS.find(x => x.kind === kind)!;
  return { id: rid(), kind, label: p.label, cap: p.cap, minIS: p.minIS, bonus: p.bonus, perTeam: 4, pins: [], auto: true, ...extra };
};
// Ordre par defaut : celui de ta methode (IS Champion 1, Cup, IS Contender 1, IS Champion 2, puis les Classic)
const defaultRooms = (night: string): Room[] => [
  makeRoom('is-champ', { label: 'In-Season Champion 1' }),
  makeRoom('cup', { label: 'Emirates NBA Cup · palier 2', minIS: 1, night }),
  makeRoom('is-cont', { label: 'In-Season Contender 1' }),
  makeRoom('is-champ', { label: 'In-Season Champion 2' }),
  makeRoom('cl-champ', { label: 'Classic Champion 1' }),
  makeRoom('cl-champ', { label: 'Classic Champion 2' }),
  makeRoom('cl-cont', { label: 'Classic Contender 1' }),
];

const Ring = ({ v, max, col, size = 54, label }: { v: number; max: number; col: string; size?: number; label?: string }) => {
  const R = 20, C = 2 * Math.PI * R, f = Math.max(0.02, Math.min(1, v / max));
  return (
    <svg viewBox="0 0 50 50" width={size} height={size} style={{ filter: `drop-shadow(0 0 8px ${col}66)`, flex: '0 0 auto' }}>
      <circle cx="25" cy="25" r={R} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="5" />
      <circle cx="25" cy="25" r={R} fill="none" stroke={col} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${C * f} ${C}`} transform="rotate(-90 25 25)" />
      <text x="25" y="29" textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff">{label ?? Math.round(v)}</text>
    </svg>
  );
};
const Chip = ({ t, ok = true, warn = false }: { t: string; ok?: boolean; warn?: boolean }) => <span style={{ fontSize: 12, padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap', color: warn ? c.gold : ok ? c.dim : c.red, border: `1px solid ${warn ? c.gold + '88' : ok ? c.line : c.red + '88'}`, background: ok && !warn ? 'rgba(255,255,255,.04)' : 'transparent' }}>{t}</span>;

// ===== Vue « Mes équipes » : une ligne par joueur (miniature de la carte, equipe, etoiles, bonus, matchs avec logo adverse, vs = domicile, @ = deplacement)
const ESP: Record<string, string> = { GSW: 'gs', NOP: 'no', NYK: 'ny', SAS: 'sa', UTA: 'utah', WAS: 'wsh' };
const logoOf = (abbr: string) => `https://a.espncdn.com/i/teamlogos/nba/500/${ESP[abbr] || abbr.toLowerCase()}.png`;
const ABBR: Record<string, string> = Object.fromEntries(Object.entries(TEAMS).map(([k, v]) => [v, k]));
const abbrOf = (n: string) => ABBR[n] || n.split(' ').pop()!.slice(0, 3).toUpperCase();
const wday = (iso: string) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short' }).format(new Date(iso)).replace('.', '');
const Logo = ({ ab, s }: { ab: string; s: number }) => /* eslint-disable-next-line @next/next/no-img-element */ <img src={logoOf(ab)} alt={ab} width={s} height={s} loading="lazy" style={{ width: s, height: s, objectFit: 'contain', flex: '0 0 auto' }} onError={e => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }} />;
function TeamRow({ x }: { x: Cand }) {
  const best = x.p.opp.length ? Math.max(...x.p.opp.map(o => o.pj ?? x.p.proj)) : 0;
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderTop: `1px solid ${c.line}` }}>
      {x.pic && /* eslint-disable-next-line @next/next/no-img-element */ <img src={x.pic} alt="" loading="lazy" style={{ height: 84, width: 'auto', borderRadius: 8, flex: '0 0 auto', boxShadow: '0 4px 14px rgba(0,0,0,.5)' }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <b style={{ fontSize: 15.5 }}>{x.p.name}</b>
          {x.p.inj && <span style={{ fontSize: 10.5, fontWeight: 700, padding: '1px 8px', borderRadius: 99, background: x.p.inj === 'GTD' || x.p.inj === 'QUEST' ? '#ffd914' : '#ff2828', color: x.p.inj === 'GTD' || x.p.inj === 'QUEST' ? '#0e0e0e' : '#fff' }}>{x.p.inj}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4, fontSize: 12.5, color: c.dim }}>
          <Logo ab={abbrOf(x.p.teamName)} s={18} /><span>{x.p.teamName}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><HexStars stars={x.p.stars} size="20px" /><span>{x.p.stars}★</span></span>
          {x.pw > 1 && <span style={{ color: c.cy, fontWeight: 700 }}>bonus +{Math.round((x.pw - 1) * 100)} %</span>}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 7 }}>
          {x.p.opp.map((o, i) => { const pj = o.pj ?? x.p.proj, top = x.p.opp.length > 1 && pj === best; const ab = abbrOf(o.o); return (
            <span key={i} title={top ? 'Meilleur match : c’est lui qui compte' : undefined} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px 3px 7px', borderRadius: 999, fontSize: 12, whiteSpace: 'nowrap', border: `1px solid ${top ? c.gold + 'aa' : c.line}`, background: top ? 'rgba(229,185,78,.12)' : 'rgba(255,255,255,.04)' }}>
              <span style={{ color: c.dim }}>{wday(o.d)}</span><span style={{ color: c.dim, fontWeight: 700 }}>{o.h ? 'vs' : '@'}</span><Logo ab={ab} s={16} /><span>{ab}</span><b style={{ color: c.gold }}>{Math.round(pj)}</b>
            </span>); })}
          {!x.p.opp.length && <span style={{ fontSize: 12, color: c.dim }}>pas de match</span>}
        </div>
      </div>
      <div style={{ textAlign: 'right', flex: '0 0 auto' }}><div style={{ fontWeight: 800, fontSize: 24, color: c.gold, lineHeight: 1 }}>{x.v.toFixed(1)}</div><div style={{ fontSize: 10, letterSpacing: 1, color: c.cy, marginTop: 3 }}>PROJ</div></div>
    </div>
  );
}

export default function GwBuilder() {
  const [gw, setGw] = useState<any>(null);
  const [err, setErr] = useState('');
  const [planOpen, setPlanOpen] = useState(false);
  const [acct, setAcct] = useState<boolean | null>(null);        // compte connecte ? (null = inconnu)
  const [saveSt, setSaveSt] = useState<'' | 'wait' | 'ok' | 'err'>('');
  const synced = useRef(false);
  const [autoBusy, setAutoBusy] = useState(false);
  const [clearAsk, setClearAsk] = useState(false);   // 2e clic pour confirmer « Tout effacer »
  const [autoMsg, setAutoMsg] = useState('');
  const [pseudo, setPseudo] = useState('memejacquet1998');
  const [rawCards, setRawCards] = useState<any[]>([]);
  const [used, setUsed] = useState<Record<string, string[]>>({});
  const [loadMsg, setLoadMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [noInj, setNoInj] = useState(true);
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [picker, setPicker] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [copied, setCopied] = useState(false);
  const [src, setSrc] = useState<'sorare' | 'mnl'>('mnl');   // source de projection
  const [view, setView] = useState<'build' | 'teams' | 'best'>('build');
  const [bestRar, setBestRar] = useState('limited');
  const [bestTier, setBestTier] = useState(2);
  const [plan, setPlan] = useState<Record<string, number>>({ 'isc|limited': 4, 'isk|limited': 3, 'clc|limited': 3, 'clk|limited': 3, 'ar|limited': 2 });
  const [shareMsg, setShareMsg] = useState('');
  const [cup, setCup] = useState<CupMap>({});
  const [thr, setThr] = useState<Record<string, { fifth: number; podium: number; first: number; rooms: number; list: number[] }>>({});
  const [onlyRent, setOnlyRent] = useState(true);
  const [buy, setBuy] = useState<{ id: string; n: 1 | 2; busy: boolean; msg: string; res: { adds: Card[]; total: number; gain: number }[] } | null>(null);
  const [splits, setSplits] = useState<Record<string, { home: number; away: number; b2b: number; n: number }>>({});

  useEffect(() => { fetch('/api/outils/gw').then(r => r.json()).then(j => j.error ? setErr(j.error) : setGw(j)).catch(e => setErr(String(e))); }, []);
  useEffect(() => { fetch('/api/outils/arena-thresholds').then(r => r.json()).then(j => j.thresholds && setThr(j.thresholds)).catch(() => {}); }, []);
  useEffect(() => { fetch('/api/outils/gw-splits').then(r => r.json()).then(j => j.splits && setSplits(j.splits)).catch(() => {}); }, []);
  useEffect(() => { try { const p = localStorage.getItem(LSP); if (p) setPseudo(p); } catch {} }, []);
  const players = useMemo(() => (gw?.players || []) as GP[], [gw]);
  // Projection d'un joueur = son MEILLEUR match de la GW (seul le meilleur score compte, qu'il joue 1, 2 ou 3 matchs).
  // Source "Sorare" : projection Sorare par match. Source "myNFTlocker" : 50 % Sorare + 30 % forme (moy. 10 derniers, ajustee domicile/exterieur et back-to-back d'apres l'historique des 3 dernieres saisons)
  // + 15 % plafond (meilleur des 10) + 5 % L5 (forme du moment). Statut : questionable -10 %, doubtful -15 %. Bonus 3 matchs : +2 d'office.
  const playersP = useMemo(() => players.map(p => {
    const days = new Set(p.opp.map(o => parisDay(o.d)));
    const prev = (d: string) => parisDay(new Date(new Date(d + 'T12:00:00Z').getTime() - 864e5).toISOString());
    const blend = (pj: number, o: { d: string; h: boolean }) => {
      if (src !== 'mnl') return pj;
      return baseProj({ pj, l10: p.l10, l5: p.l5, ceil: p.ceil, adj: gameAdj(splits[p.slug], o.h, days.has(prev(parisDay(o.d)))) });
    };
    const opp = p.opp.map(o => ({ ...o, pj: blend(o.pj ?? p.proj, o) }));
    const best = opp.length ? Math.max(...opp.map(o => o.pj)) : 0;
    const st = statusMul(p.inj);
    const proj = p.games > 0 ? (best + (p.games >= 3 ? 2 : 0)) * st : 0;
    return { ...p, opp, proj };
  }), [players, src, splits]);
  const nights = useMemo(() => [...new Set(players.flatMap(p => p.opp.map(o => parisDay(o.d))))].sort(), [players]);
  const fxSlug: string = gw?.fixture?.slug || '';

  // Ordre des compos : memorise dans le navigateur
  useEffect(() => {
    if (!nights.length || rooms) return;
    let r: Room[] | null = null;
    try { const s = localStorage.getItem(LSR); if (s) r = JSON.parse(s); } catch {}
    setRooms(Array.isArray(r) ? r.map(x => ({ ...x, pins: [], rar: x.rar?.length ? [x.rar[0]] : undefined })) : defaultRooms(nights.find(n => n >= parisDay(new Date().toISOString())) || nights[0]));
  }, [nights, rooms]);
  useEffect(() => { if (rooms) try { localStorage.setItem(LSR, JSON.stringify(rooms)); } catch {} }, [rooms]);

  // Sauvegarde des compos par GW pour un compte connecte (la connexion reste un bonus : sans compte, tout marche, memorise sur cet appareil)
  const gwNum = gw?.fixture?.gw;
  useEffect(() => {
    if (!gwNum || !rooms || synced.current) return;
    synced.current = true;
    fetch('/api/gw-compos?gw=' + gwNum).then(async r => {
      if (r.status === 401) { setAcct(false); return; }
      const j = await r.json(); setAcct(true);
      if (Array.isArray(j.saved?.rooms)) { setRooms(j.saved.rooms); if (j.saved.plan && Object.keys(j.saved.plan).length) setPlan(j.saved.plan); setSaveSt('ok'); }
    }).catch(() => setAcct(false));
  }, [gwNum, rooms]);
  useEffect(() => {
    if (!acct || !gwNum || !rooms || !synced.current) return;
    setSaveSt('wait');
    const t = setTimeout(() => {
      fetch('/api/gw-compos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gw: gwNum, rooms, plan }) })
        .then(r => setSaveSt(r.ok ? 'ok' : 'err')).catch(() => setSaveSt('err'));
    }, 1500);
    return () => clearTimeout(t);
  }, [rooms, plan, acct, gwNum]);

  // Collection + cartes deja alignees dans une compo de la GW
  const loadCol = async (pp: string) => {
    const slug = pp.trim().toLowerCase(); if (!slug || !fxSlug) return;
    setLoading(true); setLoadMsg(''); try { localStorage.setItem(LSP, slug); } catch {}
    try {
      const r = await fetch('/api/collection?slug=' + encodeURIComponent(slug));
      if (!r.ok || !r.body) throw new Error('http ' + r.status);
      const rd = r.body.getReader(), dec = new TextDecoder(); let buf = ''; const all: any[] = [];
      for (;;) {
        const { done, value } = await rd.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl; while ((nl = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1); if (!line) continue; const o = JSON.parse(line); if (o.error) throw new Error(o.error); if (o.cards) all.push(...o.cards); }
      }
      setRawCards(all.filter(x => x.__typename === 'NBACard'));
      try { const ru = await fetch('/api/outils/cup-used?fixture=' + encodeURIComponent(fxSlug)); if (ru.ok) { const ju = await ru.json(); setUsed(ju.used || {}); } } catch {}
    } catch (e: any) { setLoadMsg('Collection introuvable : ' + String(e?.message || e)); }
    setLoading(false);
  };
  useEffect(() => { if (fxSlug) loadCol(typeof window !== 'undefined' && localStorage.getItem(LSP) || 'memejacquet1998'); }, [fxSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pourquoi certaines cartes ne sont pas jouables cette GW : detail affiche sous l'indicateur
  const cardStats = useMemo(() => {
    const by: Record<string, GP> = {}; playersP.forEach(p => { by[p.slug] = p; });
    const st = { total: 0, nomatch: 0, inj: 0, engaged: 0, common: 0 };
    for (const x of rawCards) {
      const rar = String(x.rarityTyped || '').toLowerCase();
      if (!['limited', 'rare', 'super_rare', 'unique'].includes(rar)) { st.common++; continue; }
      st.total++;
      const p = by[x.anyPlayer?.slug];
      if (!p || p.games <= 0) { st.nomatch++; continue; }
      if (noInj && p.inj && p.inj !== 'GTD') { st.inj++; continue; }
      if (used[x.slug]) st.engaged++;
    }
    return st;
  }, [rawCards, playersP, used, noInj]);
  const cards: Card[] = useMemo(() => {
    const by: Record<string, GP> = {}; playersP.forEach(p => { by[p.slug] = p; });
    const out: Card[] = [];
    for (const x of rawCards) {
      const rar = String(x.rarityTyped || '').toLowerCase(); if (!['limited', 'rare', 'super_rare', 'unique'].includes(rar)) continue;
      const p = by[x.anyPlayer?.slug]; if (!p || p.games <= 0) continue;
      if (noInj && p.inj && p.inj !== 'GTD') continue;
      if (used[x.slug]) continue; // deja alignee dans une compo de cette GW
      out.push({ id: x.slug, p, is: !!x.inSeasonEligible, pw: Number(x.power) || 1, pic: x.pictureUrl || p.pic, rar });
    }
    return out;
  }, [rawCards, playersP, used, noInj]);

  // Cup : donnees de la nuit choisie (calendrier independant des GW) via l'API du Cup Builder
  const bestNights = useMemo(() => Array.from({ length: 5 }, (_, i) => parisDay(new Date(Date.now() + i * 864e5).toISOString())), []);
  const cupNights = useMemo(() => [...new Set([...(rooms || []).filter(r => r.kind === 'cup' && r.night).map(r => r.night as string), ...(view === 'best' ? bestNights : [])])], [rooms, view, bestNights]);
  useEffect(() => {
    cupNights.filter(n => !cup[n]).forEach(night => {
      fetch('/api/outils/cup?night=' + night).then(r => r.json()).then(j => {
        const m: Record<string, GP> = {};
        for (const p of j.players || []) {
          const v = baseProj({ pj: p.proj, l10: p.l10, l5: p.l5, ceil: p.max, adj: gameAdj(undefined, p.home, false) }) * statusMul(p.inj);
          m[p.slug] = { slug: p.slug, name: p.name, team: p.team, teamName: p.team, games: 1, opp: [{ d: night + 'T12:00:00Z', o: p.opp, h: p.home, pj: v }], stars: p.stars, proj: v, l10: p.l10, inj: p.inj || null, pic: null, ceil: p.max, l5: p.l5 } as GP;
        }
        setCup(c => ({ ...c, [night]: m }));
      }).catch(() => setCup(c => ({ ...c, [night]: {} })));
    });
  }, [cupNights]); // eslint-disable-line react-hooks/exhaustive-deps
  const rawRar = useMemo(() => Object.fromEntries(cards.map(x => [x.id, x.rar || 'limited'])) as Record<string, string>, [cards]);
  const results = useMemo(() => (rooms ? allocate(rooms, cards, cup) : []), [rooms, cards, cup]);
  // Rentabilite d'une Arena : projection de la compo contre le score MEDIAN de la 5e place sur les GW deja terminees (meme type de room, meme rarete)
  const rent = (r: Room, total: number) => {
    if (r.kind !== 'arena') return null;
    const t = r.arena || (r.label.includes('Uncapped') ? 'unc' : r.label.includes('Veterans') ? 'vet' : r.label.includes('U23') ? 'u23' : r.label.includes('Contender') ? 'cont' : 'champ');
    const th = thr[`${roomRar(r)[0]}|${t}`]; if (!th) return { th: null as null | typeof th, ok: true, ratio: 0, pass: 0 };
    const pass = th.list.filter(v => total >= v).length;
    return { th, ok: pass / Math.max(1, th.list.length) >= 0.5, ratio: total / th.fifth, pass };
  };
  const skipped = (res: typeof results[number]) => { const q = rent(res.room, res.total); return (onlyRent && !!q && !!q.th && !q.ok && res.lineup.length === 5) || (!!res.room.minProj && res.lineup.length === 5 && res.total < res.room.minProj); };
  // Onglet « Les meilleures » : pour chaque type de compo, la meilleure compo possible avec TES cartes (chaque type calcule seul, sans se partager les cartes)
  const bestList = useMemo(() => {
    if (view !== 'best' || !cards.length) return [];
    const base: { key: string; title: string; room: Room }[] = [];
    const R = [bestRar];
    base.push({ key: 'isc', title: 'In-Season Champion', room: makeRoom('is-champ', { rar: R }) }, { key: 'isk', title: 'In-Season Contender', room: makeRoom('is-cont', { rar: R }) },
      { key: 'clc', title: 'Classic Champion', room: makeRoom('cl-champ', { rar: R }) }, { key: 'clk', title: 'Classic Contender', room: makeRoom('cl-cont', { rar: R }) });
    for (const a of ARENAS) base.push({ key: 'ar' + a.k, title: a.label, room: makeRoom('arena', { label: a.label, rar: R, cap: a.cap, essence: a.essence, arena: a.k, minAge: 'minAge' in a ? a.minAge : undefined, maxAge: 'maxAge' in a ? a.maxAge : undefined }) });
    const t = CUP_TIERS.find(z => z.n === bestTier)!;
    for (const n of bestNights) if (cup[n] && Object.keys(cup[n]).length) base.push({ key: 'cup' + n, title: `Emirates NBA Cup · ${dayLab(n)}`, room: makeRoom('cup', { label: `Emirates NBA Cup · palier ${t.n}`, minIS: t.is, night: n, rar: R }) });
    return base.map(b => {
      const rr = roomRar(b.room);
      const free = cardsFor(cards, b.room, cup).filter(x => rr.includes(x.rar || 'limited') && ageOk(x.p, b.room)).map(x => toCand(x, b.room));
      const lineup = solve(free, b.room, []);
      const total = lineup.reduce((q, x) => q + x.v, 0);
      const ideal = b.room.kind === 'cup' ? 0 : idealTotal(playersP, b.room);
      return { ...b, lineup, total, ideal, issues: check(lineup, b.room), tier: b.room.kind === 'cup' ? t : null };
    });
  }, [view, cards, cup, bestRar, bestTier, bestNights, playersP]); // eslint-disable-line react-hooks/exhaustive-deps
  const patch = (id: string, f: (r: Room) => Room) => setRooms(rs => (rs || []).map(r => (r.id === id ? f(r) : r)));
  const move = (i: number, d: -1 | 1) => setRooms(rs => { const a = [...(rs || [])]; const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; });
  const MAXCL = 3; // Classic : 3 Champion + 3 Contender maximum
  const count = (kind: RoomKind) => (rooms || []).filter(r => r.kind === kind && roomRar(r)[0] === 'limited').length;
  const addArena = (a: typeof ARENAS[number]) => setRooms(rs => [...(rs || []), makeRoom('arena', { label: `${a.label} ${(rs || []).filter(r => r.label.startsWith(a.label)).length + 1}`, cap: a.cap, essence: a.essence, arena: a.k, minAge: 'minAge' in a ? a.minAge : undefined, maxAge: 'maxAge' in a ? a.maxAge : undefined, rar: ['limited'] })]);
  const rank = () => setRooms(rs => rankRooms(rs || [], cards, playersP, cup));
  // Plan complet : genere toutes les compos dans l'ordre de preference (IS en alternance, puis Classic, puis Arena), en gardant la Cup
  const mp = (k: string) => plan['min|' + k] || undefined;   // seuil mini de projection du type (0 = aucun)
  const genPlan = () => setRooms(rs => {
    const keep = (rs || []).filter(r => r.kind === 'cup').map(r => ({ ...r, pins: [] }));
    const out: Room[] = [];
    for (const ra of RARITIES.slice(0, 3)) {
      const nm = ra.k === 'limited' ? '' : ` ${ra.l}`, g = (k: string) => plan[`${k}|${ra.k}`] || 0, rar = [ra.k];
      let a = g('isc'), b = g('isk'), n1 = 0, n2 = 0;
      while (a > 0 || b > 0) { if (a > 0) { out.push(makeRoom('is-champ', { label: `In-Season Champion${nm} ${++n1}`, rar, minProj: mp('isc') })); a--; } if (b > 0) { out.push(makeRoom('is-cont', { label: `In-Season Contender${nm} ${++n2}`, rar, minProj: mp('isk') })); b--; } }
      let c1 = Math.min(MAXCL, g('clc')), c2 = Math.min(MAXCL, g('clk')), m1 = 0, m2 = 0; // Classic : 3 max par type et par rareté
      while (c1 > 0 || c2 > 0) { if (c1 > 0) { out.push(makeRoom('cl-champ', { label: `Classic Champion${nm} ${++m1}`, rar, minProj: mp('clc') })); c1--; } if (c2 > 0) { out.push(makeRoom('cl-cont', { label: `Classic Contender${nm} ${++m2}`, rar, minProj: mp('clk') })); c2--; } }
      for (let i = 1; i <= g('ar'); i++) out.push(makeRoom('arena', { label: `Arena Champion${nm} ${i}`, essence: 150, arena: 'champ', rar, minProj: mp('ar') }));
    }
    return [...out.slice(0, 1), ...keep, ...out.slice(1)];
  });
  // Tout generer automatiquement : le maximum de compos viables avec toutes les cartes, du plus rentable au moins rentable
  const runAuto = () => {
    if (!rooms) return; setAutoBusy(true); setAutoMsg('');
    setTimeout(() => {
      try {
        const keepCup = rooms.filter(r => r.kind === 'cup');
        const minProj: Record<string, number> = {}; for (const k of ['isc', 'isk', 'clc', 'clk', 'ar']) minProj[k] = plan['min|' + k] || 0;
        const o = autoAll({ cards, players: playersP, cup, keepCup, minProj, mk: (k, e) => makeRoom(k, e), arena: (r, t) => { const q = rent(r, t); return q && q.th ? { ok: q.ok, ratio: q.ratio } : null; } });
        setRooms(o.rooms);
        const n = (f: (r: Room) => boolean) => o.rooms.filter(f).length;
        setAutoMsg(`${o.rooms.length} compos viables générées : ${n(r => r.kind === 'is-champ' || r.kind === 'is-cont')} In-Season · ${n(r => r.kind === 'cl-champ' || r.kind === 'cl-cont')} Classic · ${n(r => r.kind === 'arena')} Arena rentables${n(r => r.kind === 'cup') ? ` · ${n(r => r.kind === 'cup')} Cup` : ''}.${o.arenaSkipped ? ` ${o.arenaSkipped} type(s) d’Arena écarté(s) car non rentables.` : ''}${o.arenaUnknown ? ' Seuils Arena indisponibles pour certains types : non créés.' : ''}`);
      } catch (e: any) { setAutoMsg('Génération impossible : ' + String(e?.message || e)); }
      setAutoBusy(false);
    }, 30);
  };
  // Acheter 1 ou 2 cartes : on cherche, parmi les meilleurs joueurs de la GW, la ou les cartes EN VENTE qui font le plus monter cette compo
  // (visuel In-Season pour les compos IS et la Cup, Classic pour les Classic et les Arena). Pour 2 cartes : on garde les meilleures premieres achats puis on cherche le meilleur complement.
  const runBuy = async (room: Room, n: 1 | 2) => {
    setBuy({ id: room.id, n, busy: true, msg: '', res: [] });
    try {
      const isRoom = room.kind === 'is-champ' || room.kind === 'is-cont' || room.kind === 'cup', rar = roomRar(room)[0];
      const cand = [...(room.kind === 'cup' && room.night && cup[room.night] ? Object.values(cup[room.night]) : playersP)].filter(p => p.games > 0 && p.proj > 0 && p.inj !== 'OUT' && ageOk(p, room)).sort((a, b) => b.proj - a.proj).slice(0, 40);
      const offers: Record<string, any> = {};
      for (let i = 0; i < cand.length; i += 20) {
        const r = await fetch(`/api/outils/gw-market?rar=${rar}&slugs=${cand.slice(i, i + 20).map(p => p.slug).join(',')}`); const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'marché indisponible'); Object.assign(offers, j.offers || {});
      }
      const extras: Card[] = [];
      for (const p of cand) { const o = offers[p.slug]?.[isRoom ? 'is' : 'cl']; if (o) extras.push({ id: 'buy:' + o.card, p, is: isRoom, pw: o.power || 1, pic: o.pic, rar, buy: { eur: o.eur, url: 'https://sorare.com/nba/cards/' + o.card } }); }
      if (!extras.length) throw new Error('aucune carte en vente trouvée pour cette rareté');
      const here = results.find(x => x.room.id === room.id)!;
      const taken = new Set(results.filter(x => x.room.id !== room.id).flatMap(x => x.lineup.map(l => l.id)));
      const rr = roomRar(room);
      const pool = cardsFor(cards, room, cup).filter(c => !taken.has(c.id) && rr.includes(c.rar || 'limited') && ageOk(c.p, room));
      const lockedC = room.pins.map(id => cardsFor(cards, room, cup).find(c => c.id === id)).filter(Boolean).map(c => toCand(c as Card, room));
      const tot = (extra: Card[]) => { const lu = solve([...pool, ...extra].map(c => toCand(c, room)), room, lockedC); return { lu, t: lu.length === 5 ? lu.reduce((s, c) => s + c.v, 0) : 0 }; };
      const base = here.lineup.length === 5 ? here.total : 0;
      const one = extras.map(e => { const r = tot([e]); return { adds: [e], total: r.t, gain: r.t - base, used: r.lu.some(c => c.id === e.id) }; }).filter(x => x.used && x.gain > 0.05).sort((a, b) => b.gain - a.gain);
      let out: { adds: Card[]; total: number; gain: number }[] = one.slice(0, 6);
      if (n === 2) {
        const pairs: { adds: Card[]; total: number; gain: number }[] = [];
        for (const a of one.slice(0, 6)) for (const b of extras) {
          if (b.p.slug === a.adds[0].p.slug) continue; const r = tot([a.adds[0], b]);
          if (r.lu.some(c => c.id === a.adds[0].id) && r.lu.some(c => c.id === b.id) && r.t - base > 0.05) pairs.push({ adds: [a.adds[0], b], total: r.t, gain: r.t - base });
        }
        out = pairs.sort((a, b) => b.gain - a.gain).slice(0, 5);
      }
      setBuy({ id: room.id, n, busy: false, msg: out.length ? '' : 'Aucun achat n’améliore cette compo.', res: out.map(({ adds, total, gain }) => ({ adds, total, gain })) });
    } catch (e: any) { setBuy({ id: room.id, n, busy: false, msg: 'Achat impossible : ' + String(e?.message || e), res: [] }); }
  };
  const shareTeam = async (res: typeof results[number], i: number) => {
    try {
      const title = `${res.room.label}`;
      const d = btoa(unescape(encodeURIComponent(JSON.stringify({ t: `${title} · GW ${gw?.fixture?.gw ?? ''}`, u: `${res.total.toFixed(1)} pts`, c: res.lineup.map(x => ({ n: x.p.name, tn: x.p.teamName, v: Number(x.v.toFixed(1)), p: x.real ? x.pic : null, s: x.p.stars, b: Math.round((x.pw - 1) * 100), i: x.p.inj, g: x.p.opp })) })))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const r = await fetch('/api/gw-img?d=' + d); if (!r.ok) throw new Error('image ' + r.status);
      const blob = await r.blob(); const file = new File([blob], `compo-${i + 1}-gw${gw?.fixture?.gw ?? ''}.png`, { type: 'image/png' });
      const nav: any = navigator;
      if (nav.canShare?.({ files: [file] })) { try { await nav.share({ files: [file], text: title }); return; } catch {} }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
    } catch (e: any) { setShareMsg('Partage impossible : ' + String(e?.message || e)); setTimeout(() => setShareMsg(''), 3000); }
  };
  const add = (kind: RoomKind) => setRooms(rs => {
    if ((kind === 'cl-champ' || kind === 'cl-cont') && (rs || []).filter(r => r.kind === kind && roomRar(r)[0] === 'limited').length >= MAXCL) return rs || [];
    const n = (rs || []).filter(r => r.kind === kind).length + 1; const p = PRESETS.find(x => x.kind === kind)!;
    return [...(rs || []), makeRoom(kind, { label: kind === 'cup' ? 'Emirates NBA Cup · palier 2' : `${p.label} ${n}`, ...(kind === 'cup' ? { minIS: 1, night: nights[0] } : {}) })];
  });
  const arenaOk = results.filter(r => r.room.kind === 'arena' && r.lineup.length === 5 && !r.issues.length && !skipped(r));
  const nArena = arenaOk.length, essenceIn = arenaOk.reduce((s, r) => s + (r.room.essence || 0), 0);
  const nDone = results.filter(r => r.lineup.length === 5 && !r.issues.length && !skipped(r)).length;
  const usedCards = new Set(results.flatMap(r => r.lineup.map(x => x.id)));

  const recap = () => {
    const t = `GW ${gw?.fixture?.gw ?? ''}\n` + results.map((r, i) => `${i + 1}. ${r.room.label} — ${r.lineup.map(x => x.p.name).join(', ')} (${r.total.toFixed(0)} pts, ${r.stars}★)`).join('\n');
    navigator.clipboard?.writeText(t).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }).catch(() => {});
  };

  const glass: React.CSSProperties = { background: `linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.01)), ${c.card}`, border: `1px solid ${c.line}`, borderRadius: 18, backdropFilter: 'blur(8px)' };
  const btn = (on = false): React.CSSProperties => ({ background: on ? 'rgba(0,255,255,.14)' : 'rgba(255,255,255,.06)', border: `1px solid ${on ? c.cy : c.line}`, color: on ? c.cy : '#fff', borderRadius: 10, padding: '7px 12px', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' });
  const pill = (on = false): React.CSSProperties => ({ background: on ? 'rgba(0,255,255,.12)' : 'rgba(255,255,255,.04)', border: `1px solid ${on ? c.cy + '99' : c.line}`, color: on ? c.cy : 'rgba(255,255,255,.86)', borderRadius: 999, padding: '4px 11px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' });
  const addPill = (gold = false): React.CSSProperties => ({ background: gold ? 'rgba(229,185,78,.08)' : 'rgba(0,255,255,.07)', border: `1px solid ${gold ? c.gold + '88' : 'rgba(0,255,255,.5)'}`, color: '#fff', borderRadius: 999, padding: '5px 13px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' });
  const lab: React.CSSProperties = { fontSize: 10.5, letterSpacing: 1.2, color: c.dim, textTransform: 'uppercase', marginRight: 2 };
  const inp: React.CSSProperties = { background: 'rgba(0,0,0,.4)', color: '#fff', border: `1px solid ${c.line}`, borderRadius: 10, padding: '8px 10px', fontSize: 14 };

  // Fenetre de choix : TOUTES les cartes de ta collection, regroupees par joueur (stock, statut de chaque exemplaire)
  const pickerRoom = rooms?.find(r => r.id === picker);
  const pickerRes = results.find(r => r.room.id === picker);
  const pickerGroups = useMemo(() => {
    if (!pickerRoom || !pickerRes) return [];
    const ql = q.toLowerCase(), rr = roomRar(pickerRoom);
    const mine = pickerRes.lineup.filter(x => pickerRoom.pins.includes(x.id));
    const cost = mine.reduce((s, x) => s + x.cost, 0), cnt: Record<string, number> = {}; mine.forEach(x => { cnt[x.p.team] = (cnt[x.p.team] || 0) + 1; });
    const where = (id: string) => results.findIndex(r => r.room.id !== picker && r.lineup.some(l => l.id === id));
    const pinnedAt = (id: string) => (rooms || []).findIndex(r => r.id !== picker && r.pins.includes(id));
    const by = new Map<string, { p: GP; list: { x: Card; v: number; st: string; ok: boolean; why: string }[] }>();
    for (const x of cardsFor(cards, pickerRoom, cup)) {
      if (!rr.includes(x.rar || 'limited') || !ageOk(x.p, pickerRoom)) continue;
      if (ql && !(x.p.name + ' ' + x.p.teamName).toLowerCase().includes(ql)) continue;
      const v = cardValue(x, pickerRoom); if (v <= 0) continue;
      const here = pickerRoom.pins.includes(x.id), pe = pinnedAt(x.id), w = where(x.id);
      const samePlayer = mine.some(m => m.p.slug === x.p.slug && m.id !== x.id);
      let why = '';
      if (!here) {
        if (pe >= 0) why = `imposée en compo ${pe + 1}`;
        else if (samePlayer) why = 'joueur déjà choisi';
        else if (cost + Math.round(x.p.stars * 2) > pickerRoom.cap * 2) why = 'dépasse le plafond d’étoiles';
        else if ((cnt[x.p.team] || 0) >= pickerRoom.perTeam) why = `déjà ${pickerRoom.perTeam} joueurs de ${x.p.teamName}`;
      }
      const g = by.get(x.p.slug) || { p: x.p, list: [] }; by.set(x.p.slug, g);
      g.list.push({ x, v, st: here ? 'ici' : w >= 0 ? `en compo ${w + 1}` : 'libre', ok: !why, why });
    }
    return [...by.values()].map(g => ({ ...g, best: Math.max(...g.list.map(z => z.v)) })).sort((a, b) => b.best - a.best).slice(0, 40);
  }, [pickerRoom, pickerRes, cards, results, rooms, picker, q, cup]);

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#030510', color: '#fff' }}>
      <StarBg />
      <style>{'.gwb-row{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}.gwb-cell{container-type:inline-size}.gwb-pick{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}@media(max-width:700px){.gwb-pick{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:700px){.gwb-row{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}}'}</style>
      <main style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '22px 14px 80px', fontFamily: 'system-ui,sans-serif' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <nav style={{ display: 'flex', gap: 6, marginBottom: 10 }} aria-label="Navigation">
              <a href="/" style={pillLink}>← Vestiaire</a>
              <a href="/?vue=galerie" style={pillLink}>Galerie</a>
            </nav>
            <h1 style={{ fontSize: 28, margin: '0 0 4px', letterSpacing: '.01em' }}>GW <span style={{ color: c.cy }}>Builder</span></h1>
            <p style={{ color: c.dim, fontSize: 14, margin: 0 }}>{gw ? `GW ${gw.fixture.gw} · ${gw.fixture.games} matchs` : err || 'Chargement de la GW…'} · tes compos dans l’ordre que tu choisis : une carte ne sert qu’une fois, la compo la plus haute la prend.</p>
          </div>
          <a href="/" title="Retour à myNFTlocker" style={{ flex: '0 0 auto' }}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/logo-pack.png" alt="myNFTlocker" style={{ height: 'clamp(72px,14vw,112px)', width: 'auto', display: 'block', filter: 'drop-shadow(0 8px 22px rgba(0,255,255,.28))' }} /></a>
        </header>

        {/* Synthese */}
        <div style={{ ...glass, padding: '14px 16px', marginBottom: 14, display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', justifyContent: 'space-between', border: `1px solid rgba(0,255,255,.28)`, background: 'radial-gradient(120% 160% at 0% 0%, rgba(0,255,255,.14), rgba(7,11,28,0) 60%), ' + c.card }}>
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'center' }}>
            <div><div style={{ fontSize: 12, color: c.dim, letterSpacing: 1 }}>COMPOS PRÊTES</div><div style={{ fontSize: 34, fontWeight: 800, color: c.cy, textShadow: '0 0 18px rgba(0,255,255,.5)', lineHeight: 1.1 }}>{nDone}<span style={{ color: c.dim, fontSize: 18, textShadow: 'none' }}> / {results.length}</span></div></div>
            <div><div style={{ fontSize: 12, color: c.dim, letterSpacing: 1 }}>CARTES ENGAGÉES</div><div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.2 }}>{usedCards.size}<span style={{ color: c.dim, fontSize: 18 }}> / {cards.length}</span></div><div style={{ fontSize: 11.5, color: c.dim }}>jouables sur {cardStats.total} cartes de jeu · {cardStats.nomatch} sans match · {cardStats.inj} blessées · {cardStats.engaged} déjà alignées</div></div>
            <div><div style={{ fontSize: 12, color: c.dim, letterSpacing: 1 }}>ESSENCE ARENA</div><div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.2, color: c.gold }}>{essenceIn}<span style={{ color: c.dim, fontSize: 16 }}> Ess.</span></div><div style={{ fontSize: 11.5, color: c.dim }}>{nArena} Arena rentables</div></div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ fontSize: 13, color: c.dim, display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={onlyRent} onChange={e => setOnlyRent(e.target.checked)} /> Écarter les Arena non rentables</label>
            <label style={{ fontSize: 13, color: c.dim, display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={noInj} onChange={e => setNoInj(e.target.checked)} /> Exclure les blessés</label>
            <input value={pseudo} onChange={e => setPseudo(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadCol(pseudo)} style={{ ...inp, width: 150 }} aria-label="Compte Sorare" />
            <button onClick={() => loadCol(pseudo)} style={btn()}>Recharger</button>
            <button onClick={recap} style={btn(copied)}>{copied ? 'Copié ✓' : 'Copier le récap'}</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
          <button onClick={() => setView('build')} style={btn(view === 'build')}>Construire</button>
          <button onClick={() => setView('best')} style={btn(view === 'best')}>★ Les meilleures</button>
          <button onClick={() => setView('teams')} style={btn(view === 'teams')}>Mes équipes ({results.filter(r => r.lineup.length === 5 && !skipped(r)).length})</button>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: c.dim }}>Projection :</span>
          <button onClick={() => setSrc('mnl')} style={btn(src === 'mnl')}>myNFTlocker</button>
          <button onClick={() => setSrc('sorare')} style={btn(src === 'sorare')}>Sorare (Rotowire)</button>
        </div>
        {shareMsg && <p style={{ color: c.red, fontSize: 13 }}>{shareMsg}</p>}
        {loadMsg && <p style={{ color: c.gold, fontSize: 13 }}>{loadMsg}</p>}
        {loading && <p style={{ color: c.dim, fontSize: 13 }}>Chargement de ta collection…</p>}

        {view === 'best' && (
          <div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
              <span style={lab}>Rareté</span>
              {RARITIES.map(ra => <button key={ra.k} onClick={() => setBestRar(ra.k)} style={pill(bestRar === ra.k)}>{ra.l}</button>)}
              <span style={{ ...lab, marginLeft: 10 }}>Cup : palier</span>
              <select value={bestTier} onChange={e => setBestTier(+e.target.value)} style={{ ...inp, padding: '4px 8px' }}>{CUP_TIERS.map(t => <option key={t.n} value={t.n}>{t.n} · {t.pts} pts · {t.is} IS min</option>)}</select>
            </div>
            <p style={{ color: c.dim, fontSize: 12.5, margin: '0 2px 12px' }}>La meilleure compo possible pour chaque type avec tes cartes. Chaque type est calculé séparément : une même carte peut apparaître dans plusieurs.</p>
            {!bestList.length && <p style={{ color: c.dim }}>{loading ? 'Chargement…' : 'Aucune carte jouable.'}</p>}
            {bestList.map(b => { const q = rent(b.room, b.total); const full = b.lineup.length === 5 && !b.issues.length; return (
              <section key={b.key} style={{ ...glass, padding: 14, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                  <div style={{ flex: '1 1 200px', minWidth: 0 }}><div style={{ fontSize: 17, fontWeight: 700 }}>{b.title}</div><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 5 }}>
                    <Chip t={`${b.lineup.reduce((x, y) => x + y.cost, 0) / 2}/${b.room.cap}★`} />
                    {b.room.minIS > 0 && <Chip t={`${b.lineup.filter(x => x.is).length}/${b.room.minIS} In-Season`} ok={b.lineup.filter(x => x.is).length >= b.room.minIS} />}
                    {b.ideal > 0 && full && <Chip t={`${Math.round(b.total / b.ideal * 100)} % du potentiel max`} />}
                    {b.tier && full && <Chip t={`objectif ${b.tier.pts} : ${b.total >= b.tier.pts ? 'atteint' : `il manque ${Math.round(b.tier.pts - b.total)}`}`} ok={b.total >= b.tier.pts} warn={b.total < b.tier.pts} />}
                    {q && q.th && full && <Chip t={q.ok ? `Rentable · seuil 5e place ${Math.round(q.th.fifth)}` : `Non rentable · seuil 5e place ${Math.round(q.th.fifth)}`} ok={q.ok} warn={!q.ok} />}
                    {b.room.essence ? <Chip t={`${b.room.essence} Essence`} warn /> : null}
                  </div></div>
                  {full && <div style={{ textAlign: 'right' }}><div style={{ fontSize: 11, color: c.dim, letterSpacing: 1 }}>TOTAL</div><div style={{ fontSize: 30, fontWeight: 800, color: c.cy, textShadow: '0 0 16px rgba(0,255,255,.45)', lineHeight: 1 }}>{b.total.toFixed(1)}</div></div>}
                </div>
                {full ? <div className="gwb-row">{b.lineup.map(cd => <div key={cd.id} className="gwb-cell"><Slab c={cd} u={n => `${n}cqw`} art={cd.real ? cd.pic : null} /></div>)}</div>
                  : <p style={{ margin: 0, color: c.dim, fontSize: 13 }}>Pas assez de cartes {RARITIES.find(z => z.k === bestRar)?.l} pour une compo complète.</p>}
              </section>); })}
          </div>
        )}
        {view === 'teams' && (
          <div>
            {results.filter(r => r.lineup.length === 5 && !skipped(r)).map((res, i) => (
              <section key={res.room.id} style={{ ...glass, padding: 14, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                  <div style={{ flex: '1 1 160px', minWidth: 0 }}><div style={{ fontSize: 17, fontWeight: 700 }}>{res.room.label}</div><div style={{ fontSize: 12, color: c.dim }}>{res.stars}/{res.room.cap}★ · {res.nIS} In-Season</div></div>
                  <div style={{ textAlign: 'right' }}><div style={{ fontSize: 11, color: c.dim, letterSpacing: 1 }}>TOTAL</div><div style={{ fontSize: 28, fontWeight: 800, color: c.cy, textShadow: '0 0 14px rgba(0,255,255,.5)', lineHeight: 1 }}>{res.total.toFixed(1)}</div></div>
                  <button onClick={() => shareTeam(res, i)} style={btn()}>Partager</button>
                </div>
                {res.lineup.map(x => <TeamRow key={x.id} x={x} />)}
              </section>
            ))}
            {!results.some(r => r.lineup.length === 5) && <p style={{ color: c.dim }}>Aucune équipe complète pour l’instant.</p>}
          </div>
        )}
        <div style={{ display: view === 'build' ? 'block' : 'none' }}>
        {/* Barre de commande : ajouter / classer / générer */}
        <div style={{ ...glass, padding: '10px 12px', marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: c.cy, marginRight: 4, whiteSpace: 'nowrap' }}>＋ Ajouter une compo</span>
            {PRESETS.filter(p => p.kind !== 'arena').map(p => { const lim = (p.kind === 'cl-champ' || p.kind === 'cl-cont') && count(p.kind) >= MAXCL; return <button key={p.kind} disabled={lim} onClick={() => add(p.kind)} style={{ ...addPill(), opacity: lim ? 0.35 : 1 }}>+ {p.label.replace('In-Season', 'IS').replace('Emirates NBA Cup', 'Cup')}{p.kind === 'cl-champ' || p.kind === 'cl-cont' ? ` ${count(p.kind)}/${MAXCL}` : ''}</button>; })}
            <span style={{ fontSize: 12, fontWeight: 700, color: c.gold, margin: '0 2px 0 8px', whiteSpace: 'nowrap' }}>Arena</span>
            {ARENAS.map(a => <button key={a.k} onClick={() => addArena(a)} title={`${a.label} · ${a.essence} Essence`} style={addPill(true)}>+ {a.label.replace('Arena ', '')}</button>)}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: `1px solid ${c.line}` }}>
            <button onClick={runAuto} disabled={autoBusy || !rooms || !cards.length} title="Crée le maximum de compos viables avec toutes tes cartes, en respectant toutes les règles Sorare" style={{ background: 'linear-gradient(135deg,rgba(0,255,255,.3),rgba(229,185,78,.28))', border: `1px solid ${c.cy}`, color: '#fff', borderRadius: 999, padding: '7px 18px', fontSize: 13.5, fontWeight: 800, cursor: autoBusy ? 'wait' : 'pointer', boxShadow: '0 0 18px rgba(0,255,255,.28)', whiteSpace: 'nowrap', opacity: autoBusy ? 0.7 : 1 }}>{autoBusy ? 'Calcul en cours…' : '⚡ Tout générer automatiquement'}</button>
            <button onClick={rank} style={pill()}>Classer par chance de perf</button>
            <button onClick={() => setPlanOpen(o => !o)} style={pill(planOpen)}>Générer tout le plan {planOpen ? '▴' : '▾'}</button>
            {acct && saveSt && <span style={{ fontSize: 11, color: saveSt === 'err' ? c.red : c.dim, marginLeft: 6 }}>{saveSt === 'wait' ? 'Sauvegarde…' : saveSt === 'ok' ? 'Compos sauvegardées ✓' : 'Sauvegarde impossible'}</span>}
            <button onClick={() => { if (!clearAsk) { setClearAsk(true); setTimeout(() => setClearAsk(false), 3500); return; } setRooms([]); setPlan({}); setAutoMsg(''); setClearAsk(false); }} title="Supprime toutes les compos pour repartir de zéro" style={{ ...pill(clearAsk), marginLeft: 'auto', color: clearAsk ? c.red : c.dim, borderColor: clearAsk ? c.red : undefined }}>{clearAsk ? 'Confirmer : tout effacer ?' : 'Tout effacer'}</button>
          </div>
          {autoMsg && <div style={{ marginTop: 8, fontSize: 12.5, color: c.green }}>{autoMsg}</div>}
          {planOpen && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${c.line}` }}>
              <div style={{ fontSize: 11.5, color: c.dim, marginBottom: 6 }}>Nombre de compos par type et par rareté (Classic : 3 max) et seuil mini de projection : une compo sous le seuil n’est pas jouée. Remplace l’ordre actuel, garde la Cup.</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(110px,1fr) repeat(3,62px) 78px', gap: '4px 8px', alignItems: 'center', maxWidth: 420, fontSize: 12.5 }}>
                <span />{RARITIES.slice(0, 3).map(ra => <span key={ra.k} style={{ color: c.dim, fontSize: 11, textAlign: 'center', whiteSpace: 'nowrap' }}>{ra.l}</span>)}<span style={{ color: c.gold, fontSize: 11, textAlign: 'center', whiteSpace: 'nowrap' }}>Seuil mini</span>
                {([['isc', 'IS Champion', 99], ['isk', 'IS Contender', 99], ['clc', 'Classic Champion', 3], ['clk', 'Classic Contender', 3], ['ar', 'Arena Champion', 20]] as const).map(([k, l, mx]) => (
                  <Fragment key={k}><span>{l}</span>{RARITIES.slice(0, 3).map(ra => <input key={ra.k} type="number" min={0} max={mx} value={plan[`${k}|${ra.k}`] || 0} onChange={e => setPlan(pl => ({ ...pl, [`${k}|${ra.k}`]: Math.max(0, Math.min(mx, +e.target.value || 0)) }))} style={{ ...inp, width: 62, padding: '4px 6px', fontSize: 13, textAlign: 'center', boxSizing: 'border-box' }} />)}<input type="number" min={0} max={999} placeholder="—" value={plan['min|' + k] || ''} onChange={e => setPlan(pl => ({ ...pl, ['min|' + k]: Math.max(0, Math.min(999, +e.target.value || 0)) }))} style={{ ...inp, width: 78, padding: '4px 6px', fontSize: 13, textAlign: 'center', boxSizing: 'border-box', borderColor: c.gold + '66' }} /></Fragment>
                ))}
              </div>
              <div style={{ marginTop: 8 }}><button onClick={() => { genPlan(); setPlanOpen(false); }} style={{ ...pill(true), padding: '5px 14px' }}>Générer</button></div>
            </div>
          )}
        </div>

        {acct === false && <p style={{ margin: '-6px 2px 12px', fontSize: 12, color: c.dim }}>Compos mémorisées sur cet appareil. <a href="/" style={{ color: c.cy }}>Connecte-toi</a> pour les retrouver partout, GW par GW.</p>}
        {rooms && rooms.length === 0 && <div style={{ ...glass, padding: '26px 18px', textAlign: 'center', color: c.dim, fontSize: 14 }}>Aucune compo pour l’instant. Ajoute-en une avec les boutons <b style={{ color: c.cy }}>+</b> ci-dessus, ou lance <b style={{ color: '#fff' }}>⚡ Tout générer automatiquement</b>.</div>}
        {/* Compos dans l'ordre */}
        {results.map((res, i) => {
          const r = res.room; const full = res.lineup.length === 5; const cupT = r.kind === 'cup' ? CUP_TIERS.find(t => r.label.includes('palier ' + t.n)) : null;
          const col = !full ? c.dim : res.issues.length ? c.red : cupT ? (res.total >= cupT.pts ? c.green : c.gold) : c.cy;
          return (
            <section key={r.id} style={{ ...glass, padding: 14, marginBottom: 14, opacity: skipped(res) ? 0.5 : 1, borderColor: res.issues.length && full ? c.red + '66' : c.line }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
                <span style={{ width: 30, height: 30, borderRadius: 99, display: 'grid', placeItems: 'center', fontWeight: 800, color: '#001018', background: c.cy, boxShadow: '0 0 14px rgba(0,255,255,.5)', flex: '0 0 auto' }}>{i + 1}</span>
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{r.label}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 5 }}>
                    <Chip t={`${res.stars}/${r.cap}★`} ok={res.stars <= r.cap} />
                    <Chip t={`${res.nIS}${r.minIS ? '/' + r.minIS : ''} In-Season`} ok={res.nIS >= r.minIS} />
                    <Chip t={`max ${res.maxTeam}/${r.perTeam} par équipe`} ok={res.maxTeam <= r.perTeam} />
                    {r.night && <Chip t={`nuit du ${dayLab(r.night)}`} />}
                    {!r.bonus && <Chip t="sans bonus XP" />}{r.minProj ? <Chip t={`seuil mini ${r.minProj}`} ok={res.total >= r.minProj} /> : null}
                    {r.essence != null && <Chip t={`${r.essence} Essence`} warn />}{(() => { const q = rent(r, res.total); if (!q || !q.th || res.lineup.length < 5) return null; return <Chip t={`${q.ok ? 'Rentable' : 'Non rentable'} · proj ${res.total.toFixed(0)} · 5e place atteinte dans ${q.pass}/${q.th.list.length} rooms (seuil ${q.th.list[0].toFixed(0)}–${q.th.list[q.th.list.length - 1].toFixed(0)}, médian ${q.th.fifth.toFixed(0)})`} ok={q.ok} warn={!q.ok} />; })()}{r.minAge != null && <Chip t={`${r.minAge} ans et +`} />}{r.maxAge != null && <Chip t={`${r.maxAge} ans max`} />}{r.cap >= 99 && <Chip t="sans plafond" />}
                    {RARITIES.map(ra => { const on = roomRar(r).includes(ra.k); return <button key={ra.k} onClick={() => patch(r.id, x => ({ ...x, rar: [ra.k], pins: x.pins.filter(id => rawRar[id] === ra.k) }))} style={{ ...btn(on), padding: '3px 9px', fontSize: 11, borderRadius: 999 }}>{ra.l}</button>; })}
                    {res.issues.filter(x => !/^\d+★|In-Season$|équipe/.test(x)).map(x => <Chip key={x} t={x} ok={false} />)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {cupT && <div style={{ textAlign: 'right', fontSize: 12, color: c.dim }}>objectif<br /><b style={{ color: '#fff', fontSize: 15 }}>{cupT.pts}</b></div>}
                  <Ring v={res.total} max={cupT ? cupT.pts : 260} col={col} size={58} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                <button onClick={() => move(i, -1)} disabled={i === 0} style={{ ...btn(), opacity: i === 0 ? .35 : 1 }} aria-label="Monter">↑</button>
                <button onClick={() => move(i, 1)} disabled={i === results.length - 1} style={{ ...btn(), opacity: i === results.length - 1 ? .35 : 1 }} aria-label="Descendre">↓</button>
                <button onClick={() => patch(r.id, x => ({ ...x, auto: !x.auto }))} style={btn(r.auto)}>{r.auto ? 'Auto' : 'Manuel'}</button>
                {r.kind === 'cup' && <>
                  <select value={cupT?.n ?? 2} onChange={e => { const t = CUP_TIERS.find(z => z.n === +e.target.value)!; patch(r.id, x => ({ ...x, minIS: t.is, label: `Emirates NBA Cup · palier ${t.n}` })); }} style={inp}>{CUP_TIERS.map(t => <option key={t.n} value={t.n}>Palier {t.n} · {t.pts} pts · {t.is} IS min</option>)}</select>
                  <select value={r.night} onChange={e => patch(r.id, x => ({ ...x, night: e.target.value }))} style={inp}>{[...new Set([...nights, ...Array.from({ length: 10 }, (_, i) => parisDay(new Date(Date.now() + i * 864e5).toISOString()))])].sort().filter(n => n >= parisDay(new Date().toISOString()) || n === r.night).map(n => <option key={n} value={n}>{dayLab(n)}</option>)}</select>
                </>}
                <button onClick={() => { setPicker(r.id); setQ(''); }} style={btn()}>+ Choisir une carte</button>
                <button onClick={() => runBuy(r, 1)} style={btn(buy?.id === r.id && buy.n === 1)}>Acheter 1 carte</button>
                <button onClick={() => runBuy(r, 2)} style={btn(buy?.id === r.id && buy.n === 2)}>Acheter 2 cartes</button>
                {r.pins.length > 0 && <button onClick={() => patch(r.id, x => ({ ...x, pins: [] }))} style={btn()}>Vider mes choix</button>}
                <button onClick={() => setRooms(rs => (rs || []).filter(x => x.id !== r.id))} style={{ ...btn(), marginLeft: 'auto', color: c.red }} aria-label="Supprimer la compo">Supprimer</button>
              </div>
              {buy?.id === r.id && (
                <div style={{ margin: '10px 0 12px', padding: 12, borderRadius: 14, border: `1px solid ${c.gold}55`, background: 'radial-gradient(120% 140% at 0% 0%, rgba(229,185,78,.10), rgba(7,11,28,0))' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}><b style={{ color: c.gold }}>Acheter {buy.n} carte{buy.n > 1 ? 's' : ''} · meilleurs gains pour cette compo</b><button onClick={() => setBuy(null)} style={btn()}>✕</button></div>
                  <div style={{ fontSize: 12, color: c.dim, marginBottom: 6 }}>Marché de revente des managers d’abord (seule source pour les Classic), puis achat immédiat pour les In-Season. Les enchères sont exclues : leur prix n’est pas fiable avant la fin.</div>
                  {buy.busy && <div style={{ color: c.dim, fontSize: 13 }}>Recherche sur le marché Sorare…</div>}
                  {buy.msg && <div style={{ color: c.red, fontSize: 13 }}>{buy.msg}</div>}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(176px,1fr))', gap: 10, marginTop: 8 }}>
                    {buy.res.map((o, k) => { const eur = o.adds.reduce((s, a) => s + a.buy!.eur, 0); return (
                      <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 10, borderRadius: 12, border: `1px solid ${c.line}`, background: 'rgba(255,255,255,.03)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                          <div style={{ display: 'flex', gap: 6 }}>{o.adds.map(a => <div key={a.id} style={{ width: o.adds.length > 1 ? 64 : 76, containerType: 'inline-size' }}><Slab c={toCand(a, r)} u={n => `${n}cqw`} art={a.pic} /></div>)}</div>
                          <div style={{ textAlign: 'right' }}><div style={{ fontSize: 20, fontWeight: 800, color: c.green, lineHeight: 1 }}>+{o.gain.toFixed(1)}</div><div style={{ fontSize: 11, color: c.dim, marginTop: 3 }}>total {o.total.toFixed(0)}</div></div>
                        </div>
                        <div style={{ fontSize: 12.5, lineHeight: 1.35 }}>
                          {o.adds.map(a => <div key={a.id}><b>{a.p.name}</b> · {a.buy!.eur.toFixed(2)} €</div>)}
                          <div style={{ color: c.dim, fontSize: 11.5, marginTop: 2 }}>{(o.gain / eur * 10).toFixed(1)} pts pour 10 €{o.adds.length > 1 ? ` · ${eur.toFixed(2)} € au total` : ''}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 'auto' }}>{o.adds.map(a => <a key={a.id} href={a.buy!.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, textAlign: 'center', padding: '5px 8px', borderRadius: 999, fontSize: 12, fontWeight: 700, color: c.cy, border: `1px solid ${c.cy}77`, background: 'rgba(0,255,255,.07)', textDecoration: 'none', whiteSpace: 'nowrap' }}>Acheter{o.adds.length > 1 ? ' ' + a.p.name.split(' ').pop() : ''} ↗</a>)}</div>
                      </div>); })}
                  </div>
                </div>
              )}
              {res.lineup.length ? (
                <div className="gwb-row">
                  {res.lineup.map(cd => {
                    const pinned = r.pins.includes(cd.id);
                    return (
                      <div key={cd.id} className="gwb-cell">
                        <button onClick={() => patch(r.id, x => ({ ...x, pins: pinned ? x.pins.filter(y => y !== cd.id) : [...x.pins, cd.id] }))} title={pinned ? 'Retirer de mes choix' : 'Imposer cette carte dans cette compo'} style={{ display: 'block', width: '100%', marginBottom: 6, padding: '4px 0', borderRadius: 8, border: `1px solid ${pinned ? c.gold + 'aa' : c.line}`, background: pinned ? 'rgba(229,185,78,.16)' : 'rgba(255,255,255,.04)', color: pinned ? c.gold : c.dim, cursor: 'pointer', fontSize: 12 }}>{pinned ? '📌 Imposée · retirer' : '📌 Imposer'}</button>
                        <Slab c={cd} u={n => `${n}cqw`} art={cd.real ? cd.pic : null} />
                      </div>
                    );
                  })}
                </div>
              ) : <p style={{ color: c.dim, fontSize: 13, margin: 0 }}>{loading ? 'Chargement…' : r.kind === 'cup' && r.night && cup[r.night] && !Object.keys(cup[r.night]).length ? 'Pas encore de projections Sorare pour cette nuit : elles sortent la veille du match. Choisis une nuit plus proche.' : r.auto ? 'Aucune compo possible avec les cartes restantes.' : 'Choisis tes cartes ou passe en Auto.'}</p>}
              {full && res.issues.length > 0 && <p style={{ color: c.red, fontSize: 13, margin: '10px 0 0' }}>⚠ {res.issues.join(' · ')}</p>}
            </section>
          );
        })}

        </div>
        <p style={{ color: c.dim, fontSize: 12, margin: '14px 2px 0', lineHeight: 1.5 }}>Valeur affichée = projection du meilleur match de la GW (de la nuit choisie pour la Cup) × bonus de la carte ; seul le meilleur match de la GW compte (−10 % questionable, −15 % doubtful ). Bonus 3 matchs : un joueur qui joue 3 matchs reçoit +2 points, car il a trois chances de sortir son meilleur score ; sans bonus en Arena. Une seule rareté par compo (Limited par défaut), cartes déjà alignées sur Sorare exclues. Règles : 5 joueurs différents, plafond d’étoiles, max 4 joueurs d’une même équipe, minimum In-Season selon la compo. Tu envoies toi-même les compos sur Sorare.</p>
      </main>

      {/* Choix d'une carte : stock complet par joueur */}
      {picker && pickerRoom && (
        <div role="dialog" aria-modal="true" onClick={e => { if (e.target === e.currentTarget) setPicker(null); }} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(3,6,18,.9)', backdropFilter: 'blur(6px)', overflowY: 'auto', padding: '16px 10px' }}>
          <div style={{ ...glass, maxWidth: 760, margin: '0 auto', padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <b style={{ fontSize: 17 }}>{pickerRoom.label} · choisir une carte</b>
              <button onClick={() => setPicker(null)} style={btn()}>✕ Fermer</button>
            </div>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Joueur ou équipe" style={{ ...inp, width: '100%', boxSizing: 'border-box', marginBottom: 8 }} />
            <div style={{ fontSize: 12, color: c.dim, marginBottom: 10, lineHeight: 1.45 }}>Toute ta collection pour cette compo, par joueur : tu vois combien d’exemplaires il te reste et lesquels. Une carte déjà dans une autre compo passe dans celle-ci, l’autre se réorganise. Une compo ne contient qu’une seule rareté : {RARITIES.find(r => r.k === roomRar(pickerRoom)[0])?.l}.</div>
            {pickerGroups.map(g => {
              const free = g.list.filter(z => z.st === 'libre').length;
              return (
                <div key={g.p.slug} style={{ borderTop: `1px solid ${c.line}`, padding: '12px 0' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{g.p.name}{g.p.inj && <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 8px', borderRadius: 99, color: g.p.inj === 'GTD' ? c.gold : c.red, border: `1px solid ${g.p.inj === 'GTD' ? c.gold : c.red}66` }}>{g.p.inj}</span>}</div>
                      <div style={{ fontSize: 12.5, color: c.dim }}>{g.p.teamName} · {g.p.stars}★ · {g.list.length} carte{g.list.length > 1 ? 's' : ''} · {free} libre{free > 1 ? 's' : ''}{g.p.age ? ` · ${g.p.age} ans` : ''}</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                        {g.p.opp.map((o, i) => { const bestG = o.pj === Math.max(...g.p.opp.map(z => z.pj ?? 0)); return <span key={i} style={{ fontSize: 11.5, padding: '3px 8px', borderRadius: 8, border: `1px solid ${bestG ? c.gold + '99' : c.line}`, color: bestG ? c.gold : c.dim, background: bestG ? 'rgba(229,185,78,.1)' : 'transparent' }}>{dayLab(parisDay(o.d))} · {o.h ? 'vs' : '@'} {o.o}{o.pj != null ? ` · ${o.pj.toFixed(1)}` : ''}</span>; })}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}><div style={{ fontSize: 10.5, color: c.dim, letterSpacing: 1 }}>MEILLEUR MATCH</div><div style={{ fontWeight: 800, fontSize: 24, color: c.cy, lineHeight: 1.1 }}>{g.best.toFixed(1)}</div></div>
                  </div>
                  <div className="gwb-pick">
                    {g.list.sort((a, b) => b.v - a.v).map(z => (
                      <button key={z.x.id} disabled={!z.ok} onClick={() => { patch(pickerRoom.id, r => ({ ...r, pins: [...r.pins.filter(i => i !== z.x.id), z.x.id].slice(0, 5) })); setPicker(null); }} style={{ background: 'transparent', border: `1px solid ${z.st === 'ici' ? c.gold : c.line}`, borderRadius: 10, padding: 5, cursor: z.ok ? 'pointer' : 'not-allowed', opacity: z.ok ? 1 : 0.42, color: '#fff', textAlign: 'center', containerType: 'inline-size' }}>
                        <Slab c={toCand(z.x, pickerRoom)} u={n => `${n}cqw`} art={z.x.pic} />
                        <div style={{ fontSize: 11, marginTop: 4, color: z.why ? c.red : z.st === 'libre' ? c.green : c.gold, lineHeight: 1.25 }}>{z.why || (z.st === 'libre' ? 'Libre' : z.st === 'ici' ? 'Dans cette compo' : 'Utilisée ' + z.st)}</div>
                        <div style={{ fontSize: 11, color: c.dim }}>{RARITIES.find(r => r.k === z.x.rar)?.l ?? ''}{z.x.is ? ' · IS' : ' · Classic'}{z.x.pw > 1 ? ` · +${Math.round((z.x.pw - 1) * 100)} %` : ''}</div>
                        <div style={{ fontWeight: 800, color: c.cy, fontSize: 15 }}>{z.v.toFixed(1)}</div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {!pickerGroups.length && <p style={{ color: c.dim, fontSize: 13 }}>Aucune carte disponible pour cette compo.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
