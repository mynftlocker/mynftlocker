'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import StarBg from '../components/StarBg';
import LiveTab from './LiveTab';
import { t as tr, useLang, initLang, LangSwitch } from '../i18n';
import './i18nTtfl';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const parisDay = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(d);
const shift = (day: string, n: number) => { const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
// Les matchs d'une nuit NBA commencent apres minuit a Paris : des 8 h on ouvre sur la nuit suivante.
const defaultNight = () => { const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', hour12: false }).format(new Date())); return h >= 8 ? shift(parisDay(), 1) : parisDay(); };
const lbl = (day: string, en = false) => new Date(day + 'T12:00:00Z').toLocaleDateString(en ? 'en-GB' : 'fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const dm = (d: string) => d.slice(5).split('-').reverse().join('/');

type R = { name: string; team: string; opp: string; home: boolean; time: string; est: number; estFull?: number | null; proj: number; l10: number | null; n: number; last: number | null; gp: number; tg: number; g: [string, number, number, string?, boolean?, boolean?][]; slug: string; status: 'OUT' | 'GTD' | 'QUEST' | 'DOUBT' | 'PROB' | null; until: string | null };
type I = { name: string; team: string; status: 'OUT' | 'GTD' | 'QUEST' | 'DOUBT' | 'PROB'; until: string | null; untilKind: 'return' | 'reeval' | null; src: string; updated: string; l10: number | null; n: number };
const fam = (n: string) => { const w = n.replace(/\s+(Jr\.?|Sr\.?|II|III|IV)$/i, '').split(' '); return norm(w[w.length - 1]); };
const SL: Record<string, string> = { OUT: 'OUT', GTD: 'INCERTAIN', QUEST: 'QUESTIONABLE', DOUBT: 'DOUBTFUL', PROB: 'PROBABLE' };
type IK = 'status' | 'name' | 'team' | 'until' | 'l10';
type SK = 'name' | 'match' | 'est' | 'l10' | 'reg' | 'last' | 'pres';
type W = 5 | 10 | 0;
const avg = (r: R, w: W) => { const g = w ? r.g.slice(-w) : r.g; return g.length ? g.reduce((s, x) => s + x[1], 0) / g.length : null; };
// Régularité : écart-type des scores de la fenêtre et part de la moyenne (plus bas = plus fiable). Minimum 3 matchs.
const reg = (r: R, w: W): { sd: number; cv: number } | null => { const g = (w ? r.g.slice(-w) : r.g).map(x => x[1]); if (g.length < 3) return null; const m = g.reduce((s, x) => s + x, 0) / g.length; const sd = Math.sqrt(g.reduce((s, x) => s + (x - m) ** 2, 0) / g.length); return { sd, cv: m > 0 ? sd / m : 9 }; };
const trend = (r: R) => { const a = avg(r, 5), b = avg(r, 10); return a == null || b == null || r.g.length < 6 ? 0 : a - b >= 3 ? 1 : a - b <= -3 ? -1 : 0; };
const seasonOf = (d: string) => { const y = +d.slice(0, 4), m = +d.slice(5, 7); return m >= 9 ? y : y - 1; };
const ddmm = (d: string) => d.slice(8) + '/' + d.slice(5, 7);
// Scores TTFL match par match (barres) avec la projection de la nuit et la moyenne en reperes.
function Bars({ r, a, narrow }: { r: R; a: number | null; narrow?: boolean }) {
  // Telephone : 5 bougies visibles (les plus recentes), le reste se decouvre en faisant glisser le graphique vers la droite.
  const g = r.g.slice(narrow ? -25 : -10); const slots = narrow ? Math.max(8, g.length) : 10; const L = 30, H = 232, B = 44, T = 14; const W = narrow ? L + 8 + slots * 60 : 640;
  const box = useRef<HTMLDivElement>(null); const [more, setMore] = useState(false); const upd = () => { const e = box.current; setMore(!!e && e.scrollLeft > 6); }; useEffect(() => { const e = box.current; if (e) { e.scrollLeft = e.scrollWidth; upd(); } }, [g.length, narrow]); const hi = Math.max(10, ...g.map(x => x[1]), r.est) + 4; const lo = Math.min(0, ...g.map(x => x[1]));
  const bw = (W - L - 8) / slots; const off = slots - g.length; const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B); 
  return (
    <div style={{ position: 'relative' }}>
    {narrow && slots > 8 && more && <div aria-hidden style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 34, zIndex: 1, pointerEvents: 'none', background: 'linear-gradient(90deg, rgba(5,8,24,.95), rgba(5,8,24,0))', display: 'flex', alignItems: 'center', color: c.cy, fontSize: 22, fontWeight: 700 }}>‹</div>}
    <div ref={box} onScroll={upd} style={{ overflowX: narrow ? 'auto' : 'visible', WebkitOverflowScrolling: 'touch' }}>
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: narrow ? `${slots / 8 * 100}%` : '100%', height: 'auto', display: 'block' }} role="img" aria-label={tr('Scores TTFL de ') + r.name}>
      <line x1={L} x2={W - 8} y1={y(0)} y2={y(0)} stroke={c.line} />
      {g.map((x, i) => <g key={x[0]}><rect x={L + (i + off) * bw + bw / 2 - 16} y={Math.min(y(x[1]), y(0))} width={32} height={Math.abs(y(x[1]) - y(0))} rx="3" fill={x[1] >= r.est ? c.cy : 'rgba(0,255,255,.4)'} /><text x={L + (i + off) * bw + bw / 2} y={y(Math.max(x[1], 0)) - 4} fill="#fff" fontSize="12" fontWeight="700" textAnchor="middle">{x[1]}</text>{x[3] && <text x={L + (i + off) * bw + bw / 2} y={H - 30} fill={c.dim} fontSize="9.5" textAnchor="middle">{x[4] ? 'vs' : '@'}{x[3]}</text>}<text x={L + (i + off) * bw + bw / 2} y={H - 19} fill={c.dim} fontSize="9" textAnchor="middle">{ddmm(x[0])}</text>{x[5] && <text x={L + (i + off) * bw + bw / 2} y={H - 7} fill={c.gold} fontSize="9" fontWeight="700" textAnchor="middle">b2b</text>}</g>)}
      {r.est > 0 && <line x1={L} x2={W - 8} y1={y(r.est)} y2={y(r.est)} stroke={c.gold} strokeDasharray="5 4" />}{r.est > 0 && <text x={off >= 2 ? L + 6 : W - 10} y={y(r.est) + 14} fill={c.gold} textAnchor={off >= 2 ? 'start' : 'end'} fontSize="11" stroke="#050818" strokeWidth="3" paintOrder="stroke">{tr('Projection')} {r.est.toFixed(1)}</text>}
      {a != null && <><line x1={L} x2={W - 8} y1={y(a)} y2={y(a)} stroke="rgba(255,255,255,.5)" strokeDasharray="2 4" /><text x={off >= 2 ? L + 6 : W - 10} y={y(a) - 4} fill="rgba(255,255,255,.7)" fontSize="11" textAnchor={off >= 2 ? 'start' : 'end'} stroke="#050818" strokeWidth="3" paintOrder="stroke">{tr('Moyenne ')}{a.toFixed(1)}</text></>}
    </svg>
    </div>
    </div>
  );
}
const val = (r: R, k: SK, W_CUR: W): number | string => k === 'name' ? r.name : k === 'match' ? r.opp : k === 'est' ? r.est : k === 'l10' ? avg(r, W_CUR) ?? -1 : k === 'reg' ? reg(r, W_CUR)?.cv ?? 99 : k === 'last' ? r.last ?? -1 : r.tg ? r.gp / r.tg : -1;
const c = { cy: '#00ffff', gold: '#e5b94e', dim: 'rgba(255,255,255,.6)', line: 'rgba(255,255,255,.12)', card: 'rgba(8,12,28,.72)' };

export default function TtflPublic() {
  const [night, setNight] = useState(defaultNight);
  const [initGame, setInitGame] = useState<{ g: string; n: string } | null>(null);
  const [rows, setRows] = useState<R[] | null>(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [hideOut, setHideOut] = useState(true);
  const [view, setView] = useState<'night' | 'live' | 'inj'>('night');
  const [inj, setInj] = useState<I[] | null>(null);
  const [isort, setIsort] = useState<{ k: IK; dir: 1 | -1 }>({ k: 'status', dir: 1 });
  const [win, setWin] = useState<W>(10);
  const [open, setOpen] = useState<string | null>(null);
  const [hx, setHx] = useState<Record<string, [string, number, number, string, boolean, boolean][]>>({});
  // A l'ouverture d'un joueur : historique etendu (saisons precedentes comprises) pour toujours afficher 10 matchs
  const openRow = (r: R) => { setOpen(o => (o === r.name ? null : r.name)); if (r.slug && !hx[r.slug]) fetch('/api/ttfl/player?slug=' + r.slug).then(x => x.json()).then(j => j.ok && setHx(h => ({ ...h, [r.slug]: [...(j.pastGames || []), ...(j.games || [])].map((x: any) => [x.d, x.t, x.m, x.opp, x.home, x.b2b] as [string, number, number, string, boolean, boolean]) }))).catch(() => {}); };
  const [sort, setSort] = useState<{ k: SK; dir: 1 | -1 }>({ k: 'est', dir: -1 });
  // Telephone : tableau recompose (joueur + match sur 2 lignes), en-tete compact, top 5 defilant.
  const lang = useLang(); const en = lang === 'en'; useEffect(() => { initLang(); }, []);
  const [narrow, setNarrow] = useState(false); const pd = narrow ? '7px 6px' : '8px 12px';
  useEffect(() => { const m = window.matchMedia('(max-width: 640px)'); const f = () => setNarrow(m.matches); f(); m.addEventListener('change', f); return () => m.removeEventListener('change', f); }, []);

  // Lien direct vers un match : /ttfl?v=live&night=AAAA-MM-JJ&game=ID
  useEffect(() => { const sp = new URLSearchParams(window.location.search); const n = sp.get('night'); if (n && /^\d{4}-\d{2}-\d{2}$/.test(n)) setNight(n); if (sp.get('v') === 'live') setView('live'); const g = sp.get('game'); if (g && /^\d+$/.test(g)) setInitGame({ g, n: n && /^\d{4}-\d{2}-\d{2}$/.test(n) ? n : '' }); }, []);
  // URL toujours synchronisée avec l'écran (onglet / date / match) : un refresh retombe sur ce qu'on voit, pas sur le lien d'arrivée.
  const [selGame, setSelGame] = useState<string | null>(null);
  useEffect(() => { try { const q = new URLSearchParams(); if (view === 'live') { q.set('v', 'live'); q.set('night', night); if (selGame) q.set('game', selGame); } window.history.replaceState(null, '', window.location.pathname + (q.toString() ? '?' + q.toString() : '')); } catch {} }, [view, night, selGame]);
  useEffect(() => {
    setRows(null); setErr('');
    let stale = false; // une reponse tardive d'une autre nuit ne doit jamais ecraser la nuit affichee
    fetch('/api/ttfl?night=' + night).then(r => r.json()).then(j => { if (stale) return; j.ok ? setRows(j.rows) : setErr(j.error || tr('Indisponible')); }).catch(e => { if (!stale) setErr(String(e)); });
    return () => { stale = true; };
  }, [night]);
  useEffect(() => { if (view === 'inj' && !inj) fetch('/api/ttfl?inj=1').then(r => r.json()).then(j => j.ok && setInj(j.rows)).catch(() => {}); }, [view, inj]);

  const list = useMemo(() => (rows || []).filter(r => !(hideOut && r.status === 'OUT') && (!q || norm(r.name).includes(norm(q)) || norm(r.team).includes(norm(q))))
    .slice().sort((a, b) => { const x = val(a, sort.k, win), y = val(b, sort.k, win); const d = typeof x === 'string' ? x.localeCompare(y as string) : (x as number) - (y as number); return d * sort.dir || b.est - a.est; }), [rows, hideOut, q, sort, win]);
  const rank = useMemo(() => { const m: Record<string, number> = {}; (rows || []).forEach((r, i) => { m[r.name] = i + 1; }); return m; }, [rows]);
  // Echelle de couleur commune avec l'onglet En direct (meme charte : plus c'est haut, plus c'est neon)
  const tierC = (v: number) => v >= 45 ? '#00ffff' : v >= 35 ? '#4ade80' : v >= 25 ? '#a3e635' : v >= 15 ? '#e5b94e' : v >= 8 ? '#ff9f43' : '#ff6b6b'
  const heat = (v: number | null, lo: number, hi: number) => v == null ? c.dim : hi <= lo ? '#fff' : (v - lo) / (hi - lo) > 0.75 ? c.cy : (v - lo) / (hi - lo) > 0.4 ? '#fff' : 'rgba(255,255,255,.6)';
  const eLo = Math.min(...list.filter(r => r.est > 0).map(r => r.est)), eHi = Math.max(...list.map(r => r.est));
  const lv = list.map(r => avg(r, win)).filter((x): x is number => x != null); const lLo = Math.min(...lv), lHi = Math.max(...lv);
  const toggle = (k: SK) => setSort(s => s.k === k ? { k, dir: (s.dir * -1) as 1 | -1 } : { k, dir: k === 'name' || k === 'match' || k === 'reg' ? 1 : -1 });
  const projMap = useMemo(() => { const m: Record<string, number> = {}; (rows || []).forEach(r => { m[norm(r.name)] = r.est; }); return m; }, [rows]);
  const slugMap = useMemo(() => { const m: Record<string, string> = {}; (rows || []).forEach(r => { if (r.slug) m[norm(r.name)] = r.slug; }); return m; }, [rows]);
  const top = (rows || []).filter(r => r.status !== 'OUT').slice(0, 5);
  // Cartes top 5 : on ne reserve une 2e ligne (nom, equipe, match) que si l'un des 5 en a besoin ; rien n'est jamais coupe.
  const nk = (t: string) => /Trail Blazers$/.test(t) ? 'Trail Blazers' : t.split(' ').pop() || t;
  const lnOf = (n: string) => { const i = n.indexOf(' '); return i > 0 ? n.slice(i + 1) : n; };
  const need2 = { name: top.some(r => lnOf(r.name).length > 13), team: top.some(r => r.team.length > 15), match: top.some(r => `${r.home ? 'vs' : '@'} ${nk(r.opp)} · ${r.time}`.length > 21) };
  const injVal = (r: I, k: IK): number | string => k === 'name' ? fam(r.name) + ' ' + norm(r.name) : k === 'team' ? r.team : k === 'until' ? r.until || '9999' : k === 'l10' ? r.l10 ?? -1 : (r.status === 'OUT' ? 0 : r.status === 'GTD' ? 1 : 2) + (r.until || '9999');
  const injList = (inj || []).filter(r => !q || norm(r.name + r.team).includes(norm(q))).slice().sort((a, b) => { const x = injVal(a, isort.k), y = injVal(b, isort.k); return (typeof x === 'string' ? x.localeCompare(y as string) : (x as number) - (y as number)) * isort.dir || fam(a.name).localeCompare(fam(b.name)); });
  const itoggle = (k: IK) => setIsort(s => s.k === k ? { k, dir: (s.dir * -1) as 1 | -1 } : { k, dir: k === 'l10' ? -1 : 1 });

  const btn = (on = false): React.CSSProperties => ({ background: c.card, border: `1px solid ${on ? c.cy : c.line}`, color: on ? c.cy : '#fff', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 14 });
  const badge = (s: 'OUT' | 'GTD' | 'QUEST' | 'DOUBT' | 'PROB', t: string) => <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: s === 'OUT' ? 'rgba(255,90,90,.18)' : s === 'PROB' ? 'rgba(74,222,128,.16)' : 'rgba(229,185,78,.18)', color: s === 'OUT' ? '#ff7b7b' : s === 'PROB' ? '#4ade80' : s === 'DOUBT' ? '#ff9f43' : s === 'QUEST' ? '#e5c07b' : c.gold }}>{t}</span>;

  return (
    <main style={{ minHeight: '100vh', color: '#fff', fontFamily: 'system-ui,sans-serif', padding: narrow ? '16px 12px 50px' : '28px 16px 60px', position: 'relative' }}>
      <StarBg />
      <div style={{ maxWidth: 1000, margin: '0 auto', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: narrow ? 10 : 20, flexWrap: narrow ? 'nowrap' : 'wrap' }}>
          <div style={{ flex: narrow ? '1 1 0' : '1 1 420px', minWidth: 0 }}>
        <h1 style={{ fontSize: narrow ? 24 : 'clamp(26px,5vw,42px)', margin: '0 0 4px', letterSpacing: '.01em', lineHeight: 1.15 }}>{en ? 'Fill your deck with' : 'Remplis ton deck de'} <span style={{ color: c.cy }}>best picks</span> TTFL</h1>
        <p style={{ color: c.dim, margin: narrow ? '0 0 10px' : '0 0 18px', maxWidth: 700, lineHeight: 1.45, fontSize: narrow ? 13 : 15 }}>{en ? <>The <b style={{ color: '#fff' }}>myNFTlocker projections</b>: the TTFL score expected from every NBA player tonight, based on form, matchup, injuries and returns. Updated continuously.</> : <>Les <b style={{ color: '#fff' }}>projections myNFTlocker</b> : le score TTFL attendu de chaque joueur NBA pour la nuit, selon la forme, le match, les blessures et les retours. Mises à jour en continu.</>}</p>
          </div>
          <a href="/" title="Retour à l'accueil myNFTlocker" style={{ flex: '0 0 auto', margin: '0 auto' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-pack.png" alt="myNFTlocker" style={{ height: narrow ? 78 : 'clamp(84px,18vw,170px)', width: 'auto', display: 'block', filter: 'drop-shadow(0 8px 22px rgba(0,255,255,.25))' }} />
          </a>
        </div>

        <div style={{ display: 'flex', gap: narrow ? 6 : 8, marginBottom: narrow ? 10 : 16, overflowX: 'auto' }}>
          <button style={{ ...btn(view === 'night'), whiteSpace: 'nowrap', ...(narrow ? { padding: '8px 10px' } : {}) }} onClick={() => setView('night')}>{narrow ? tr('Projections') : tr('Projections de la nuit')}</button>
          <button style={{ ...btn(view === 'inj'), whiteSpace: 'nowrap', ...(narrow ? { padding: '8px 10px' } : {}) }} onClick={() => setView('inj')}>{narrow ? tr('Blessures') : tr('Blessures et retours')}</button>
          <button style={{ ...btn(view === 'live'), whiteSpace: 'nowrap', ...(narrow ? { padding: '8px 10px' } : {}) }} onClick={() => setView('live')}>{tr('En direct')}</button>
          <LangSwitch style={{ marginLeft: 'auto', flex: '0 0 auto' }} />
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
          {view !== 'inj' && <>
            <button style={btn()} onClick={() => setNight(shift(night, -1))} aria-label={tr('Nuit précédente')}>◀</button>
            <div style={{ ...btn(), cursor: 'default', textTransform: 'capitalize', minWidth: 170, textAlign: 'center' }}>{lbl(night, en)}</div>
            <button style={btn()} onClick={() => setNight(shift(night, 1))} aria-label={tr('Nuit suivante')}>▶</button>
          </>}
          <input placeholder={tr('Joueur ou équipe')} value={q} onChange={e => setQ(e.target.value)} style={{ ...btn(), cursor: 'text', flex: '1 1 160px', minWidth: 0 }} />
          {view === 'night' && <label style={{ fontSize: 13, color: c.dim, display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={hideOut} onChange={e => setHideOut(e.target.checked)} /> {tr('Masquer les absents')}</label>}
        </div>

        {view === 'night' && <>
          {err && <p style={{ color: '#ff7b7b' }}>{err}</p>}
          {!rows && !err && <p style={{ color: c.dim }}>{tr('Chargement…')}</p>}
          {rows && !rows.length && <p style={{ color: c.dim }}>{tr('Aucun match NBA cette nuit.')}</p>}
          {top.length > 0 && !q && (
            <div style={narrow ? { display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' } : { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 10, marginBottom: 18 }}>
              {top.map((r, i) => (
                <a key={r.name} href={`/ttfl/joueur/${r.slug || 'n-' + r.name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`} style={{ display: 'block', color: '#fff', textDecoration: 'none', background: `radial-gradient(120% 80% at 50% 0%, ${tierC(r.est)}24, rgba(8,12,28,0) 70%), ${c.card}`, border: `1px solid ${tierC(r.est)}${i === 0 ? '99' : '44'}`, boxShadow: i === 0 ? `0 0 26px ${tierC(r.est)}33` : 'none', borderRadius: 14, padding: narrow ? 10 : 14, backdropFilter: 'blur(6px)', ...(narrow ? { flex: '0 0 150px' } : {}) }}>
                  {(() => { const sp = r.name.indexOf(' '); const fn = sp > 0 ? r.name.slice(0, sp) : '', ln = sp > 0 ? r.name.slice(sp + 1) : r.name;
                    return <>
                      <div style={{ fontSize: 12, color: c.dim, minHeight: need2.team ? 30 : 15, lineHeight: '15px', display: 'flex', gap: 6 }}><span style={{ flex: '0 0 auto', color: c.gold, fontWeight: 700 }}>#{i + 1}</span><span>{r.team}</span></div>
                      <div style={{ minHeight: 14, lineHeight: '14px', fontSize: 12, color: c.dim, marginTop: 12 }}>{fn || '\u00A0'}</div>
                      <div style={{ minHeight: need2.name ? 40 : 20, lineHeight: '20px', fontSize: 16, fontWeight: 700 }}>{ln}</div>
                      <div style={{ height: 20, marginTop: 4, display: 'flex', alignItems: 'center' }}>{r.status && r.status !== 'OUT' && <span style={{ marginLeft: -8 }}>{badge(r.status, tr(SL[r.status]))}</span>}</div>
                      <div style={{ fontSize: 30, fontWeight: 800, color: tierC(r.est), textShadow: `0 0 16px ${tierC(r.est)}66`, lineHeight: 1, marginTop: 6 }}>{r.est.toFixed(1)}</div>
                      <div aria-hidden style={{ height: 5, marginTop: 8, borderRadius: 99, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}><div style={{ height: '100%', width: Math.max(4, Math.min(100, 100 * r.est / 60)) + '%', borderRadius: 99, background: `linear-gradient(90deg, ${tierC(r.est)}55, ${tierC(r.est)})`, boxShadow: `0 0 10px ${tierC(r.est)}77` }} /></div>
                      <div style={{ fontSize: 12, color: c.dim, marginTop: 8, minHeight: need2.match ? 30 : 15, lineHeight: '15px' }}>{r.home ? 'vs' : '@'} {nk(r.opp)} · {r.time}</div>
                    </>; })()}
                </a>
              ))}
            </div>
          )}
          {rows && list.length > 0 && <div style={{ display: 'flex', gap: 6, alignItems: 'center', margin: '0 0 8px', fontSize: 13, color: c.dim }}>{tr('Forme sur')}
            {([[5, '5 matchs'], [10, '10 matchs'], [0, 'Saison']] as [W, string][]).map(([w, l]) => <button key={w} onClick={() => setWin(w)} style={{ ...btn(win === w), padding: '4px 10px', fontSize: 13 }}>{tr(l)}</button>)}
            {!narrow && <span style={{ marginLeft: 'auto', fontSize: 12 }}>{tr('Clique sur un joueur pour voir ses scores match par match')}</span>}</div>}
          {rows && list.length > 0 && (
            <div style={{ background: c.card, border: `1px solid ${c.line}`, borderRadius: 14, overflowX: 'auto', backdropFilter: 'blur(6px)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: narrow ? 13 : 14, minWidth: narrow ? 0 : 640 }}>
                <thead><tr style={{ color: c.dim, textAlign: 'left' }}>
                  <th style={{ padding: narrow ? '8px 6px' : '10px 12px', fontWeight: 500 }}>#</th>
                  {([['name', tr('Joueur')], ['match', tr('Match')], ['est', narrow ? tr('Proj.') : tr('Projection')], ['l10', win ? tr('Moy.') + ' ' + win : narrow ? tr('Moy.') : tr('Moy. saison')], ['reg', narrow ? tr('Régul.') : tr('Régularité')], ['last', tr('Dernier')], ['pres', tr('Présence')]] as [SK, string][]).filter(([k]) => !narrow || k !== 'match' && k !== 'last' && k !== 'pres').map(([k, h], i) => (
                    <th key={k} onClick={() => toggle(k)} aria-sort={sort.k === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'} style={{ padding: narrow ? '8px 6px' : '10px 12px', fontWeight: 500, textAlign: i > 1 ? 'right' : 'left', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none', color: sort.k === k ? c.cy : c.dim }}>{h} {sort.k === k ? (sort.dir === 1 ? '▲' : '▼') : <span style={{ opacity: .35 }}>↕</span>}</th>
                  ))}
                </tr></thead>
                <tbody>{list.map(r => { const a = avg(r, win), trd = trend(r), o = open === r.name; return [
                  <tr key={r.name} onClick={() => openRow(r)} style={{ borderTop: `1px solid ${c.line}`, opacity: r.status === 'OUT' ? 0.45 : 1, cursor: 'pointer', background: o ? 'rgba(0,255,255,.07)' : 'transparent' }}>
                    <td style={{ padding: pd, color: c.dim }}>{rank[r.name]}</td>
                    <td style={{ padding: pd, whiteSpace: narrow ? 'normal' : 'nowrap' }}>{r.name}{r.status && badge(r.status, r.status === 'OUT' && r.until ? `OUT → ${dm(r.until)}` : tr(SL[r.status]))}{narrow && <div style={{ fontSize: 11, color: c.dim }}>{r.home ? 'vs' : '@'} {r.opp.split(' ').pop()} · {r.time}{r.tg && r.gp < r.tg - 1 ? <span style={{ color: '#ff9f43' }}> · {r.gp}/{r.tg} {tr('matchs')}</span> : null}</div>}</td>
                    {!narrow && <td style={{ padding: pd, color: c.dim, whiteSpace: 'nowrap' }}>{r.home ? 'vs' : '@'} {r.opp} · {r.time}</td>}
                    <td style={{ padding: pd, textAlign: 'right', color: r.status === 'OUT' ? c.dim : tierC(r.est), fontWeight: 800, textShadow: r.status === 'OUT' ? 'none' : `0 0 12px ${tierC(r.est)}55` }}>{r.status === 'OUT' ? '–' : r.est.toFixed(1)}{r.status !== 'OUT' && <span aria-hidden style={{ display: 'block', height: 4, width: 44, marginLeft: 'auto', marginTop: 4, borderRadius: 99, background: 'rgba(255,255,255,.08)' }}><span style={{ display: 'block', height: '100%', width: Math.max(4, Math.min(100, 100 * r.est / 60)) + '%', borderRadius: 99, background: `linear-gradient(90deg, ${tierC(r.est)}55, ${tierC(r.est)})`, boxShadow: `0 0 8px ${tierC(r.est)}66` }} /></span>}{(r.status === 'GTD' || r.status === 'QUEST' || r.status === 'DOUBT') && r.estFull != null && <div title={tr('Les Questionable / Doubtful ont un malus de 12 % sur la projection. Valeur affichée en dessous : projection réelle s’il joue.')} style={{ fontSize: 11, fontWeight: 600, color: '#e5c07b', whiteSpace: 'nowrap', textAlign: 'right' }}>↑ {r.estFull.toFixed(1)}</div>}</td>
                    <td style={{ padding: pd, textAlign: 'right', color: heat(a, lLo, lHi) }}>{a == null ? '–' : a.toFixed(1)}{trd !== 0 && <span title={trd > 0 ? tr('En hausse (5 derniers vs 10)') : tr('En baisse (5 derniers vs 10)')} style={{ marginLeft: 4, fontSize: 10, color: trd > 0 ? '#4ade80' : '#ff7b7b' }}>{trd > 0 ? '▲' : '▼'}</span>}</td>
                    {(() => { const q = reg(r, win); const m = avg(r, win); const gw = (win ? r.g.slice(-win) : r.g).map(x => x[1]); const lo = q && m != null ? Math.max(0, Math.round(m - q.sd)) : 0, hi = q && m != null ? Math.round(m + q.sd) : 0; const pc = gw.length ? Math.round(100 * gw.filter(v => v >= lo && v <= hi).length / gw.length) : 0; const lab = !q ? null : q.cv < 0.25 ? [tr('Très régulier'), '#4ade80'] : q.cv < 0.35 ? [tr('Régulier'), '#a3e635'] : q.cv < 0.45 ? [tr('Moyen'), '#e5b94e'] : [tr('Irrégulier'), '#ff9f43']; return <td title={q && m != null ? `${en ? 'Usually scores between' : 'Il score le plus souvent entre'} ${lo} ${tr(' et ').trim()} ${hi} (${pc} % ${tr('des matchs')})` : tr('pas assez de matchs')} style={{ padding: pd, textAlign: 'right', whiteSpace: 'nowrap', color: lab ? lab[1] : c.dim }}>{lab ? lab[0] : '–'}</td>; })()}
                    {!narrow && <td style={{ padding: pd, textAlign: 'right' }}>{r.last ?? '–'}</td>}
                    {!narrow && <td style={{ padding: pd, textAlign: 'right', color: r.tg && r.gp < r.tg - 1 ? '#ff9f43' : c.dim }}>{r.tg ? `${r.gp}/${r.tg}` : '–'}</td>}
                  </tr>,
                  o && (() => { const rr = hx[r.slug] ? { ...r, g: hx[r.slug] } : r; const cs = seasonOf(night); const sr = { ...rr, g: rr.g.filter(x => seasonOf(x[0]) === cs) }; return <tr key={r.name + 'x'}><td colSpan={narrow ? 5 : 8} style={{ padding: '10px 12px 14px', background: 'rgba(0,255,255,.04)' }}>
                    {rr.g.length ? <Bars r={rr} a={avg(sr, 0)} narrow={narrow} /> : <span style={{ color: c.dim }}>{tr('Pas encore de match joué cette saison.')}</span>}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10, fontSize: 15, alignItems: 'center' }}>
                      {([[tr('Moy. 5'), avg(sr, 5)], [tr('Moy. 10'), avg(sr, 10)], [tr('Moy. saison') + ' (' + sr.g.length + ')', avg(sr, 0)], [tr('Max'), sr.g.length ? Math.max(...sr.g.map(x => x[1])) : null], [tr('Min'), sr.g.length ? Math.min(...sr.g.map(x => x[1])) : null]] as [string, number | null][]).map(([k, v]) => (
                        <span key={k} style={{ border: `1px solid ${c.line}`, borderRadius: 10, padding: '6px 12px', background: 'rgba(255,255,255,.05)' }}><span style={{ color: c.dim, fontSize: 13 }}>{k}</span> <b style={{ fontSize: 18 }}>{v == null ? '–' : v.toFixed(1)}</b></span>))}
                      {r.slug && <a href={`/ttfl/joueur/${r.slug}`} onClick={e => e.stopPropagation()} style={{ marginLeft: 'auto', background: c.cy, color: '#001018', fontWeight: 700, padding: '8px 14px', borderRadius: 10, textDecoration: 'none', fontSize: 14 }}>{tr('Fiche joueur →')}</a>}
                    </div>
                  </td></tr>; })()]; })}</tbody>
              </table>
            </div>
          )}
          <p style={{ color: c.dim, fontSize: 12, marginTop: 14, lineHeight: 1.5 }}>{tr('Projection myNFTlocker = score TTFL attendu, calculé à partir de l’actualité, de la forme du joueur et de son équipe, et de l’adversaire. Statuts : injury report officiel de la NBA croisé avec l’actualité. ↑ = projection du joueur s’il joue (statut incertain). « Présence » = matchs joués / matchs de l’équipe cette saison. Heures de Paris.')}</p>
        </>}

        {view === 'live' && <LiveTab night={night} proj={projMap} slugs={slugMap} initialGame={initGame && (initGame.n === night || !initGame.n) ? initGame.g : null} onSelect={setSelGame} />}

        {view === 'inj' && (
          <div style={{ background: c.card, border: `1px solid ${c.line}`, borderRadius: 14, overflowX: 'auto' }}>
            {!inj && <p style={{ padding: 14, color: c.dim, margin: 0 }}>{tr('Chargement…')}</p>}
            {inj && <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: narrow ? 13 : 14, minWidth: narrow ? 0 : 600 }}>
              <thead><tr style={{ color: c.dim, textAlign: 'left' }}>{([['name', tr('Joueur (nom de famille)')], ['team', tr('Équipe')], ['status', tr('Statut')], ['until', narrow ? tr('Retour') : tr('Retour / réévaluation')], ['l10', tr('Moy. 10')]] as [IK, string][]).filter(([k]) => !narrow || k !== 'team').map(([k, h]) => <th key={k} onClick={() => itoggle(k)} style={{ padding: narrow ? '8px 6px' : '10px 12px', fontWeight: 500, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', color: isort.k === k ? c.cy : c.dim }}>{h} {isort.k === k ? (isort.dir === 1 ? '▲' : '▼') : <span style={{ opacity: .35 }}>↕</span>}</th>)}</tr></thead>
              <tbody>{injList.map(r => (
                <tr key={r.name} style={{ borderTop: `1px solid ${c.line}` }}>
                  <td style={{ padding: pd }}>{(() => { const sl = rows?.find(x => norm(x.name) === norm(r.name))?.slug || 'n-' + r.name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); return <a href={`/ttfl/joueur/${sl}`} style={{ color: '#fff', textDecoration: 'none', borderBottom: `1px dashed ${c.cy}` }}>{r.name} →</a>; })()}{narrow && <div style={{ fontSize: 11, color: c.dim }}>{r.team || '–'}</div>}</td>
                  {!narrow && <td style={{ padding: pd, color: c.dim }}>{r.team || '–'}</td>}
                  <td style={{ padding: pd }}>{(() => { const sc = r.status === 'OUT' ? '255,107,107' : r.status === 'PROB' ? '74,222,128' : r.status === 'DOUBT' ? '255,159,67' : '229,185,78'; return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', fontWeight: 700, fontSize: narrow ? 11.5 : 12.5, color: `rgb(${sc})`, background: `rgba(${sc},.12)`, border: `1px solid rgba(${sc},.5)`, borderRadius: 999, padding: '3px 9px', boxShadow: `0 0 12px rgba(${sc},.22)` }}><span style={{ width: 6, height: 6, borderRadius: 99, background: `rgb(${sc})`, boxShadow: `0 0 8px rgb(${sc})` }} />{tr(SL[r.status])}</span>; })()}</td>
                  <td style={{ padding: pd }}>{r.until ? (narrow ? <>{dm(r.until)}<div style={{ fontSize: 11, color: c.dim }}>{r.untilKind === 'reeval' ? tr('réévaluation') : tr('retour')}</div></> : `${dm(r.until)} (${r.untilKind === 'reeval' ? tr('réévaluation') : tr('retour')})`) : '–'}</td>
                  <td style={{ padding: pd, textAlign: 'right' }}>{r.l10 == null ? '–' : r.l10.toFixed(1)}</td>
                </tr>))}</tbody>
            </table>}
          </div>
        )}

        <div style={{ marginTop: 28, textAlign: 'center' }}>
          <a href="/" style={{ display: 'inline-block', background: c.cy, color: '#001018', fontWeight: 700, padding: '12px 22px', borderRadius: 12, textDecoration: 'none' }}>{tr('Découvrir myNFTlocker')}</a>
          <div style={{ color: c.dim, fontSize: 12, marginTop: 10 }}>{tr('Projections TTFL © myNFTlocker.com')} · <a href="/cgu" style={{ color: c.dim }}>{tr('CGU et mentions légales')}</a></div>
        </div>
      </div>
    </main>
  );
}
