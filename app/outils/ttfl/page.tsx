import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { isOwnerToken } from '../../../lib/owner';
import TtflBoard from './TtflBoard';

// Outil perso (non liste, non indexe, reserve au proprietaire) : estimation du score TTFL de la nuit.
export const metadata: Metadata = {
  title: 'TTFL Board | myNFTlocker',
  robots: { index: false, follow: false },
};

export default async function Page() {
  if (!(await isOwnerToken((await cookies()).get('mnfl_session')?.value))) notFound();
  return <TtflBoard />;
}
