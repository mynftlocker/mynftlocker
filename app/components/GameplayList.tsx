'use client';
import { useEffect, useMemo, useState } from 'react';
import { activeInjury } from '../lib/gameplay';

// Mode Gameplay, vue Liste : une ligne par carte NBA (L10, projection + matchs de la prochaine GW, ecarts, statut, forme, plafond, minutes).
type PInfo = { l5: number | null; l10: number | null; max: number | null; min5: number | null; min10: number | null; n: number };
type Game = { date: string; opp: string; home: boolean };
const cache: { fixture: any; games: Record<string, Game[]>; players: Record<string, PInfo> } = { fixture: null, games: {}, players: {} };

const f1 = (n: number | null | undefined) => (n == null || !isFinite(n) ? '–' : n.toFixed(1));
const sg = (n: number | null | undefined) => (n == null || !isFinite(n) ? '–' : (n > 0 ? '+' : '') + n.toFixed(1));
const tone = (n: number | null | undefined, eps = 0.5) => (n == null || !isFinite(n) ? '#9aa' : n > eps ? '#4ade80' : n < -eps ? '#ff6b6b' : '#cfd8dc');
const short = (n: string) => n.split(' ').slice(-1)[0];
const dayLab = (iso: string) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short' }).format(new Date(iso)).replace('.', '');
const cleanName = (c: any) => String(c.name || '').split(' 20')[0];
const COLS = '46px minmax(130px,1.3fr) 54px 54px minmax(120px,1.6fr) 62px 62px 74px 54px 70px 62px';
const HEAD: { k: string; t: string; tip: string }[] = [
  { k: '', t: 'Carte', tip: '' }, { k: 'name', t: 'Joueur', tip: '' }, { k: 'l10', t: 'L10', tip: 'Moyenne des 10 derniers matchs' },
  { k: 'proj', t: 'Proj.', tip: 'Projection Sorare (prochaine GW)' }, { k: '', t: 'Matchs de la GW', tip: '' },
  { k: 'dl10', t: '± L10', tip: 'Projection moins L10' }, { k: 'gain', t: '± ★', tip: 'Marge avant de perdre une étoile (projection moins minimum du palier)' },
  { k: 'inj', t: 'Statut', tip: '' }, { k: 'form', t: 'Forme', tip: 'L5 moins L10' }, { k: 'max', t: 'Plafond', tip: 'Meilleur score sur 10 matchs' }, { k: 'min', t: 'Min.', tip: 'Minutes moyennes (5 derniers matchs) et écart vs 10 matchs' },
];

export default function GameplayList({ cards }: { cards: any[] }) {
  const [ver, force] = useState(0);
  const [sort, setSort] = useState<{ k: string; dir: 1 | -1 } | null>(null);
  const [shown, setShown] = useState(60);
  const [err, setErr] = useState('');
  const slugs = useMemo(() => [...new Set(cards.map((c) => c.anyPlayer?.slug).filter(Boolean))] as string[], [cards]);

  useEffect(() => {
    let off = false;
    const todo = slugs.filter((s) => !cache.players[s]);
    const needGames = !cache.fixture;
    if (!todo.length && !needGames) return;
    (async () => {
      try {
        const parts = [] as string[][]; for (let i = 0; i < todo.length; i += 30) parts.push(todo.slice(i, i + 30));
        if (!parts.length) parts.push([]);
        let first = needGames;
        for (let i = 0; i < parts.length; i += 3) {
          await Promise.all(parts.slice(i, i + 3).map(async (p, j) => {
            const g = first && i === 0 && j === 0; if (g) first = false;
            const r = await fetch('/api/gameplay?slugs=' + p.join(',') + (g ? '&games=1' : ''));
            const d = await r.json(); if (d.error) throw new Error(d.error);
            if (d.fixture) { cache.fixture = d.fixture; cache.games = d.games || {}; }
            Object.assign(cache.players, d.players || {});
          }));
          if (!off) force((x) => x + 1);
        }
      } catch (e: any) { if (!off) setErr(String(e?.message || e)); }
    })();
    return () => { off = true; };
  }, [slugs]);

  const rows = useMemo(() => cards.map((c) => {
    const pi = cache.players[c.anyPlayer?.slug] as PInfo | undefined;
    const l10 = c.averageScore != null ? Number(c.averageScore) : null;
    const proj = c.proj as number | null;
    const inj = activeInjury(c);
    return {
      c, pi, l10, proj, dl10: proj != null && l10 != null ? proj - l10 : null, gain: c.gain as number | null,
      inj: inj ? (inj.status || 'OUT') : '', form: pi?.l5 != null && pi?.l10 != null ? pi.l5 - pi.l10 : null,
      max: pi?.max ?? null, min: pi?.min5 ?? null, name: cleanName(c),
    };
  }), [cards, ver]);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const k = sort.k as keyof (typeof rows)[number];
    return [...rows].sort((a: any, b: any) => {
      const x = a[k], y = b[k];
      if (x == null || x === '') return 1; if (y == null || y === '') return -1;
      return (typeof x === 'string' ? x.localeCompare(y) : x - y) * sort.dir;
    });
  }, [rows, sort]);

  const fx = cache.fixture;
  return (
    <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 1rem 3rem', color: '#e6f0f5' }}>
      <div style={{ fontSize: 12, opacity: 0.7, margin: '4px 0 10px' }}>
        La projection Sorare est la même pour tous les matchs de la prochaine Game Week{fx ? ` (GW ${fx.gameWeek}, ${dayLab(fx.startDate)}–${dayLab(fx.endDate)})` : ''} ; les matchs affichés sont ceux de cette GW.
        {err && <span style={{ color: '#ff6b6b' }}> · {err}</span>}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 980 }}>
          <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 8, padding: '6px 10px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: '#40e8ff', position: 'sticky', top: 0, background: 'rgba(7,9,13,0.92)', backdropFilter: 'blur(8px)', zIndex: 2 }}>
            {HEAD.map((h) => (
              <span key={h.t} title={h.tip} onClick={() => h.k && setSort((s) => (s && s.k === h.k ? { k: h.k, dir: (s.dir * -1) as 1 | -1 } : { k: h.k, dir: h.k === 'name' || h.k === 'inj' ? 1 : -1 }))} style={{ cursor: h.k ? 'pointer' : 'default', whiteSpace: 'nowrap' }}>
                {h.t}{sort && sort.k === h.k ? (sort.dir === -1 ? ' ↓' : ' ↑') : ''}
              </span>
            ))}
          </div>
          {sorted.slice(0, shown).map(({ c, pi, l10, proj, dl10, gain, inj, form, max, min }) => {
            const g = (cache.games[c.anyTeam?.name || ''] || []);
            const bonus = Math.round((Number(c.power || 1) - 1) * 100);
            const lose = gain != null && gain < 0 && !(Number(c.anyPlayer?.gameplayTierStars) <= 1);
            const dm = pi?.min5 != null && pi?.min10 != null ? pi.min5 - pi.min10 : null;
            return (
              <div key={c.slug} style={{ display: 'grid', gridTemplateColumns: COLS, gap: 8, alignItems: 'center', padding: '6px 10px', borderTop: '1px solid rgba(255,255,255,0.07)', fontSize: 13, background: inj ? 'rgba(255,107,107,0.05)' : 'transparent' }}>
                <span style={{ position: 'relative' }}>
                  {c.pictureUrl && <img src={c.pictureUrl} alt="" loading="lazy" style={{ width: 38, borderRadius: 4, display: 'block' }} />}
                  <span style={{ position: 'absolute', bottom: -2, left: 0, fontSize: 9, fontWeight: 700, padding: '0 3px', borderRadius: 3, background: c.inSeasonEligible ? '#8b5cf6' : '#2a2f3a', color: '#fff' }}>{c.inSeasonEligible ? 'IS' : 'CL'}{bonus > 0 ? ' +' + bonus + '%' : ''}</span>
                </span>
                <span><b>{cleanName(c)}</b><br /><span style={{ opacity: 0.55, fontSize: 11 }}>{short(c.anyTeam?.name || '')} · {c.anyPlayer?.gameplayTierStars ?? '?'}★ · {c.rarityTyped}</span></span>
                <b>{f1(l10)}</b>
                <b style={{ color: '#ffd24a' }}>{f1(proj)}</b>
                <span style={{ fontSize: 11, lineHeight: 1.35 }}>{g.length ? g.map((x, i) => <span key={i} style={{ display: 'inline-block', marginRight: 6, opacity: 0.85 }}>{dayLab(x.date)} {x.home ? 'vs' : '@'} {short(x.opp)}</span>) : <span style={{ opacity: 0.4 }}>{fx ? 'pas de match' : '…'}</span>}</span>
                <span style={{ color: tone(dl10), fontWeight: 600 }}>{sg(dl10)}</span>
                <span style={{ color: lose ? '#ff6b6b' : tone(gain, 1), fontWeight: 600 }}>{sg(gain)}{lose ? ' ★↓' : ''}</span>
                <span style={{ color: inj ? '#ff6b6b' : '#4ade80', fontSize: 12, fontWeight: 600 }}>{inj || 'OK'}</span>
                <span style={{ color: tone(form, 1), fontWeight: 600 }}>{pi ? sg(form) : '…'}</span>
                <span>{pi ? f1(max) : '…'}</span>
                <span>{pi && min != null ? Math.round(min) + "'" : '…'}{dm != null && Math.abs(dm) >= 1 && <span style={{ color: tone(dm, 1), fontSize: 11 }}> {dm > 0 ? '▲' : '▼'}{Math.abs(Math.round(dm))}</span>}</span>
              </div>
            );
          })}
        </div>
      </div>
      {shown < sorted.length && <div style={{ textAlign: 'center', marginTop: 12 }}><button onClick={() => setShown((s) => s + 60)} style={{ padding: '8px 18px', borderRadius: 999, border: '1px solid #40e8ff', background: 'transparent', color: '#40e8ff', cursor: 'pointer' }}>Voir plus ({sorted.length - shown})</button></div>}
    </div>
  );
}
