'use client';
import { useEffect, useMemo, useState } from 'react';
import StarBg from '../components/StarBg';
import LiveTab from './LiveTab';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const parisDay = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(d);
const shift = (day: string, n: number) => { const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
// Les matchs d'une nuit NBA commencent apres minuit a Paris : des 8 h on ouvre sur la nuit suivante.
const defaultNight = () => { const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', hour12: false }).format(new Date())); return h >= 8 ? shift(parisDay(), 1) : parisDay(); };
const lbl = (day: string) => new Date(day + 'T12:00:00Z').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const dm = (d: string) => d.slice(5).split('-').reverse().join('/');

type R = { name: string; team: string; opp: string; home: boolean; time: string; est: number; proj: number; l10: number | null; n: number; last: number | null; gp: number; tg: number; g: [string, number, number][]; status: 'OUT' | 'GTD' | null; until: string | null };
type I = { name: string; team: string; status: 'OUT' | 'GTD' | 'PROB'; until: string | null; untilKind: 'return' | 'reeval' | null; src: string; updated: string };
type SK = 'name' | 'match' | 'est' | 'l10' | 'last' | 'pres';
type W = 5 | 10 | 0;
const avg = (r: R, w: W) => { const g = w ? r.g.slice(-w) : r.g; return g.length ? g.reduce((s, x) => s + x[1], 0) / g.length : null; };
const trend = (r: R) => { const a = avg(r, 5), b = avg(r, 10); return a == null || b == null || r.g.length < 6 ? 0 : a - b >= 3 ? 1 : a - b <= -3 ? -1 : 0; };
const ddmm = (d: string) => d.slice(8) + '/' + d.slice(5, 7);
// Scores TTFL match par match (barres) avec la projection de la nuit et la moyenne en reperes.
function Bars({ r }: { r: R }) {
  const g = r.g.slice(-20); const W = 640, H = 200, L = 30, B = 22, T = 14; const hi = Math.max(10, ...g.map(x => x[1]), r.est) + 4; const lo = Math.min(0, ...g.map(x => x[1]));
  const bw = Math.min(46, (W - L - 8) / Math.max(g.length, 1)); const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B); const a = avg(r, 0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label={`Scores TTFL de ${r.name}`}>
      <line x1={L} x2={W - 8} y1={y(0)} y2={y(0)} stroke={c.line} />
      {g.map((x, i) => <g key={x[0]}><rect x={L + i * bw + 3} y={Math.min(y(x[1]), y(0))} width={Math.max(bw - 6, 2)} height={Math.abs(y(x[1]) - y(0))} rx="3" fill={x[1] >= r.est ? c.cy : 'rgba(0,255,255,.4)'} /><text x={L + i * bw + bw / 2} y={y(Math.max(x[1], 0)) - 4} fill="#fff" fontSize="10" textAnchor="middle">{x[1]}</text><text x={L + i * bw + bw / 2} y={H - 6} fill={c.dim} fontSize="9" textAnchor="middle">{ddmm(x[0])}</text></g>)}
      <line x1={L} x2={W - 8} y1={y(r.est)} y2={y(r.est)} stroke={c.gold} strokeDasharray="5 4" /><text x={W - 10} y={y(r.est) + 14} fill={c.gold} textAnchor="end" fontSize="11" stroke="#050818" strokeWidth="3" paintOrder="stroke">Projection {r.est.toFixed(1)}</text>
      {a != null && <><line x1={L} x2={W - 8} y1={y(a)} y2={y(a)} stroke="rgba(255,255,255,.5)" strokeDasharray="2 4" /><text x={W - 10} y={y(a) - 4} fill="rgba(255,255,255,.7)" fontSize="11" textAnchor="end" stroke="#050818" strokeWidth="3" paintOrder="stroke">Moyenne {a.toFixed(1)}</text></>}
    </svg>
  );
}
let W_CUR: W = 10;
const val = (r: R, k: SK): number | string => k === 'name' ? r.name : k === 'match' ? r.opp : k === 'est' ? r.est : k === 'l10' ? avg(r, W_CUR) ?? -1 : k === 'last' ? r.last ?? -1 : r.tg ? r.gp / r.tg : -1;
const c = { cy: '#00ffff', gold: '#e5b94e', dim: 'rgba(255,255,255,.6)', line: 'rgba(255,255,255,.12)', card: 'rgba(8,12,28,.72)' };

export default function TtflPublic() {
  const [night, setNight] = useState(defaultNight);
  const [rows, setRows] = useState<R[] | null>(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [hideOut, setHideOut] = useState(true);
  const [view, setView] = useState<'night' | 'live' | 'inj'>('night');
  const [inj, setInj] = useState<I[] | null>(null);
  const [win, setWin] = useState<W>(10);
  const [open, setOpen] = useState<string | null>(null);
  const [sort, setSort] = useState<{ k: SK; dir: 1 | -1 }>({ k: 'est', dir: -1 });

  useEffect(() => {
    setRows(null); setErr('');
    fetch('/api/ttfl?night=' + night).then(r => r.json()).then(j => j.ok ? setRows(j.rows) : setErr(j.error || 'Indisponible')).catch(e => setErr(String(e)));
  }, [night]);
  useEffect(() => { if (view === 'inj' && !inj) fetch('/api/ttfl?inj=1').then(r => r.json()).then(j => j.ok && setInj(j.rows)).catch(() => {}); }, [view, inj]);

  W_CUR = win;
  const list = useMemo(() => (rows || []).filter(r => !(hideOut && r.status === 'OUT') && (!q || norm(r.name).includes(norm(q)) || norm(r.team).includes(norm(q))))
    .slice().sort((a, b) => { const x = val(a, sort.k), y = val(b, sort.k); const d = typeof x === 'string' ? x.localeCompare(y as string) : (x as number) - (y as number); return d * sort.dir || b.est - a.est; }), [rows, hideOut, q, sort, win]);
  const rank = useMemo(() => { const m: Record<string, number> = {}; (rows || []).forEach((r, i) => { m[r.name] = i + 1; }); return m; }, [rows]);
  const heat = (v: number | null, lo: number, hi: number) => v == null ? c.dim : hi <= lo ? '#fff' : (v - lo) / (hi - lo) > 0.75 ? c.cy : (v - lo) / (hi - lo) > 0.4 ? '#fff' : 'rgba(255,255,255,.6)';
  const eLo = Math.min(...list.map(r => r.est)), eHi = Math.max(...list.map(r => r.est));
  const lv = list.map(r => avg(r, win)).filter((x): x is number => x != null); const lLo = Math.min(...lv), lHi = Math.max(...lv);
  const toggle = (k: SK) => setSort(s => s.k === k ? { k, dir: (s.dir * -1) as 1 | -1 } : { k, dir: k === 'name' || k === 'match' ? 1 : -1 });
  const projMap = useMemo(() => { const m: Record<string, number> = {}; (rows || []).forEach(r => { m[norm(r.name)] = r.est; }); return m; }, [rows]);
  const top = (rows || []).filter(r => r.status !== 'OUT').slice(0, 5);
  const injList = (inj || []).filter(r => !q || norm(r.name + r.team).includes(norm(q))).sort((a, b) => (a.status === b.status ? ((a.until || '9') < (b.until || '9') ? -1 : 1) : a.status === 'OUT' ? -1 : 1));

  const btn = (on = false): React.CSSProperties => ({ background: c.card, border: `1px solid ${on ? c.cy : c.line}`, color: on ? c.cy : '#fff', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 14 });
  const badge = (s: 'OUT' | 'GTD' | 'PROB', t: string) => <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: s === 'OUT' ? 'rgba(255,90,90,.18)' : 'rgba(229,185,78,.18)', color: s === 'OUT' ? '#ff7b7b' : c.gold }}>{t}</span>;

  return (
    <main style={{ minHeight: '100vh', color: '#fff', fontFamily: 'system-ui,sans-serif', padding: '28px 16px 60px', position: 'relative' }}>
      <StarBg />
      <div style={{ maxWidth: 1000, margin: '0 auto', position: 'relative' }}>
        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: '.02em', color: '#fff' }}>my<span style={{ color: c.cy }}>NFT</span>locker</span>
        </a>
        <h1 style={{ fontSize: 'clamp(26px,5vw,42px)', margin: '10px 0 4px', letterSpacing: '.01em' }}>Remplis ton deck de <span style={{ color: c.cy }}>best picks</span> TTFL</h1>
        <p style={{ color: c.dim, margin: '0 0 18px', maxWidth: 700, lineHeight: 1.5, fontSize: 15 }}>Les <b style={{ color: '#fff' }}>projections myNFTlocker</b> : le score TTFL attendu de chaque joueur NBA pour la nuit, selon la forme, le match, les blessures et les retours. Mises à jour en continu.</p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button style={btn(view === 'night')} onClick={() => setView('night')}>Projections de la nuit</button>
          <button style={btn(view === 'live')} onClick={() => setView('live')}>En direct</button>
          <button style={btn(view === 'inj')} onClick={() => setView('inj')}>Blessures et retours</button>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
          {view !== 'inj' && <>
            <button style={btn()} onClick={() => setNight(shift(night, -1))} aria-label="Nuit précédente">◀</button>
            <div style={{ ...btn(), cursor: 'default', textTransform: 'capitalize', minWidth: 170, textAlign: 'center' }}>{lbl(night)}</div>
            <button style={btn()} onClick={() => setNight(shift(night, 1))} aria-label="Nuit suivante">▶</button>
          </>}
          <input placeholder="Joueur ou équipe" value={q} onChange={e => setQ(e.target.value)} style={{ ...btn(), cursor: 'text', flex: '1 1 160px', minWidth: 0 }} />
          {view === 'night' && <label style={{ fontSize: 13, color: c.dim, display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={hideOut} onChange={e => setHideOut(e.target.checked)} /> Masquer les absents</label>}
        </div>

        {view === 'night' && <>
          {err && <p style={{ color: '#ff7b7b' }}>{err}</p>}
          {!rows && !err && <p style={{ color: c.dim }}>Chargement…</p>}
          {rows && !rows.length && <p style={{ color: c.dim }}>Aucun match NBA cette nuit.</p>}
          {top.length > 0 && !q && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 10, marginBottom: 18 }}>
              {top.map((r, i) => (
                <div key={r.name} style={{ background: c.card, border: `1px solid ${i === 0 ? c.cy : c.line}`, borderRadius: 14, padding: 14, backdropFilter: 'blur(6px)' }}>
                  <div style={{ fontSize: 12, color: c.dim }}>#{i + 1} · {r.team}</div>
                  <div style={{ fontWeight: 700, margin: '4px 0 8px' }}>{r.name}{r.status === 'GTD' && badge('GTD', 'GTD')}</div>
                  <div style={{ fontSize: 30, fontWeight: 800, color: c.cy, lineHeight: 1 }}>{r.est.toFixed(1)}</div>
                  <div style={{ fontSize: 12, color: c.dim, marginTop: 6 }}>{r.home ? 'vs' : '@'} {r.opp} · {r.time}</div>
                </div>
              ))}
            </div>
          )}
          {rows && list.length > 0 && <div style={{ display: 'flex', gap: 6, alignItems: 'center', margin: '0 0 8px', fontSize: 13, color: c.dim }}>Forme sur
            {([[5, '5 matchs'], [10, '10 matchs'], [0, 'Saison']] as [W, string][]).map(([w, l]) => <button key={w} onClick={() => setWin(w)} style={{ ...btn(win === w), padding: '4px 10px', fontSize: 13 }}>{l}</button>)}
            <span style={{ marginLeft: 'auto', fontSize: 12 }}>Clique sur un joueur pour voir ses scores match par match</span></div>}
          {rows && list.length > 0 && (
            <div style={{ background: c.card, border: `1px solid ${c.line}`, borderRadius: 14, overflowX: 'auto', backdropFilter: 'blur(6px)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 640 }}>
                <thead><tr style={{ color: c.dim, textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 500 }}>#</th>
                  {([['name', 'Joueur'], ['match', 'Match'], ['est', 'Projection'], ['l10', win ? 'Moy. ' + win : 'Moy. saison'], ['last', 'Dernier'], ['pres', 'Présence']] as [SK, string][]).map(([k, h], i) => (
                    <th key={k} onClick={() => toggle(k)} aria-sort={sort.k === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'} style={{ padding: '10px 12px', fontWeight: 500, textAlign: i > 1 ? 'right' : 'left', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none', color: sort.k === k ? c.cy : c.dim }}>{h} {sort.k === k ? (sort.dir === 1 ? '▲' : '▼') : <span style={{ opacity: .35 }}>↕</span>}</th>
                  ))}
                </tr></thead>
                <tbody>{list.map(r => { const a = avg(r, win), tr = trend(r), o = open === r.name; return [
                  <tr key={r.name} onClick={() => setOpen(o ? null : r.name)} style={{ borderTop: `1px solid ${c.line}`, opacity: r.status === 'OUT' ? 0.45 : 1, cursor: 'pointer', background: o ? 'rgba(0,255,255,.07)' : 'transparent' }}>
                    <td style={{ padding: '8px 12px', color: c.dim }}>{rank[r.name]}</td>
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{r.name}{r.status && badge(r.status, r.status === 'OUT' && r.until ? `OUT → ${dm(r.until)}` : r.status)}</td>
                    <td style={{ padding: '8px 12px', color: c.dim, whiteSpace: 'nowrap' }}>{r.home ? 'vs' : '@'} {r.opp} · {r.time}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: heat(r.est, eLo, eHi), fontWeight: 700 }}>{r.est.toFixed(1)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: heat(a, lLo, lHi) }}>{a == null ? '–' : a.toFixed(1)}{tr !== 0 && <span title={tr > 0 ? 'En hausse (5 derniers vs 10)' : 'En baisse (5 derniers vs 10)'} style={{ marginLeft: 4, fontSize: 10, color: tr > 0 ? '#4ade80' : '#ff7b7b' }}>{tr > 0 ? '▲' : '▼'}</span>}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>{r.last ?? '–'}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: r.tg && r.gp < r.tg - 1 ? '#ff9f43' : c.dim }}>{r.tg ? `${r.gp}/${r.tg}` : '–'}</td>
                  </tr>,
                  o && <tr key={r.name + 'x'}><td colSpan={7} style={{ padding: '10px 12px 14px', background: 'rgba(0,255,255,.04)' }}>
                    {r.g.length ? <Bars r={r} /> : <span style={{ color: c.dim }}>Pas encore de match joué cette saison.</span>}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, fontSize: 12 }}>
                      {([['Moy. 5', avg(r, 5)], ['Moy. 10', avg(r, 10)], ['Saison', avg(r, 0)], ['Max', r.g.length ? Math.max(...r.g.map(x => x[1])) : null], ['Min', r.g.length ? Math.min(...r.g.map(x => x[1])) : null]] as [string, number | null][]).map(([k, v]) => (
                        <span key={k} style={{ border: `1px solid ${c.line}`, borderRadius: 8, padding: '3px 8px' }}><span style={{ color: c.dim }}>{k}</span> <b>{v == null ? '–' : v.toFixed(1)}</b></span>))}
                    </div>
                  </td></tr>]; })}</tbody>
              </table>
            </div>
          )}
          <p style={{ color: c.dim, fontSize: 12, marginTop: 14, lineHeight: 1.5 }}>Projection myNFTlocker = score TTFL attendu, calculé depuis la projection Sorare lissée avec la forme récente (joueurs incertains GTD pondérés à la baisse). Calibrage en cours sur les scores réels. « Présence » = matchs joués / matchs de l&apos;équipe cette saison. Heures de Paris.</p>
        </>}

        {view === 'live' && <LiveTab night={night} proj={projMap} />}

        {view === 'inj' && (
          <div style={{ background: c.card, border: `1px solid ${c.line}`, borderRadius: 14, overflowX: 'auto' }}>
            {!inj && <p style={{ padding: 14, color: c.dim, margin: 0 }}>Chargement…</p>}
            {inj && <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 520 }}>
              <thead><tr style={{ color: c.dim, textAlign: 'left' }}>{['Joueur', 'Équipe', 'Statut', 'Retour / réévaluation'].map(h => <th key={h} style={{ padding: '10px 12px', fontWeight: 500 }}>{h}</th>)}</tr></thead>
              <tbody>{injList.map(r => (
                <tr key={r.name} style={{ borderTop: `1px solid ${c.line}` }}>
                  <td style={{ padding: '8px 12px' }}>{r.name}</td>
                  <td style={{ padding: '8px 12px', color: c.dim }}>{r.team}</td>
                  <td style={{ padding: '8px 12px', color: r.status === 'OUT' ? '#ff7b7b' : c.gold, fontWeight: 700 }}>{r.status}</td>
                  <td style={{ padding: '8px 12px' }}>{r.until ? `${dm(r.until)} (${r.untilKind === 'reeval' ? 'réévaluation' : 'retour'})` : '–'}</td>
                </tr>))}</tbody>
            </table>}
          </div>
        )}

        <div style={{ marginTop: 28, textAlign: 'center' }}>
          <a href="/" style={{ display: 'inline-block', background: c.cy, color: '#001018', fontWeight: 700, padding: '12px 22px', borderRadius: 12, textDecoration: 'none' }}>Découvrir myNFTlocker</a>
          <div style={{ color: c.dim, fontSize: 12, marginTop: 10 }}>Projections TTFL © myNFTlocker.com</div>
        </div>
      </div>
    </main>
  );
}
