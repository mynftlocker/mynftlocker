import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redis } from '../../../lib/redis';
import Redirect from './Redirect';

// Lien de partage : mynftlocker.com/u/<slug>  (apercu riche dans X / Discord / WhatsApp, puis ouverture de la galerie)
const SITE = 'https://mynftlocker.com';
type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug: raw } = await params;
  const slug = String(raw || '').toLowerCase();
  if (!/^[a-z0-9_-]{1,80}$/.test(slug)) return {};
  let snap: any = null;
  try { const v = await redis.get('share:' + slug); snap = v ? (typeof v === 'string' ? JSON.parse(v) : v) : null; } catch (e) { /* apercu generique */ }
  const name = snap?.m || slug;
  const title = snap ? `${name} · ${snap.t || 'Vestiaire'} — myNFTlocker` : `Vestiaire de ${name} — myNFTlocker`;
  const description = `Le vestiaire Sorare de ${name} : cartes NBA et foot, stats et partage. Ouvre-le sur myNFTlocker.`;
  const ua = String((await headers()).get('user-agent') || '');
  const wa = /whatsapp/i.test(ua); // WhatsApp n'affiche pas les images > 300 Ko : version legere
  const image = `${SITE}/api/og?slug=${encodeURIComponent(slug)}${snap?.ts ? '&v=' + snap.ts : ''}${wa ? '&s=sm' : ''}`; // v = date du dernier partage : une nouvelle version = une nouvelle URL (jamais d'ancienne image en cache)
  return {
    title, description,
    openGraph: { title, description, url: `${SITE}/u/${slug}`, siteName: 'myNFTlocker', type: 'website', images: [wa ? { url: image, width: 600, height: 315 } : { url: image, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function Page({ params }: P) {
  const { slug } = await params;
  return <Redirect slug={String(slug || '').toLowerCase()} />;
}
