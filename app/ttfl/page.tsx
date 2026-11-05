import type { Metadata } from 'next';
import TtflPublic from './TtflPublic';

export const metadata: Metadata = {
  title: 'Projections TTFL NBA de la nuit : best picks | myNFTlocker',
  description: 'Remplis ton deck de best picks : les projections myNFTlocker du score TTFL de chaque joueur NBA, avec blessures et retours.',
  openGraph: { title: 'Projections TTFL NBA de la nuit', description: 'Remplis ton deck de best picks TTFL avec les projections myNFTlocker.', url: 'https://mynftlocker.com/ttfl', siteName: 'myNFTlocker' },
};

export default function Page() { return <TtflPublic />; }
