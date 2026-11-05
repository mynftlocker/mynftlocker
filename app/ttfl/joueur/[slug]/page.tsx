import type { Metadata } from 'next';
import PlayerSheet from '../../PlayerSheet';

type Props = { params: Promise<{ slug: string }> };
const nameOf = (slug: string) => slug.replace(/-\d{8}$/, '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params; const n = nameOf(slug);
  return { title: `${n} : fiche TTFL, scores et projection | myNFTlocker`, description: `Tous les scores TTFL de ${n} : forme sur 5 et 10 matchs, adversaires, stats moyennes et projection myNFTlocker.` };
}
export default async function Page({ params }: Props) { const { slug } = await params; return <PlayerSheet slug={slug} />; }
