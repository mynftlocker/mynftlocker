'use client';
import { useEffect, useMemo, useState } from 'react';
import StarBg from '../components/StarBg';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const parisDay = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(d);
const shift = (day: string, n: number) => { const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
// Les matchs d'une nuit NBA commencent apres minuit a Paris : des 8 h on ouvre sur la nuit suivante.
const defaultNight = () => { const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', hour12: false }).format(new Date())); return h >= 8 ? shift(parisDay(), 1) : parisDay(); };
const lbl = (day: string) => new Date(day + 'T12:00:00Z').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const dm = (d: string) => d.slice(5).split('-').reverse().join('/');

type R = { name: string; team: string; opp: string; home: boolean; time: string; est: number; proj: number; l10: number | null; n: number; last: number | null; gp: number; tg: number; status: 'OUT' | 'GTD' | null; until: string | null };
type I = { name: string; team: string; status: 'OUT' | 'GTD' | 'PROB'; until: string | null; untilKind: 'return' | 'reeval' | null; src: string; updated: string };
type SK = 'name' | 'match' | 'est' | 'l10' | 'last' | 'pres';
const val = (r: R, k: SK): number | string => k === 'name' ? r.name : k === 'match' ? r.opp : k === 'est' ? r.est : k === 'l10' ? r.l10 ?? -1 : k === 'last' ? r.last ?? -1 : r.tg ? r.gp / r.tg : -1;
const c = { cy: '#00ffff', gold: '#e5b94e', dim: 'rgba(255,255,255,.6)', line: 'rgba(255,255,255,.12)', card: 'rgba(8,12,28,.72)' };

export default function TtflPublic() {
  const [night, setNight] = useState(defaultNight);
  const [rows, setRows] = useState<R[] | null>(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [hideOut, setHideOut] = useState(true);
  const [view, setView] = useState<'night' | 'inj'>('night');
  const [inj, setInj] = useState<I[] | null>(null);
  const [sort, setSort] = useState<{ k: SK; dir: 1 | -1 }>({ k: 'est', dir: -1 });

  useEffect(() => {
    setRows(null); setErr('');
    fetch('/api/ttfl?night=' + night).then(r => r.json()).then(j => j.ok ? setRows(j.rows) : setErr(j.error || 'Indisponible')).catch(e => setErr(String(e)));
  }, [night]);
  useEffect(() => { if (view === 'inj' && !inj) fetch('/api/ttfl?inj=1').then(r => r.json()).then(j => j.ok && setInj(j.rows)).catch(() => {}); }, [view, inj]);

  const list = useMemo(() => (rows || []).filter(r => !(hideOut && r.status === 'OUT') && (!q || norm(r.name).includes(norm(q)) || norm(r.team).includes(norm(q))))
    .slice().sort((a, b) => { const x = val(a, sort.k), y = val(b, sort.k); const d = typeof x === 'string' ? x.localeCompare(y as string) : (x as number) - (y as number); return d * sort.dir || b.est - a.est; }), [rows, hideOut, q, sort]);
  const rank = useMemo(() => { const m: Record<string, number> = {}; (rows || []).forEach((r, i) => { m[r.name] = i + 1; }); return m; }, [rows]);
  const heat = (v: number | null, lo: number, hi: number) => v == null ? c.dim : hi <= lo ? '#fff' : (v - lo) / (hi - lo) > 0.75 ? c.cy : (v - lo) / (hi - lo) > 0.4 ? '#fff' : 'rgba(255,255,255,.6)';
  const eLo = Math.min(...list.map(r => r.est)), eHi = Math.max(...list.map(r => r.est));
  const lLo = Math.min(...list.filter(r => r.l10 != null).map(r => r.l10 as number)), lHi = Math.max(...list.filter(r => r.l10 != null).map(r => r.l10 as number));
  const toggle = (k: SK) => setSort(s => s.k === k ? { k, dir: (s.dir * -1) as 1 | -1 } : { k, dir: k === 'name' || k === 'match' ? 1 : -1 });
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
          <button style={btn(view === 'inj')} onClick={() => setView('inj')}>Blessures et retours</button>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
          {view === 'night' && <>
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
          {rows && list.length > 0 && (
            <div style={{ background: c.card, border: `1px solid ${c.line}`, borderRadius: 14, overflowX: 'auto', backdropFilter: 'blur(6px)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 640 }}>
                <thead><tr style={{ color: c.dim, textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 500 }}>#</th>
                  {([['name', 'Joueur'], ['match', 'Match'], ['est', 'Projection'], ['l10', 'Moy. 10'], ['last', 'Dernier'], ['pres', 'Présence']] as [SK, string][]).map(([k, h], i) => (
                    <th key={k} onClick={() => toggle(k)} aria-sort={sort.k === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'} style={{ padding: '10px 12px', fontWeight: 500, textAlign: i > 1 ? 'right' : 'left', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none', color: sort.k === k ? c.cy : c.dim }}>{h} {sort.k === k ? (sort.dir === 1 ? '▲' : '▼') : <span style={{ opacity: .35 }}>↕</span>}</th>
                  ))}
                </tr></thead>
                <tbody>{list.map(r => (
                  <tr key={r.name} style={{ borderTop: `1px solid ${c.line}`, opacity: r.status === 'OUT' ? 0.45 : 1 }}>
                    <td style={{ padding: '8px 12px', color: c.dim }}>{rank[r.name]}</td>
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{r.name}{r.status && badge(r.status, r.status === 'OUT' && r.until ? `OUT → ${dm(r.until)}` : r.status)}</td>
                    <td style={{ padding: '8px 12px', color: c.dim, whiteSpace: 'nowrap' }}>{r.home ? 'vs' : '@'} {r.opp} · {r.time}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: heat(r.est, eLo, eHi), fontWeight: 700 }}>{r.est.toFixed(1)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: heat(r.l10, lLo, lHi) }}>{r.l10 == null ? '–' : r.l10.toFixed(1)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>{r.last ?? '–'}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: r.tg && r.gp < r.tg - 1 ? '#ff9f43' : c.dim }}>{r.tg ? `${r.gp}/${r.tg}` : '–'}</td>
                  </tr>))}</tbody>
              </table>
            </div>
          )}
          <p style={{ color: c.dim, fontSize: 12, marginTop: 14, lineHeight: 1.5 }}>Projection myNFTlocker = score TTFL attendu, calculé depuis la projection Sorare lissée avec la forme récente (joueurs incertains GTD pondérés à la baisse). Calibrage en cours sur les scores réels. « Présence » = matchs joués / matchs de l&apos;équipe cette saison. Heures de Paris.</p>
        </>}

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
