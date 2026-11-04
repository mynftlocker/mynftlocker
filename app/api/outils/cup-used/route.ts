import { NextRequest, NextResponse } from 'next/server';

// Cartes deja alignees dans une compo Sorare de la GW qui contient la nuit demandee (outil perso Cup Builder).
// Utilise le jeton Sorare deja configure cote serveur (SORARE_JWT / SORARE_AUD) : le navigateur ne recoit que des slugs de cartes.
export const maxDuration = 30;
const GQL = 'https://api.sorare.com/graphql';
async function gql(query: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
  const jwt = process.env.SORARE_JWT || '', aud = process.env.SORARE_AUD || '';
  if (jwt && aud) { headers.Authorization = `Bearer ${jwt}`; headers['JWT-AUD'] = aud; }
  const r = await fetch(GQL, { method: 'POST', headers, body: JSON.stringify({ query }), signal: AbortSignal.timeout(20000), cache: 'no-store' });
  return r.json();
}

export async function GET(req: NextRequest) {
  const night = (req.nextUrl.searchParams.get('night') || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) return NextResponse.json({ error: 'night=YYYY-MM-DD requis' }, { status: 400 });
  try {
    // GW qui contient la nuit (les matchs de la nuit d'une date Paris se jouent entre 00:00 et 05:00 UTC ce jour-la)
    const t = new Date(night + 'T02:00:00Z').getTime();
    const fx = await gql('{ so5{ so5Fixtures(first:6, sport:NBA){ nodes{ slug startDate endDate } } } }');
    const f = (fx?.data?.so5?.so5Fixtures?.nodes || []).find((n: any) => new Date(n.startDate).getTime() <= t && t <= new Date(n.endDate).getTime());
    if (!f) return NextResponse.json({ fixture: null, used: {} });
    const used: Record<string, string[]> = {};
    let after = '', pages = 0, n = 0;
    for (;;) {
      if (++pages > 40) break;
      const q = `{ currentUser { cards(first:50${after ? `, after:"${after}"` : ''}, sport:NBA, rarities:[limited, rare, super_rare, unique]) { nodes { slug usedIn { ... on UsedInSo5Lineups { so5Lineups { so5Fixture { slug } so5Leaderboard { slug } } } } } pageInfo { hasNextPage endCursor } } } }`;
      const d = await gql(q);
      const c = d?.data?.currentUser?.cards;
      if (!c) return NextResponse.json({ error: String(d?.errors?.[0]?.message || 'query_failed').slice(0, 300) }, { status: 502 });
      for (const nd of c.nodes) {
        n++;
        for (const l of nd.usedIn?.so5Lineups || []) {
          if (l?.so5Fixture?.slug === f.slug) (used[nd.slug] ||= []).push(String(l?.so5Leaderboard?.slug || '').replace(/^nba-[a-z0-9-]*?-2026-/, ''));
        }
      }
      if (!c.pageInfo.hasNextPage) break;
      after = c.pageInfo.endCursor;
    }
    return NextResponse.json({ fixture: f.slug, cards: n, used });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 502 });
  }
}
