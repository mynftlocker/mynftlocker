'use client';
import { useEffect, useRef, useState } from 'react';
import StarBg from '../components/StarBg';
import { t as tr, useLang, initLang, LangSwitch } from '../i18n';
import './i18nTtfl';

type G = { ps?: number; b2b?: boolean; e?: boolean; d: string; opp: string; home: boolean; gid: string; t: number; m: number; pts: number; reb: number; ast: number; stl: number; blk: number; to: number; fgm: number; fga: number; tpm: number; tpa: number; ftm: number; fta: number };
type L = { n: number; ttfl: number | null; min: number | null; pts: number | null; reb: number | null; ast: number | null; stl: number | null; blk: number | null; to: number | null; fgm: number | null; fgmiss: number | null; tpm: number | null; tpmiss: number | null; ftm: number | null; ftmiss: number | null };
type B = { avg: { season: L; l10: L; l5: L; home: L; away: L; b2b: L; rest: L; early: L }; best: { t: number; opp: string; d: string; gid: string } | null; worst: { t: number; opp: string; d: string; gid: string } | null; opps: { opp: string; n: number; avg: number }[]; sd: number | null };
type D = B & { pastGames: G[]; ext: B | null; seasons: { season: string; n: number; ttfl: number | null; max: number; min: number; min_m: number | null }[]; player: { slug: string; name: string; birthDay: string | null; country: { name: string; code: string } | null; stars: number | null; pic: string | null; team: string | null }; card: { slug: string; pic: string; year: number } | null; games: G[] };
const c = { cy: '#00ffff', gold: '#e5b94e', dim: 'rgba(255,255,255,.6)', line: 'rgba(255,255,255,.12)', card: 'rgba(8,12,28,.72)' };
const age = (b: string) => Math.floor((Date.now() - new Date(b).getTime()) / 31557600000);
const ddmm = (d: string) => d.slice(8) + '/' + d.slice(5, 7);
const parisNight = (us: string) => { const d = new Date(us + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); };
export const matchHref = (us: string, gid: string) => `/ttfl?v=live&night=${parisNight(us)}&game=${gid}`;
const seasonOf = (d: string) => { const y = +d.slice(0, 4), m = +d.slice(5, 7); return m >= 9 ? `${y}-${String((y + 1) % 100).padStart(2, '0')}` : `${y - 1}-${String(y % 100).padStart(2, '0')}`; };
const av = (a: number[]) => (a.length ? +(a.reduce((s, x) => s + x, 0) / a.length).toFixed(1) : null);
const lines = (g: G[]): L => ({ n: g.length, ttfl: av(g.map(x => x.t)), min: av(g.map(x => x.m)), pts: av(g.map(x => x.pts)), reb: av(g.map(x => x.reb)), ast: av(g.map(x => x.ast)), stl: av(g.map(x => x.stl)), blk: av(g.map(x => x.blk)), to: av(g.map(x => x.to)),
  fgm: av(g.map(x => x.fgm)), fgmiss: av(g.map(x => x.fga - x.fgm)), tpm: av(g.map(x => x.tpm)), tpmiss: av(g.map(x => x.tpa - x.tpm)), ftm: av(g.map(x => x.ftm)), ftmiss: av(g.map(x => x.fta - x.ftm)) });
const bundle = (rows: G[]): B => {
  const best = rows.length ? rows.reduce((m, x) => (x.t > m.t ? x : m)) : null; const worst = rows.length ? rows.reduce((m, x) => (x.t < m.t ? x : m)) : null;
  const byOpp: Record<string, G[]> = {}; rows.forEach(r => (byOpp[r.opp] ||= []).push(r));
  const opps = Object.entries(byOpp).map(([opp, g]) => ({ opp, n: g.length, avg: av(g.map(x => x.t)) as number })).sort((a, b) => b.avg - a.avg);
  const mean = av(rows.map(x => x.t)) as number; const sd = rows.length > 1 ? +Math.sqrt(rows.reduce((s, x) => s + (x.t - mean) ** 2, 0) / rows.length).toFixed(1) : null;
  return { avg: { season: lines(rows), l10: lines(rows.slice(-10)), l5: lines(rows.slice(-5)), home: lines(rows.filter(r => r.home)), away: lines(rows.filter(r => !r.home)), b2b: lines(rows.filter(r => r.b2b)), rest: lines(rows.filter(r => !r.b2b)), early: lines(rows.filter(r => r.e === true)) },
    best: best && { t: best.t, opp: best.opp, d: best.d, gid: best.gid }, worst: worst && { t: worst.t, opp: worst.opp, d: worst.d, gid: worst.gid }, opps, sd };
};
const fx = (v: number | null) => (v == null ? '–' : v.toFixed(1));

function Bars({ g, narrow }: { g: G[]; narrow?: boolean }) {
  // Telephone : 5 bougies visibles (les plus recentes), le reste en faisant glisser vers la droite.
  const s = g.slice(narrow ? -25 : -10); const H = 210, Lm = 8, B = 36, T = 16; const slots = narrow ? Math.max(5, s.length) : 10; const W = narrow ? Lm * 2 + slots * 96 : 640; const bw = (W - Lm * 2) / slots;
  const box = useRef<HTMLDivElement>(null); const [more, setMore] = useState(false); const upd = () => { const e = box.current; setMore(!!e && e.scrollLeft > 6); }; useEffect(() => { const e = box.current; if (e) { e.scrollLeft = e.scrollWidth; upd(); } }, [s.length, narrow]);
  const hi = Math.max(10, ...s.map(x => x.t)) + 4; const lo = Math.min(0, ...s.map(x => x.t)); const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const mean = s.length ? s.reduce((a, x) => a + x.t, 0) / s.length : 0;
  return (
    <div style={{ position: 'relative' }}>
    {narrow && slots > 5 && more && <div aria-hidden style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 34, zIndex: 1, pointerEvents: 'none', background: 'linear-gradient(90deg, rgba(5,8,24,.95), rgba(5,8,24,0))', display: 'flex', alignItems: 'center', color: c.cy, fontSize: 22, fontWeight: 700 }}>‹</div>}
    <div ref={box} onScroll={upd} style={{ overflowX: narrow ? 'auto' : 'visible', WebkitOverflowScrolling: 'touch' }}>
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: narrow ? `${slots / 5 * 100}%` : '100%', height: 'auto', display: 'block' }} role="img" aria-label={tr('10 derniers matchs')}>
      <line x1={Lm} x2={W - Lm} y1={y(0)} y2={y(0)} stroke={c.line} />
      {s.map((x, i) => { const cx = Lm + (slots - s.length + i) * bw + bw / 2; return (
        <a key={x.gid} href={matchHref(x.d, x.gid)}><g style={{ cursor: 'pointer' }}>
          <rect x={cx - 17} y={Math.min(y(x.t), y(0))} width={34} height={Math.max(Math.abs(y(x.t) - y(0)), 2)} rx="4" fill={x.t >= mean ? c.cy : 'rgba(0,255,255,.4)'} />
          <text x={cx} y={y(Math.max(x.t, 0)) - 5} fill="#fff" fontSize="12" fontWeight="700" textAnchor="middle">{x.t}</text>
          <text x={cx} y={H - 20} fill={c.dim} fontSize="10" textAnchor="middle">{x.home ? 'vs' : '@'} {x.opp}</text>
          <text x={cx} y={H - 7} fill={c.dim} fontSize="9" textAnchor="middle">{ddmm(x.d)}</text>
        </g></a>); })}
      {s.length > 0 && <><line x1={Lm} x2={W - Lm} y1={y(mean)} y2={y(mean)} stroke="rgba(255,255,255,.5)" strokeDasharray="2 4" /><text x={W - Lm} y={y(mean) - 4} fill="rgba(255,255,255,.8)" fontSize="11" textAnchor="end" stroke="#050818" strokeWidth="3" paintOrder="stroke">{tr('Moyenne ')}{mean.toFixed(1)}</text></>}
    </svg>
    </div>
    </div>
  );
}

export default function PlayerSheet({ slug }: { slug: string }) {
  const lang = useLang(); const en = lang === 'en'; useEffect(() => { initLang(); }, []);
  // Telephone : la carte Sorare remplace la photo (elle montre deja le joueur) au lieu de la doubler.
  const [narrow, setNarrow] = useState(false);
  useEffect(() => { const m = window.matchMedia('(max-width: 640px)'); const f = () => setNarrow(m.matches); f(); m.addEventListener('change', f); return () => m.removeEventListener('change', f); }, []);
  const [d, setD] = useState<D | null>(null); const [err, setErr] = useState(''); const [w, setW] = useState<'l5' | 'l10' | 'season'>('l10'); const [sel, setSel] = useState<string>(''); const [po, setPo] = useState(true);
  useEffect(() => { fetch('/api/ttfl/player?slug=' + slug).then(r => r.json()).then(j => j.ok ? setD(j) : setErr(j.error || tr('Indisponible'))).catch(e => setErr(String(e))); }, [slug]);
  const box: React.CSSProperties = { background: c.card, border: `1px solid ${c.line}`, borderRadius: 14, padding: 14, backdropFilter: 'blur(6px)' };
  const btn = (on: boolean): React.CSSProperties => ({ background: c.card, border: `1px solid ${on ? c.cy : c.line}`, color: on ? c.cy : '#fff', borderRadius: 10, padding: '6px 12px', cursor: 'pointer', fontSize: 13 });
  const everyGame = d ? [...d.pastGames, ...d.games] : [];
  const cur = sel || (d?.seasons[0]?.season ?? 'all');
  const hasPo = everyGame.some(g => g.ps);
  const recent = everyGame.filter(g => (cur === 'all' || seasonOf(g.d) === cur) && (po || !g.ps));
  const shown = recent;
  const S: B | null = d ? bundle(recent) : null;
  const A = S?.avg[w];
  const tile = (k: string, v: string, sub?: string, col = '#fff') => <div style={{ ...box, flex: '1 1 120px', minWidth: 110 }}><div style={{ fontSize: 12, color: c.dim }}>{k}</div><div style={{ fontSize: 26, fontWeight: 800, color: col, margin: '2px 0' }}>{v}</div>{sub && <div style={{ fontSize: 12, color: c.dim }}>{sub}</div>}</div>;
  const mlink = (g: { d: string; gid: string }, t: number, strong = false) => <a href={matchHref(g.d, g.gid)} style={{ color: c.cy, fontWeight: strong ? 800 : 700, textDecoration: 'none', borderBottom: `1px dashed ${c.cy}` }}>{t}</a>;

  return (
    <main style={{ minHeight: '100vh', color: '#fff', fontFamily: 'system-ui,sans-serif', padding: '28px 16px 60px', position: 'relative' }}>
      <StarBg />
      <div style={{ maxWidth: 1000, margin: '0 auto', position: 'relative' }}>
        <a href="/ttfl" style={{ color: c.cy, fontSize: 13, textDecoration: 'none' }}>{tr('← Projections TTFL')} · <b>my<span style={{ color: c.cy }}>NFT</span>locker</b></a><LangSwitch style={{ float: 'right' }} />
        {err && <p style={{ color: '#ff7b7b', marginTop: 20 }}>{err}</p>}
        {!d && !err && <p style={{ color: c.dim, marginTop: 20 }}>{tr('Chargement de la fiche…')}</p>}
        {d && A && <>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', margin: '16px 0 18px' }}>
            {narrow && d.card ? <a href={`https://sorare.com/nba/cards/${d.card.slug}`} target="_blank" rel="noopener noreferrer" aria-label={tr('Carte Sorare ') + d.player.name} style={{ flex: '0 0 auto' }}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={d.card.pic} alt={tr('Carte Sorare ') + d.player.name} style={{ height: 132, width: 'auto', borderRadius: 8, display: 'block', filter: 'drop-shadow(0 6px 16px rgba(229,185,78,.25))' }} /></a> : d.player.pic && /* eslint-disable-next-line @next/next/no-img-element */ <img src={d.player.pic} alt={d.player.name} width={96} height={96} style={{ borderRadius: 18, border: `1px solid ${c.line}`, objectFit: 'cover' }} />}
            <div style={{ flex: '1 1 260px' }}>
              <h1 style={{ fontSize: narrow ? 24 : 'clamp(26px,5vw,40px)', margin: 0, lineHeight: 1.15 }}>{d.player.name}</h1>
              <div style={{ color: c.dim, marginTop: 6, fontSize: 15, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {d.player.team && <span>{d.player.team}</span>}
                {d.player.country && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={`https://flagcdn.com/w40/${d.player.country.code.toLowerCase()}.png`} alt={d.player.country.code} width={22} height={15} style={{ borderRadius: 2 }} />{d.player.country.name}</span>}
                {d.player.birthDay && <span>{new Date(d.player.birthDay).toLocaleDateString(en ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} ({age(d.player.birthDay)} {tr('ans')})</span>}
                {d.player.stars != null && <span style={{ color: c.gold }}>{d.player.stars} ★ Sorare</span>}
                {narrow && d.card && <a href={`https://sorare.com/nba/cards/${d.card.slug}`} target="_blank" rel="noopener noreferrer" style={{ color: c.cy, textDecoration: 'none' }}>{tr('Carte Sorare ')}{d.card.year} →</a>}
              </div>
            </div>
            {d.card && !narrow && <a href={`https://sorare.com/nba/cards/${d.card.slug}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#fff', textAlign: 'center', fontSize: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}<img src={d.card.pic} alt={tr('Carte Sorare ') + d.player.name} style={{ height: 120, width: 'auto', borderRadius: 8, display: 'block', margin: '0 auto 4px' }} />{tr('Carte Sorare ')}{d.card.year} →</a>}
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}><span style={{ color: c.dim, fontSize: 13 }}>{tr('Saison')}</span>
            {d.seasons.map(x => <button key={x.season} style={btn(cur === x.season)} onClick={() => setSel(x.season)}>{x.season}</button>)}
            {d.seasons.length > 1 && <button style={btn(cur === 'all')} onClick={() => setSel('all')}>{tr('Toutes les saisons')}</button>}
            {hasPo && <label style={{ marginLeft: 8, fontSize: 13, color: c.dim, display: 'inline-flex', gap: 5, alignItems: 'center', cursor: 'pointer' }}><input type="checkbox" checked={po} onChange={e => setPo(e.target.checked)} />{tr('Playoffs inclus')}</label>}</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            {tile(tr('Moy. 5 matchs'), fx(S!.avg.l5.ttfl), `${S!.avg.l5.n} ${tr('match(s)')}`, c.cy)}{tile(tr('Moy. 10 matchs'), fx(S!.avg.l10.ttfl), `${S!.avg.l10.n} ${tr('match(s)')}`, c.cy)}{tile(cur === 'all' ? tr('Moy. période') : tr('Moy. saison'), fx(S!.avg.season.ttfl), `${S!.avg.season.n} ${tr('match(s)')}`)}
            {(() => { const m = S!.avg.season.ttfl; const k = m == null ? 0 : recent.filter(g => g.t > m).length; return tile(tr('Au-dessus de sa moyenne'), recent.length ? Math.round(100 * k / recent.length) + ' %' : '–', recent.length ? en ? `${k} of ${recent.length} games > ${fx(m)}` : `${k} match${k > 1 ? 's' : ''} sur ${recent.length} > ${fx(m)}` : undefined, c.gold); })()}
            {(() => { const m = S!.avg.season.ttfl, sd = S!.sd; if (sd == null || !m) return tile(tr('Régularité'), '–', tr('pas assez de matchs')); const cv = sd / m; const lo = Math.max(0, Math.round(m - sd)), hi = Math.round(m + sd); const pc = recent.length ? Math.round(100 * recent.filter(g => g.t >= lo && g.t <= hi).length / recent.length) : 0; const lab = cv < 0.25 ? [tr('Très régulier'), '#4ade80'] : cv < 0.35 ? [tr('Régulier'), '#a3e635'] : cv < 0.45 ? [tr('Moyen'), '#e5b94e'] : [tr('Irrégulier'), '#ff9f43']; return tile(tr('Régularité'), lab[0], `${tr('il score le plus souvent entre ')}${lo}${tr(' et ')}${hi} (${pc} % ${tr('des matchs')})`, lab[1]); })()}
            {tile(tr('Score max'), S!.best ? String(S!.best.t) : '–', S!.best ? `vs ${S!.best.opp} · ${ddmm(S!.best.d)}` : undefined, '#4ade80')}{tile(tr('Score min'), S!.worst ? String(S!.worst.t) : '–', S!.worst ? `vs ${S!.worst.opp} · ${ddmm(S!.worst.d)}` : undefined, '#ff7b7b')}
          </div>

          <div style={{ ...box, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{narrow ? tr('Derniers matchs') : tr('10 derniers matchs')} <span style={{ color: c.dim, fontWeight: 400, fontSize: 12 }}>{tr('· clique sur un score pour ouvrir la fiche du match')}</span></div>
            {recent.length ? <Bars g={recent} narrow={narrow} /> : <p style={{ color: c.dim }}>{tr('Aucun match sur cette période.')}</p>}
          </div>

          <div style={{ ...box, marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}><b style={{ marginRight: 6 }}>{tr('Moyennes par match')}</b>
              {([['l5', '5 matchs'], ['l10', '10 matchs'], ['season', cur === 'all' ? 'Tout' : 'Saison']] as ['l5' | 'l10' | 'season', string][]).map(([k, l]) => <button key={k} style={btn(w === k)} onClick={() => setW(k)}>{tr(l)}</button>)}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 8 }}>
              {([['Minutes', A.min, ''], ['Points', A.pts, '+'], ['Rebonds', A.reb, '+'], ['Passes', A.ast, '+'], ['Interceptions', A.stl, '+'], ['Contres', A.blk, '+'], ['Tirs réussis', A.fgm, '+'], ['3 pts réussis', A.tpm, '+'], ['LF réussis', A.ftm, '+'], ['Tirs manqués', A.fgmiss, '−'], ['3 pts manqués', A.tpmiss, '−'], ['LF manqués', A.ftmiss, '−'], ['Balles perdues', A.to, '−']] as [string, number | null, string][]).map(([k0, v, s]) => { const k = tr(k0); return (
                <div key={k} style={{ border: `1px solid ${c.line}`, borderRadius: 10, padding: '8px 10px' }}><div style={{ fontSize: 11, color: c.dim }}>{k}</div><div style={{ fontSize: 20, fontWeight: 800, color: s === '−' ? '#ff9b9b' : s === '+' ? '#fff' : c.dim }}>{s === '−' && v ? '−' : ''}{fx(v)}</div></div>); })}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10, fontSize: 13, color: c.dim }}>
              <span>{tr('Domicile : ')}<b style={{ color: '#fff' }}>{fx(S!.avg.home.ttfl)}</b> ({S!.avg.home.n})</span><span>{tr('Extérieur : ')}<b style={{ color: '#fff' }}>{fx(S!.avg.away.ttfl)}</b> ({S!.avg.away.n})</span>
              <span title={tr('Équipe ayant déjà joué la veille')}>{tr('2e soir de back-to-back : ')}<b style={{ color: c.gold }}>{fx(S!.avg.b2b.ttfl)}</b> ({S!.avg.b2b.n})</span><span>{tr('Avec repos : ')}<b style={{ color: '#fff' }}>{fx(S!.avg.rest.ttfl)}</b> ({S!.avg.rest.n})</span><span title={tr('Matchs dont le coup d’envoi est au plus tard à 23 h, heure de Paris')}>{tr('Match jusqu’à 23 h (FR) : ')}<b style={{ color: c.cy }}>{fx(S!.avg.early.ttfl)}</b> ({S!.avg.early.n})</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: 16 }}>
            <div style={{ ...box, overflowX: 'auto', padding: 0 }}>
              <div style={{ padding: '12px 14px', fontWeight: 700 }}>{tr('Tous les matchs')}</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 440 }}>
                <thead><tr style={{ color: c.dim, textAlign: 'right' }}>{['Date', 'Adversaire', 'TTFL', 'MIN', 'PTS', 'REB', 'PD', 'INT', 'CT', 'BP'].map((h, i) => <th key={h} style={{ padding: '6px 8px', fontWeight: 500, textAlign: i < 2 ? 'left' : 'right' }}>{tr(h)}</th>)}</tr></thead>
                <tbody>{shown.slice().reverse().map(g => (
                  <tr key={g.gid} style={{ borderTop: `1px solid ${c.line}` }}>
                    <td style={{ padding: '7px 8px', color: c.dim }}>{ddmm(g.d)}{g.b2b && <span title={tr('2e soir de back-to-back')} style={{ marginLeft: 6, fontSize: 9, color: c.gold, border: `1px solid ${c.gold}`, borderRadius: 4, padding: '0 3px' }}>B2B</span>}</td><td style={{ padding: '7px 8px' }}>{g.home ? 'vs' : '@'} {g.opp}</td>
                    <td style={{ padding: '7px 8px', textAlign: 'right' }}>{mlink(g, g.t, true)}</td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', color: c.dim }}>{g.m}</td><td style={{ padding: '7px 8px', textAlign: 'right' }}>{g.pts}</td><td style={{ padding: '7px 8px', textAlign: 'right' }}>{g.reb}</td><td style={{ padding: '7px 8px', textAlign: 'right' }}>{g.ast}</td><td style={{ padding: '7px 8px', textAlign: 'right' }}>{g.stl}</td><td style={{ padding: '7px 8px', textAlign: 'right' }}>{g.blk}</td><td style={{ padding: '7px 8px', textAlign: 'right' }}>{g.to}</td>
                  </tr>))}</tbody>
              </table>
            </div>
            <div style={box}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>{tr('Scores par adversaire')}</div>
              {S!.opps.length === 0 && <p style={{ color: c.dim }}>{tr('Pas encore de données.')}</p>}
              {S!.opps.map((o, i) => (
                <div key={o.opp} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: i ? `1px solid ${c.line}` : 'none' }}>
                  <span>{o.opp} {i === 0 && S!.opps.length > 1 && <span style={{ fontSize: 10, color: c.gold, border: `1px solid ${c.gold}`, borderRadius: 4, padding: '0 4px', marginLeft: 4 }}>{tr('FAVORI')}</span>}</span>
                  <span><b style={{ color: c.cy }}>{o.avg.toFixed(1)}</b> <span style={{ color: c.dim, fontSize: 12 }}>({o.n} {tr('match')}{o.n > 1 ? 's' : ''})</span></span>
                </div>))}
            </div>
          </div>
          {d.seasons.length > 1 && <div style={{ ...box, marginTop: 16, overflowX: 'auto' }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>{tr('Saison par saison')}</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 360 }}><thead><tr style={{ color: c.dim }}>{['Saison', 'Matchs', 'Moy. TTFL', 'Max', 'Min', 'Minutes'].map((h, i) => <th key={h} style={{ padding: '6px 8px', fontWeight: 500, textAlign: i ? 'right' : 'left' }}>{tr(h)}</th>)}</tr></thead>
              <tbody>{d.seasons.map(x => <tr key={x.season} onClick={() => setSel(x.season)} style={{ cursor: 'pointer', background: cur === x.season ? 'rgba(0,255,255,.07)' : 'none', borderTop: `1px solid ${c.line}` }}><td style={{ padding: '7px 8px' }}>{x.season}</td><td style={{ padding: '7px 8px', textAlign: 'right' }}>{x.n}</td><td style={{ padding: '7px 8px', textAlign: 'right', color: c.cy, fontWeight: 700 }}>{fx(x.ttfl)}</td><td style={{ padding: '7px 8px', textAlign: 'right' }}>{x.max}</td><td style={{ padding: '7px 8px', textAlign: 'right' }}>{x.min}</td><td style={{ padding: '7px 8px', textAlign: 'right', color: c.dim }}>{fx(x.min_m)}</td></tr>)}</tbody></table></div>}
          <p style={{ color: c.dim, fontSize: 12, marginTop: 14 }}>{tr('Scores TTFL calculés depuis les box scores officiels (saison en cours depuis le 20/10, 3 saisons précédentes comprises). La carte affichée est la Limited In-Season de la saison la plus récente.')}</p>
        </>}
      </div>
    </main>
  );
}
