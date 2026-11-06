import { NextRequest, NextResponse } from 'next/server';
import { ownerOnly } from '../../../../lib/owner';

// Marche Sorare NBA : carte la moins chere en vente (euros) par joueur, en version In-Season et en version Classic, pour une rarete donnee.
// GET ?slugs=a,b,c&rar=limited  ->  { offers: { slug: { is?: Offer, cl?: Offer } } }. Reserve au proprietaire (cle API Sorare).
export const maxDuration = 30;
type Offer = { eur: number; pic: string | null; year: number; power: number; card: string };
const q = (slug: string, n: number) => `{ tokens{ liveSingleSaleOffers(sport:NBA, first:${n}, playerSlug:${JSON.stringify(slug)}){ nodes{ receiverSide{ amounts{ eurCents } } senderSide{ anyCards{ slug rarityTyped inSeasonEligible seasonYear pictureUrl ... on NBACard{ power } } } } } } }`;
export async function GET(req: NextRequest) {
  const deny = await ownerOnly(req); if (deny) return deny;
  const sp = req.nextUrl.searchParams;
  const slugs = (sp.get('slugs') || '').split(',').filter(s => /^[a-z0-9-]{3,80}$/.test(s)).slice(0, 20);
  const rar = ['limited', 'rare', 'super_rare', 'unique'].includes(sp.get('rar') || '') ? sp.get('rar')! : 'limited';
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const key = !!process.env.SORARE_API_KEY; if (key) h['APIKEY'] = process.env.SORARE_API_KEY!;
  const offers: Record<string, { is?: Offer; cl?: Offer }> = {};
  await Promise.all(slugs.map(async s => {
    offers[s] = {};
    try {
      const r = await fetch('https://api.sorare.com/graphql', { method: 'POST', headers: h, body: JSON.stringify({ query: q(s, key ? 100 : 15) }), signal: AbortSignal.timeout(15000), next: { revalidate: 300 } });
      const j = await r.json();
      for (const n of j?.data?.tokens?.liveSingleSaleOffers?.nodes || []) {
        const c = n.senderSide?.anyCards?.[0]; const cents = n.receiverSide?.amounts?.eurCents;
        if (!c || cents == null || String(c.rarityTyped).toLowerCase() !== rar) continue;
        const o: Offer = { eur: cents / 100, pic: c.pictureUrl || null, year: Number(c.seasonYear) || 0, power: Number(c.power) || 1, card: c.slug };
        const k = c.inSeasonEligible ? 'is' : 'cl';
        if (!offers[s][k] || o.eur < offers[s][k]!.eur) offers[s][k] = o;
      }
    } catch { /* pas d'offre lisible */ }
  }));
  return NextResponse.json({ offers, key }, { headers: { 'Cache-Control': 'private, max-age=300' } });
}
