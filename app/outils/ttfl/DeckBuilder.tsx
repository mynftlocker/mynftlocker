'use client';
import { useEffect, useMemo, useState } from 'react';
import { ttflProj } from '../../../lib/ttflEst';

// Deck builder TTFL : choisit un joueur par nuit sur plusieurs jours pour maximiser le total estime, en respectant le verrou de 30 jours
// (un joueur pické est indisponible les 30 jours suivants) et sans reprendre deux fois le meme joueur. Dates = jour americain (comme TTFL).
const LOCK = 30;
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const shift = (day: string, n: number) => { const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const diff = (a: string, b: string) => Math.round((new Date(a + 'T12:00:00Z').getTime() - new Date(b + 'T12:00:00Z').getTime()) / 86400000);
const parisDay = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());
const fmt = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' });

type Pick = { d: string; n: string };
type Picks = { updated: string; history: (Pick & { s: number | null })[]; planned: Pick[] };
type Cand = { name: string; team: string; opp: string; home: boolean; est: number; inj: string | null; src: 'S' | 'L' };
type Night = { us: string; games: number; close: string | null; closeIso: string | null; closed: boolean; cands: Cand[] };
type Hist = Record<string, { d: string; t: number; m: number; tm: string }[]>;
type Sched = Record<string, { first: string | null; games: { h: string; a: string }[] }>;
type Inj = Record<string, { s: 'OUT' | 'DTD'; long: boolean; until?: string | null; kind?: string | null }>;
// Nuits sans projection Sorare : moyenne TTFL des 10 derniers matchs ramenee vers la moyenne des titulaires (test du 05/11 : 10,7 d'erreur contre 10,35 avec la projection)
const farEst = (g: number[]) => (g.length * (g.reduce((s, x) => s + x, 0) / g.length) + 6 * 30) / (g.length + 6);

// Affectation optimale (algorithme hongrois, maximisation) : n lignes (nuits) <= m colonnes (joueurs). Renvoie la colonne choisie par ligne.
function assign(profit: number[][], m: number): number[] {
  const n = profit.length, INF = 1e9;
  const a = (i: number, j: number) => -profit[i - 1][j - 1];
  const u = Array(n + 1).fill(0), v = Array(m + 1).fill(0), p = Array(m + 1).fill(0), way = Array(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i; let j0 = 0; const minv = Array(m + 1).fill(INF), used = Array(m + 1).fill(false);
    do {
      used[j0] = true; const i0 = p[j0]; let delta = INF, j1 = 0;
      for (let j = 1; j <= m; j++) if (!used[j]) {
        const cur = a(i0, j) - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= m; j++) if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta;
      j0 = j1;
    } while (p[j0] !== 0);
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
  }
  const res = Array(n).fill(-1);
  for (let j = 1; j <= m; j++) if (p[j]) res[p[j] - 1] = j - 1;
  return res;
}

export default function DeckBuilder() {
  // Jour americain de la prochaine nuit encore ouvrable : le jour Paris, ou le suivant apres 22 h (les decks ferment avant les matchs de 1 h)
  const defStart = (() => { const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', hour12: false }).format(new Date())); return shift(parisDay(), h >= 22 ? 1 : 0); })();
  const [start, setStart] = useState(defStart);
  const [days, setDays] = useState(7);
  const [keep, setKeep] = useState(false);
  const [picks, setPicks] = useState<Picks | null>(null);
  const [nights, setNights] = useState<Night[] | null>(null);
  const [prog, setProg] = useState('');
  const [err, setErr] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => { fetch('/api/outils/ttfl-picks').then(r => r.json()).then(j => j.ok ? setPicks(j.picks) : setErr('picks indisponibles')).catch(e => setErr(String(e))); }, []);
  useEffect(() => {
    let dead = false; setNights(null); setErr('');
    (async () => {
      const dates = Array.from({ length: days }, (_, i) => shift(start, i));
      const [hj, sj] = await Promise.all([
        fetch('/api/outils/ttfl').then(r => r.json()).catch(() => null),
        fetch('/api/outils/ttfl?sched=' + dates.join(',')).then(r => r.json()).catch(() => null),
      ]);
      const hist: Hist = hj?.hist || {}; const sched: Sched = sj?.sched || {}; const injs: Inj = sj?.inj || {};
      // Une nuit americaine (jour D) = matchs du jour Paris D a partir de midi + matchs du jour Paris D+1 avant midi (les matchs d'apres-midi US tombent le meme jour a Paris).
      const cache: Record<string, any[]> = {};
      const paris = async (day: string) => {
        if (cache[day]) return cache[day];
        for (let t = 0; t < 3; t++) {
          try { const r = await fetch('/api/outils/cup?night=' + day); const j = await r.json(); if (r.ok && !j.error) { cache[day] = j.players || []; return cache[day]; } } catch { /* nouvel essai */ }
          await new Promise(res => setTimeout(res, 1500));
        }
        return [];
      };
      const out: Night[] = [];
      for (let i = 0; i < days; i++) {
        const us = dates[i]; setProg(`Nuit ${i + 1}/${days}…`);
        const sc = sched[us]; const teams = new Set<string>(); const opp: Record<string, { o: string; home: boolean }> = {};
        (sc?.games || []).forEach(g => { teams.add(g.h); teams.add(g.a); opp[g.h] = { o: g.a, home: true }; opp[g.a] = { o: g.h, home: false }; });
        let cands: Cand[] = [];
        if (i <= 6) {
          const [d0, d1] = [await paris(us), await paris(shift(us, 1))];
          if (dead) return;
          const hr = (t: string) => Number(String(t).slice(0, 2));
          const pl = [...d0.filter((p: any) => hr(p.time) >= 12), ...d1.filter((p: any) => hr(p.time) < 12)];
          const seen = new Set<string>();
          cands = pl.filter((p: any) => p.proj >= 5 && !seen.has(p.slug) && seen.add(p.slug)).map((p: any) => ({ name: p.name, team: p.team, opp: p.opp, home: p.home, est: ttflProj(p.proj, null, p.inj, p.home), inj: p.inj, src: 'S' as const }))
            .filter((c: Cand) => !c.inj || c.inj === 'GTD')
            .filter((c: Cand) => { const ij = injs[norm(c.name)]; return !(ij?.s === 'OUT' && ij.until && us < ij.until); });
        }
        if (!cands.length && teams.size) {
          // Pas de projection Sorare pour cette nuit : joueurs dont la derniere equipe joue ce jour-la, estimes depuis leur moyenne TTFL
          for (const [name, g0] of Object.entries(hist)) {
            const g = g0.slice().sort((x, y) => (x.d < y.d ? -1 : 1)); const last = g[g.length - 1];
            if (g.length < 3 || !teams.has(last.tm)) continue;
            const l10 = g.slice(-10).map(x => x.t);
            if (l10.reduce((s, x) => s + x, 0) / l10.length < 22) continue;
            // Blessures (ESPN) : absence longue = exclu ; absence courte = estimation x0,7 ; incertain = x0,88
            const ij = injs[norm(name)];
            if (ij?.until) { if (us < ij.until) continue; } else if (ij?.long) continue;
            const f = ij ? (ij.s === 'OUT' ? (ij.until ? (ij.kind === 'reeval' ? 0.7 : 0.85) : 0.7) : 0.88) : 1;
            cands.push({ name, team: last.tm, opp: opp[last.tm].o, home: opp[last.tm].home, est: farEst(l10) * f, inj: ij ? (ij.s === 'OUT' ? 'OUT?' : 'GTD') : null, src: 'L' });
          }
        }
        const close = sc?.first ? new Date(sc.first).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short', hour: '2-digit', minute: '2-digit' }) : null;
        out.push({ us, games: sc?.games.length ?? Math.round(teams.size / 2), close, closeIso: sc?.first || null, closed: !!sc?.first && new Date(sc.first).getTime() <= Date.now(), cands });
      }
      if (!dead) setNights(out);
    })();
    return () => { dead = true; };
  }, [start, days, tick]);

  const plan = useMemo(() => {
    if (!nights || !picks) return null;
    // Les picks des nuits deja commencees (avant la date de depart) ne changent plus : ils verrouillent toujours le joueur, meme sans "garder mes picks".
    // Nuits deja fermees (premier match commence) : le pick posé ne peut plus changer, il est figé et bloque le joueur 30 jours.
    const closedD = new Set(nights.filter(n => n.closed).map(n => n.us));
    const hist = [...picks.history, ...picks.planned.filter(x => x.d < start || closedD.has(x.d))];
    const planned = keep ? picks.planned.filter(x => x.d >= start && !closedD.has(x.d)) : [];
    const planAll = picks.planned.filter(x => x.d >= start);
    // verrou : un joueur pické le jour P est indisponible aux jours P+1..P+30
    const blocked = (name: string, d: string) => [...hist, ...planned].some(x => norm(x.n) === norm(name) && x.d !== d && diff(d, x.d) > 0 && diff(d, x.d) <= LOCK);
    const lockedBy = (name: string, d: string) => [...hist, ...planned].find(x => norm(x.n) === norm(name) && x.d !== d && diff(d, x.d) > 0 && diff(d, x.d) <= LOCK);
    const open = nights.filter(n => n.cands.length && !n.closed && !(keep && planned.some(p => p.d === n.us)));
    const pool = new Map<string, number>(); // nom -> index colonne
    const cols: string[] = [];
    const avail = open.map(n => n.cands.filter(c => !blocked(c.name, n.us)).sort((a, b) => b.est - a.est).slice(0, 60));
    avail.forEach(list => list.forEach(c => { const k = norm(c.name); if (!pool.has(k)) { pool.set(k, cols.length); cols.push(k); } }));
    let choice: number[] = [];
    if (open.length && cols.length >= open.length) {
      const P = open.map((n, i) => { const row = Array(cols.length).fill(-1000); avail[i].forEach(c => { row[pool.get(norm(c.name))!] = c.est; }); return row; });
      choice = assign(P, cols.length);
    }
    const rows = nights.map(n => {
      const fixedPick = n.closed ? picks.planned.find(p => p.d === n.us) || picks.history.find(p => p.d === n.us) : keep ? planned.find(p => p.d === n.us) : undefined;
      const cur = planAll.find(p => p.d === n.us);
      const find = (name: string) => n.cands.find(c => norm(c.name) === norm(name));
      let pick: Cand | undefined; let fixed = false;
      if (fixedPick) { pick = find(fixedPick.n); fixed = true; }
      else { const oi = open.indexOf(n); if (oi >= 0 && choice[oi] >= 0) { const k = cols[choice[oi]]; pick = avail[oi].find(c => norm(c.name) === k); } }
      const alt = n.closed ? [] : n.cands.filter(c => !blocked(c.name, n.us) && c !== pick).sort((a, b) => b.est - a.est).slice(0, 3);
      const curC = cur ? find(cur.n) : undefined;
      const curLocked = cur ? lockedBy(cur.n, n.us) : undefined;
      return { n, pick, fixed, alt, cur, curC, curLocked };
    });
    const total = rows.reduce((s, r) => s + (r.pick?.est || 0), 0);
    const curTotal = rows.reduce((s, r) => s + (r.curC?.est || 0), 0);
    const curCount = rows.filter(r => r.curC).length;
    const best = rows.reduce((b, r) => (r.pick && (!b || r.pick.est > b.pick!.est) ? r : b), null as (typeof rows)[number] | null);
    const next = rows.find(r => !r.n.closed && r.pick && r.n.closeIso) || null;
    return { rows, total, curTotal, curCount, best, next };
  }, [nights, picks, keep, start]);

  const c = { card: 'rgba(255,255,255,.04)', line: 'rgba(255,255,255,.1)', cy: '#00ffff', gold: '#e5b94e', dim: 'rgba(255,255,255,.55)' };
  const btn: React.CSSProperties = { background: c.card, border: `1px solid ${c.line}`, color: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 14 };
  const upd = picks?.updated ? new Date(picks.updated).toLocaleString('fr-FR') : null;
  return (
    <div>
      <p style={{ color: c.dim, fontSize: 13, margin: '0 0 12px' }}>Un joueur par nuit pour maximiser le total estimé sur la période. Un joueur pické est bloqué 30 jours, et aucun joueur n&apos;est repris deux fois. Une nuit à peu de matchs coûte moins cher si les gros noms sont gardés pour les autres soirs. Dates = jour américain, comme sur TTFL.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <input type="date" value={start} onChange={e => e.target.value && setStart(e.target.value)} style={btn} />
        <select value={days} onChange={e => setDays(Number(e.target.value))} style={btn}>{[3, 5, 7, 10, 14].map(d => <option key={d} value={d}>{d} nuits</option>)}</select>
        <button onClick={() => setTick(t => t + 1)} style={btn}>↻ Recalculer</button>
        <label style={{ fontSize: 13, color: c.dim }}><input type="checkbox" checked={keep} onChange={e => setKeep(e.target.checked)} /> Garder mes picks déjà posés</label>
      </div>
      {plan?.next?.pick && (() => { const ms = new Date(plan.next.n.closeIso!).getTime() - Date.now(); const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000); return (
        <div style={{ ...btn, padding: '12px 16px', marginBottom: 12, borderColor: c.cy }}>
          <div style={{ color: c.dim, fontSize: 12 }}>Prochaine clôture · {fmt(plan.next.n.us)} · dans {h} h {String(m).padStart(2, '0')} ({plan.next.n.close})</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}><span style={{ color: c.cy }}>{plan.next.pick.name}</span> <span style={{ color: c.dim, fontSize: 14, fontWeight: 400 }}>{plan.next.pick.home ? 'vs' : '@'} {plan.next.pick.opp.split(' ').pop()} · {plan.next.pick.est.toFixed(1)} pts estimés{plan.next.cur && plan.next.cur.n !== plan.next.pick.name ? ` · ton pick posé : ${plan.next.cur.n}` : ''}</span></div>
        </div>); })()}
      <div style={{ fontSize: 12, color: picks && Date.now() - new Date(picks.updated).getTime() > 86400000 ? '#ff9f43' : c.dim, marginBottom: 10 }}>{picks && Date.now() - new Date(picks.updated).getTime() > 86400000 ? '⚠ Picks vieux de plus de 24 h : demande à Claude de relire ton historique TTFL. ' : ''}{picks ? `Picks lus sur TTFL : ${picks.history.length} joués, ${picks.planned.length} posés à l'avance${upd ? ' · mis à jour le ' + upd : ''}` : 'Picks…'}</div>
      {err && <div style={{ color: '#ff6b6b', marginBottom: 10 }}>{err}</div>}
      {!nights && !err && <div style={{ color: c.dim }}>{prog || 'Chargement…'}</div>}
      {plan && (
        <>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            <div style={{ ...btn, padding: '10px 14px' }}><div style={{ color: c.dim, fontSize: 12 }}>Total proposé</div><div style={{ color: c.cy, fontSize: 22, fontWeight: 700 }}>{plan.total.toFixed(0)} pts</div></div>
            {plan.curCount > 0 && <div style={{ ...btn, padding: '10px 14px' }}><div style={{ color: c.dim, fontSize: 12 }}>Ton deck posé ({plan.curCount} nuits)</div><div style={{ fontSize: 22, fontWeight: 700 }}>{plan.curTotal.toFixed(0)} pts</div></div>}
            {plan.best?.pick && <div style={{ ...btn, padding: '10px 14px' }}><div style={{ color: c.dim, fontSize: 12 }}>Meilleure nuit pour le ×2 (si dispo)</div><div style={{ color: c.gold, fontSize: 16, fontWeight: 700 }}>{fmt(plan.best.n.us)} · {plan.best.pick.name}</div></div>}
          </div>
          <div style={{ background: c.card, border: `1px solid ${c.line}`, borderRadius: 12, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead><tr style={{ color: c.dim, textAlign: 'left' }}>{['Nuit', 'Matchs', 'Clôture', 'Pick proposé', 'Estim.', 'Ton pick posé', 'Alternatives'].map((h, i) => <th key={h} style={{ padding: '10px 12px', fontWeight: 500, textAlign: i === 4 ? 'right' : 'left' }}>{h}</th>)}</tr></thead>
              <tbody>
                {plan.rows.map(r => (
                  <tr key={r.n.us} style={{ borderTop: `1px solid ${c.line}`, verticalAlign: 'top' }}>
                    <td style={{ padding: '8px 12px' }}>{fmt(r.n.us)}{r.n.closed && <span style={{ color: '#ff6b6b', fontSize: 11 }}> fermée</span>}</td>
                    <td style={{ padding: '8px 12px', color: r.n.games <= 6 ? c.gold : c.dim }}>{r.n.games || '–'}</td>
                    <td style={{ padding: '8px 12px', color: c.dim, whiteSpace: 'nowrap' }}>{r.n.close || '–'}</td>
                    <td style={{ padding: '8px 12px' }}>{r.pick ? <><b>{r.pick.name}</b><span style={{ color: c.dim }}> {r.pick.home ? 'vs' : '@'} {r.pick.opp.split(' ').pop()}</span>{r.pick.inj && <span style={{ color: c.gold, fontSize: 11 }}> {r.pick.inj}</span>}{r.pick.src === 'L' && <span style={{ color: c.dim, fontSize: 11 }}> (moy. TTFL)</span>}{r.fixed && <span style={{ color: c.dim, fontSize: 11 }}> (posé)</span>}</> : <span style={{ color: c.dim }}>{r.n.closed ? 'nuit fermée, pas de pick posé' : r.n.games ? 'aucun joueur dispo' : 'pas de match'}</span>}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: c.cy, fontWeight: 700 }}>{r.pick ? r.pick.est.toFixed(1) : '–'}</td>
                    <td style={{ padding: '8px 12px', color: c.dim }}>{r.cur ? <>{r.cur.n}{r.curC ? ` (${r.curC.est.toFixed(1)})` : ''}{r.curLocked && <span style={{ color: '#ff6b6b' }}> bloqué</span>}</> : '–'}</td>
                    <td style={{ padding: '8px 12px', color: c.dim, fontSize: 13 }}>{r.alt.map(a => `${a.name} ${a.est.toFixed(1)}`).join(' · ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ color: c.dim, fontSize: 12, marginTop: 10 }}>Les nuits marquées « moy. TTFL » n'ont pas encore de projection Sorare : elles reposent sur la moyenne TTFL des 10 derniers matchs et sur le rapport de blessures ESPN du jour (absence longue : exclu ; « OUT? » ou GTD : estimation réduite), donc moins fiables. Tout se recalcule à chaque ouverture : refais le calcul avant chaque clôture (le deck ferme au premier match de la journée NBA). Un joueur absent fait 0 et reste bloqué 30 jours.</p>
        </>
      )}
    </div>
  );
}
