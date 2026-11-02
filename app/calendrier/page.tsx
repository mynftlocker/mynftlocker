import type { Metadata } from 'next';
import Calendar from './Calendar';

// Page non indexee tant que le calendrier n'est pas lance (retirer "robots" le jour du lancement).
// ?day=N : lien de partage d'une case, avec son image de partage (carte, joueur, scores).
// Francais par defaut (communaute TTFL) ; anglais avec ?lang=en (ajoute aux liens partages depuis la version anglaise)
const T = { fr: 'TTFL × Sorare Arcade — Calendrier de l’Avent | myNFTlocker', en: 'TTFL × Sorare Arcade — Advent Calendar | myNFTlocker' };
const D = { fr: 'Chaque matin de décembre, le meilleur score TTFL de la nuit NBA, sur sa carte Sorare Arcade gratuite.', en: 'Every morning in December, the best TTFL score of the NBA night on its free Sorare Arcade card.' };
export async function generateMetadata({ searchParams }: { searchParams: Promise<{ [k: string]: string | string[] | undefined }> }): Promise<Metadata> {
  const sp = await searchParams;
  const raw = Array.isArray(sp.day) ? sp.day[0] : sp.day;
  const day = Math.floor(Number(raw));
  const ok = day >= 1 && day <= 24;
  const lg = (Array.isArray(sp.lang) ? sp.lang[0] : sp.lang) === 'en' ? 'en' : 'fr';
  const q = [ok ? 'day=' + day : '', lg === 'en' ? 'lang=en' : ''].filter(Boolean).join('&');
  const img = 'https://mynftlocker.com/api/calendrier/og' + (q ? '?' + q : '');
  const DESC = D[lg];
  const title = ok ? `${lg === 'en' ? 'Day' : 'Jour'} ${day} — ${T[lg]}` : T[lg];
  return {
    title, description: DESC,
    alternates: { canonical: '/calendrier' },
    robots: { index: false, follow: false },
    openGraph: { title, description: DESC, url: 'https://mynftlocker.com/calendrier' + (q ? '?' + q : ''), images: [{ url: img, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description: DESC, images: [img] },
  };
}

export default function Page() {
  return <Calendar />;
}
