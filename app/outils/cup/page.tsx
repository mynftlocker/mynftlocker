import type { Metadata } from 'next';
import CupBuilder from './CupBuilder';

// Outil perso (non liste, non indexe) : builder NBA Cup avec cartes possedees / a acheter.
export const metadata: Metadata = {
  title: 'Cup Builder | myNFTlocker',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <CupBuilder />;
}
