// Probe 13 : verifier que la requete complete passe avec first:30 (complexite GraphQL)
async function run() {
  const q = `query { user(slug: "memejacquet1998-gmail-com") { cards(first: 30) {
    nodes {
      slug name rarityTyped pictureUrl
      ... on NBACard {
        seasonYear specialEdition power
        averageScore(type: LAST_TEN_PLAYED_SO5_AVERAGE_SCORE)
        anyTeam { name }
        anyPlayer { lastName shirtNumber }
      }
    }
    pageInfo { hasNextPage endCursor }
  } } }`;
  const t0 = Date.now();
  const r = await fetch('https://api.sorare.com/federation/graphql', {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({query:q})
  });
  const d = await r.json();
  if (d.errors) { console.log("ERREUR:", JSON.stringify(d.errors)); return; }
  const nodes = d.data.user.cards.nodes;
  console.log("OK -", nodes.length, "cartes en", (Date.now()-t0)+"ms");
  console.log("\nExemple NBA:");
  const nba = nodes.find(n=>/\d{8}/.test(n.slug));
  console.log(JSON.stringify(nba,null,2));
}
run();
