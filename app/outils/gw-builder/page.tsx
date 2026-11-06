import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { toolSlug } from '../../../lib/owner';
import GwBuilder from './GwBuilder';

// Outil perso (non liste, non indexe, reserve au proprietaire) : GW Builder, toutes les compos de la Game Week dans l'ordre choisi.
export const metadata: Metadata = {
  title: 'GW Builder | myNFTlocker',
  robots: { index: false, follow: false },
};

export default async function Page() {
  const slug = await toolSlug((await cookies()).get('mnfl_session')?.value);
  if (!slug) notFound();
  return <GwBuilder defaultSlug={slug} />;
}
