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

  // Entete du match : face-a-face lumineux (logos, scores, vainqueur en neon) + meilleurs scores TTFL de la rencontre.
  const hero = (g: G) => {
    const gm = games?.find(x => x.id === g.id); const sides = [gm?.away || g.away, gm?.home || g.home] as T[]; const pre = g.state === 'pre';
    const best = (det?.players || []).filter(p => !p.dnp).sort((a, b) => b.ttfl - a.ttfl).slice(0, 3);
    return (
      <div style={{ margin: '12px 12px 0', padding: '18px 10px 14px', borderRadius: 18, border: '1px solid rgba(0,255,255,.28)', background: 'radial-gradient(120% 140% at 50% -30%, rgba(0,255,255,.2), rgba(7,11,28,0) 62%), linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.01))', boxShadow: '0 0 44px rgba(0,255,255,.07) inset' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 6, textAlign: 'center' }}>
          {sides.map((t, i) => { const other = sides[1 - i]; const win = g.state === 'post' && t.score > other.score;
            return [
              <div key={t.abbr} style={{ opacity: g.state === 'post' && !win ? .7 : 1 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {t.logo && <img src={t.logo} alt="" width={58} height={58} style={{ display: 'block', margin: '0 auto 6px', filter: win ? 'drop-shadow(0 0 14px rgba(0,255,255,.55))' : 'none' }} />}
                <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>{t.name}</div>
                <div style={{ fontSize: 46, fontWeight: 800, lineHeight: 1.05, marginTop: 6, fontVariantNumeric: 'tabular-nums', color: win ? c.cy : '#fff', textShadow: win ? '0 0 22px rgba(0,255,255,.6)' : 'none' }}>{pre ? '–' : t.score}</div>
              </div>,
              i === 0 && <div key="mid" style={{ color: c.dim, fontSize: 22, fontWeight: 300 }}>–</div>,
            ]; })}
        </div>
        {best.length > 0 && !pre && <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${c.line}` }}>
          <div style={{ fontSize: 11, letterSpacing: 1, color: c.gold, textAlign: 'center', marginBottom: 8, textTransform: 'uppercase' }}>{tr('Meilleurs scores TTFL')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>{best.map(p => <button key={p.id} onClick={() => setPid(p.id)} style={{ cursor: 'pointer', color: '#fff', background: 'rgba(255,255,255,.05)', border: `1px solid ${tier(p.ttfl)}66`, borderRadius: 999, padding: '6px 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}><span>{p.name}</span><b style={{ color: tier(p.ttfl), fontSize: 16 }}>{p.ttfl}</b></button>)}</div>
        </div>}
      </div>
    );
  };

  // Liste : nom + ligne de stats (minutes comprises) a gauche, score TTFL en badge colore a droite. Un clic ouvre la feuille du joueur.
  const list = (abbr: string) => {
    const ps = (det?.players || []).filter(p => p.team === abbr && !p.dnp).sort((a, b) => b.ttfl - a.ttfl);
    const dnp = (det?.players || []).filter(p => p.team === abbr && p.dnp);
    return (
      <div style={{ background: c.card, border: `1px solid ${c.line}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '10px 12px', fontWeight: 700, display: 'flex', justifyContent: 'space-between', gap: 8, color: c.dim, fontSize: 12 }}><span>{abbr}</span><span style={{ fontWeight: 500 }}>{tr('Score TTFL · trait doré = projection')}</span></div>
        {ps.map(p => { const pj = proj[norm(p.name)];
          const col = tier(p.ttfl); const MAXV = 60; const w = Math.max(2, Math.min(100, 100 * p.ttfl / MAXV)); const pp = pj != null ? Math.max(0, Math.min(100, 100 * pj / MAXV)) : null;
          return <button key={p.id} onClick={() => setPid(p.id)} style={{ width: '100%', display: 'block', textAlign: 'left', color: '#fff', background: 'transparent', border: 'none', borderTop: `1px solid ${c.line}`, padding: '11px 12px 12px', cursor: 'pointer' }}>
            <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{p.name}{p.starter && <span title={tr('Cinq majeur')} style={{ marginLeft: 6, fontSize: 10, color: c.gold, border: `1px solid ${c.gold}`, borderRadius: 4, padding: '0 4px', verticalAlign: 'middle' }}>5M</span>}</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: col, textShadow: `0 0 14px ${col}55`, fontVariantNumeric: 'tabular-nums' }}>{p.ttfl}</span>
            </span>
            <span style={{ display: 'flex', justifyContent: 'space-between', gap: 10, color: c.dim, fontSize: 12.5, marginTop: 3 }}>
              <span>{p.pts} pts · {p.reb} reb · {p.ast} {tr('pd')} · <b style={{ color: '#fff', fontWeight: 600 }}>{Math.round(p.min)} min</b></span>
              {pj != null && <span style={{ color: c.gold, whiteSpace: 'nowrap' }}>{tr('Proj.')} {pj.toFixed(1)}</span>}
            </span>
            <span style={{ display: 'block', position: 'relative', height: 6, borderRadius: 99, background: 'rgba(255,255,255,.08)', marginTop: 8 }}>
              <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: w + '%', borderRadius: 99, background: `linear-gradient(90deg, ${col}55, ${col})`, boxShadow: `0 0 10px ${col}66` }} />
              {pp != null && <span style={{ position: 'absolute', left: `calc(${pp}% - 1px)`, top: -3, bottom: -3, width: 2, background: c.gold, borderRadius: 2 }} />}
            </span>
          </button>; })}
        {dnp.length > 0 && <div style={{ padding: '8px 12px', fontSize: 12, color: c.dim, borderTop: `1px solid ${c.line}` }}>{tr('Non entrés : ')}{dnp.map(p => p.name).join(', ')}</div>}
      </div>
    );
  };

  // Fiche joueur : anneau TTFL vs projection, puis "ce qui rapporte / ce qui coute" en barres, et l'adresse au tir en trois anneaux.
  const sheet = (p: P) => {
    const pj = proj[norm(p.name)]; const gm = games?.find(g => g.id === sel); const logo = gm && (gm.away.abbr === p.team ? gm.away.logo : gm.home.logo); // le logo vient de la liste de la nuit (la fiche du match ne le donne pas)
    const miss = (p.fga - p.fgm) + (p.tpa - p.tpm) + (p.fta - p.ftm);
    const bonus = p.pts + p.reb + p.ast + p.stl + p.blk + p.fgm + p.tpm + p.ftm; const malus = miss + p.to;
    const col = tier(p.ttfl);
    // Anneau : arc = score / 60, petit trait doré = projection
    const R = 52, C = 2 * Math.PI * R; const frac = Math.max(0.02, Math.min(1, p.ttfl / 60));
    const tick = pj != null ? (() => { const a = (-90 + 360 * Math.max(0, Math.min(1, pj / 60))) * Math.PI / 180; return { x1: 70 + (R - 9) * Math.cos(a), y1: 70 + (R - 9) * Math.sin(a), x2: 70 + (R + 9) * Math.cos(a), y2: 70 + (R + 9) * Math.sin(a) }; })() : null;
    const ring = (
      <svg viewBox="0 0 140 140" width={132} height={132} style={{ flex: '0 0 auto', filter: `drop-shadow(0 0 14px ${col}66)` }} role="img" aria-label={`TTFL ${p.ttfl}`}>
        <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(255,255,255,.09)" strokeWidth="10" />
        <circle cx="70" cy="70" r={R} fill="none" stroke={col} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${C * frac} ${C}`} transform="rotate(-90 70 70)" />
        {tick && <line {...tick} stroke={c.gold} strokeWidth="3" strokeLinecap="round" />}
        <text x="70" y="78" textAnchor="middle" fontSize="40" fontWeight="800" fill="#fff" style={{ fontVariantNumeric: 'tabular-nums' }}>{p.ttfl}</text>
        <text x="70" y="98" textAnchor="middle" fontSize="11" fill="rgba(255,255,255,.6)" letterSpacing="1">TTFL</text>
      </svg>
    );
    const rows = (items: [string, number][], rgb: string) => { const mx = Math.max(1, ...items.map(i => i[1])); return items.map(([k, v]) => (
      <div key={k} style={{ display: 'grid', gridTemplateColumns: '64px 1fr 30px', alignItems: 'center', gap: 10, padding: '5px 0', opacity: v ? 1 : .45 }}>
        <span style={{ fontSize: 13, color: c.dim }}>{k}</span>
        <span style={{ height: 8, borderRadius: 99, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: (100 * v / mx) + '%', borderRadius: 99, background: `linear-gradient(90deg, rgba(${rgb},.3), rgb(${rgb}))`, boxShadow: `0 0 10px rgba(${rgb},.5)` }} /></span>
        <b style={{ textAlign: 'right', fontSize: 16, fontVariantNumeric: 'tabular-nums' }}>{v}</b>
      </div>)); };
    const box = (rgb: string): React.CSSProperties => ({ marginTop: 12, padding: '12px 14px', borderRadius: 16, border: `1px solid rgba(${rgb},.35)`, background: `linear-gradient(180deg, rgba(${rgb},.08), rgba(255,255,255,.01))` });
    const head = (label: string, total: string, rgb: string) => <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}><span style={{ fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: `rgb(${rgb})` }}>{label}</span><span style={{ fontSize: 26, fontWeight: 800, color: `rgb(${rgb})`, textShadow: `0 0 14px rgba(${rgb},.5)` }}>{total}</span></div>;
    const shoot = (label: string, m: number, a: number) => { const f = a ? m / a : 0; const pc = a ? Math.round(1000 * f) / 10 : null; const sc = pc == null ? 'rgba(255,255,255,.3)' : label === '3P' ? (pc >= 38 ? '#4ade80' : pc < 30 ? '#ff6b6b' : '#e5b94e') : label === 'FG' ? (pc >= 50 ? '#4ade80' : pc < 40 ? '#ff6b6b' : '#e5b94e') : (pc >= 80 ? '#4ade80' : pc < 65 ? '#ff6b6b' : '#e5b94e'); const r = 30, cc = 2 * Math.PI * r;
      return <div key={label} style={{ textAlign: 'center' }}>
        <svg viewBox="0 0 80 80" width={86} height={86} style={{ filter: `drop-shadow(0 0 8px ${sc}55)` }}><circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,.09)" strokeWidth="7" /><circle cx="40" cy="40" r={r} fill="none" stroke={sc} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${cc * f} ${cc}`} transform="rotate(-90 40 40)" /><text x="40" y="45" textAnchor="middle" fontSize="15" fontWeight="800" fill="#fff">{pc == null ? '–' : pc + '%'}</text></svg>
        <div style={{ fontSize: 12, color: c.dim, marginTop: 2 }}>{label === 'FT' ? tr('LF') : label}</div><div style={{ fontWeight: 700, fontSize: 14 }}>{m}/{a}</div>
      </div>; };
    const chip = (k: string, v: string | number, rgb?: string) => <div key={k} style={{ flex: 1, textAlign: 'center', padding: '8px 4px', borderRadius: 12, border: `1px solid ${rgb ? `rgba(${rgb},.5)` : c.line}`, background: rgb ? `rgba(${rgb},.12)` : 'rgba(255,255,255,.03)' }}><div style={{ fontSize: 11.5, color: c.dim }}>{k}</div><div style={{ fontWeight: 800, fontSize: 18, color: rgb ? `rgb(${rgb})` : '#fff' }}>{v}</div></div>;
    return (
      <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 70, background: '#070b1c', overflowY: 'auto' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', paddingBottom: 24 }}>
          <div style={{ position: 'sticky', top: 0, zIndex: 2, background: 'rgba(7,11,28,.92)', backdropFilter: 'blur(8px)', borderBottom: `1px solid ${c.line}`, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <button onClick={() => setPid(null)} style={{ background: 'rgba(255,255,255,.08)', border: `1px solid ${c.line}`, color: c.cy, borderRadius: 10, padding: '8px 14px', fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' }}>← {tr('Retour au match')}</button>
            <button onClick={() => { setPid(null); setSel(null); }} aria-label={tr('Fermer')} style={{ background: 'rgba(255,255,255,.08)', border: `1px solid ${c.line}`, color: '#fff', borderRadius: 10, padding: '8px 14px', fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' }}>✕ {tr('Fermer')}</button>
          </div>
          <div style={{ padding: '14px 12px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 14px', borderRadius: 18, border: `1px solid ${col}55`, background: `radial-gradient(110% 130% at 100% 0%, ${col}26, rgba(7,11,28,0) 60%), linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.01))` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {logo && /* eslint-disable-next-line @next/next/no-img-element */ <img src={logo} alt="" width={40} height={40} style={{ display: 'block', marginBottom: 6 }} />}
                <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>{p.name}</div>
                <div style={{ color: c.dim, fontSize: 13, marginTop: 4 }}>{p.starter ? tr('Cinq majeur') + ' · ' : ''}<b style={{ color: '#fff' }}>{Math.round(p.min)} min</b></div>
                {pj != null && <div style={{ marginTop: 8, display: 'inline-block', fontSize: 13, color: c.gold, border: `1px solid ${c.gold}66`, borderRadius: 999, padding: '3px 10px' }}>{tr('Projection')} {pj.toFixed(1)} <b style={{ color: p.ttfl >= pj ? '#4ade80' : '#ff7b7b' }}>({p.ttfl >= pj ? '+' : ''}{(p.ttfl - pj).toFixed(1)})</b></div>}
              </div>
              {ring}
            </div>
            <details open style={{ marginTop: 12, background: c.card, border: `1px solid ${c.line}`, borderRadius: 14, padding: '10px 12px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>{tr('Évolution de son score')}</summary>
              <div style={{ marginTop: 8 }}><Curve p={p} proj={pj ?? null} /></div>
            </details>
            <div style={box('74,222,128')}>{head(tr('Ce qui rapporte'), '+' + bonus, '74,222,128')}{rows([['PTS', p.pts], ['REB', p.reb], [tr('PD'), p.ast], [tr('INT'), p.stl], [tr('CT'), p.blk], ['FGM', p.fgm], ['3PM', p.tpm], ['FTM', p.ftm]], '74,222,128')}</div>
            <div style={box('255,107,107')}>{head(tr('Ce qui coûte'), '−' + malus, '255,107,107')}{rows([[tr('Tirs manqués'), miss], [tr('BP'), p.to]], '255,107,107')}</div>
            <div style={{ ...box('0,255,255'), display: 'flex', justifyContent: 'space-around', gap: 4 }}>{shoot('FG', p.fgm, p.fga)}{shoot('3P', p.tpm, p.tpa)}{shoot('FT', p.ftm, p.fta)}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>{chip('+/-', p.pm > 0 ? '+' + p.pm : p.pm, p.pm > 0 ? '74,222,128' : p.pm < 0 ? '255,107,107' : undefined)}{chip(tr('Fautes'), p.pf)}{chip('OREB', p.oreb)}{chip('DREB', p.dreb)}</div>
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
          <div style={{ position: 'sticky', top: 0, zIndex: 2, background: 'rgba(7,11,28,.92)', backdropFilter: 'blur(8px)', borderBottom: `1px solid ${c.line}`, borderRadius: nw ? 0 : '16px 16px 0 0', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div style={{ minWidth: 0, fontSize: 13, fontWeight: 700, color: live ? c.red : c.dim, letterSpacing: .3 }}>{det ? <>{live && <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 99, background: c.red, marginRight: 7, boxShadow: '0 0 10px #ff5a5a' }} />}{live ? tr('EN DIRECT') + ' · ' : ''}{stat(det.game)}{live && tr(' · mise à jour auto')}</> : tr('Chargement du match…')}</div>
            <button onClick={() => setSel(null)} aria-label={tr('Fermer')} style={{ flex: '0 0 auto', background: 'rgba(255,255,255,.08)', border: `1px solid ${c.line}`, color: '#fff', borderRadius: 10, padding: '8px 14px', fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' }}>✕ {tr('Fermer')}</button>
          </div>
          {det && hero(det.game)}
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
