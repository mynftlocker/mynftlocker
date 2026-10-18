import { NextRequest, NextResponse } from 'next/server';

// Moyenne des 5 dernieres ventes du JOUEUR pour la rarete de la carte affichee,
// avec distinction in-season / classic (via card.inSeasonEligible) pour ne pas fausser la moyenne.
const RARITIES = ['common', 'limited', 'rare', 'super_rare', 'unique'];

export async function GET(request: NextRequest) {
  const slug = (request.nextUrl.searchParams.get('slug') || '').trim();
  const rarity = (request.nextUrl.searchParams.get('rarity') || '').trim().toLowerCase();
  if (!slug || !RARITIES.includes(rarity)) return NextResponse.json({}, { status: 200 });

  // tokenPrices doit etre lu sur un joueur unique -> on passe par anyCard(slug) puis anyPlayer.
  const frag = `tokenPrices(rarity:${rarity},last:50){nodes{date amounts{eurCents} card{inSeasonEligible}}}`;
  const query = `query{anyCard(slug:"${slug}"){anyPlayer{...on NBAPlayer{${frag}} ...on Player{${frag}}}}}`;
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    const jwt = process.env.SORARE_JWT || '';
    const aud = process.env.SORARE_AUD || '';
    if (jwt && aud) { headers['Authorization'] = `Bearer ${jwt}`; headers['JWT-AUD'] = aud; }

    const r = await fetch('https://api.sorare.com/graphql', {
      method: 'POST', headers, body: JSON.stringify({ query }), signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return NextResponse.json({}, { status: 200 });
    const j = await r.json();
    const nodes: any[] = j?.data?.anyCard?.anyPlayer?.tokenPrices?.nodes || [];

    // tokenPrices est ordonne du plus ancien au plus recent -> on retrie desc et on prend les 5 plus recents de chaque groupe.
    const grp = (isIn: boolean) => {
      const g = nodes
        .filter((n) => !!n?.card?.inSeasonEligible === isIn && n?.amounts?.eurCents > 0)
        .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
        .slice(0, 5);
      if (!g.length) return null;
      const avg = Math.round(g.reduce((s, n) => s + n.amounts.eurCents, 0) / g.length) / 100;
      return { avg, count: g.length };
    };
    return NextResponse.json({ inSeason: grp(true), classic: grp(false), rarity });
  } catch (e) {
    return NextResponse.json({}, { status: 200 });
  }
}
