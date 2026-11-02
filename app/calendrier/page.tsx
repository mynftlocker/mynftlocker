import type { Metadata } from 'next';
import Calendar from './Calendar';

// Page non indexee tant que le calendrier n'est pas lance (retirer "robots" le jour du lancement).
// ?day=N : lien de partage d'une case, avec son image de partage (carte, joueur, scores).
const TITLE = 'TTFL × Sorare Arcade — Advent Calendar | myNFTlocker';
const DESC = 'Every morning in December, the best TTFL score of the NBA night on its free Sorare Arcade card.';
export async function generateMetadata({ searchParams }: { searchParams: Promise<{ [k: string]: string | string[] | undefined }> }): Promise<Metadata> {
  const sp = await searchParams;
  const raw = Array.isArray(sp.day) ? sp.day[0] : sp.day;
  const day = Math.floor(Number(raw));
  const ok = day >= 1 && day <= 24;
  const img = 'https://mynftlocker.com/api/calendrier/og' + (ok ? '?day=' + day : '');
  const title = ok ? `Day ${day} — ${TITLE}` : TITLE;
  return {
    title, description: DESC,
    alternates: { canonical: '/calendrier' },
    robots: { index: false, follow: false },
    openGraph: { title, description: DESC, url: 'https://mynftlocker.com/calendrier' + (ok ? '?day=' + day : ''), images: [{ url: img, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description: DESC, images: [img] },
  };
}

export default function Page() {
  return <Calendar />;
}
