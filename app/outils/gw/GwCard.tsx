import type { Cand } from '../../../lib/gwLineup';
import { Slab } from './Slab';

// Ligne de 5 cartes « slab » (rendu identique a la galerie du site).
export function GwRow({ set }: { set: Cand[] }) {
  return (
    <>
      <style>{'.gwrow{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}.gwcell{container-type:inline-size}@media(max-width:640px){.gwrow{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}}'}</style>
      <div className="gwrow">{set.map(c => <div key={c.id} className="gwcell"><Slab c={c} u={n => `${n}cqw`} art={c.real ? c.pic : null} /></div>)}</div>
    </>
  );
}
