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

  const one = async (s: string) => {
    const query = `query{players(slugs:["${s}"]){...on Player{slug nextGame{playerGameScore(playerSlug:"${s}"){anyPlayerGameStats{...on PlayerGameStats{footballPlayingStatusOdds{reliability starterOddsBasisPoints}}}}}}}}`;
    try {
      const r = await fetch('https://api.sorare.com/graphql', {
        method: 'POST', headers, body: JSON.stringify({ query }), signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) return { s, o: null, err: 'http_' + r.status };
      const j = await r.json();
      const o = j?.data?.players?.[0]?.nextGame?.playerGameScore?.anyPlayerGameStats?.footballPlayingStatusOdds;
      return { s, o: o && o.starterOddsBasisPoints != null ? { pct: Math.round(Number(o.starterOddsBasisPoints)) / 100, rel: o.reliability ?? null } : null, err: j?.errors?.[0]?.message || null };
    } catch (e) { return { s, o: null, err: 'fetch_failed' }; }
  };
  // Sorare refuse plusieurs fois le meme champ racine dans une requete : une requete par joueur, en parallele.
  const rs = await Promise.all(slugs.map(one));
  const odds: Record<string, { pct: number; rel: string | null } | null> = {};
  rs.forEach(x => { odds[x.s] = x.o; });
  const res = NextResponse.json({ odds, auth, err: rs.find(x => x.err)?.err || null });
  res.headers.set('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
  return res;
}
