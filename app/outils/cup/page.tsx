import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { isOwnerToken } from '../../../lib/owner';
import CupBuilder from './CupBuilder';

// Outil perso (non liste, non indexe, reserve au proprietaire) : builder NBA Cup avec cartes possedees / a acheter.
export const metadata: Metadata = {
  title: 'Cup Builder | myNFTlocker',
  robots: { index: false, follow: false },
};

export default async function Page() {
  if (!(await isOwnerToken((await cookies()).get('mnfl_session')?.value))) notFound();
  return <CupBuilder />;
}
