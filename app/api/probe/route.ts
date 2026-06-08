import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const query = `query {
    anyCard(slug: "lebron-james-19841230-2025-limited-877") {
      __typename
      slug
      name
      rarityTyped
      ... on NBACard {
        anyPlayer {
          displayName
          shirtNumber
          firstName
          lastName
        }
      }
    }
  }`;

  const res = await fetch('https://api.sorare.com/federation/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: 200 });
}