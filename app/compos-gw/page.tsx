import type { Metadata } from 'next';
import Link from 'next/link';
import { getGw, idealLineup } from '../../lib/gwData';
import { CAPS, type Cand } from '../../lib/gwLineup';
import StarBg from '../components/StarBg';
import { GwRow } from '../outils/gw/GwCard';

// Page publique a partager dans les posts : compos idealees de la GW NBA (Champion / Contender) en vraies cartes Sorare avec projection.
export const revalidate = 900;
export const metadata: Metadata = {
  title: 'Compos NBA de la GW | myNFTlocker',
  description: 'Les compos idéales Champion et Contender de la Game Week Sorare NBA, calculées par myNFTlocker à partir des projections.',
  openGraph: { title: 'Compos NBA de la GW | myNFTlocker', description: 'Compos idéales Champion et Contender de la Game Week Sorare NBA.' },
};

export default async function Page() {
  let content: React.ReactNode;
  try {
    const gw = await getGw();
    const lc = await idealLineup(gw.players, CAPS.champ), lk = await idealLineup(gw.players, CAPS.cont);
    const withPic = (s: Cand[]) => s;
    const tot = (s: Cand[]) => s.reduce((t, c) => t + c.v, 0).toFixed(1);
    const when = new Date(gw.fixture.start).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long' });
    const Sec = ({ t, cap, s }: { t: string; cap: number; s: Cand[] }) => (
      <section style={{ border: '1px solid #ffffff1f', borderRadius: 16, padding: 16, background: '#0a1218e6', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, margin: '0 0 12px', color: '#19d3e6' }}>{t} <span style={{ fontSize: 13, color: '#9ab', fontWeight: 400 }}>· {cap}★ max · {tot(s)} pts</span></h2>
        <GwRow set={withPic(s)} />
      </section>
    );
    content = (<>
      <p style={{ color: '#9ab', fontSize: 14, margin: '0 0 18px' }}>GW {gw.fixture.gw} · {gw.fixture.games} matchs · à partir du {when}</p>
      <Sec t="Champion" cap={CAPS.champ} s={lc} />
      <Sec t="Contender" cap={CAPS.cont} s={lk} />
    </>);
  } catch {
    content = <p style={{ color: '#9ab' }}>Les compos de la GW arrivent. Reviens dans quelques minutes.</p>;
  }
  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#030510' }}>
    <StarBg />
    <main style={{ position: 'relative', zIndex: 1, maxWidth: 960, margin: '0 auto', padding: '26px 14px 70px', color: '#fff' }}>
      <h1 style={{ fontSize: 28, margin: '0 0 4px' }}>Compos NBA de la Game Week</h1>
      {content}
      <section style={{ border: '1px solid #d4af3766', borderRadius: 16, padding: 18, background: 'linear-gradient(135deg,#171305,#0d1519)', textAlign: 'center' }}>
        <p style={{ margin: '0 0 12px', fontSize: 15 }}>Projections Sorare, blessures, calendrier : myNFTlocker construit la meilleure compo pour toi.</p>
        <Link href="/" style={{ display: 'inline-block', background: '#19d3e6', color: '#001', fontWeight: 800, padding: '10px 20px', borderRadius: 10, textDecoration: 'none' }}>Découvrir myNFTlocker</Link>
      </section>
      <p style={{ color: '#789', fontSize: 11.5, marginTop: 14 }}>Valeur affichée = projection Sorare de la GW × bonus In-Season de +5 %. Maximum 4 joueurs par équipe, blessés exclus.</p>
    </main>
    </div>
  );
}
