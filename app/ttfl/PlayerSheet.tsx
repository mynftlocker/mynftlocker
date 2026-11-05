'use client';
import { useEffect, useState } from 'react';
import StarBg from '../components/StarBg';

type G = { d: string; opp: string; home: boolean; gid: string; t: number; m: number; pts: number; reb: number; ast: number; stl: number; blk: number; to: number; fgm: number; fga: number; tpm: number; tpa: number; ftm: number; fta: number };
type L = { n: number; ttfl: number | null; min: number | null; pts: number | null; reb: number | null; ast: number | null; stl: number | null; blk: number | null; to: number | null; fgm: number | null; fgmiss: number | null; tpm: number | null; tpmiss: number | null; ftm: number | null; ftmiss: number | null };
type D = { player: { slug: string; name: string; birthDay: string | null; country: { name: string; code: string } | null; stars: number | null; pic: string | null; team: string | null }; card: { slug: string; pic: string; year: number } | null; games: G[]; avg: { season: L; l10: L; l5: L; home: L; away: L }; best: { t: number; opp: string; d: string; gid: string } | null; worst: { t: number; opp: string; d: string; gid: string } | null; opps: { opp: string; n: number; avg: number }[]; sd: number | null };
const c = { cy: '#00ffff', gold: '#e5b94e', dim: 'rgba(255,255,255,.6)', line: 'rgba(255,255,255,.12)', card: 'rgba(8,12,28,.72)' };
const flag = (code: string) => String.fromCodePoint(...[...code.toUpperCase()].map(ch => 127397 + ch.charCodeAt(0)));
const age = (b: string) => Math.floor((Date.now() - new Date(b).getTime()) / 31557600000);
const ddmm = (d: string) => d.slice(8) + '/' + d.slice(5, 7);
const parisNight = (us: string) => { const d = new Date(us + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); };
export const matchHref = (us: string, gid: string) => `/ttfl?v=live&night=${parisNight(us)}&game=${gid}`;
const fx = (v: number | null) => (v == null ? '–' : v.toFixed(1));

function Bars({ g }: { g: G[] }) {
  const s = g.slice(-10); const W = 640, H = 210, Lm = 8, B = 36, T = 16; const slots = 10; const bw = (W - Lm * 2) / slots;
  const hi = Math.max(10, ...s.map(x => x.t)) + 4; const lo = Math.min(0, ...s.map(x => x.t)); const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const mean = s.length ? s.reduce((a, x) => a + x.t, 0) / s.length : 0;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="10 derniers scores TTFL">
      <line x1={Lm} x2={W - Lm} y1={y(0)} y2={y(0)} stroke={c.line} />
      {s.map((x, i) => { const cx = Lm + (slots - s.length + i) * bw + bw / 2; return (
        <a key={x.gid} href={matchHref(x.d, x.gid)}><g style={{ cursor: 'pointer' }}>
          <rect x={cx - 17} y={Math.min(y(x.t), y(0))} width={34} height={Math.max(Math.abs(y(x.t) - y(0)), 2)} rx="4" fill={x.t >= mean ? c.cy : 'rgba(0,255,255,.4)'} />
          <text x={cx} y={y(Math.max(x.t, 0)) - 5} fill="#fff" fontSize="12" fontWeight="700" textAnchor="middle">{x.t}</text>
          <text x={cx} y={H - 20} fill={c.dim} fontSize="10" textAnchor="middle">{x.home ? 'vs' : '@'} {x.opp}</text>
          <text x={cx} y={H - 7} fill={c.dim} fontSize="9" textAnchor="middle">{ddmm(x.d)}</text>
        </g></a>); })}
      {s.length > 0 && <><line x1={Lm} x2={W - Lm} y1={y(mean)} y2={y(mean)} stroke="rgba(255,255,255,.5)" strokeDasharray="2 4" /><text x={W - Lm} y={y(mean) - 4} fill="rgba(255,255,255,.8)" fontSize="11" textAnchor="end" stroke="#050818" strokeWidth="3" paintOrder="stroke">Moyenne {mean.toFixed(1)}</text></>}
    </svg>
  );
}

export default function PlayerSheet({ slug }: { slug: string }) {
  const [d, setD] = useState<D | null>(null); const [err, setErr] = useState(''); const [w, setW] = useState<'l5' | 'l10' | 'season'>('l10');
  useEffect(() => { fetch('/api/ttfl/player?slug=' + slug).then(r => r.json()).then(j => j.ok ? setD(j) : setErr(j.error || 'Indisponible')).catch(e => setErr(String(e))); }, [slug]);
  const box: React.CSSProperties = { background: c.card, border: `1px solid ${c.line}`, borderRadius: 14, padding: 14, backdropFilter: 'blur(6px)' };
  const btn = (on: boolean): React.CSSProperties => ({ background: c.card, border: `1px solid ${on ? c.cy : c.line}`, color: on ? c.cy : '#fff', borderRadius: 10, padding: '6px 12px', cursor: 'pointer', fontSize: 13 });
  const A = d?.avg[w];
  const tile = (k: string, v: string, sub?: string, col = '#fff') => <div style={{ ...box, flex: '1 1 120px', minWidth: 110 }}><div style={{ fontSize: 12, color: c.dim }}>{k}</div><div style={{ fontSize: 26, fontWeight: 800, color: col, margin: '2px 0' }}>{v}</div>{sub && <div style={{ fontSize: 12, color: c.dim }}>{sub}</div>}</div>;
  const mlink = (g: { d: string; gid: string }, t: number, strong = false) => <a href={matchHref(g.d, g.gid)} style={{ color: c.cy, fontWeight: strong ? 800 : 700, textDecoration: 'none', borderBottom: `1px dashed ${c.cy}` }}>{t}</a>;

  return (
    <main style={{ minHeight: '100vh', color: '#fff', fontFamily: 'system-ui,sans-serif', padding: '28px 16px 60px', position: 'relative' }}>
      <StarBg />
      <div style={{ maxWidth: 1000, margin: '0 auto', position: 'relative' }}>
        <a href="/ttfl" style={{ color: c.cy, fontSize: 13, textDecoration: 'none' }}>← Projections TTFL · <b>my<span style={{ color: c.cy }}>NFT</span>locker</b></a>
        {err && <p style={{ color: '#ff7b7b', marginTop: 20 }}>{err}</p>}
        {!d && !err && <p style={{ color: c.dim, marginTop: 20 }}>Chargement de la fiche…</p>}
        {d && A && <>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', margin: '16px 0 18px' }}>
            {d.player.pic && /* eslint-disable-next-line @next/next/no-img-element */ <img src={d.player.pic} alt={d.player.name} width={96} height={96} style={{ borderRadius: 18, border: `1px solid ${c.line}`, objectFit: 'cover' }} />}
            <div style={{ flex: '1 1 260px' }}>
              <h1 style={{ fontSize: 'clamp(26px,5vw,40px)', margin: 0 }}>{d.player.name}</h1>
              <div style={{ color: c.dim, marginTop: 6, fontSize: 15, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {d.player.team && <span>{d.player.team}</span>}
                {d.player.country && <span>{flag(d.player.country.code)} {d.player.country.name}</span>}
                {d.player.birthDay && <span>{new Date(d.player.birthDay).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} ({age(d.player.birthDay)} ans)</span>}
                {d.player.stars != null && <span style={{ color: c.gold }}>{d.player.stars} ★ Sorare</span>}
              </div>
            </div>
            {d.card && <a href={`https://sorare.com/nba/cards/${d.card.slug}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#fff', textAlign: 'center', fontSize: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}<img src={d.card.pic} alt={`Carte Sorare ${d.player.name}`} style={{ height: 120, width: 'auto', borderRadius: 8, display: 'block', margin: '0 auto 4px' }} />Carte Sorare {d.card.year} →</a>}
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            {tile('Moy. 5 matchs', fx(d.avg.l5.ttfl), `${d.avg.l5.n} match(s)`, c.cy)}{tile('Moy. 10 matchs', fx(d.avg.l10.ttfl), `${d.avg.l10.n} match(s)`, c.cy)}{tile('Moy. saison', fx(d.avg.season.ttfl), `${d.avg.season.n} match(s)`)}
            {tile('Score max', d.best ? String(d.best.t) : '–', d.best ? `vs ${d.best.opp} · ${ddmm(d.best.d)}` : undefined, '#4ade80')}{tile('Score min', d.worst ? String(d.worst.t) : '–', d.worst ? `vs ${d.worst.opp} · ${ddmm(d.worst.d)}` : undefined, '#ff7b7b')}
            {tile('Régularité', d.sd == null ? '–' : '±' + d.sd, 'écart-type des scores')}
          </div>

          <div style={{ ...box, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>10 derniers matchs <span style={{ color: c.dim, fontWeight: 400, fontSize: 12 }}>· clique sur un score pour ouvrir la fiche du match</span></div>
            {d.games.length ? <Bars g={d.games} /> : <p style={{ color: c.dim }}>Aucun match joué cette saison.</p>}
          </div>

          <div style={{ ...box, marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}><b style={{ marginRight: 6 }}>Moyennes par match</b>
              {([['l5', '5 matchs'], ['l10', '10 matchs'], ['season', 'Saison']] as ['l5' | 'l10' | 'season', string][]).map(([k, l]) => <button key={k} style={btn(w === k)} onClick={() => setW(k)}>{l}</button>)}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 8 }}>
              {([['Minutes', A.min, ''], ['Points', A.pts, '+'], ['Rebonds', A.reb, '+'], ['Passes', A.ast, '+'], ['Interceptions', A.stl, '+'], ['Contres', A.blk, '+'], ['Tirs réussis', A.fgm, '+'], ['3 pts réussis', A.tpm, '+'], ['LF réussis', A.ftm, '+'], ['Tirs manqués', A.fgmiss, '−'], ['3 pts manqués', A.tpmiss, '−'], ['LF manqués', A.ftmiss, '−'], ['Balles perdues', A.to, '−']] as [string, number | null, string][]).map(([k, v, s]) => (
                <div key={k} style={{ border: `1px solid ${c.line}`, borderRadius: 10, padding: '8px 10px' }}><div style={{ fontSize: 11, color: c.dim }}>{k}</div><div style={{ fontSize: 20, fontWeight: 800, color: s === '−' ? '#ff9b9b' : s === '+' ? '#fff' : c.dim }}>{s === '−' && v ? '−' : ''}{fx(v)}</div></div>))}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10, fontSize: 13, color: c.dim }}>
              <span>Domicile : <b style={{ color: '#fff' }}>{fx(d.avg.home.ttfl)}</b> ({d.avg.home.n})</span><span>Extérieur : <b style={{ color: '#fff' }}>{fx(d.avg.away.ttfl)}</b> ({d.avg.away.n})</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: 16 }}>
            <div style={{ ...box, overflowX: 'auto', padding: 0 }}>
              <div style={{ padding: '12px 14px', fontWeight: 700 }}>Tous les matchs</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 440 }}>
                <thead><tr style={{ color: c.dim, textAlign: 'right' }}>{['Date', 'Adversaire', 'TTFL', 'MIN', 'PTS', 'REB', 'PD', 'INT', 'CT', 'BP'].map((h, i) => <th key={h} style={{ padding: '6px 8px', fontWeight: 500, textAlign: i < 2 ? 'left' : 'right' }}>{h}</th>)}</tr></thead>
                <tbody>{d.games.slice().reverse().map(g => (
                  <tr key={g.gid} style={{ borderTop: `1px solid ${c.line}` }}>
                    <td style={{ padding: '7px 8px', color: c.dim }}>{ddmm(g.d)}</td><td style={{ padding: '7px 8px' }}>{g.home ? 'vs' : '@'} {g.opp}</td>
                    <td style={{ padding: '7px 8px', textAlign: 'right' }}>{mlink(g, g.t, true)}</td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', color: c.dim }}>{g.m}</td><td style={{ padding: '7px 8px', textAlign: 'right' }}>{g.pts}</td><td style={{ padding: '7px 8px', textAlign: 'right' }}>{g.reb}</td><td style={{ padding: '7px 8px', textAlign: 'right' }}>{g.ast}</td><td style={{ padding: '7px 8px', textAlign: 'right' }}>{g.stl}</td><td style={{ padding: '7px 8px', textAlign: 'right' }}>{g.blk}</td><td style={{ padding: '7px 8px', textAlign: 'right' }}>{g.to}</td>
                  </tr>))}</tbody>
              </table>
            </div>
            <div style={box}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Scores par adversaire</div>
              {d.opps.length === 0 && <p style={{ color: c.dim }}>Pas encore de données.</p>}
              {d.opps.map((o, i) => (
                <div key={o.opp} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: i ? `1px solid ${c.line}` : 'none' }}>
                  <span>{o.opp} {i === 0 && d.opps.length > 1 && <span style={{ fontSize: 10, color: c.gold, border: `1px solid ${c.gold}`, borderRadius: 4, padding: '0 4px', marginLeft: 4 }}>FAVORI</span>}</span>
                  <span><b style={{ color: c.cy }}>{o.avg.toFixed(1)}</b> <span style={{ color: c.dim, fontSize: 12 }}>({o.n} match{o.n > 1 ? 's' : ''})</span></span>
                </div>))}
            </div>
          </div>
          <p style={{ color: c.dim, fontSize: 12, marginTop: 14 }}>Scores TTFL calculés depuis les box scores officiels de la saison 2026-27 (depuis le 21/10). La carte affichée est la Limited In-Season de la saison la plus récente.</p>
        </>}
      </div>
    </main>
  );
}
