import { NextRequest, NextResponse } from 'next/server';

// Cartes deja alignees dans une compo Sorare (outil perso Cup Builder).
// Utilise le jeton Sorare deja configure cote serveur (SORARE_JWT / SORARE_AUD) : rien n'est renvoye au navigateur sauf les slugs de cartes.
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
  const probe = req.nextUrl.searchParams.get('probe');
  const who = await gql('{ currentUser { slug nickname } }');
  if (probe === 'who') return NextResponse.json({ user: who?.data?.currentUser?.slug ?? null, err: who?.errors?.[0]?.message?.slice(0, 160) ?? null });
  const user = who?.data?.currentUser?.slug ?? null;
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
  const q = `{ currentUser { so5Lineups(first:50, sport:NBA) { nodes { slug so5Fixture { slug } so5Appearances { anyCard { slug } } } } } }`;
  const d = await gql(q);
  if (!d?.data) return NextResponse.json({ error: String(d?.errors?.[0]?.message || 'query_failed').slice(0, 300) }, { status: 502 });
  return NextResponse.json({ user, raw: d.data });
}
