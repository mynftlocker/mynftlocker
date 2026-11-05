import type { Cand } from '../../../lib/gwLineup';
import { TEAMS } from '../../../lib/rotowire';

// Carte « slab » identique a la galerie du site (nom, equipe, etoiles dans l'hexagone, valeur, art Sorare) + bonus, matchs et adversaires.
// Composant sans etat : utilise par les pages (unites cqw) et par l'image de partage (px) via la prop w.
const S_PATH = 'M12 1.6l2.95 7.03 7.6.62-5.78 4.96 1.75 7.42L12 17.7l-6.52 3.93 1.75-7.42L1.45 9.25l7.6-.62z';
const LAY: Record<number, number[][]> = { 1: [[50, 50]], 2: [[34, 50], [66, 50]], 3: [[33, 36], [67, 36], [50, 67]], 4: [[34, 35], [66, 35], [34, 67], [66, 67]], 5: [[32, 33], [68, 33], [32, 69], [68, 69], [50, 51]] };
const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
const ABBR: Record<string, string> = Object.fromEntries(Object.entries(TEAMS).map(([k, v]) => [v, k]));
const abbr = (n: string) => ABBR[n] || n.split(' ').pop()!.slice(0, 3).toUpperCase();
const day = (iso: string) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short' }).format(new Date(iso)).replace('.', '');

export function HexStars({ stars, size }: { stars: number; size: string }) {
  const n = Math.min(5, Math.max(1, Math.ceil(stars))), full = Math.floor(stars);
  const t = Math.max(0, Math.min(1, (stars - 1) / 4));
  const col = `rgb(${lerp(255, 0, t)},${lerp(126, 243, t)},${lerp(52, 235, t)})`;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ width: size, height: size, display: 'flex' }}>
      <defs>
        <linearGradient id="gw-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff6b0" /><stop offset="0.45" stopColor="#f5d76e" /><stop offset="1" stopColor="#c9870f" /></linearGradient>
        <linearGradient id="gw-h" x1="0" y1="0" x2="1" y2="0"><stop offset="0.5" stopColor="#f5d76e" /><stop offset="0.5" stopColor="#ffffff" stopOpacity="0.16" /></linearGradient>
      </defs>
      <polygon points="50,3 92,27 92,73 50,97 8,73 8,27" fill={col} fillOpacity="0.22" stroke={col} strokeWidth="4" strokeOpacity="0.9" />
      {(LAY[n] || []).map((p, i) => {
        const half = i >= full && stars - full >= 0.5 ? i === full : false;
        const off = 13.8;
        return <g key={i} transform={`translate(${p[0] - off},${p[1] - off}) scale(1.15)`}><path d={S_PATH} fill="rgba(255,255,255,0.16)" /><path d={S_PATH} fill={i < full ? 'url(#gw-g)' : half ? 'url(#gw-h)' : 'rgba(255,255,255,0.16)'} /></g>;
      })}
    </svg>
  );
}

// w = largeur en unites : { u: (n) => taille css } ; pages -> n + 'cqw', image -> px
export function Slab({ c, u, art }: { c: Cand; u: (n: number) => string; art: string | null }) {
  const gold = '#f5d76e';
  const name = c.p.name, long = name.length > 15;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', borderRadius: u(7), padding: u(4), background: 'linear-gradient(160deg,#101826,#070a11)', border: `1px solid ${gold}88`, boxShadow: `0 0 ${u(6)} ${gold}33` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: u(2), height: u(15) }}>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', fontSize: u(name.length > 20 ? 4.6 : long ? 5.6 : 7), fontWeight: 800, color: '#fff', lineHeight: 1.05, textTransform: 'uppercase' }}>{name}</div>
            <div style={{ display: 'flex', fontSize: u(4.8), color: '#cfd8e6', marginTop: u(1) }}>{c.p.teamName.split(' ').pop()}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: u(1.6), borderRadius: u(3.5), padding: `${u(1.6)} ${u(2.2)}`, border: '1px solid rgba(120,150,190,0.25)', background: 'rgba(53,230,255,0.08)' }}>
            <HexStars stars={c.p.stars} size={u(12.5)} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ display: 'flex', fontWeight: 800, fontSize: u(8.2), lineHeight: 0.95, color: gold }}>{c.v.toFixed(1)}</div>
              <div style={{ display: 'flex', fontSize: u(3), letterSpacing: '0.1em', color: '#35e6ff', marginTop: u(0.5) }}>PROJ</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', marginTop: u(3.4), borderRadius: u(4.8), overflow: 'hidden', background: '#0b1d26', height: u(148.9) }}>
          {art ? <img src={art} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ display: 'flex' }} />}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: u(2), marginTop: u(2.6) }}>
        {c.pw !== 1 && <div style={{ display: 'flex', fontSize: u(6.2), fontWeight: 700, color: '#35e6ff' }}>{`bonus +${Math.round((c.pw - 1) * 100)} %`}</div>}
        {c.p.inj && <div style={{ display: 'flex', fontSize: u(5), fontWeight: 700, padding: `${u(0.6)} ${u(3)}`, borderRadius: u(10), background: c.p.inj === 'GTD' ? '#ffd914' : '#ff2828', color: c.p.inj === 'GTD' ? '#0e0e0e' : '#fff' }}>{c.p.inj}</div>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: u(1.6), fontSize: u(5.4), color: '#cfd8e6', lineHeight: 1.45 }}>
        <div style={{ display: 'flex', color: '#9ab' }}>{c.p.games} match{c.p.games > 1 ? 's' : ''}</div>
        {c.p.opp.map((g, i) => (
          <div key={i} style={{ display: 'flex' }}>
            <span>{day(g.d)}</span><span style={{ marginLeft: u(1.6) }}>{`${g.h ? '' : '@'}${abbr(g.o)}`}</span>{g.pj != null && <span style={{ marginLeft: u(2), color: '#ffd24a', fontWeight: 700 }}>{Math.round(g.pj)}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
