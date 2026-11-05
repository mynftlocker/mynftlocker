import type { Metadata } from 'next';
import { headers } from 'next/headers';
import PlayerSheet from '../../PlayerSheet';

type Props = { params: Promise<{ slug: string }> };
const nameOf = (slug: string) => slug.startsWith('n-') ? 'Joueur NBA' : slug.replace(/-\d{8}$/, '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params; const n = nameOf(slug);
  const en = /^en/i.test(String((await headers()).get('accept-language') || ''));
  if (en) return { title: `${n}: TTFL profile, scores and projection | myNFTlocker`, description: `Every TTFL score of ${n}: form over 5 and 10 games, opponents, average stats and myNFTlocker projection.` };
  return { title: `${n} : fiche TTFL, scores et projection | myNFTlocker`, description: `Tous les scores TTFL de ${n} : forme sur 5 et 10 matchs, adversaires, stats moyennes et projection myNFTlocker.` };
}
export default async function Page({ params }: Props) { const { slug } = await params; return <PlayerSheet slug={slug} />; }
