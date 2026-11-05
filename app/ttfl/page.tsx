import type { Metadata } from 'next';
import { headers } from 'next/headers';
import TtflPublic from './TtflPublic';

// Les matchs d'une nuit NBA commencent apres minuit a Paris : des 8 h on annonce la nuit suivante (meme regle que la page).
const nightNow = () => {
  const d = new Date(); const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(d);
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', hour12: false }).format(d));
  if (h < 8) return day; const x = new Date(day + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + 1); return x.toISOString().slice(0, 10);
};

export async function generateMetadata(): Promise<Metadata> {
  const wa = /whatsapp/i.test(String((await headers()).get('user-agent') || '')); // WhatsApp refuse les images > 300 Ko : version legere
  const image = `https://mynftlocker.com/api/og-ttfl?night=${nightNow()}${wa ? '&s=sm' : ''}`;
  const title = 'Projections TTFL NBA de la nuit : best picks | myNFTlocker';
  const description = 'Remplis ton deck de best picks : les projections myNFTlocker du score TTFL de chaque joueur NBA, avec blessures et retours.';
  return {
    title, description,
    openGraph: { title: 'Projections TTFL NBA de la nuit', description: 'Remplis ton deck de best picks TTFL avec les projections myNFTlocker.', url: 'https://mynftlocker.com/ttfl', siteName: 'myNFTlocker', type: 'website', images: [wa ? { url: image, width: 600, height: 315 } : { url: image, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title: 'Projections TTFL NBA de la nuit', description: 'Remplis ton deck de best picks TTFL.', images: [image] },
  };
}

export default function Page() { return <TtflPublic />; }
