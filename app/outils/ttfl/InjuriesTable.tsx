'use client';
import { useEffect, useState } from 'react';

type Row = { name: string; team: string; status: 'OUT' | 'GTD' | 'PROB'; until: string | null; untilKind: 'return' | 'reeval' | null; detail: string; src: string; updated: string };
const SRC: Record<string, string> = { espn: 'ESPN', rotowire: 'Rotowire', underdog: 'Underdog NBA', manual: 'Manuel' };
const fmt = (iso: string) => (iso ? new Date(iso).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '–');

// Tableau des blessures partage (aussi lu par le fil SORARE 2) : statut, date de retour ou de reevaluation, source.
export default function InjuriesTable() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [upd, setUpd] = useState('');
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => { fetch('/api/outils/injuries').then(r => r.json()).then(j => j.ok ? (setRows(j.rows), setUpd(j.updated)) : setErr(j.error || 'indisponible')).catch(e => setErr(String(e))); }, []);
  const dim = 'rgba(255,255,255,.55)', line = 'rgba(255,255,255,.1)';
  const list = (rows || []).filter(r => !q || (r.name + ' ' + r.team).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (a.status === b.status ? (a.until || '9') < (b.until || '9') ? -1 : 1 : a.status === 'OUT' ? -1 : 1));
  return (
    <div>
      <p style={{ color: dim, fontSize: 13, margin: '0 0 10px' }}>Mis à jour : {fmt(upd)} · base ESPN automatique chaque jour, dates de retour / réévaluation issues de Rotowire et Underdog NBA.</p>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Joueur ou équipe" style={{ background: 'rgba(255,255,255,.04)', border: `1px solid ${line}`, color: '#fff', borderRadius: 8, padding: '6px 10px', marginBottom: 10 }} />
      {err && <p style={{ color: '#ff6b6b' }}>{err}</p>}
      {!rows && !err && <p style={{ color: dim }}>Chargement…</p>}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead><tr style={{ color: dim, textAlign: 'left' }}>{['Joueur', 'Équipe', 'Statut', 'Retour / réévaluation', 'Détail', 'Source', 'Maj'].map(h => <th key={h} style={{ padding: '8px 10px', borderBottom: `1px solid ${line}`, fontWeight: 500 }}>{h}</th>)}</tr></thead>
          <tbody>{list.map(r => (
            <tr key={r.name} style={{ borderBottom: `1px solid ${line}` }}>
              <td style={{ padding: '7px 10px' }}><b>{r.name}</b></td>
              <td style={{ padding: '7px 10px', color: dim }}>{r.team}</td>
              <td style={{ padding: '7px 10px', color: r.status === 'OUT' ? '#ff6b6b' : '#e5b94e' }}>{r.status}</td>
              <td style={{ padding: '7px 10px' }}>{r.until ? `${r.until} (${r.untilKind === 'reeval' ? 'réévaluation' : 'retour'})` : '–'}</td>
              <td style={{ padding: '7px 10px', color: dim, fontSize: 12, maxWidth: 360 }}>{r.detail}</td>
              <td style={{ padding: '7px 10px', color: dim }}>{SRC[r.src] || r.src}</td>
              <td style={{ padding: '7px 10px', color: dim }}>{fmt(r.updated)}</td>
            </tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}
