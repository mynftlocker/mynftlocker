import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { toolSlug } from '../../../lib/owner';
import GwBuilder from './GwBuilder';

// Outil perso (non liste, non indexe, reserve au proprietaire) : GW Builder, toutes les compos de la Game Week dans l'ordre choisi.
export const metadata: Metadata = {
  title: 'GW Builder | myNFTlocker',
  robots: { index: false, follow: false },
};

export default async function Page() {
  // Page non listee et non indexee, ouverte a qui a le lien : chacun entre son pseudo Sorare (donnees publiques) ; compos memorisees sur son appareil (ou son compte s'il est connecte).
  const slug = await toolSlug((await cookies()).get('mnfl_session')?.value);
  return <GwBuilder defaultSlug={slug || ''} />;
}
