// Probe : trouver le champ "equipe" sur les cartes NBA
const tests = [
  {
    nom: "currentTeam sur NBAPlayer",
    query: `query { anyCard(slug: "SLUG_ICI") { ... on NBACard { anyPlayer { ... on NBAPlayer { team { name } } } } } }`
  },
  {
    nom: "currentTeam",
    query: `query { anyCard(slug: "SLUG_ICI") { ... on NBACard { anyPlayer { ... on NBAPlayer { currentTeam { name } } } } } }`
  },
  {
    nom: "activeClub",
    query: `query { anyCard(slug: "SLUG_ICI") { ... on NBACard { anyPlayer { ... on NBAPlayer { activeClub { name } } } } } }`
  },
];

async function run() {
  // 1. recuperer un slug NBA reel
  const userQ = `query { user(slug: "memejacquet1998-gmail-com") { cards(first: 5) { nodes { slug name } } } }`;
  const r = await fetch('https://api.sorare.com/federation/graphql', {
    method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({query: userQ})
  });
  const d = await r.json();
  const nbaCard = d?.data?.user?.cards?.nodes?.find(c => /\d{8}/.test(c.slug));
  if (!nbaCard) { console.log("Aucune carte NBA trouvee"); return; }
  console.log("Carte test:", nbaCard.slug, "(" + nbaCard.name + ")\n");

  for (const t of tests) {
    const q = t.query.replace("SLUG_ICI", nbaCard.slug);
    const res = await fetch('https://api.sorare.com/federation/graphql', {
      method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({query: q})
    });
    const data = await res.json();
    if (data.errors) {
      console.log("[X] " + t.nom + " -> " + data.errors[0].message);
    } else {
      console.log("[OK] " + t.nom + " -> " + JSON.stringify(data.data));
    }
  }
}
run();
