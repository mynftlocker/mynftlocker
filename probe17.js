const SLUG = 'memejacquet1998-gmail-com';
const ENDPOINT = 'https://api.sorare.com/federation/graphql';

async function test(first) {
  const query = `query {
    user(slug: "${SLUG}") {
      cards(first: ${first}) {
        nodes {
          slug
          ... on NBACard {
            averageScore(type: LAST_TEN_PLAYED_SO5_AVERAGE_SCORE)
            anyPlayer {
              lastName
              shirtNumber
              playerGameScores(last: 10) {
                score
              }
            }
          }
        }
      }
    }
  }`;
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const json = await res.json();
  if (json.errors) {
    console.log(`first:${first} -> ERREUR: ${json.errors[0].message}`);
    return false;
  }
  const nodes = json.data?.user?.cards?.nodes || [];
  const nba = nodes.filter(n => n.anyPlayer);
  if (nba.length === 0) {
    console.log(`first:${first} -> OK mais 0 cartes NBA`);
    return true;
  }
  const sample = nba[0];
  const scores = sample.anyPlayer.playerGameScores?.map(s => s.score) || [];
  console.log(`first:${first} -> OK | ${nba.length} cartes NBA | ${sample.anyPlayer.lastName} | L10avg=${sample.averageScore} | scores=${JSON.stringify(scores)}`);
  return true;
}

(async () => {
  console.log('=== PROBE 17 : playerGameScores ===');
  for (const f of [20, 15, 10]) {
    const ok = await test(f);
    if (ok) { console.log(`=> Utiliser first:${f}`); break; }
  }
})();
