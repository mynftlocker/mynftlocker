import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { isOwnerToken } from '../../../lib/owner';
import GwLineups from './GwLineups';

// Outil perso (non liste, non indexe, reserve au proprietaire) : compos de Game Week, ta compo face a la compo ideale du builder.
export const metadata: Metadata = {
  title: 'Compos GW | myNFTlocker',
  robots: { index: false, follow: false },
};

export default async function Page() {
  if (!(await isOwnerToken((await cookies()).get('mnfl_session')?.value))) notFound();
  return <GwLineups />;
}
