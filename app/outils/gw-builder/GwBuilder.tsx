'use client';
import { useEffect, useMemo, useState } from 'react';
import type { GP } from '../../../lib/gwLineup';
import { PRESETS, RARITIES, roomRar, CUP_TIERS, allocate, cardValue, type Card, type Room, type RoomKind } from '../../../lib/gwAuto';
import StarBg from '../../components/StarBg';
import { Slab } from '../gw/Slab';

// GW Builder : toutes les compos de la Game Week dans l'ORDRE que tu choisis. Une carte = une seule compo : la compo la plus haut dans l'ordre la prend.
// Mode Auto (le moteur complete, tu peux imposer des cartes avec l'epingle) ou Manuel (seulement tes cartes).
const LSP = 'mnl_cup_pseudo_v1', LSR = 'mnl_gwb_rooms_v1';
const c = { cy: '#00ffff', gold: '#e5b94e', dim: 'rgba(255,255,255,.62)', line: 'rgba(255,255,255,.13)', card: 'rgba(8,12,28,.74)', red: '#ff6b6b', green: '#4ade80' };
const parisDay = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date(iso));
const dayLab = (s: string) => new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(s + 'T12:00:00Z'));
let seq = 0; const rid = () => 'r' + Date.now().toString(36) + (seq++);

const makeRoom = (kind: RoomKind, extra: Partial<Room> = {}): Room => {
  const p = PRESETS.find(x => x.kind === kind)!;
  return { id: rid(), kind, label: p.label, cap: p.cap, minIS: p.minIS, bonus: p.bonus, perTeam: 4, pins: [], auto: true, ...extra };
};
// Ordre par defaut : celui de ta methode (IS Champion 1, Cup, IS Contender 1, IS Champion 2, puis les Classic)
const defaultRooms = (night: string): Room[] => [
  makeRoom('is-champ', { label: 'In-Season Champion 1' }),
  makeRoom('cup', { label: 'Emirates NBA Cup · palier 2', minIS: 1, night }),
  makeRoom('is-cont', { label: 'In-Season Contender 1' }),
  makeRoom('is-champ', { label: 'In-Season Champion 2' }),
  makeRoom('cl-champ', { label: 'Classic Champion 1' }),
  makeRoom('cl-champ', { label: 'Classic Champion 2' }),
  makeRoom('cl-cont', { label: 'Classic Contender 1' }),
];

const Ring = ({ v, max, col, size = 54, label }: { v: number; max: number; col: string; size?: number; label?: string }) => {
  const R = 20, C = 2 * Math.PI * R, f = Math.max(0.02, Math.min(1, v / max));
  return (
    <svg viewBox="0 0 50 50" width={size} height={size} style={{ filter: `drop-shadow(0 0 8px ${col}66)`, flex: '0 0 auto' }}>
      <circle cx="25" cy="25" r={R} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="5" />
      <circle cx="25" cy="25" r={R} fill="none" stroke={col} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${C * f} ${C}`} transform="rotate(-90 25 25)" />
      <text x="25" y="29" textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff">{label ?? Math.round(v)}</text>
    </svg>
  );
};
const Chip = ({ t, ok = true, warn = false }: { t: string; ok?: boolean; warn?: boolean }) => <span style={{ fontSize: 12, padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap', color: warn ? c.gold : ok ? c.dim : c.red, border: `1px solid ${warn ? c.gold + '88' : ok ? c.line : c.red + '88'}`, background: ok && !warn ? 'rgba(255,255,255,.04)' : 'transparent' }}>{t}</span>;

export default function GwBuilder() {
  const [gw, setGw] = useState<any>(null);
  const [err, setErr] = useState('');
  const [pseudo, setPseudo] = useState('memejacquet1998');
  const [rawCards, setRawCards] = useState<any[]>([]);
  const [used, setUsed] = useState<Record<string, string[]>>({});
  const [loadMsg, setLoadMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [noInj, setNoInj] = useState(true);
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [picker, setPicker] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => { fetch('/api/outils/gw').then(r => r.json()).then(j => j.error ? setErr(j.error) : setGw(j)).catch(e => setErr(String(e))); }, []);
  useEffect(() => { try { const p = localStorage.getItem(LSP); if (p) setPseudo(p); } catch {} }, []);
  const players = useMemo(() => (gw?.players || []) as GP[], [gw]);
  const nights = useMemo(() => [...new Set(players.flatMap(p => p.opp.map(o => parisDay(o.d))))].sort(), [players]);
  const fxSlug: string = gw?.fixture?.slug || '';

  // Ordre des compos : memorise dans le navigateur
  useEffect(() => {
    if (!nights.length || rooms) return;
    let r: Room[] | null = null;
    try { const s = localStorage.getItem(LSR); if (s) r = JSON.parse(s); } catch {}
    setRooms(r && r.length ? r.map(x => ({ ...x, pins: [] })) : defaultRooms(nights.find(n => n >= parisDay(new Date().toISOString())) || nights[0]));
  }, [nights, rooms]);
  useEffect(() => { if (rooms) try { localStorage.setItem(LSR, JSON.stringify(rooms)); } catch {} }, [rooms]);

  // Collection + cartes deja alignees dans une compo de la GW
  const loadCol = async (pp: string) => {
    const slug = pp.trim().toLowerCase(); if (!slug || !fxSlug) return;
    setLoading(true); setLoadMsg(''); try { localStorage.setItem(LSP, slug); } catch {}
    try {
      const r = await fetch('/api/collection?slug=' + encodeURIComponent(slug));
      if (!r.ok || !r.body) throw new Error('http ' + r.status);
      const rd = r.body.getReader(), dec = new TextDecoder(); let buf = ''; const all: any[] = [];
      for (;;) {
        const { done, value } = await rd.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl; while ((nl = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1); if (!line) continue; const o = JSON.parse(line); if (o.error) throw new Error(o.error); if (o.cards) all.push(...o.cards); }
      }
      setRawCards(all.filter(x => x.__typename === 'NBACard'));
      try { const ru = await fetch('/api/outils/cup-used?fixture=' + encodeURIComponent(fxSlug)); if (ru.ok) { const ju = await ru.json(); setUsed(ju.used || {}); } } catch {}
    } catch (e: any) { setLoadMsg('Collection introuvable : ' + String(e?.message || e)); }
    setLoading(false);
  };
  useEffect(() => { if (fxSlug) loadCol(typeof window !== 'undefined' && localStorage.getItem(LSP) || 'memejacquet1998'); }, [fxSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  const cards: Card[] = useMemo(() => {
    const by: Record<string, GP> = {}; players.forEach(p => { by[p.slug] = p; });
    const out: Card[] = [];
    for (const x of rawCards) {
      const rar = String(x.rarityTyped || '').toLowerCase(); if (!['limited', 'rare', 'super_rare'].includes(rar)) continue;
      const p = by[x.anyPlayer?.slug]; if (!p || p.games <= 0) continue;
      if (noInj && p.inj && p.inj !== 'GTD') continue;
      if (used[x.slug]) continue; // deja alignee dans une compo de cette GW
      out.push({ id: x.slug, p, is: !!x.inSeasonEligible, pw: Number(x.power) || 1, pic: x.pictureUrl || p.pic, rar });
    }
    return out;
  }, [rawCards, players, used, noInj]);

  const results = useMemo(() => (rooms ? allocate(rooms, cards) : []), [rooms, cards]);
  const patch = (id: string, f: (r: Room) => Room) => setRooms(rs => (rs || []).map(r => (r.id === id ? f(r) : r)));
  const move = (i: number, d: -1 | 1) => setRooms(rs => { const a = [...(rs || [])]; const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; });
  const add = (kind: RoomKind) => setRooms(rs => {
    const n = (rs || []).filter(r => r.kind === kind).length + 1; const p = PRESETS.find(x => x.kind === kind)!;
    return [...(rs || []), makeRoom(kind, { label: kind === 'cup' ? 'Emirates NBA Cup · palier 2' : `${p.label} ${n}`, ...(kind === 'cup' ? { minIS: 1, night: nights[0] } : {}) })];
  });
  const total = results.reduce((s, r) => s + (r.lineup.length === 5 ? r.total : 0), 0);
  const nDone = results.filter(r => r.lineup.length === 5 && !r.issues.length).length;
  const usedCards = new Set(results.flatMap(r => r.lineup.map(x => x.id)));

  const recap = () => {
    const t = `GW ${gw?.fixture?.gw ?? ''}\n` + results.map((r, i) => `${i + 1}. ${r.room.label} — ${r.lineup.map(x => x.p.name).join(', ')} (${r.total.toFixed(0)} pts, ${r.stars}★)`).join('\n');
    navigator.clipboard?.writeText(t).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }).catch(() => {});
  };

  const glass: React.CSSProperties = { background: `linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.01)), ${c.card}`, border: `1px solid ${c.line}`, borderRadius: 18, backdropFilter: 'blur(8px)' };
  const btn = (on = false): React.CSSProperties => ({ background: on ? 'rgba(0,255,255,.14)' : 'rgba(255,255,255,.06)', border: `1px solid ${on ? c.cy : c.line}`, color: on ? c.cy : '#fff', borderRadius: 10, padding: '7px 12px', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' });
  const inp: React.CSSProperties = { background: 'rgba(0,0,0,.4)', color: '#fff', border: `1px solid ${c.line}`, borderRadius: 10, padding: '8px 10px', fontSize: 14 };

  // Cartes proposees pour completer / remplacer dans une compo (regles respectees : plafond, equipe, joueur unique, carte libre)
  const pickerRoom = rooms?.find(r => r.id === picker);
  const pickerRes = results.find(r => r.room.id === picker);
  const pickerList = useMemo(() => {
    if (!pickerRoom || !pickerRes) return [];
    const mine = pickerRes.lineup.filter(x => pickerRoom.pins.includes(x.id)), ql = q.toLowerCase(); // seules les cartes imposees comptent : le moteur complete autour
    const pinnedElsewhere = new Set((rooms || []).filter(r => r.id !== picker).flatMap(r => r.pins));
    const cost = mine.reduce((s, x) => s + x.cost, 0), cnt: Record<string, number> = {}; mine.forEach(x => { cnt[x.p.team] = (cnt[x.p.team] || 0) + 1; });
    return cards.filter(x => !pinnedElsewhere.has(x.id) && !mine.some(m => m.id === x.id) && !mine.some(m => m.p.slug === x.p.slug) && roomRar(pickerRoom).includes(x.rar || 'limited')
      && cost + Math.round(x.p.stars * 2) <= pickerRoom.cap * 2 && (cnt[x.p.team] || 0) < pickerRoom.perTeam && (!ql || (x.p.name + x.p.teamName).toLowerCase().includes(ql)))
      .map(x => ({ x, v: cardValue(x, pickerRoom) })).filter(z => z.v > 0).sort((a, b) => b.v - a.v).slice(0, 60);
  }, [pickerRoom, pickerRes, cards, results, rooms, picker, q]);

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#030510', color: '#fff' }}>
      <StarBg />
      <style>{'.gwb-row{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}.gwb-cell{container-type:inline-size}@media(max-width:700px){.gwb-row{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}}'}</style>
      <main style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '22px 14px 80px', fontFamily: 'system-ui,sans-serif' }}>
        <h1 style={{ fontSize: 28, margin: '0 0 4px', letterSpacing: '.01em' }}>GW <span style={{ color: c.cy }}>Builder</span></h1>
        <p style={{ color: c.dim, fontSize: 14, margin: '0 0 16px' }}>{gw ? `GW ${gw.fixture.gw} · ${gw.fixture.games} matchs` : err || 'Chargement de la GW…'} · tes compos dans l’ordre que tu choisis : une carte ne sert qu’une fois, la compo la plus haute la prend.</p>

        {/* Synthese */}
        <div style={{ ...glass, padding: '14px 16px', marginBottom: 14, display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', justifyContent: 'space-between', border: `1px solid rgba(0,255,255,.28)`, background: 'radial-gradient(120% 160% at 0% 0%, rgba(0,255,255,.14), rgba(7,11,28,0) 60%), ' + c.card }}>
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'center' }}>
            <div><div style={{ fontSize: 12, color: c.dim, letterSpacing: 1 }}>TOTAL PROJETÉ</div><div style={{ fontSize: 34, fontWeight: 800, color: c.cy, textShadow: '0 0 18px rgba(0,255,255,.5)', lineHeight: 1.1 }}>{total.toFixed(0)}</div></div>
            <div><div style={{ fontSize: 12, color: c.dim, letterSpacing: 1 }}>COMPOS COMPLÈTES</div><div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.2 }}>{nDone}<span style={{ color: c.dim, fontSize: 18 }}> / {results.length}</span></div></div>
            <div><div style={{ fontSize: 12, color: c.dim, letterSpacing: 1 }}>CARTES UTILISÉES</div><div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.2 }}>{usedCards.size}<span style={{ color: c.dim, fontSize: 18 }}> / {cards.length}</span></div></div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ fontSize: 13, color: c.dim, display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={noInj} onChange={e => setNoInj(e.target.checked)} /> Exclure les blessés</label>
            <input value={pseudo} onChange={e => setPseudo(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadCol(pseudo)} style={{ ...inp, width: 150 }} aria-label="Compte Sorare" />
            <button onClick={() => loadCol(pseudo)} style={btn()}>Recharger</button>
            <button onClick={recap} style={btn(copied)}>{copied ? 'Copié ✓' : 'Copier le récap'}</button>
          </div>
        </div>
        {loadMsg && <p style={{ color: c.gold, fontSize: 13 }}>{loadMsg}</p>}
        {loading && <p style={{ color: c.dim, fontSize: 13 }}>Chargement de ta collection…</p>}

        {/* Compos dans l'ordre */}
        {results.map((res, i) => {
          const r = res.room; const full = res.lineup.length === 5; const cupT = r.kind === 'cup' ? CUP_TIERS.find(t => r.label.includes('palier ' + t.n)) : null;
          const col = !full ? c.dim : res.issues.length ? c.red : cupT ? (res.total >= cupT.pts ? c.green : c.gold) : c.cy;
          return (
            <section key={r.id} style={{ ...glass, padding: 14, marginBottom: 14, borderColor: res.issues.length && full ? c.red + '66' : c.line }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
                <span style={{ width: 30, height: 30, borderRadius: 99, display: 'grid', placeItems: 'center', fontWeight: 800, color: '#001018', background: c.cy, boxShadow: '0 0 14px rgba(0,255,255,.5)', flex: '0 0 auto' }}>{i + 1}</span>
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{r.label}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 5 }}>
                    <Chip t={`${res.stars}/${r.cap}★`} ok={res.stars <= r.cap} />
                    <Chip t={`${res.nIS}${r.minIS ? '/' + r.minIS : ''} In-Season`} ok={res.nIS >= r.minIS} />
                    <Chip t={`max ${res.maxTeam}/${r.perTeam} par équipe`} ok={res.maxTeam <= r.perTeam} />
                    {r.night && <Chip t={`nuit du ${dayLab(r.night)}`} />}
                    {!r.bonus && <Chip t="sans bonus XP" />}
                    {RARITIES.map(ra => { const on = roomRar(r).includes(ra.k); return <button key={ra.k} onClick={() => patch(r.id, x => { const cur = roomRar(x); const nx = cur.includes(ra.k) ? cur.filter(k => k !== ra.k) : [...cur, ra.k]; return { ...x, rar: nx.length ? nx : cur }; })} style={{ ...btn(on), padding: '3px 9px', fontSize: 11, borderRadius: 999 }}>{ra.l}</button>; })}
                    {res.issues.filter(x => !/^\d+★|In-Season$|équipe/.test(x)).map(x => <Chip key={x} t={x} ok={false} />)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {cupT && <div style={{ textAlign: 'right', fontSize: 12, color: c.dim }}>objectif<br /><b style={{ color: '#fff', fontSize: 15 }}>{cupT.pts}</b></div>}
                  <Ring v={res.total} max={cupT ? cupT.pts : 260} col={col} size={58} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                <button onClick={() => move(i, -1)} disabled={i === 0} style={{ ...btn(), opacity: i === 0 ? .35 : 1 }} aria-label="Monter">↑</button>
                <button onClick={() => move(i, 1)} disabled={i === results.length - 1} style={{ ...btn(), opacity: i === results.length - 1 ? .35 : 1 }} aria-label="Descendre">↓</button>
                <button onClick={() => patch(r.id, x => ({ ...x, auto: !x.auto }))} style={btn(r.auto)}>{r.auto ? 'Auto' : 'Manuel'}</button>
                {r.kind === 'cup' && <>
                  <select value={cupT?.n ?? 2} onChange={e => { const t = CUP_TIERS.find(z => z.n === +e.target.value)!; patch(r.id, x => ({ ...x, minIS: t.is, label: `Emirates NBA Cup · palier ${t.n}` })); }} style={inp}>{CUP_TIERS.map(t => <option key={t.n} value={t.n}>Palier {t.n} · {t.pts} pts · {t.is} IS min</option>)}</select>
                  <select value={r.night} onChange={e => patch(r.id, x => ({ ...x, night: e.target.value }))} style={inp}>{nights.map(n => <option key={n} value={n}>{dayLab(n)}</option>)}</select>
                </>}
                {r.kind === 'arena' && <label style={{ fontSize: 13, color: c.dim, display: 'flex', alignItems: 'center', gap: 6 }}>Plafond ★ <input type="number" min={5} max={25} value={r.cap} onChange={e => patch(r.id, x => ({ ...x, cap: Math.max(5, +e.target.value || 16) }))} style={{ ...inp, width: 64 }} /></label>}
                <button onClick={() => { setPicker(r.id); setQ(''); }} style={btn()}>+ Choisir une carte</button>
                {r.pins.length > 0 && <button onClick={() => patch(r.id, x => ({ ...x, pins: [] }))} style={btn()}>Vider mes choix</button>}
                <button onClick={() => setRooms(rs => (rs || []).filter(x => x.id !== r.id))} style={{ ...btn(), marginLeft: 'auto', color: c.red }} aria-label="Supprimer la compo">Supprimer</button>
              </div>
              {res.lineup.length ? (
                <div className="gwb-row">
                  {res.lineup.map(cd => {
                    const pinned = r.pins.includes(cd.id);
                    return (
                      <div key={cd.id} className="gwb-cell">
                        <button onClick={() => patch(r.id, x => ({ ...x, pins: pinned ? x.pins.filter(y => y !== cd.id) : [...x.pins, cd.id] }))} title={pinned ? 'Retirer de mes choix' : 'Imposer cette carte dans cette compo'} style={{ display: 'block', width: '100%', marginBottom: 6, padding: '4px 0', borderRadius: 8, border: `1px solid ${pinned ? c.gold + 'aa' : c.line}`, background: pinned ? 'rgba(229,185,78,.16)' : 'rgba(255,255,255,.04)', color: pinned ? c.gold : c.dim, cursor: 'pointer', fontSize: 12 }}>{pinned ? '📌 Imposée · retirer' : '📌 Imposer'}</button>
                        <Slab c={cd} u={n => `${n}cqw`} art={cd.real ? cd.pic : null} />
                      </div>
                    );
                  })}
                </div>
              ) : <p style={{ color: c.dim, fontSize: 13, margin: 0 }}>{loading ? 'Chargement…' : r.auto ? 'Aucune compo possible avec les cartes restantes.' : 'Choisis tes cartes ou passe en Auto.'}</p>}
              {full && res.issues.length > 0 && <p style={{ color: c.red, fontSize: 13, margin: '10px 0 0' }}>⚠ {res.issues.join(' · ')}</p>}
            </section>
          );
        })}

        {/* Ajouter une compo */}
        <div style={{ ...glass, padding: 14 }}>
          <div style={{ fontSize: 12, color: c.dim, letterSpacing: 1, marginBottom: 8 }}>AJOUTER UNE COMPO À LA FIN DE L’ORDRE</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{PRESETS.map(p => <button key={p.kind} onClick={() => add(p.kind)} style={btn()}>+ {p.label}</button>)}<button onClick={() => setRooms(defaultRooms(nights[0]))} style={{ ...btn(), marginLeft: 'auto' }}>Ordre par défaut</button></div>
        </div>
        <p style={{ color: c.dim, fontSize: 12, margin: '14px 2px 0', lineHeight: 1.5 }}>Valeur affichée = projection Sorare de la GW (de la nuit choisie pour la Cup) × bonus de la carte × 0,88 si GTD ; sans bonus en Arena. Raretés au choix par compo (Limited par défaut), cartes déjà alignées sur Sorare exclues. Règles : 5 joueurs différents, plafond d’étoiles, max 4 joueurs d’une même équipe, minimum In-Season selon la compo. Tu envoies toi-même les compos sur Sorare.</p>
      </main>

      {/* Choix manuel d'une carte */}
      {picker && pickerRoom && (
        <div role="dialog" aria-modal="true" onClick={e => { if (e.target === e.currentTarget) setPicker(null); }} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(3,6,18,.86)', backdropFilter: 'blur(6px)', overflowY: 'auto', padding: '20px 12px' }}>
          <div style={{ ...glass, maxWidth: 640, margin: '0 auto', padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <b style={{ fontSize: 16 }}>{pickerRoom.label} · choisir une carte</b>
              <button onClick={() => setPicker(null)} style={btn()}>✕ Fermer</button>
            </div>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Joueur ou équipe" style={{ ...inp, width: '100%', boxSizing: 'border-box', marginBottom: 8 }} />
            <div style={{ fontSize: 12, color: c.dim, marginBottom: 6 }}>Cartes qui respectent le plafond, l’équipe et le joueur unique avec tes cartes imposées, de la plus forte à la plus faible. Si la carte est déjà utilisée dans une autre compo, elle passe dans celle-ci et l’autre se réorganise.</div>
            {pickerList.map(({ x, v }) => (
              <button key={x.id} onClick={() => { patch(pickerRoom.id, r => ({ ...r, pins: [...r.pins, x.id].slice(0, 5) })); setPicker(null); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', color: '#fff', background: 'transparent', border: 'none', borderTop: `1px solid ${c.line}`, padding: '9px 4px', cursor: 'pointer' }}>
                <span style={{ flex: 1, minWidth: 0 }}><b>{x.p.name}</b><span style={{ display: 'block', color: c.dim, fontSize: 12.5 }}>{x.p.teamName} · {x.p.stars}★ · {x.is ? 'In-Season' : 'Classic'}{x.pw !== 1 ? ` · +${Math.round((x.pw - 1) * 100)} %` : ''} · {x.p.games} match{x.p.games > 1 ? 's' : ''}{x.p.inj ? ' · ' + x.p.inj : ''}{(() => { const k = results.findIndex(r => r.lineup.some(l => l.id === x.id)); return k >= 0 ? ` · utilisée en compo ${k + 1}` : ''; })()}</span></span>
                <span style={{ fontWeight: 800, fontSize: 20, color: c.cy }}>{v.toFixed(1)}</span>
              </button>
            ))}
            {!pickerList.length && <p style={{ color: c.dim, fontSize: 13 }}>Aucune carte disponible.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
