import { NextRequest, NextResponse } from 'next/server';
import { ownerOnly } from '../../../../lib/owner';

// Historique de tes compos Sorare NBA (score reel + rang + score de chaque joueur), pour calibrer l'outil Cup. Jeton serveur, lecture seule.
export const maxDuration = 60;
const GQL = 'https://api.sorare.com/graphql';
async function gql(query: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
  const jwt = process.env.SORARE_JWT || '', aud = process.env.SORARE_AUD || '';
  if (jwt && aud) { headers.Authorization = `Bearer ${jwt}`; headers['JWT-AUD'] = aud; }
  const r = await fetch(GQL, { method: 'POST', headers, body: JSON.stringify({ query }), signal: AbortSignal.timeout(25000), cache: 'no-store' });
  return r.json();
}

export async function GET(req: NextRequest) {
  const deny = await ownerOnly(req); if (deny) return deny;
  try {
    const out = new Map<string, any>();
    let after = '', pages = 0;
    for (;;) {
      if (++pages > 60) break;
      const q = `{ currentUser { cards(first:50${after ? `, after:"${after}"` : ''}, sport:NBA, rarities:[limited, rare, super_rare, unique]) { nodes { slug usedIn { ... on UsedInSo5Lineups { so5Lineups { id so5Fixture { slug gameWeek } so5Leaderboard { slug } so5Rankings { score ranking } so5Appearances { score anyPlayer { slug } } } } } } pageInfo { hasNextPage endCursor } } } }`;
      const d = await gql(q);
      const c = d?.data?.currentUser?.cards;
      if (!c) return NextResponse.json({ error: String(d?.errors?.[0]?.message || 'query_failed').slice(0, 300) }, { status: 502 });
      for (const nd of c.nodes) for (const l of nd.usedIn?.so5Lineups || []) {
        if (!l?.id || out.has(l.id)) continue;
        out.set(l.id, { gw: l.so5Fixture?.gameWeek, fx: l.so5Fixture?.slug, lb: String(l.so5Leaderboard?.slug || '').replace(/^nba-[a-z0-9-]*?-2026-/, ''), score: l.so5Rankings?.[0]?.score ?? null, rank: l.so5Rankings?.[0]?.ranking ?? null, pl: (l.so5Appearances || []).map((a: any) => [a.anyPlayer?.slug, a.score]) });
      }
      if (!c.pageInfo.hasNextPage) break;
      after = c.pageInfo.endCursor;
    }
    return NextResponse.json({ lineups: [...out.values()].sort((a, b) => (b.gw || 0) - (a.gw || 0)) });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 502 });
  }
}
