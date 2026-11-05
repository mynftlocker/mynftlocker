import type { Metadata } from 'next';
import TtflPublic from './TtflPublic';

export const metadata: Metadata = {
  title: 'Projections TTFL NBA de la nuit | myNFTlocker',
  description: 'Estimation du score TTFL de chaque joueur NBA pour la nuit : projection, forme récente, présence, blessures et retours.',
  openGraph: { title: 'Projections TTFL NBA de la nuit', description: 'Les meilleurs choix TTFL de la nuit, estimés par myNFTlocker.', url: 'https://mynftlocker.com/ttfl', siteName: 'myNFTlocker' },
};

export default function Page() { return <TtflPublic />; }
