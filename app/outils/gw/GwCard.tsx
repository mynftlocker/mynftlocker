import type { Cand } from '../../../lib/gwLineup';

// Carte Sorare avec la projection imprimee dessus (utilisee par l'outil perso et par la page publique).
export function GwCard({ c }: { c: Cand }) {
  const gold = c.is;
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', aspectRatio: '5 / 7', background: 'radial-gradient(circle at 50% 30%,#12323d,#05090c 75%)', border: `2px solid ${gold ? '#d4af37' : '#19d3e6'}`, boxShadow: `0 6px 22px ${gold ? '#d4af3733' : '#00e5ff22'}` }}>
        {c.pic && <img src={c.pic} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: c.real ? 'cover' : 'contain', objectPosition: 'center top' }} />}
        <div style={{ position: 'absolute', top: 6, right: 6, background: '#000b', color: '#fff', fontSize: 12, fontWeight: 700, borderRadius: 6, padding: '2px 7px' }}>{c.p.stars}★</div>
        {c.p.inj && <div style={{ position: 'absolute', top: 6, left: 6, background: '#d35400', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '2px 6px' }}>{c.p.inj}</div>}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '28px 6px 8px', textAlign: 'center', background: 'linear-gradient(transparent,#000e 55%)' }}>
          <div style={{ fontSize: 'clamp(22px,4vw,32px)', fontWeight: 800, color: '#fff', lineHeight: 1, letterSpacing: -0.5 }}>{c.v.toFixed(1)}</div>
          <div style={{ fontSize: 11, color: '#9fe' , marginTop: 2 }}>{c.pw !== 1 ? `bonus +${Math.round((c.pw - 1) * 100)} %` : 'projection'}</div>
        </div>
      </div>
      <div style={{ marginTop: 6, fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.2, wordBreak: 'break-word' }}>{c.p.name}</div>
      <div style={{ fontSize: 11.5, color: '#9ab' }}>{c.p.teamName.split(' ').pop()} · {c.p.games} match{c.p.games > 1 ? 's' : ''}</div>
    </div>
  );
}

export function GwRow({ set }: { set: Cand[] }) {
  return (
    <>
      <style>{'.gwrow{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}@media(max-width:640px){.gwrow{grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}}'}</style>
      <div className="gwrow">{set.map(c => <GwCard key={c.id} c={c} />)}</div>
    </>
  );
}
