'use client';
import { useEffect, useMemo, useState } from 'react';

// Compos de Game Week : TA compo (tes cartes) face a la compo IDEALE du builder (toutes cartes), en vraies cartes Sorare avec la projection dessus.
const LSP = 'mnl_cup_pseudo_v1';
type GP = { slug: string; name: string; team: string; teamName: string; games: number; opp: string[]; stars: number; proj: number; l10: number | null; inj: string | null; pic: string | null };
type Cand = { p: GP; v: number; cost: number; pw: number; is: boolean; pic: string | null; real: boolean };

function best(cands: Cand[], cap: number, perTeam: number): Cand[] {
  const pool = [...cands].sort((a, b) => b.v - a.v).slice(0, 70);
  let bestV = -1, bestSet: Cand[] = [];
  const cur: Cand[] = []; const cnt: Record<string, number> = {};
  const rec = (i: number, cost: number, v: number) => {
    if (cur.length === 5) { if (v > bestV) { bestV = v; bestSet = [...cur]; } return; }
    if (i >= pool.length) return;
    const need = 5 - cur.length;
    if (pool.length - i < need) return;
    if (v + pool[i].v * need <= bestV) return;
    const c = pool[i];
    if (cost + c.cost <= cap && (cnt[c.p.team] || 0) < perTeam && !cur.some(x => x.p.slug === c.p.slug)) {
      cur.push(c); cnt[c.p.team] = (cnt[c.p.team] || 0) + 1;
      rec(i + 1, cost + c.cost, v + c.v);
      cur.pop(); cnt[c.p.team]--;
    }
    rec(i + 1, cost, v);
  };
  rec(0, 0, 0);
  return bestSet.sort((a, b) => b.v - a.v);
}

function Card({ c, cap }: { c: Cand; cap?: boolean }) {
  return (
    <div style={{ width: 150, flex: '0 0 auto', textAlign: 'center' }}>
      <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: 'linear-gradient(160deg,#0b1d26,#05080b)', border: '1px solid ' + (c.is ? '#d4af37' : '#00ffff55'), aspectRatio: '5/7' }}>
        {c.pic ? <img src={c.pic} alt={c.p.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ color: '#8aa', paddingTop: 60, fontSize: 12 }}>{c.p.name}</div>}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '18px 6px 6px', background: 'linear-gradient(transparent,#000d)' }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0ff', lineHeight: 1, textShadow: '0 0 10px #0ff8' }}>{c.v.toFixed(1)}</div>
          <div style={{ fontSize: 10, color: '#cfe' }}>proj. {c.p.proj.toFixed(1)}{c.pw !== 1 ? ` ×${c.pw.toFixed(2)}` : ''}</div>
        </div>
        {cap && <div style={{ position: 'absolute', top: 6, left: 6, background: '#d4af37', color: '#000', fontWeight: 800, fontSize: 11, borderRadius: 99, padding: '1px 7px' }}>C</div>}
        <div style={{ position: 'absolute', top: 6, right: 6, background: '#000a', color: '#fff', fontSize: 11, borderRadius: 6, padding: '1px 6px' }}>{c.p.stars}★</div>
        {c.p.inj && <div style={{ position: 'absolute', top: 30, right: 6, background: '#c0392b', color: '#fff', fontSize: 10, borderRadius: 6, padding: '1px 5px' }}>{c.p.inj}</div>}
        {!c.real && <div style={{ position: 'absolute', top: 6, left: cap ? 34 : 6, background: '#0008', color: '#9bd', fontSize: 9, borderRadius: 6, padding: '1px 5px' }}>photo</div>}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>{c.p.name}</div>
      <div style={{ fontSize: 10, color: '#8aa' }}>{c.p.teamName.split(' ').pop()} · {c.p.games} match{c.p.games > 1 ? 's' : ''}</div>
    </div>
  );
}

function Lineup({ title, set, cap }: { title: string; set: Cand[]; cap: number }) {
  const tot = set.reduce((s, c) => s + c.v, 0), cost = set.reduce((s, c) => s + c.cost, 0);
  return (
    <section style={{ border: '1px solid #ffffff22', borderRadius: 14, padding: 14, background: '#ffffff08', marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        <b>{title}</b>
        <span style={{ color: '#0ff' }}>Total {tot.toFixed(1)} · {cost / 2}/{cap / 2}★</span>
      </div>
      {set.length ? <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6 }}>{set.map((c, i) => <Card key={c.p.slug + i} c={c} cap={i === 0} />)}</div> : <div style={{ color: '#8aa' }}>Aucune compo possible avec ces contraintes.</div>}
    </section>
  );
}

export default function GwLineups() {
  const [gw, setGw] = useState<any>(null);
  const [err, setErr] = useState('');
  const [pseudo, setPseudo] = useState('memejacquet1998');
  const [cards, setCards] = useState<any[]>([]);
  const [colMsg, setColMsg] = useState('');
  const [mode, setMode] = useState<'champ' | 'cont'>('champ');
  const [capStars, setCapStars] = useState<{ champ: number; cont: number }>({ champ: 16, cont: 16 });
  const [isOnly, setIsOnly] = useState(true);
  const [perTeam, setPerTeam] = useState(1);
  const [noInj, setNoInj] = useState(true);
  const [pics, setPics] = useState<Record<string, string | null>>({});

  useEffect(() => { try { const p = localStorage.getItem(LSP); if (p) setPseudo(p); } catch {} }, []);
  useEffect(() => { fetch('/api/outils/gw').then(r => r.json()).then(j => j.error ? setErr(j.error) : setGw(j)).catch(e => setErr(String(e))); }, []);
  const loadCol = async (pp: string) => {
    const slug = pp.trim().toLowerCase(); if (!slug) return;
    setColMsg('Chargement de ta collection…'); try { localStorage.setItem(LSP, slug); } catch {}
    try {
      const r = await fetch('/api/collection?slug=' + encodeURIComponent(slug));
      if (!r.ok || !r.body) throw new Error('http ' + r.status);
      const rd = r.body.getReader(), dec = new TextDecoder(); let buf = ''; const all: any[] = [];
      for (;;) {
        const { done, value } = await rd.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl; while ((nl = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1); if (!line) continue; const o = JSON.parse(line); if (o.error) throw new Error(o.error); if (o.cards) all.push(...o.cards); }
      }
      setCards(all.filter(c => c.__typename === 'NBACard')); setColMsg('');
    } catch (e: any) { setColMsg('Collection introuvable : ' + String(e?.message || e)); }
  };
  useEffect(() => { loadCol(typeof window !== 'undefined' && localStorage.getItem(LSP) || 'memejacquet1998'); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const players = useMemo(() => (gw?.players || []) as GP[], [gw]);
  const cap = Math.round(capStars[mode] * 2);
  const okP = (p: GP) => !(noInj && p.inj && p.inj !== 'GTD') && p.games > 0;

  // Compo ideale : toutes les cartes (une option IS + une option Classic par joueur ; carte du marche -> image reelle chargee ensuite)
  const ideal = useMemo(() => {
    const c: Cand[] = [];
    for (const p of players) if (okP(p)) c.push({ p, v: p.proj * (p.inj === 'GTD' ? 0.88 : 1), cost: Math.round(p.stars * 2), pw: 1, is: isOnly, pic: pics[p.slug] || p.pic, real: !!pics[p.slug] });
    return best(c, cap, perTeam);
  }, [players, cap, perTeam, noInj, isOnly, pics]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const need = ideal.map(c => c.p.slug).filter(s => pics[s] === undefined);
    if (!need.length) return;
    fetch('/api/outils/gw?pics=' + need.join(',')).then(r => r.json()).then(j => setPics(o => ({ ...o, ...(j.pics || {}) }))).catch(() => {});
  }, [ideal]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ta compo : tes cartes reelles (meilleure carte par joueur et par type), bonus power applique
  const mine = useMemo(() => {
    const by: Record<string, GP> = {}; players.forEach(p => { by[p.slug] = p; });
    const bestCard: Record<string, any> = {};
    for (const c of cards) {
      const rar = String(c.rarityTyped || '').toLowerCase(); if (!rar || rar === 'common') continue;
      const ps = c.anyPlayer?.slug, p = ps && by[ps]; if (!p || !okP(p)) continue;
      const is = !!c.inSeasonEligible; if (isOnly && !is) continue;
      const k = ps + (is ? ':i' : ':c'); const pw = Number(c.power) || 1;
      if (!bestCard[k] || pw > (Number(bestCard[k].power) || 1)) bestCard[k] = c;
    }
    const cs: Cand[] = Object.values(bestCard).map((c: any) => { const p = by[c.anyPlayer.slug]; const pw = Number(c.power) || 1; return { p, v: p.proj * pw * (p.inj === 'GTD' ? 0.88 : 1), cost: Math.round(p.stars * 2), pw, is: !!c.inSeasonEligible, pic: c.pictureUrl || p.pic, real: !!c.pictureUrl }; });
    return best(cs, cap, perTeam);
  }, [players, cards, cap, perTeam, noInj, isOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  const tm = mine.reduce((s, c) => s + c.v, 0), ti = ideal.reduce((s, c) => s + c.v, 0);
  const btn = (on: boolean): React.CSSProperties => ({ padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (on ? '#0ff' : '#ffffff33'), background: on ? '#0ff2' : 'transparent', color: '#fff', cursor: 'pointer' });

  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: '20px 14px 60px', color: '#fff' }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Compos GW</h1>
      <p style={{ color: '#8aa', fontSize: 13, marginTop: 0 }}>{gw ? `GW ${gw.fixture.gw} · ${gw.fixture.games} matchs · ${new Date(gw.fixture.start).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : err || 'Chargement de la GW…'}</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <button style={btn(mode === 'champ')} onClick={() => setMode('champ')}>Champion</button>
        <button style={btn(mode === 'cont')} onClick={() => setMode('cont')}>Contender</button>
        <label style={{ fontSize: 13 }}>Plafond ★ <input type="number" min={5} max={40} value={capStars[mode]} onChange={e => setCapStars(o => ({ ...o, [mode]: Number(e.target.value) || 16 }))} style={{ width: 56, background: '#000', color: '#fff', border: '1px solid #ffffff33', borderRadius: 6, padding: 3 }} /></label>
        <label style={{ fontSize: 13 }}><input type="checkbox" checked={isOnly} onChange={e => setIsOnly(e.target.checked)} /> In-Season</label>
        <label style={{ fontSize: 13 }}><input type="checkbox" checked={noInj} onChange={e => setNoInj(e.target.checked)} /> Sans blessés</label>
        <label style={{ fontSize: 13 }}>Max / équipe <select value={perTeam} onChange={e => setPerTeam(Number(e.target.value))} style={{ background: '#000', color: '#fff', border: '1px solid #ffffff33', borderRadius: 6 }}><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option></select></label>
        <input value={pseudo} onChange={e => setPseudo(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadCol(pseudo)} style={{ width: 160, background: '#000', color: '#fff', border: '1px solid #ffffff33', borderRadius: 6, padding: 5 }} />
        <button style={btn(false)} onClick={() => loadCol(pseudo)}>Charger</button>
      </div>
      {mode === 'cont' && <p style={{ color: '#d4af37', fontSize: 12 }}>Plafond Contender à confirmer : réglé comme Champion par défaut, ajuste-le au besoin.</p>}
      {colMsg && <p style={{ color: '#d4af37', fontSize: 12 }}>{colMsg}</p>}
      <Lineup title={`Ta compo ${mode === 'champ' ? 'Champion' : 'Contender'}${isOnly ? ' In-Season' : ''}`} set={mine} cap={cap} />
      <Lineup title="Compo idéale du builder (toutes cartes)" set={ideal} cap={cap} />
      {mine.length === 5 && ideal.length === 5 && <p style={{ fontSize: 14 }}>Écart avec l’idéale : <b style={{ color: ti - tm > 0.5 ? '#e67e22' : '#2ecc71' }}>{(tm - ti).toFixed(1)}</b> pts de projection</p>}
      <p style={{ color: '#8aa', fontSize: 11 }}>Score affiché = projection Sorare de la GW × bonus de la carte (power). Capitaine = plus forte valeur (bonus capitaine non compté). Les cartes de l’idéale sont des vraies cartes du marché quand il y en a, sinon la photo du joueur.</p>
    </main>
  );
}
