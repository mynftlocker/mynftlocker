'use client';
import { useEffect, useMemo, useState } from 'react';

// Paliers Emirates NBA Cup (Sorare) : cible de points, nb min de cartes In-Season. Cap 16 etoiles, 5 cartes Limited+.
const TIERS = [
  { n: 1, pts: 230, is: 1 }, { n: 2, pts: 250, is: 1 }, { n: 3, pts: 270, is: 2 }, { n: 4, pts: 280, is: 3 }, { n: 5, pts: 300, is: 4 },
];
const CAP = 32; // 16 etoiles en demi-etoiles
type P = { slug: string; name: string; team: string; opp: string; home: boolean; time: string; stars: number; proj: number; l5: number | null; l10: number | null; sd: number | null; max: number | null; n: number; inj: string | null };
type Metric = 'proj' | 'l5' | 'l10' | 'mix';
const LS = 'mnl_cup_owned_v1';

const ymd = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(d);
const lab = (s: string) => new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(s + 'T12:00:00Z'));
const erf = (x: number) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
const cdf = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2));

function best(pool: { v: number; c: number; i: number }[], k = 5): { total: number; idx: number[] } {
  // sac a dos : choisir au plus k joueurs, somme des demi-etoiles <= CAP, valeur max
  const dp: number[][] = Array.from({ length: k + 1 }, () => Array(CAP + 1).fill(-1));
  const pick: number[][][] = Array.from({ length: k + 1 }, () => Array.from({ length: CAP + 1 }, () => []));
  for (let c = 0; c <= CAP; c++) dp[0][c] = 0;
  for (const it of pool) {
    for (let j = k; j >= 1; j--) for (let c = CAP; c >= it.c; c--) {
      const prev = dp[j - 1][c - it.c];
      if (prev >= 0 && prev + it.v > dp[j][c]) { dp[j][c] = prev + it.v; pick[j][c] = [...pick[j - 1][c - it.c], it.i]; }
    }
  }
  let bt = 0, bi: number[] = [];
  for (let j = 0; j <= k; j++) for (let c = 0; c <= CAP; c++) if (dp[j][c] > bt) { bt = dp[j][c]; bi = pick[j][c]; }
  return { total: bt, idx: bi };
}

export default function CupBuilder() {
  const today = useMemo(() => new Date(), []);
  const nights = useMemo(() => Array.from({ length: 8 }, (_, i) => ymd(new Date(today.getTime() + i * 86400000))), [today]);
  const [night, setNight] = useState(nights[1]);
  const [tier, setTier] = useState(2);
  const [metric, setMetric] = useState<Metric>('mix');
  const [noOut, setNoOut] = useState(true);
  const [data, setData] = useState<P[]>([]);
  const [games, setGames] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [owned, setOwned] = useState<Record<string, 1 | 2>>({}); // 1 = Limited+ possedee, 2 = possedee en In-Season
  const [q, setQ] = useState('');

  useEffect(() => { try { setOwned(JSON.parse(localStorage.getItem(LS) || '{}')); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem(LS, JSON.stringify(owned)); } catch {} }, [owned]);
  useEffect(() => {
    let off = false; setLoading(true); setErr('');
    fetch('/api/outils/cup?night=' + night).then(r => r.json()).then(j => {
      if (off) return; if (j.error) { setErr(j.error); setData([]); } else { setData(j.players || []); setGames(j.games || 0); }
    }).catch(e => !off && setErr(String(e))).finally(() => !off && setLoading(false));
    return () => { off = true; };
  }, [night]);

  const T = TIERS[tier - 1];
  const val = (p: P) => {
    const l5 = p.l5 ?? p.proj, l10 = p.l10 ?? p.proj;
    const b = metric === 'proj' ? p.proj : metric === 'l5' ? l5 : metric === 'l10' ? l10 : 0.5 * p.proj + 0.3 * l5 + 0.2 * l10;
    return p.inj === 'GTD' ? b * 0.88 : b;
  };
  const pool = useMemo(() => data.filter(p => !(noOut && p.inj && p.inj !== 'GTD')).map((p, i) => ({ p, v: val(p), c: Math.round(p.stars * 2), i })), [data, metric, noOut]); // eslint-disable-line react-hooks/exhaustive-deps
  const ownedPool = useMemo(() => pool.filter(x => owned[x.p.slug]), [pool, owned]);
  const free = useMemo(() => best(pool), [pool]);
  const mine = useMemo(() => best(ownedPool), [ownedPool]);
  const gains = useMemo(() => ownedPool.length < 5 ? [] : pool.filter(x => !owned[x.p.slug]).map(x => ({ x, g: best([...ownedPool, x]).total - mine.total })).filter(r => r.g > 0.05).sort((a, b) => b.g - a.g).slice(0, 12), [pool, ownedPool, mine, owned]);

  const stat = (list: { p: P; v: number }[]) => {
    const mean = list.reduce((s, x) => s + x.v, 0);
    const sd = Math.sqrt(list.reduce((s, x) => s + (x.p.sd ?? 14) ** 2, 0));
    return { mean, prob: list.length === 5 ? 1 - cdf((T.pts - mean) / sd) : 0 };
  };
  const mineList = mine.idx.map(i => pool.find(x => x.i === i)!).filter(Boolean);
  const freeList = free.idx.map(i => pool.find(x => x.i === i)!).filter(Boolean);
  const sM = stat(mineList), sF = stat(freeList);
  const stars = (l: { p: P }[]) => l.reduce((s, x) => s + x.p.stars, 0);
  const toggle = (slug: string) => setOwned(o => { const n = { ...o }; const c = n[slug]; if (!c) n[slug] = 1; else if (c === 1) n[slug] = 2; else delete n[slug]; return n; });
  const list = useMemo(() => data.filter(p => !q || (p.name + p.team).toLowerCase().includes(q.toLowerCase())).sort((a, b) => val(b) - val(a)), [data, q, metric]); // eslint-disable-line react-hooks/exhaustive-deps

  const box: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,255,255,0.18)', borderRadius: 14, padding: '14px 16px', backdropFilter: 'blur(8px)' };
  const btn = (on: boolean): React.CSSProperties => ({ padding: '6px 12px', borderRadius: 999, border: '1px solid ' + (on ? '#00ffff' : 'rgba(255,255,255,0.2)'), background: on ? 'rgba(0,255,255,0.15)' : 'transparent', color: on ? '#00ffff' : '#ddd', cursor: 'pointer', fontSize: 13 });
  const Team = ({ s, title, sub }: { s: ReturnType<typeof stat>; title: string; sub: string }) => (
    <div style={box}>
      <div style={{ fontWeight: 700, color: '#00ffff' }}>{title}</div>
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>{sub}</div>
      {(title.startsWith('Ma') ? mineList : freeList).map(x => (
        <div key={x.p.slug} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '2px 0' }}>
          <span>{x.p.name} <span style={{ opacity: 0.55 }}>· {x.p.stars}★ · {x.p.team.split(' ').pop()} {x.p.home ? 'vs' : '@'} {x.p.opp.split(' ').pop()}{owned[x.p.slug] ? '' : ' · À ACHETER'}</span></span>
          <b>{x.v.toFixed(0)}</b>
        </div>
      ))}
      <div style={{ marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
        <span>{stars(title.startsWith('Ma') ? mineList : freeList)}/16★ · total</span>
        <b style={{ color: s.mean >= T.pts ? '#4ade80' : '#ffb020' }}>{s.mean.toFixed(0)} / {T.pts} · {Math.round(s.prob * 100)}%</b>
      </div>
    </div>
  );

  return (
    <main style={{ minHeight: '100vh', background: '#07090d', color: '#eee', padding: '20px 16px 60px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', display: 'grid', gap: 14 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>NBA Cup Builder <span style={{ opacity: 0.5, fontSize: 13 }}>· outil perso</span></h1>
        <div style={box}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {nights.map(n => <button key={n} onClick={() => setNight(n)} style={btn(n === night)}>{lab(n)}</button>)}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {TIERS.map(t => <button key={t.n} onClick={() => setTier(t.n)} style={btn(t.n === tier)}>Palier {t.n} · {t.pts} pts · {t.is} IS min</button>)}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 12, opacity: 0.7 }}>Estimation :</span>
            {([['mix', 'Mix (proj 50 / L5 30 / L10 20)'], ['proj', 'Projection Sorare'], ['l5', 'L5'], ['l10', 'L10']] as [Metric, string][]).map(([m, l]) => <button key={m} onClick={() => setMetric(m)} style={btn(m === metric)}>{l}</button>)}
            <label style={{ fontSize: 13, marginLeft: 8 }}><input type="checkbox" checked={noOut} onChange={e => setNoOut(e.target.checked)} /> Exclure blessés</label>
          </div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 8 }}>
            {loading ? 'Chargement…' : err ? 'Erreur : ' + err : `${games} matchs · ${data.length} joueurs · cap 16★ · 5 cartes Limited+ · min ${T.is} carte(s) In-Season. Le palier ${T.n} exige ${T.is} IS : vérifie-le à l'achat (non détectable ici). Statuts blessés : à recouper (Rotowire).`}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 14 }}>
          <Team s={sM} title="Ma meilleure compo" sub={ownedPool.length ? `avec les ${ownedPool.length} cartes marquées « possédée »` : 'marque tes cartes ci-dessous (clic : possédée → In-Season → retirée)'} />
          <Team s={sF} title="Compo idéale (sans contrainte)" sub="meilleure équipe sous le cap, toutes cartes confondues" />
        </div>

        {ownedPool.length > 0 && ownedPool.length < 5 && <div style={{ ...box, fontSize: 13, opacity: 0.8 }}>Marque au moins 5 cartes possédées pour voir quelles cartes acheter (aujourd'hui : {ownedPool.length}).</div>}
        {ownedPool.length >= 5 && (
          <div style={box}>
            <div style={{ fontWeight: 700, color: '#ffd24a', marginBottom: 6 }}>Cartes à acheter (gain de points sur ta meilleure compo)</div>
            {gains.length === 0 && <div style={{ fontSize: 13, opacity: 0.7 }}>Aucun achat n'améliore ta compo sous le cap.</div>}
            {gains.map(({ x, g }) => (
              <div key={x.p.slug} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '2px 0' }}>
                <span>{x.p.name} <span style={{ opacity: 0.55 }}>· {x.p.stars}★ · {x.p.team.split(' ').pop()} {x.p.home ? 'vs' : '@'} {x.p.opp.split(' ').pop()}</span></span>
                <b style={{ color: '#4ade80' }}>+{g.toFixed(1)} pts</b>
              </div>
            ))}
          </div>
        )}

        <div style={box}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un joueur ou une équipe" style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: '#fff', marginBottom: 8 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 44px 52px 52px 52px 52px', gap: 4, fontSize: 11, opacity: 0.55, padding: '0 4px 4px' }}>
            <span>Joueur (clic = possédée)</span><span>★</span><span>Proj</span><span>L5</span><span>L10</span><span>Est.</span>
          </div>
          {list.map(p => {
            const o = owned[p.slug];
            return (
              <div key={p.slug} onClick={() => toggle(p.slug)} style={{ display: 'grid', gridTemplateColumns: '1fr 44px 52px 52px 52px 52px', gap: 4, fontSize: 13, padding: '5px 4px', cursor: 'pointer', borderRadius: 6, background: o ? 'rgba(0,255,255,0.1)' : 'transparent', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <span>{o === 2 ? '🟣 ' : o === 1 ? '✅ ' : ''}{p.name} <span style={{ opacity: 0.5 }}>{p.team.split(' ').pop()} {p.home ? 'vs' : '@'} {p.opp.split(' ').pop()} {p.time}</span>{p.inj ? <span style={{ color: p.inj === 'GTD' ? '#ffb020' : '#ff4d4d' }}> {p.inj}</span> : null}</span>
                <span>{p.stars}</span><span>{p.proj.toFixed(0)}</span><span>{p.l5 == null ? '–' : p.l5.toFixed(0)}</span><span>{p.l10 == null ? '–' : p.l10.toFixed(0)}</span><b>{val(p).toFixed(0)}</b>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
