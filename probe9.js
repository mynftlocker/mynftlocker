// Probe 9 : valeur de collection (enum) + recensement des specialEdition par rarete
async function run() {
  // 1. Tester collection en enum (sans accolades)
  const userQ = `query { user(slug: "memejacquet1998-gmail-com") { cards(first: 5) { nodes { slug } } } }`;
  const r0 = await fetch('https://api.sorare.com/federation/graphql', {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({query:userQ})
  });
  const d0 = await r0.json();
  const slug = d0?.data?.user?.cards?.nodes?.find(c => /\d{8}/.test(c.slug))?.slug;

  const q1 = `query { anyCard(slug: "${slug}") { ... on NBACard { collection seasonYear specialEdition rarityTyped } } }`;
  const r1 = await fetch('https://api.sorare.com/federation/graphql', {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({query:q1})
  });
  console.log("Exemple complet:", JSON.stringify((await r1.json()).data.anyCard) + "\n");

  // 2. Recenser toutes les combinaisons rarete + specialEdition + collection
  const combos = {};
  let cursor=null, page=0;
  while(page<70){
    const after = cursor?`, after: "${cursor}"`:'';
    const q = `query { user(slug: "memejacquet1998-gmail-com") { cards(first: 50${after}) {
      nodes { slug ... on NBACard { rarityTyped specialEdition collection seasonYear } }
      pageInfo { hasNextPage endCursor } } } }`;
    const res = await fetch('https://api.sorare.com/federation/graphql', {
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({query:q})
    });
    const data = await res.json();
    if(data.errors){console.log("ERR:",JSON.stringify(data.errors));break;}
    const c = data?.data?.user?.cards; if(!c)break;
    for(const n of c.nodes){
      if(!/\d{8}/.test(n.slug))continue;
      const key = n.rarityTyped + " | " + (n.specialEdition||"(none)");
      combos[key] = (combos[key]||0)+1;
    }
    if(!c.pageInfo.hasNextPage)break;
    cursor=c.pageInfo.endCursor; page++;
  }
  console.log("=== RARETE | SPECIAL_EDITION (nombre) ===");
  Object.entries(combos).sort().forEach(([k,v])=>console.log("  "+k+" -> "+v));

  // collections distinctes
  const cols = new Set();
  // (re-scan rapide juste collection)
  console.log("\n(collection enum: voir exemple ci-dessus)");
}
run();
