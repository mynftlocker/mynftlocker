// Probe 4 : verifier que anyTeam reflete le maillot de la carte (joueur transfere)
// Cherche dans la collection un joueur ayant 2 cartes avec 2 equipes differentes

async function run() {
  const all = [];
  let cursor = null, page = 0;
  while (page < 60) {
    const after = cursor ? `, after: "${cursor}"` : '';
    const q = `query { user(slug: "memejacquet1998-gmail-com") { cards(first: 50${after}) {
      nodes { slug name ... on NBACard { anyTeam { name } anyPlayer { lastName } } }
      pageInfo { hasNextPage endCursor } } } }`;
    const r = await fetch('https://api.sorare.com/federation/graphql', {
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({query:q})
    });
    const d = await r.json();
    if (d.errors) { console.log("ERREUR:", JSON.stringify(d.errors)); break; }
    const c = d?.data?.user?.cards;
    if (!c) break;
    all.push(...c.nodes.filter(n => /\d{8}/.test(n.slug)));
    if (!c.pageInfo.hasNextPage) break;
    cursor = c.pageInfo.endCursor; page++;
  }
  console.log("Total cartes NBA:", all.length);

  // Regrouper par joueur, detecter ceux avec >1 equipe
  const byPlayer = {};
  for (const c of all) {
    const ln = c.anyPlayer?.lastName || "?";
    const team = c.anyTeam?.name || "?";
    if (!byPlayer[ln]) byPlayer[ln] = new Set();
    byPlayer[ln].add(team);
  }
  console.log("\nJoueurs avec plusieurs equipes (= cartes d'equipes differentes):");
  let found = false;
  for (const [ln, teams] of Object.entries(byPlayer)) {
    if (teams.size > 1) { console.log("  " + ln + " -> " + [...teams].join(", ")); found = true; }
  }
  if (!found) console.log("  (aucun trouve - tous les joueurs ont 1 seule equipe)");
}
run();
