import { NextRequest, NextResponse } from 'next/server';

// Probabilite de titularisation foot (donnee Sorare "footballPlayingStatusOdds") pour une liste de joueurs.
// GET /api/starting-odds?slugs=slug1,slug2,...  ->  { odds:{ slug1:{pct,rel}|null }, auth:boolean }
// pct = chance d'etre titulaire en % ; rel = fiabilite Sorare. null = Sorare ne la donne pas (ex. requete non connectee).
export async function GET(request: NextRequest) {
  const slugs = (request.nextUrl.searchParams.get('slugs') || '')
    .split(',').map(s => s.trim().toLowerCase()).filter(s => /^[a-z0-9_-]{2,80}$/.test(s)).slice(0, 25);
  if (!slugs.length) return NextResponse.json({ odds: {}, auth: false });

  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
  const jwt = process.env.SORARE_JWT || '';
  const aud = process.env.SORARE_AUD || '';
  const auth = !!(jwt && aud);
  if (auth) { headers['Authorization'] = `Bearer ${jwt}`; headers['JWT-AUD'] = aud; }
  if (process.env.SORARE_API_KEY) headers['APIKEY'] = process.env.SORARE_API_KEY;

  const body = slugs.map((s, i) =>
    `p${i}:players(slugs:["${s}"]){...on Player{slug nextGame{playerGameScore(playerSlug:"${s}"){anyPlayerGameStats{...on PlayerGameStats{footballPlayingStatusOdds{reliability starterOddsBasisPoints}}}}}}}`
  ).join(' ');
  try {
    const r = await fetch('https://api.sorare.com/graphql', {
      method: 'POST', headers, body: JSON.stringify({ query: `query{${body}}` }), signal: AbortSignal.timeout(9000),
    });
    if (!r.ok) return NextResponse.json({ odds: {}, auth, error: 'http_' + r.status });
    const j = await r.json();
    const odds: Record<string, { pct: number; rel: string | null } | null> = {};
    slugs.forEach((s, i) => {
      const o = j?.data?.['p' + i]?.[0]?.nextGame?.playerGameScore?.anyPlayerGameStats?.footballPlayingStatusOdds;
      odds[s] = o && o.starterOddsBasisPoints != null ? { pct: Math.round(Number(o.starterOddsBasisPoints)) / 100, rel: o.reliability ?? null } : null;
    });
    const res = NextResponse.json({ odds, auth, err: j?.errors?.[0]?.message || null });
    res.headers.set('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
    return res;
  } catch (e) {
    return NextResponse.json({ odds: {}, auth, error: 'fetch_failed' });
  }
}
