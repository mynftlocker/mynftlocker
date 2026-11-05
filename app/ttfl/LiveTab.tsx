'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { t as tr, useLang, getLang, initLang } from '../i18n';
import './i18nTtfl';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
type G = { id: string; state: 'pre' | 'in' | 'post'; detail: string; period: number; clock: string; start: string; home: T; away: T };
type T = { abbr: string; name: string; score: number; logo: string; q: number[] };
type P = { id: string; name: string; team: string; starter: boolean; dnp: boolean; min: number; pts: number; reb: number; ast: number; stl: number; blk: number; to: number; fgm: number; fga: number; tpm: number; tpa: number; ftm: number; fta: number; ttfl: number; pf: number; pm: number; oreb: number; dreb: number; curve: [number, number][] };
const c = { cy: '#00ffff', gold: '#e5b94e', dim: 'rgba(255,255,255,.6)', line: 'rgba(255,255,255,.12)', card: 'rgba(8,12,28,.72)', red: '#ff5a5a' };
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString(getLang() === 'en' ? 'en-GB' : 'fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
const stat = (g: G) => g.state === 'in' ? `${g.period > 4 ? tr('PROL') + ' ' + (g.period - 4) : 'Q' + g.period} · ${g.clock}` : g.state === 'post' ? tr('Terminé') : hhmm(g.start);

// Courbe d'evolution du score TTFL d'un joueur (rejoue le play-by-play) avec la projection en repere pointille.
function Curve({ p, proj }: { p: P; proj: number | null }) {
  const W = 640, H = 220, L = 34, B = 24, R = 10, T = 12;
  const pts = p.curve; const maxX = Math.max(48, ...pts.map(a => a[0])); const ys = pts.map(a => a[1]).concat(proj ?? 0, 0);
  const lo = Math.min(...ys), hi = Math.max(...ys, lo + 10); const x = (v: number) => L + (v / maxX) * (W - L - R); const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  let d = ''; pts.forEach(([t, v], i) => { d += i ? `L${x(t)},${y(pts[i - 1][1])}L${x(t)},${y(v)}` : `M${x(t)},${y(v)}`; });
  const qs = [12, 24, 36, 48].filter(q => q <= maxX);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label={tr('Évolution du score TTFL de ') + p.name}>
      {qs.map(q => <g key={q}><line x1={x(q)} x2={x(q)} y1={T} y2={H - B} stroke={c.line} /><text x={x(q)} y={H - 7} fill={c.dim} fontSize="11" textAnchor="end">{q <= 48 ? 'Q' + q / 12 : ''}</text></g>)}
      <line x1={L} x2={W - R} y1={y(0)} y2={y(0)} stroke={c.line} />
      {proj != null && <><line x1={L} x2={W - R} y1={y(proj)} y2={y(proj)} stroke={c.gold} strokeDasharray="5 4" /><text x={L + 4} y={y(proj) - 4} fill={c.gold} fontSize="11">{tr('Projection')} {proj.toFixed(1)}</text></>}
      <path d={d} fill="none" stroke={c.cy} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx={x(pts[pts.length - 1][0])} cy={y(p.ttfl)} r="4.5" fill={c.cy} />
      {[lo, hi].map(v => <text key={v} x={4} y={y(v) + 4} fill={c.dim} fontSize="11">{Math.round(v)}</text>)}
    </svg>
  );
}

export default function LiveTab({ night, proj, slugs, initialGame, onSelect }: { night: string; proj: Record<string, number>; slugs: Record<string, string>; initialGame?: string | null; onSelect?: (g: string | null) => void }) {
  useLang(); useEffect(() => { initLang(); }, []);
  const [games, setGames] = useState<G[] | null>(null);
  const [err, setErr] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const [nw, setNw] = useState(false); // telephone : tableau resserre (sans MIN) pour que TTFL et Proj. restent visibles sans defilement
  useEffect(() => { const m = window.matchMedia('(max-width: 640px)'); const f = () => setNw(m.matches); f(); m.addEventListener('change', f); return () => m.removeEventListener('change', f); }, []);
  useEffect(() => { if (!sel) return; const o = document.body.style.overflow; document.body.style.overflow = 'hidden'; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (pidRef.current) setPid(null); else setSel(null); } }; window.addEventListener('keydown', k); return () => { document.body.style.overflow = o; window.removeEventListener('keydown', k); }; }, [sel]);
  const [det, setDet] = useState<{ game: G; players: P[] } | null>(null);
  const [pid, setPid] = useState<string | null>(null);

  const nightRef = useRef(night); nightRef.current = night; // reponses tardives d'une autre nuit / d'un autre match ignorees
  const loadGames = useCallback(() => fetch('/api/ttfl/live?night=' + night).then(r => r.json()).then(j => { if (nightRef.current !== night) return; j.ok ? (setGames(j.games), setErr('')) : setErr(j.error || tr('Indisponible')); }).catch(e => { if (nightRef.current === night) setErr(String(e)); }), [night]);
  useEffect(() => { onSelect?.(sel); }, [sel, onSelect]);
  useEffect(() => { setGames(null); setSel(initialGame || null); setDet(null); loadGames(); }, [night, loadGames, initialGame]);
  const anyLive = !!games?.some(g => g.state === 'in');
  useEffect(() => { const t = setInterval(loadGames, anyLive ? 15000 : 60000); return () => clearInterval(t); }, [loadGames, anyLive]);

  const selRef = useRef(sel); selRef.current = sel;
  const loadDet = useCallback(() => sel ? fetch('/api/ttfl/live?game=' + sel).then(r => r.json()).then(j => j.ok && selRef.current === sel && setDet({ game: j.game, players: j.players })).catch(() => {}) : Promise.resolve(), [sel]);
  useEffect(() => { setDet(null); setPid(null); loadDet(); }, [sel, loadDet]);
  const live = det?.game.state === 'in';
  useEffect(() => { if (!sel) return; const t = setInterval(loadDet, live ? 15000 : 120000); return () => clearInterval(t); }, [sel, loadDet, live]);

  const card = (g: G) => (
    <button key={g.id} onClick={() => setSel(g.id)} style={{ textAlign: 'left', color: '#fff', cursor: 'pointer', background: c.card, border: `1px solid ${sel === g.id ? c.cy : c.line}`, borderRadius: 14, padding: 12, backdropFilter: 'blur(6px)', height: '100%' }}>
      <div style={{ fontSize: 12, marginBottom: 8, color: g.state === 'in' ? c.red : c.dim, fontWeight: g.state === 'in' ? 700 : 400 }}>{g.state === 'in' ? tr('● EN DIRECT · ') : ''}{stat(g)}</div>
      {[g.away, g.home].map((t, i) => {
        const win = g.state === 'post' && t.score > (i ? g.away.score : g.home.score);
        return <div key={t.abbr} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0', fontWeight: win ? 800 : 500, opacity: g.state === 'post' && !win ? 0.6 : 1 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={t.logo} alt="" width={22} height={22} />{t.name}</span>
          <span style={{ fontSize: 24, fontWeight: 800, fontVariantNumeric: 'tabular-nums', minWidth: 40, textAlign: 'right', color: g.state === 'pre' ? c.dim : g.state === 'in' && t.score > (i ? g.away.score : g.home.score) ? c.cy : '#fff' }}>{g.state === 'pre' ? '–' : t.score}</span></div>;
      })}
    </button>
  );

  // Couleur du badge TTFL selon le niveau du score
  const tier = (v: number) => v >= 45 ? '#00ffff' : v >= 35 ? '#4ade80' : v >= 25 ? '#a3e635' : v >= 15 ? '#e5b94e' : v >= 8 ? '#ff9f43' : '#ff6b6b';
  const badge = (v: number, big = false) => <span style={{ flex: '0 0 auto', minWidth: big ? 84 : 52, textAlign: 'center', fontWeight: 800, fontSize: big ? 34 : 20, lineHeight: 1, padding: big ? '14px 10px' : '9px 8px', borderRadius: big ? 16 : 10, background: tier(v), color: '#04101a', fontVariantNumeric: 'tabular-nums' }}>{v}</span>;
  const [tab, setTab] = useState<'away' | 'home'>('away'); useEffect(() => { setTab('away'); }, [sel]);
  const pidRef = useRef<string | null>(null); pidRef.current = pid;

  // Liste BFLH-like : nom + ligne de stats (minutes comprises) a gauche, score TTFL en badge colore a droite. Un clic ouvre la feuille du joueur.
  const list = (abbr: string) => {
    const ps = (det?.players || []).filter(p => p.team === abbr && !p.dnp).sort((a, b) => b.ttfl - a.ttfl);
    const dnp = (det?.players || []).filter(p => p.team === abbr && p.dnp);
    return (
      <div style={{ background: c.card, border: `1px solid ${c.line}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '10px 12px', fontWeight: 700, display: 'flex', justifyContent: 'space-between', color: c.dim, fontSize: 13 }}><span>{abbr} · {tr('Joueur')}</span><span>TTFL</span></div>
        {ps.map(p => { const pj = proj[norm(p.name)];
          return <button key={p.id} onClick={() => setPid(p.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, textAlign: 'left', color: '#fff', background: 'transparent', border: 'none', borderTop: `1px solid ${c.line}`, padding: '10px 12px', cursor: 'pointer' }}>
            <span style={{ minWidth: 0 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{p.name}{p.starter && <span title={tr('Cinq majeur')} style={{ marginLeft: 6, fontSize: 10, color: c.gold, border: `1px solid ${c.gold}`, borderRadius: 4, padding: '0 4px', verticalAlign: 'middle' }}>5M</span>}</span>
              <span style={{ display: 'block', color: c.dim, fontSize: 12.5, marginTop: 3 }}>{p.pts} pts · {p.reb} reb · {p.ast} {tr('pd')} · <b style={{ color: '#fff', fontWeight: 600 }}>{Math.round(p.min)} min</b></span>
            </span>
            <span style={{ textAlign: 'center' }}>{badge(p.ttfl)}{pj != null && <span style={{ display: 'block', fontSize: 11, color: c.gold, marginTop: 3 }}>{tr('Proj.')} {pj.toFixed(1)}</span>}</span>
          </button>; })}
        {dnp.length > 0 && <div style={{ padding: '8px 12px', fontSize: 12, color: c.dim, borderTop: `1px solid ${c.line}` }}>{tr('Non entrés : ')}{dnp.map(p => p.name).join(', ')}</div>}
      </div>
    );
  };

  // Feuille du joueur : badge TTFL, courbe, puis toutes les stats en petits blocs colores (vert = apporte des points, rouge = en retire).
  const sheet = (p: P) => {
    const pj = proj[norm(p.name)]; const logo = det && (det.game.away.abbr === p.team ? det.game.away.logo : det.game.home.logo);
    const pct = (m: number, a: number) => (a ? +(100 * m / a).toFixed(1) : null);
    const miss = (p.fga - p.fgm) + (p.tpa - p.tpm) + (p.fta - p.ftm);
    const bonus = p.pts + p.reb + p.ast + p.stl + p.blk + p.fgm + p.tpm + p.ftm; const malus = miss + p.to;
    type K = 'pos' | 'neg' | 'neu' | 'pm' | { good: number; bad: number };
    const tiles: [string, string | number, K][] = [
      ['PTS', p.pts, 'pos'], ['REB', p.reb, 'pos'], [tr('PD'), p.ast, 'pos'], [tr('INT'), p.stl, 'pos'],
      ['FGM', p.fgm, 'pos'], ['FGA', p.fga, 'neu'], ['FG%', pct(p.fgm, p.fga) ?? '–', { good: 50, bad: 40 }], [tr('CT'), p.blk, 'pos'],
      ['3PM', p.tpm, 'pos'], ['3PA', p.tpa, 'neu'], ['3P%', pct(p.tpm, p.tpa) ?? '–', { good: 38, bad: 30 }], [tr('BP'), p.to, 'neg'],
      ['FTM', p.ftm, 'pos'], ['FTA', p.fta, 'neu'], ['FT%', pct(p.ftm, p.fta) ?? '–', { good: 80, bad: 65 }], ['+/-', p.pm > 0 ? '+' + p.pm : p.pm, 'pm'],
      [tr('Fautes'), p.pf, 'neu'], ['OREB', p.oreb, 'neu'], ['DREB', p.dreb, 'neu'], [tr('Tirs manqués'), miss, 'neg'],
    ];
    const pill = (v: string | number, k: K) => {
      const n = typeof v === 'number' ? v : parseFloat(String(v)); let bg = 'transparent', col = '#fff', bd = `1px solid ${c.line}`;
      if (k === 'pos' && n > 0) { bg = '#4ade80'; col = '#04210f'; bd = 'none'; }
      else if (k === 'neg' && n > 0) { bg = '#ff6b6b'; col = '#2a0606'; bd = 'none'; }
      else if (k === 'pm' && !isNaN(n) && n !== 0) { bg = n > 0 ? '#4ade80' : '#ff6b6b'; col = n > 0 ? '#04210f' : '#2a0606'; bd = 'none'; }
      else if (typeof k === 'object' && !isNaN(n)) { if (n >= k.good) { bg = '#4ade80'; col = '#04210f'; bd = 'none'; } else if (n < k.bad) { bg = '#ff6b6b'; col = '#2a0606'; bd = 'none'; } else { bg = '#e5b94e'; col = '#2a1c02'; bd = 'none'; } }
      return <span style={{ display: 'inline-block', minWidth: 46, textAlign: 'center', fontWeight: 800, fontSize: 18, padding: '5px 8px', borderRadius: 10, background: bg, color: col, border: bd }}>{v}</span>;
    };
    return (
      <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 70, background: '#070b1c', overflowY: 'auto' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', paddingBottom: 24 }}>
          <div style={{ position: 'sticky', top: 0, zIndex: 2, background: '#070b1c', borderBottom: `1px solid ${c.line}`, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <button onClick={() => setPid(null)} style={{ background: 'rgba(255,255,255,.08)', border: `1px solid ${c.line}`, color: c.cy, borderRadius: 10, padding: '8px 14px', fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' }}>← {tr('Retour au match')}</button>
            <button onClick={() => { setPid(null); setSel(null); }} aria-label={tr('Fermer')} style={{ background: 'rgba(255,255,255,.08)', border: `1px solid ${c.line}`, color: '#fff', borderRadius: 10, padding: '8px 14px', fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' }}>✕ {tr('Fermer')}</button>
          </div>
          <div style={{ padding: '14px 12px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                {logo && /* eslint-disable-next-line @next/next/no-img-element */ <img src={logo} alt="" width={54} height={54} style={{ flex: '0 0 auto' }} />}
                <div style={{ minWidth: 0 }}><div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>{p.name}</div>
                  <div style={{ color: c.dim, fontSize: 13, marginTop: 3 }}>{p.starter ? tr('Cinq majeur') + ' · ' : ''}<b style={{ color: '#fff' }}>{Math.round(p.min)} min</b></div>
                  {pj != null && <div style={{ fontSize: 13, marginTop: 3, color: c.gold }}>{tr('Projection')} {pj.toFixed(1)} <span style={{ color: p.ttfl >= pj ? '#4ade80' : '#ff7b7b', fontWeight: 700 }}>({p.ttfl >= pj ? '+' : ''}{(p.ttfl - pj).toFixed(1)})</span></div>}
                </div>
              </div>
              {badge(p.ttfl, true)}
            </div>
            <details open style={{ marginTop: 16, background: c.card, border: `1px solid ${c.line}`, borderRadius: 14, padding: '10px 12px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>{tr('Évolution de son score')}</summary>
              <div style={{ marginTop: 8 }}><Curve p={p} proj={pj ?? null} /></div>
            </details>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginTop: 14 }}>
              {tiles.map(([k, v, kind]) => <div key={k} style={{ border: `1px solid ${c.line}`, borderRadius: 12, padding: '8px 4px 10px', textAlign: 'center', background: 'rgba(255,255,255,.03)' }}><div style={{ fontSize: 11.5, color: c.dim, marginBottom: 6, lineHeight: 1.15, minHeight: 27, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{k}</div>{pill(v, kind)}</div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 12 }}>
              {([[tr('Bonus'), '+' + bonus, '#4ade80', '#04210f'], [tr('Malus'), '−' + malus, '#ff6b6b', '#2a0606'], ['TTFL', String(p.ttfl), tier(p.ttfl), '#04101a']] as [string, string, string, string][]).map(([k, v, bg, col]) => <div key={k} style={{ border: `1px solid ${c.line}`, borderRadius: 12, padding: '8px 4px 10px', textAlign: 'center' }}><div style={{ fontSize: 12, color: c.dim, marginBottom: 6 }}>{k}</div><span style={{ display: 'inline-block', minWidth: 60, fontWeight: 800, fontSize: 20, padding: '5px 10px', borderRadius: 10, background: bg, color: col }}>{v}</span></div>)}
            </div>
            {slugs[norm(p.name)] && <a href={`/ttfl/joueur/${slugs[norm(p.name)]}`} style={{ display: 'block', textAlign: 'center', marginTop: 16, background: c.cy, color: '#001018', fontWeight: 700, padding: '12px 14px', borderRadius: 12, textDecoration: 'none', fontSize: 15 }}>{tr('Fiche joueur →')}</a>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {err && <p style={{ color: c.red }}>{err}</p>}
      {!games && !err && <p style={{ color: c.dim }}>{tr('Chargement…')}</p>}
      {games && !games.length && <p style={{ color: c.dim }}>{tr('Aucun match NBA cette nuit.')}</p>}
      {games && games.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 10, marginBottom: 16 }}>{games.map(card)}</div>}
      {sel && <div role="dialog" aria-modal="true" onClick={e => { if (e.target === e.currentTarget) setSel(null); }} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(3,6,18,.86)', backdropFilter: 'blur(6px)', overflowY: 'auto', padding: nw ? 0 : '24px 16px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', background: '#070b1c', border: nw ? 'none' : `1px solid ${c.line}`, borderRadius: nw ? 0 : 16, minHeight: nw ? '100%' : undefined, paddingBottom: 14 }}>
          <div style={{ position: 'sticky', top: 0, zIndex: 2, background: '#070b1c', borderBottom: `1px solid ${c.line}`, borderRadius: nw ? 0 : '16px 16px 0 0', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              {det ? <>
                <h2 style={{ fontSize: 17, margin: 0, lineHeight: 1.25 }}>{det.game.away.name} {det.game.away.score} – {det.game.home.score} {det.game.home.name}</h2>
                <div style={{ color: live ? c.red : c.dim, fontSize: 12, marginTop: 2 }}>{live ? tr('● EN DIRECT · ') : ''}{stat(det.game)}{live && tr(' · mise à jour auto')}</div>
              </> : <span style={{ color: c.dim }}>{tr('Chargement du match…')}</span>}
            </div>
            <button onClick={() => setSel(null)} aria-label={tr('Fermer')} style={{ flex: '0 0 auto', background: 'rgba(255,255,255,.08)', border: `1px solid ${c.line}`, color: '#fff', borderRadius: 10, padding: '8px 14px', fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' }}>✕ {tr('Fermer')}</button>
          </div>
          {det && <div style={{ padding: '12px 12px 0' }}>
            {det.game.state === 'pre' ? <p style={{ color: c.dim }}>{tr('Le match n’a pas commencé : le 5 majeur et les scores TTFL apparaissent dès la mise en jeu.')}</p> :
              <>
                {nw && <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>{(['away', 'home'] as const).map(k => <button key={k} onClick={() => setTab(k)} style={{ flex: 1, background: tab === k ? c.cy : 'rgba(255,255,255,.06)', color: tab === k ? '#001018' : '#fff', border: `1px solid ${tab === k ? c.cy : c.line}`, borderRadius: 10, padding: '9px 6px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>{det.game[k].abbr}</button>)}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: nw ? '1fr' : 'repeat(2,1fr)', gap: 12 }}>{nw ? list(det.game[tab].abbr) : <>{list(det.game.away.abbr)}{list(det.game.home.abbr)}</>}</div>
              </>}
            <p style={{ color: c.dim, fontSize: 12, marginTop: 10 }}>{tr('Clique sur un joueur pour ouvrir sa feuille : évolution du score TTFL, stats prises en compte et projection myNFTlocker.')}</p>
          </div>}
        </div>
        {det && pid && (() => { const pl = det.players.find(x => x.id === pid); return pl ? sheet(pl) : null; })()}
      </div>}
    </div>
  );
}
