'use client';
import { useCallback, useEffect, useState } from 'react';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
type G = { id: string; state: 'pre' | 'in' | 'post'; detail: string; period: number; clock: string; start: string; home: T; away: T };
type T = { abbr: string; name: string; score: number; logo: string; q: number[] };
type P = { id: string; name: string; team: string; starter: boolean; dnp: boolean; min: number; pts: number; reb: number; ast: number; stl: number; blk: number; to: number; fgm: number; fga: number; tpm: number; tpa: number; ftm: number; fta: number; ttfl: number; curve: [number, number][] };
const c = { cy: '#00ffff', gold: '#e5b94e', dim: 'rgba(255,255,255,.6)', line: 'rgba(255,255,255,.12)', card: 'rgba(8,12,28,.72)', red: '#ff5a5a' };
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
const stat = (g: G) => g.state === 'in' ? `${g.period > 4 ? 'PROL ' + (g.period - 4) : 'Q' + g.period} · ${g.clock}` : g.state === 'post' ? 'Terminé' : hhmm(g.start);

// Courbe d'evolution du score TTFL d'un joueur (rejoue le play-by-play) avec la projection en repere pointille.
function Curve({ p, proj }: { p: P; proj: number | null }) {
  const W = 640, H = 220, L = 34, B = 24, R = 10, T = 12;
  const pts = p.curve; const maxX = Math.max(48, ...pts.map(a => a[0])); const ys = pts.map(a => a[1]).concat(proj ?? 0, 0);
  const lo = Math.min(...ys), hi = Math.max(...ys, lo + 10); const x = (v: number) => L + (v / maxX) * (W - L - R); const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  let d = ''; pts.forEach(([t, v], i) => { d += i ? `L${x(t)},${y(pts[i - 1][1])}L${x(t)},${y(v)}` : `M${x(t)},${y(v)}`; });
  const qs = [12, 24, 36, 48].filter(q => q <= maxX);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label={`Évolution du score TTFL de ${p.name}`}>
      {qs.map(q => <g key={q}><line x1={x(q)} x2={x(q)} y1={T} y2={H - B} stroke={c.line} /><text x={x(q)} y={H - 7} fill={c.dim} fontSize="11" textAnchor="end">{q <= 48 ? 'Q' + q / 12 : ''}</text></g>)}
      <line x1={L} x2={W - R} y1={y(0)} y2={y(0)} stroke={c.line} />
      {proj != null && <><line x1={L} x2={W - R} y1={y(proj)} y2={y(proj)} stroke={c.gold} strokeDasharray="5 4" /><text x={L + 4} y={y(proj) - 4} fill={c.gold} fontSize="11">Projection {proj.toFixed(1)}</text></>}
      <path d={d} fill="none" stroke={c.cy} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx={x(pts[pts.length - 1][0])} cy={y(p.ttfl)} r="4.5" fill={c.cy} />
      {[lo, hi].map(v => <text key={v} x={4} y={y(v) + 4} fill={c.dim} fontSize="11">{Math.round(v)}</text>)}
    </svg>
  );
}

export default function LiveTab({ night, proj, slugs, initialGame }: { night: string; proj: Record<string, number>; slugs: Record<string, string>; initialGame?: string | null }) {
  const [games, setGames] = useState<G[] | null>(null);
  const [err, setErr] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const [det, setDet] = useState<{ game: G; players: P[] } | null>(null);
  const [pid, setPid] = useState<string | null>(null);

  const loadGames = useCallback(() => fetch('/api/ttfl/live?night=' + night).then(r => r.json()).then(j => j.ok ? (setGames(j.games), setErr('')) : setErr(j.error || 'Indisponible')).catch(e => setErr(String(e))), [night]);
  useEffect(() => { setGames(null); setSel(initialGame || null); setDet(null); loadGames(); }, [night, loadGames, initialGame]);
  const anyLive = !!games?.some(g => g.state === 'in');
  useEffect(() => { const t = setInterval(loadGames, anyLive ? 15000 : 60000); return () => clearInterval(t); }, [loadGames, anyLive]);

  const loadDet = useCallback(() => sel ? fetch('/api/ttfl/live?game=' + sel).then(r => r.json()).then(j => j.ok && setDet({ game: j.game, players: j.players })).catch(() => {}) : Promise.resolve(), [sel]);
  useEffect(() => { setDet(null); setPid(null); loadDet(); }, [sel, loadDet]);
  const live = det?.game.state === 'in';
  useEffect(() => { if (!sel) return; const t = setInterval(loadDet, live ? 15000 : 120000); return () => clearInterval(t); }, [sel, loadDet, live]);

  const card = (g: G) => (
    <button key={g.id} onClick={() => setSel(g.id)} style={{ textAlign: 'left', color: '#fff', cursor: 'pointer', background: c.card, border: `1px solid ${sel === g.id ? c.cy : c.line}`, borderRadius: 14, padding: 12, backdropFilter: 'blur(6px)' }}>
      <div style={{ fontSize: 12, marginBottom: 8, color: g.state === 'in' ? c.red : c.dim, fontWeight: g.state === 'in' ? 700 : 400 }}>{g.state === 'in' ? '● EN DIRECT · ' : ''}{stat(g)}</div>
      {[g.away, g.home].map((t, i) => {
        const win = g.state === 'post' && t.score > (i ? g.away.score : g.home.score);
        return <div key={t.abbr} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0', fontWeight: win ? 800 : 500, opacity: g.state === 'post' && !win ? 0.6 : 1 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={t.logo} alt="" width={22} height={22} />{t.name}</span>
          <span style={{ fontSize: 18 }}>{g.state === 'pre' ? '' : t.score}</span></div>;
      })}
    </button>
  );

  const tbl = (abbr: string) => {
    const ps = (det?.players || []).filter(p => p.team === abbr && !p.dnp).sort((a, b) => Number(b.starter) - Number(a.starter) || b.ttfl - a.ttfl);
    const dnp = (det?.players || []).filter(p => p.team === abbr && p.dnp);
    const th = (h: string, r = true) => <th key={h} style={{ padding: '6px 8px', fontWeight: 500, textAlign: r ? 'right' : 'left', color: c.dim, whiteSpace: 'nowrap' }}>{h}</th>;
    return (
      <div style={{ background: c.card, border: `1px solid ${c.line}`, borderRadius: 14, overflowX: 'auto' }}>
        <div style={{ padding: '10px 12px', fontWeight: 700 }}>{abbr}</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 380 }}>
          <thead><tr>{th('Joueur', false)}{th('MIN')}{th('PTS')}{th('REB')}{th('PD')}{th('TTFL')}{th('Proj.')}</tr></thead>
          <tbody>{ps.map((p, i) => {
            const pj = proj[norm(p.name)]; const open = pid === p.id;
            return [
              <tr key={p.id} onClick={() => setPid(open ? null : p.id)} style={{ borderTop: `1px solid ${c.line}`, cursor: 'pointer', background: open ? 'rgba(0,255,255,.07)' : 'transparent' }}>
                <td style={{ padding: '7px 8px', whiteSpace: 'nowrap' }}>{p.name}{p.starter && <span title="Cinq majeur" style={{ marginLeft: 6, fontSize: 10, color: c.gold, border: `1px solid ${c.gold}`, borderRadius: 4, padding: '0 4px' }}>5M</span>}</td>
                <td style={{ padding: '7px 8px', textAlign: 'right', color: c.dim }}>{Math.round(p.min)}</td>
                <td style={{ padding: '7px 8px', textAlign: 'right' }}>{p.pts}</td><td style={{ padding: '7px 8px', textAlign: 'right' }}>{p.reb}</td><td style={{ padding: '7px 8px', textAlign: 'right' }}>{p.ast}</td>
                <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 800, color: pj != null && p.ttfl >= pj ? c.cy : '#fff' }}>{p.ttfl}</td>
                <td style={{ padding: '7px 8px', textAlign: 'right', color: c.gold }}>{pj != null ? pj.toFixed(1) : '–'}</td>
              </tr>,
              open && <tr key={p.id + 'x'}><td colSpan={7} style={{ padding: '8px 10px 14px', background: 'rgba(0,255,255,.04)' }}>
                <Curve p={p} proj={pj ?? null} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, fontSize: 14, alignItems: 'center' }}>
                  {([['PTS', p.pts], ['REB', p.reb], ['PD', p.ast], ['INT', p.stl], ['CT', p.blk], ['Tirs', `${p.fgm}/${p.fga}`], ['3 pts', `${p.tpm}/${p.tpa}`], ['LF', `${p.ftm}/${p.fta}`], ['BP', p.to]] as [string, string | number][]).map(([k, v]) => (
                    <span key={k} style={{ border: `1px solid ${c.line}`, borderRadius: 10, padding: '5px 10px', background: 'rgba(255,255,255,.05)' }}><span style={{ color: c.dim, fontSize: 12 }}>{k}</span> <b style={{ fontSize: 16 }}>{v}</b></span>))}
                  {slugs[norm(p.name)] && <a href={`/ttfl/joueur/${slugs[norm(p.name)]}`} style={{ marginLeft: 'auto', background: c.cy, color: '#001018', fontWeight: 700, padding: '7px 14px', borderRadius: 10, textDecoration: 'none', fontSize: 14 }}>Fiche joueur →</a>}
                </div>
              </td></tr>,
            ];
          })}</tbody>
        </table>
        {dnp.length > 0 && <div style={{ padding: '8px 12px', fontSize: 12, color: c.dim }}>Non entrés : {dnp.map(p => p.name).join(', ')}</div>}
      </div>
    );
  };

  return (
    <div>
      {err && <p style={{ color: c.red }}>{err}</p>}
      {!games && !err && <p style={{ color: c.dim }}>Chargement…</p>}
      {games && !games.length && <p style={{ color: c.dim }}>Aucun match NBA cette nuit.</p>}
      {games && games.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 10, marginBottom: 16 }}>{games.map(card)}</div>}
      {sel && !det && <p style={{ color: c.dim }}>Chargement du match…</p>}
      {det && <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, margin: '4px 0 10px' }}>
          <h2 style={{ fontSize: 18, margin: 0 }}>{det.game.away.name} {det.game.away.score} – {det.game.home.score} {det.game.home.name}</h2>
          <span style={{ color: live ? c.red : c.dim, fontSize: 13 }}>{live ? '● EN DIRECT · ' : ''}{stat(det.game)}{live && ' · mise à jour auto'}</span>
        </div>
        {det.game.state === 'pre' ? <p style={{ color: c.dim }}>Le match n&apos;a pas commencé : le 5 majeur et les scores TTFL apparaissent dès la mise en jeu.</p> :
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: 12 }}>{tbl(det.game.away.abbr)}{tbl(det.game.home.abbr)}</div>}
        <p style={{ color: c.dim, fontSize: 12, marginTop: 10 }}>Clique sur un joueur pour voir l&apos;évolution de son score TTFL (courbe) et les stats prises en compte. Ligne pointillée = projection myNFTlocker.</p>
      </>}
    </div>
  );
}
