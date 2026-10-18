import { NextRequest, NextResponse } from 'next/server';

// Moyenne des 5 dernieres VENTES (payantes) de la carte en question, via l'historique de propriete Sorare.
export async function GET(request: NextRequest) {
  const slug = (request.nextUrl.searchParams.get('slug') || '').trim();
  if (!slug) return NextResponse.json({}, { status: 200 });

  const query = `query{anyCards(slugs:["${slug}"]){ownershipHistory{settleAt transferType amounts{eurCents}}}}`;
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
    const hist: any[] = j?.data?.anyCards?.[0]?.ownershipHistory || [];
    // On ne garde que les transferts payants (une vente a un prix > 0), on prend les 5 plus recents.
    const sales = hist
      .filter((h) => h?.amounts?.eurCents && h.amounts.eurCents > 0)
      .sort((a, b) => String(b.settleAt || '').localeCompare(String(a.settleAt || '')))
      .slice(0, 5);
    if (!sales.length) return NextResponse.json({ count: 0 });
    const avgCents = Math.round(sales.reduce((s, h) => s + h.amounts.eurCents, 0) / sales.length);
    const lastCents = sales[0].amounts.eurCents;
    return NextResponse.json({ avg: avgCents / 100, last: lastCents / 100, count: sales.length });
  } catch (e) {
    return NextResponse.json({}, { status: 200 });
  }
}
