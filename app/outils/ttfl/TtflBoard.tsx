'use client';
import { useEffect, useMemo, useState } from 'react';

import { ttflProj, ttflForm, toSorareScale } from '../../../lib/ttflEst';
import DeckBuilder from './DeckBuilder';
import InjuriesTable from './InjuriesTable';
import Bilan from './Bilan';
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const parisDay = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(d);
const shift = (day: string, n: number) => { const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
// Les matchs d'une nuit NBA commencent apres minuit a Paris : des 8 h, on ouvre sur la nuit suivante.
const defaultNight = () => { const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', hour12: false }).format(new Date())); return h >= 8 ? shift(parisDay(), 1) : parisDay(); };

type P = { slug: string; name: string; team: string; opp: string; home: boolean; time: string; proj: number; l5: number | null; l10: number | null; inj: string | null };
type H = Record<string, { d: string; t: number; m: number; tm?: string }[]>;

export default function TtflBoard() {
  const [night, setNight] = useState(defaultNight);
  const [players, setPlayers] = useState<P[] | null>(null);
  const [hist, setHist] = useState<H | null>(null);
  const [err, setErr] = useState('');
  const [tbl, setTbl] = useState<Record<string, { status: string; until: string | null }>>({});
  const [q, setQ] = useState('');
  const [hideOut, setHideOut] = useState(true);
  const [view, setView] = useState<'night' | 'deck' | 'inj' | 'bilan'>('night');

  useEffect(() => { fetch('/api/outils/ttfl').then(r => r.json()).then(j => j.ok ? setHist(j.hist) : setErr(j.error || 'historique indisponible')).catch(e => setErr(String(e))); }, []);
  // Tableau des blessures partage (Rotowire / Underdog / ESPN) : complete le statut Sorare
  useEffect(() => { fetch('/api/outils/injuries').then(r => r.json()).then(j => { if (j.ok) { const m: Record<string, { status: string; until: string | null }> = {}; for (const r of j.rows) m[norm(r.name)] = { status: r.status, until: r.until }; setTbl(m); } }).catch(() => {}); }, []);
  useEffect(() => {
    setPlayers(null);
    fetch('/api/outils/cup?night=' + night).then(r => r.json()).then(j => j.error ? setErr(j.error) : setPlayers(j.players || [])).catch(e => setErr(String(e)));
  }, [night]);

  const rows = useMemo(() => {
    if (!players || !hist) return [];
    const byName: Record<string, { d: string; t: number; m: number; tm?: string }[]> = {};
    for (const [n, g] of Object.entries(hist)) byName[norm(n)] = g;
    // Matchs joués par l'équipe depuis le début de saison (dates distinctes où au moins un joueur de l'équipe a joué) : sert à mesurer la présence d'un joueur
    const teamDays: Record<string, Set<string>> = {};
    for (const g of Object.values(hist)) for (const x of g) if (x.tm) (teamDays[x.tm] ||= new Set()).add(x.d);
    return players.map(p => {
      const all = (byName[norm(p.name)] || []).slice().sort((a, b) => (a.d < b.d ? -1 : 1));
      const lastTm = all.length ? all[all.length - 1].tm : undefined; const gp = all.length; const tg = lastTm ? teamDays[lastTm]?.size ?? 0 : 0;
      const g = all.slice(-10);
      const n = g.length;
      const l10 = n ? g.reduce((s, x) => s + x.t, 0) / n : null;
      const est = ttflProj(p.proj, ttflForm(all.map(x => ({ d: x.d, t: x.t }))), p.inj, p.home);
      const ti = tbl[norm(p.name)];
      const tOut = !!ti && ti.status === 'OUT' && (!ti.until || night < ti.until);
      const out = (!!p.inj && p.inj !== 'GTD') || tOut;
      return { ...p, inj: p.inj || (tOut ? 'OUT' : null), n, l10, est, mp: toSorareScale(est), last: n ? g[n - 1].t : null, gp, tg, out };
    })  .filter(r => r.proj >= 5 && !(hideOut && r.out) && (!q || norm(r.name).includes(norm(q)) || norm(r.team).includes(norm(q))))
      .sort((a, b) => b.est - a.est);
  }, [players, hist, q, hideOut, tbl, night]);

  const c = { bg: '#07090d', card: 'rgba(255,255,255,.04)', line: 'rgba(255,255,255,.1)', cy: '#00ffff', gold: '#e5b94e', dim: 'rgba(255,255,255,.55)' };
  return (
    <main style={{ minHeight: '100vh', background: c.bg, color: '#fff', padding: '20px 16px', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, margin: 0, color: c.cy }}>TTFL Board</h1>
        <p style={{ color: c.dim, fontSize: 13, margin: '4px 0 14px' }}>Estimation du score TTFL de la nuit (jour Paris du coup d&apos;envoi). Calculée depuis la projection myNFTlocker (3,77 + 0,75 × projection), formule provisoire à recaler avec le journal des nuits. Joueurs incertains : ×0,88.</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {([['night', 'Estimations de la nuit'], ['deck', 'Deck builder'], ['inj', 'Blessures'], ['bilan', 'Bilan']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setView(k)} style={{ ...btn(c), borderColor: view === k ? c.cy : c.line, color: view === k ? c.cy : '#fff' }}>{l}</button>
          ))}
        </div>
        {view === 'deck' ? <DeckBuilder /> : view === 'inj' ? <InjuriesTable /> : view === 'bilan' ? <Bilan /> : <>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
          <button onClick={() => setNight(shift(night, -1))} style={btn(c)}>◀</button>
          <input type="date" value={night} onChange={e => e.target.value && setNight(e.target.value)} style={{ ...btn(c), padding: '6px 10px' }} />
          <button onClick={() => setNight(shift(night, 1))} style={btn(c)}>▶</button>
          <input placeholder="Joueur ou équipe" value={q} onChange={e => setQ(e.target.value)} style={{ ...btn(c), padding: '6px 10px', flex: '1 1 160px' }} />
          <label style={{ fontSize: 13, color: c.dim }}><input type="checkbox" checked={hideOut} onChange={e => setHideOut(e.target.checked)} /> Masquer les absents (OUT)</label>
        </div>
        {err && <div style={{ color: '#ff6b6b', marginBottom: 10 }}>{err}</div>}
        {(!players || !hist) && !err && <div style={{ color: c.dim }}>Chargement…</div>}
        {players && hist && (
          <div style={{ background: c.card, border: `1px solid ${c.line}`, borderRadius: 12, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead><tr style={{ color: c.dim, textAlign: 'left' }}>
                {['#', 'Joueur', 'Match', 'Estimation TTFL', 'Projection myNFTlocker', 'Moy. TTFL 10', 'Dernier', 'Présence'].map((h, i) => <th key={h} style={{ padding: '10px 12px', fontWeight: 500, textAlign: i > 2 ? 'right' : 'left' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.slug} style={{ borderTop: `1px solid ${c.line}`, opacity: r.out ? 0.45 : 1 }}>
                    <td style={{ padding: '8px 12px', color: c.dim }}>{i + 1}</td>
                    <td style={{ padding: '8px 12px' }}>{r.name}{r.inj && <span style={{ marginLeft: 8, fontSize: 11, color: c.gold }}>{r.inj}{tbl[norm(r.name)]?.until ? ` → ${tbl[norm(r.name)].until!.slice(5).split('-').reverse().join('/')}` : ''}</span>}</td>
                    <td style={{ padding: '8px 12px', color: c.dim }}>{r.home ? 'vs' : '@'} {r.opp} · {r.time}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: c.cy, fontWeight: 700 }}>{r.est.toFixed(1)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>{r.mp.toFixed(1)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>{r.l10 == null ? '–' : r.l10.toFixed(1)} <span style={{ color: c.dim, fontSize: 11 }}>({r.n})</span></td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>{r.last ?? '–'}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: r.tg && r.gp < r.tg - 1 ? '#ff9f43' : c.dim }} title="Matchs joués / matchs de son équipe cette saison">{r.tg ? `${r.gp}/${r.tg}` : '–'}</td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={8} style={{ padding: 16, color: c.dim }}>Aucun joueur pour cette nuit.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        </>}
      </div>
    </main>
  );
}
const btn = (c: { card: string; line: string }): React.CSSProperties => ({ background: c.card, border: `1px solid ${c.line}`, color: '#fff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 14 });
