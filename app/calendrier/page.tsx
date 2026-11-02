import type { Metadata } from 'next';
import Calendar from './Calendar';

// Page non indexee tant que le calendrier n'est pas lance (retirer "robots" le 1er decembre).
export const metadata: Metadata = {
  title: 'TTFL × Sorare Arcade — Advent Calendar | myNFTlocker',
  description: 'Every morning in December, the best TTFL score of the NBA night on its free Sorare Arcade card.',
  alternates: { canonical: '/calendrier' },
  robots: { index: false, follow: false },
};

export default function Page() {
  return <Calendar />;
}
