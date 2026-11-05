'use client';
import { useEffect, useMemo, useState } from 'react';
import { best, vary, BONUS_IS, CAPS, MAX_PER_TEAM, type Cand, type GP, type MCard } from '../../../lib/gwLineup';
import StarBg from './StarBg';
import { GwRow } from './GwCard';

// Compos de Game Week : TES cartes face a la compo IDEALE du builder (toutes cartes). Une carte = une seule compo.
const LSP = 'mnl_cup_pseudo_v1';
const sum = (s: Cand[]) => s.reduce((t, c) => t + c.v, 0);
const stars = (s: Cand[]) => s.reduce((t, c) => t + c.cost, 0) / 2;

// Image de la compo (1200x675, pour X) : generee cote serveur, partagee ou telechargee
async function shareLineup(title: string, set: Cand[], gwNum: number) {
  const d = btoa(unescape(encodeURIComponent(JSON.stringify({ t: `${title} · GW ${gwNum}`, u: `${set.reduce((t, c) => t + c.v, 0).toFixed(1)} pts`, c: set.map(c => ({ n: c.p.name, v: Number(c.v.toFixed(1)), p: c.real ? c.pic : null, s: c.p.stars, b: Math.round((c.pw - 1) * 100) })) })))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const r = await fetch('/api/gw-img?d=' + d); if (!r.ok) throw new Error('image ' + r.status);
  const blob = await r.blob(); const file = new File([blob], `compo-${title.toLowerCase().replace(/[^a-z]+/g, '-')}-gw${gwNum}.png`, { type: 'image/png' });
  const nav: any = navigator;
  if (nav.canShare?.({ files: [file] })) { try { await nav.share({ files: [file], text: `${title} · GW ${gwNum}` }); return; } catch { /* annule : telechargement */ } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
}

function Block({ title, cap, mine, ideal, loading, gwNum }: { title: string; cap: number; mine: Cand[]; ideal: Cand[]; loading: boolean; gwNum: number }) {
  const [busy, setBusy] = useState(false);
  const gap = sum(mine) - sum(ideal);
  const box: React.CSSProperties = { border: '1px solid #ffffff1f', borderRadius: 16, padding: 16, background: '#0a1218e6', marginBottom: 20 };
  const h: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 6, margin: '0 0 12px' };
  return (
    <section style={box}>
      <h2 style={{ fontSize: 20, margin: '0 0 14px', color: '#19d3e6' }}>{title} <span style={{ fontSize: 13, color: '#9ab', fontWeight: 400 }}>· {cap}★ max</span></h2>
      <div style={h}><b>Ta compo</b><span style={{ color: '#9ab', fontSize: 13, display: 'flex', gap: 10, alignItems: 'center' }}>{mine.length === 5 ? `${sum(mine).toFixed(1)} pts · ${stars(mine)}★` : ''}{mine.length === 5 && <button disabled={busy} onClick={async () => { setBusy(true); try { await shareLineup('Ma compo ' + title, mine, gwNum); } catch { alert('Image indisponible, réessaie.'); } setBusy(false); }} style={{ background: '#19d3e6', color: '#001', border: 0, borderRadius: 8, padding: '5px 12px', fontWeight: 700, cursor: 'pointer' }}>{busy ? '…' : 'Partager'}</button>}</span></div>
      {mine.length === 5 ? <GwRow set={mine} /> : <p style={{ color: '#e67e22', fontSize: 13 }}>{loading ? 'Chargement de ta collection…' : 'Pas assez de cartes disponibles pour cette compo (cartes déjà alignées exclues).'}</p>}
      <div style={{ ...h, marginTop: 22 }}><b>Compo idéale du builder <span style={{ color: '#9ab', fontWeight: 400, fontSize: 12 }}>(cartes In-Season, bonus +5 %)</span></b><span style={{ color: '#9ab', fontSize: 13, display: 'flex', gap: 10, alignItems: 'center' }}>{ideal.length === 5 ? `${sum(ideal).toFixed(1)} pts · ${stars(ideal)}★` : ''}<a href={`/api/gw-img?c=${title === 'Champion' ? 'champ' : 'cont'}`} target="_blank" rel="noreferrer" style={{ color: '#19d3e6' }}>Image du post</a></span></div>
      {ideal.length === 5 ? <GwRow set={ideal} /> : <p style={{ color: '#9ab', fontSize: 13 }}>Calcul…</p>}
      {mine.length === 5 && ideal.length === 5 && <p style={{ margin: '14px 0 0', fontSize: 14 }}>Écart avec l’idéale : <b style={{ color: gap < -0.5 ? '#e67e22' : '#2ecc71' }}>{gap.toFixed(1)} pts</b></p>}
    </section>
  );
}

export default function GwLineups() {
  const [gw, setGw] = useState<any>(null);
  const [err, setErr] = useState('');
  const [pseudo, setPseudo] = useState('memejacquet1998');
  const [cards, setCards] = useState<any[]>([]);
  const [used, setUsed] = useState<Record<string, string[]>>({});
  const [usedOk, setUsedOk] = useState(false);
  const [colMsg, setColMsg] = useState('');
  const [colLoading, setColLoading] = useState(true);
  const [isOnly, setIsOnly] = useState(true);
  const perTeam = MAX_PER_TEAM;
  const [noInj, setNoInj] = useState(true);
  const [pics, setPics] = useState<Record<string, MCard[]>>({});

  useEffect(() => { fetch('/api/outils/gw').then(r => r.json()).then(j => j.error ? setErr(j.error) : setGw(j)).catch(e => setErr(String(e))); }, []);
  const loadCol = async (pp: string, fx: string) => {
    const slug = pp.trim().toLowerCase(); if (!slug) return;
    setColLoading(true); setColMsg(''); try { localStorage.setItem(LSP, slug); } catch {}
    try {
      const r = await fetch('/api/collection?slug=' + encodeURIComponent(slug));
      if (!r.ok || !r.body) throw new Error('http ' + r.status);
      const rd = r.body.getReader(), dec = new TextDecoder(); let buf = ''; const all: any[] = [];
      for (;;) {
        const { done, value } = await rd.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl; while ((nl = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1); if (!line) continue; const o = JSON.parse(line); if (o.error) throw new Error(o.error); if (o.cards) all.push(...o.cards); }
      }
      setCards(all.filter(c => c.__typename === 'NBACard'));
      try { const ru = await fetch('/api/outils/cup-used?fixture=' + encodeURIComponent(fx)); if (ru.ok) { const ju = await ru.json(); setUsed(ju.used || {}); setUsedOk(!!ju.fixture); } } catch {}
    } catch (e: any) { setColMsg('Collection introuvable : ' + String(e?.message || e)); }
    setColLoading(false);
  };
  const fxSlug: string = gw?.fixture?.slug || '';
  useEffect(() => { if (fxSlug) loadCol(typeof window !== 'undefined' && localStorage.getItem(LSP) || 'memejacquet1998', fxSlug); }, [fxSlug]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { try { const p = localStorage.getItem(LSP); if (p) setPseudo(p); } catch {} }, []);

  const players = useMemo(() => (gw?.players || []) as GP[], [gw]);
  const okP = (p: GP) => !(noInj && p.inj && p.inj !== 'GTD') && p.games > 0;
  const gtd = (p: GP) => (p.inj === 'GTD' ? 0.88 : 1);

  // Compos ideales (toutes cartes, une par palier)
  const idealOf = (cap: number) => best(players.filter(okP).map(p => ({ id: 'i-' + p.slug, p, v: p.proj * BONUS_IS * gtd(p), cost: Math.round(p.stars * 2), pw: BONUS_IS, is: true, pic: p.pic, real: false })), Math.round(cap * 2), perTeam);
  const idealChamp = useMemo(() => vary(idealOf(CAPS.champ), pics), [players, noInj, pics]); // eslint-disable-line react-hooks/exhaustive-deps
  const idealCont = useMemo(() => vary(idealOf(CAPS.cont), pics), [players, noInj, pics]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const need = [...new Set([...idealChamp, ...idealCont].map(c => c.p.slug))].filter(s => pics[s] === undefined);
    if (!need.length) return;
    fetch('/api/outils/gw?pics=' + need.join(',')).then(r => r.json()).then(j => setPics(o => ({ ...o, ...(j.pics || {}) }))).catch(() => {});
  }, [idealChamp, idealCont]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tes compos : une carte = une compo. Champion d'abord, Contender ensuite avec les cartes restantes.
  const [mineChamp, mineCont] = useMemo(() => {
    const by: Record<string, GP> = {}; players.forEach(p => { by[p.slug] = p; });
    const all: Cand[] = [];
    for (const c of cards) {
      const rar = String(c.rarityTyped || '').toLowerCase(); if (!rar || rar !== 'limited') continue; // Limited uniquement
      const p = by[c.anyPlayer?.slug]; if (!p || !okP(p)) continue;
      if (used[c.slug]) continue; // deja alignee dans une compo de cette GW
      const is = !!c.inSeasonEligible;
      const pw = Number(c.power) || 1;
      all.push({ id: c.slug, p, v: p.proj * pw * gtd(p), cost: Math.round(p.stars * 2), pw, is, pic: c.pictureUrl || p.pic, real: !!c.pictureUrl });
    }
    const mx = isOnly ? 1 : 5; // compo In-Season : 4 cartes IS minimum, 1 carte classic autorisee
    const a = best(all, Math.round(CAPS.champ * 2), perTeam, mx);
    const ids = new Set(a.map(x => x.id));
    return [a, best(all.filter(x => !ids.has(x.id)), Math.round(CAPS.cont * 2), perTeam, mx)];
  }, [players, cards, used, noInj, isOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  const lab: React.CSSProperties = { fontSize: 13, color: '#dfe', display: 'flex', alignItems: 'center', gap: 6 };
  const inp: React.CSSProperties = { background: '#000', color: '#fff', border: '1px solid #ffffff33', borderRadius: 8, padding: '6px 8px', fontSize: 14 };
  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#030510' }}>
    <StarBg />
    <main style={{ position: 'relative', zIndex: 1, maxWidth: 980, margin: '0 auto', padding: '22px 14px 70px', color: '#fff' }}>
      <h1 style={{ fontSize: 26, margin: '0 0 4px' }}>Compos GW</h1>
      <p style={{ color: '#9ab', fontSize: 14, margin: '0 0 16px' }}>{gw ? `GW ${gw.fixture.gw} · ${gw.fixture.games} matchs · début ${new Date(gw.fixture.start).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : err || 'Chargement de la GW…'}</p>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14, padding: 12, border: '1px solid #ffffff1f', borderRadius: 12, background: '#0a1218e6' }}>
        <label style={lab}><input type="checkbox" checked={isOnly} onChange={e => setIsOnly(e.target.checked)} /> Compo In-Season (4 IS + 1 classic max)</label>
        <label style={lab}><input type="checkbox" checked={noInj} onChange={e => setNoInj(e.target.checked)} /> Exclure les blessés</label>
        <label style={lab}>Compte <input value={pseudo} onChange={e => setPseudo(e.target.value)} onKeyDown={e => e.key === 'Enter' && fxSlug && loadCol(pseudo, fxSlug)} style={{ ...inp, width: 160 }} /></label>
        <button onClick={() => fxSlug && loadCol(pseudo, fxSlug)} style={{ ...inp, cursor: 'pointer', borderColor: '#19d3e6' }}>Recharger</button>
      </div>
      {colMsg && <p style={{ color: '#e67e22', fontSize: 13 }}>{colMsg}</p>}
      {!colLoading && !colMsg && <p style={{ color: '#9ab', fontSize: 12.5, margin: '0 0 14px' }}>{usedOk ? `${Object.keys(used).length} de tes cartes sont déjà alignées dans une compo de cette GW : exclues.` : 'Cartes déjà alignées : lecture Sorare indisponible, aucune exclusion appliquée.'} Une carte ne sert que dans une compo : la Contender utilise les cartes restantes après la Champion.</p>}
      <Block title="Champion" cap={CAPS.champ} mine={mineChamp} ideal={idealChamp} loading={colLoading} gwNum={gw?.fixture?.gw || 0} />
      <Block title="Contender" cap={CAPS.cont} mine={mineCont} ideal={idealCont} loading={colLoading} gwNum={gw?.fixture?.gw || 0} />
      <p style={{ color: '#789', fontSize: 11.5 }}>Valeur affichée = projection Sorare de la GW × bonus de la carte (bonus réel pour tes cartes, +5 % par défaut pour le builder). Pas de capitaine en NBA. Cartes du builder : vraies Limited In-Season du marché.</p>
    </main>
    </div>
  );
}
