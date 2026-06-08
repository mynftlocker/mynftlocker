// Probe 5 : extraire la liste exacte des equipes NBA presentes dans la collection
async function run() {
  const teams = new Set();
  let cursor = null, page = 0;
  while (page < 70) {
    const after = cursor ? `, after: "${cursor}"` : '';
    const q = `query { user(slug: "memejacquet1998-gmail-com") { cards(first: 50${after}) {
      nodes { slug ... on NBACard { anyTeam { name } } }
      pageInfo { hasNextPage endCursor } } } }`;
    const r = await fetch('https://api.sorare.com/federation/graphql', {
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({query:q})
    });
    const d = await r.json();
    if (d.errors) { console.log("ERREUR:", JSON.stringify(d.errors)); break; }
    const c = d?.data?.user?.cards;
    if (!c) break;
    for (const n of c.nodes) {
      if (/\d{8}/.test(n.slug) && n.anyTeam?.name) teams.add(n.anyTeam.name);
    }
    if (!c.pageInfo.hasNextPage) break;
    cursor = c.pageInfo.endCursor; page++;
  }
  const sorted = [...teams].sort();
  console.log("Nombre d'equipes:", sorted.length);
  console.log("");
  sorted.forEach(t => console.log(t));
}
run();
