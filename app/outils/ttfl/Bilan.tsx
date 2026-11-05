'use client';
import { useEffect, useState } from 'react';

type Per = { night: string; joueurs: number; mae: number; top3: number; moyenneNuit: number };
type Sum = { ok?: boolean; nuits: number; joueurs: number; dnp: number; mae: number | null; biais: number | null; top3Moyen: number | null; moyenneNuit: number | null; per: Per[] };

// Journal de précision : l'estimation faite la veille (snapshot automatique) comparée au vrai score TTFL.
export default function Bilan() {
  const [s, setS] = useState<Sum | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { fetch('/api/outils/ttfl?summary=1').then(r => r.json()).then(j => (j.error ? setErr(j.error) : setS(j))).catch(e => setErr(String(e))); }, []);
  const dim = 'rgba(255,255,255,.55)', line = 'rgba(255,255,255,.1)', card = 'rgba(255,255,255,.04)';
  const Tile = ({ l, v, h }: { l: string; v: string; h?: string }) => (
    <div style={{ background: card, border: `1px solid ${line}`, borderRadius: 10, padding: '10px 14px', minWidth: 130 }}><div style={{ color: dim, fontSize: 12 }}>{l}</div><div style={{ fontSize: 22, fontWeight: 700, color: '#00ffff' }}>{v}</div>{h && <div style={{ color: dim, fontSize: 11 }}>{h}</div>}</div>
  );
  return (
    <div>
      <p style={{ color: dim, fontSize: 13, margin: '0 0 12px' }}>Chaque nuit, l&apos;estimation de chaque joueur est enregistrée avant les matchs, puis comparée au vrai score TTFL. Plus il y a de nuits, plus on peut recaler la formule avec confiance.</p>
      {err && <div style={{ color: '#ff6b6b' }}>{err}</div>}
      {!s && !err && <div style={{ color: dim }}>Chargement…</div>}
      {s && !s.nuits && <div style={{ color: dim }}>Pas encore de nuit terminée dans le journal : le premier bilan apparaît le lendemain de la première nuit enregistrée.</div>}
      {s && s.nuits > 0 && <>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <Tile l="Nuits analysées" v={String(s.nuits)} h={`${s.joueurs} joueurs`} />
          <Tile l="Erreur moyenne" v={s.mae == null ? '–' : s.mae.toFixed(1) + ' pts'} h="écart absolu estimation / réel" />
          <Tile l="Biais" v={s.biais == null ? '–' : (s.biais > 0 ? '+' : '') + s.biais.toFixed(1)} h={s.biais == null ? '' : s.biais > 0 ? 'estimations trop hautes' : 'estimations trop basses'} />
          <Tile l="Top 3 estimé : score réel" v={s.top3Moyen == null ? '–' : s.top3Moyen.toFixed(1)} h={s.moyenneNuit == null ? '' : `moyenne de la nuit ${s.moyenneNuit.toFixed(1)}`} />
          <Tile l="Absents (0)" v={String(s.dnp)} h="joueurs estimés mais non joués" />
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead><tr style={{ color: dim, textAlign: 'left' }}>{['Nuit', 'Joueurs', 'Erreur moy.', 'Top 3 réel', 'Moy. nuit'].map(h => <th key={h} style={{ padding: '8px 10px', fontWeight: 500, borderBottom: `1px solid ${line}` }}>{h}</th>)}</tr></thead>
          <tbody>{s.per.map(p => <tr key={p.night} style={{ borderBottom: `1px solid ${line}` }}><td style={{ padding: '7px 10px' }}>{p.night}</td><td style={{ padding: '7px 10px' }}>{p.joueurs}</td><td style={{ padding: '7px 10px' }}>{p.mae}</td><td style={{ padding: '7px 10px' }}>{p.top3}</td><td style={{ padding: '7px 10px' }}>{p.moyenneNuit}</td></tr>)}</tbody>
        </table>
      </>}
    </div>
  );
}
