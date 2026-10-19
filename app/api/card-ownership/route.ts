import { NextRequest, NextResponse } from 'next/server';

// Prix d'achat + dernier detenteur d'une carte, via l'historique de propriete Sorare (ownershipHistory).
// Chaque entree = un detenteur : user{nickname}, from (date de debut de possession), amounts{eurCents} (prix paye), transferType.
// Detenteur actuel = entree la plus recente ; dernier detenteur = entree precedente (si la carte a ete revendue).
const TT: Record<string, string> = {
  ENGLISH_AUCTION: 'enchère', DUTCH_AUCTION: 'enchère', DIRECT_OFFER: 'offre', SINGLE_BUY_OFFER: 'achat',
  DIRECT_PURCHASE: 'achat', INSTANT_BUY: 'achat direct', REFERRAL_REWARD: 'parrainage', REWARD: 'récompense',
  DEPOSIT: 'dépôt', WITHDRAWAL: 'retrait', MINT: 'mint',
};

export async function GET(request: NextRequest) {
  const slug = (request.nextUrl.searchParams.get('slug') || '').trim();
  if (!slug) return NextResponse.json({}, { status: 200 });

  const frag = `ownershipHistory{ user{ nickname } from amounts{ eurCents } transferType }`;
  const query = `query{ anyCard(slug:"${slug}"){ __typename ...on NBACard{ ${frag} } ...on Card{ ${frag} } } }`;
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
    const hist: any[] = j?.data?.anyCard?.ownershipHistory || [];
    if (!hist.length) return NextResponse.json({}, { status: 200 });

    // tri par date decroissante -> [0] = detenteur actuel, [1] = detenteur precedent
    const sorted = [...hist].sort((a, b) => String(b.from || '').localeCompare(String(a.from || '')));
    const cur = sorted[0];
    const prev = sorted[1];
    const price = cur?.amounts?.eurCents != null ? Math.round(cur.amounts.eurCents) / 100 : null;
    const tt = String(cur?.transferType || '');
    return NextResponse.json({
      price,
      date: cur?.from || null,
      type: TT[tt] || tt.toLowerCase().replace(/_/g, ' ') || null,
      owner: cur?.user?.nickname || null,
      lastHolder: prev?.user?.nickname || null,
      count: hist.length,
    });
  } catch (e) {
    return NextResponse.json({}, { status: 200 });
  }
}
