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
  const hs = await headers(); const en = /^en/i.test(String(hs.get('accept-language') || '')); // visiteur anglophone : titre et apercu en anglais
  const wa = /whatsapp/i.test(String(hs.get('user-agent') || '')); // WhatsApp refuse les images > 300 Ko : version legere
  const image = `https://mynftlocker.com/api/og-ttfl?night=${nightNow()}${wa ? '&s=sm' : ''}${en ? '&lang=en' : ''}`;
  const title = en ? 'NBA TTFL projections for tonight: best picks | myNFTlocker' : 'Projections TTFL NBA de la nuit : best picks | myNFTlocker';
  const description = en ? 'Fill your TTFL deck with best picks: myNFTlocker projections of every NBA player\'s TTFL score, with injuries and returns.' : 'Remplis ton deck de best picks : les projections myNFTlocker du score TTFL de chaque joueur NBA, avec blessures et retours.';
  return {
    title, description,
    openGraph: { title: en ? 'NBA TTFL projections for tonight' : 'Projections TTFL NBA de la nuit', description: en ? 'Fill your TTFL deck with best picks, using myNFTlocker projections.' : 'Remplis ton deck de best picks TTFL avec les projections myNFTlocker.', url: 'https://mynftlocker.com/ttfl', siteName: 'myNFTlocker', type: 'website', images: [wa ? { url: image, width: 600, height: 315 } : { url: image, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title: en ? 'NBA TTFL projections for tonight' : 'Projections TTFL NBA de la nuit', description: en ? 'Fill your TTFL deck with best picks.' : 'Remplis ton deck de best picks TTFL.', images: [image] },
  };
}

export default function Page() { return <TtflPublic />; }
