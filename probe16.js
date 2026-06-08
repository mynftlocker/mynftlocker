// Probe 16 : trouver le champ XP / experience de la carte
const champs = [
  'xp',
  'experience',
  'cardLevel',
  'levelName',
  'powerBreakdown { xpBonus }',
  'powerBreakdown { seasonBonus }',
  'powerBreakdown { totalXp }',
  'powerBreakdown { xp }',
  'powerBreakdown { level }',
  'powerBreakdown { currentLevel }',
  'powerBreakdown { bonusLog }',
  'xpLevelName',
  'currentXp',
  'totalExperience',
];

async function run() {
  const userQ = `query { user(slug: "memejacquet1998-gmail-com") { cards(first: 30) { nodes { slug ... on NBACard { power } } } } }`;
  const r = await fetch('https://api.sorare.com/federation/graphql', {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({query:userQ})
  });
  const d = await r.json();
  // prendre une carte avec power > 1.000 (qui a de l'xp)
  const node = d?.data?.user?.cards?.nodes?.find(c => /\d{8}/.test(c.slug) && c.power && parseFloat(c.power)>1.0);
  const slug = node?.slug;
  console.log("Carte test:", slug, "(power", node?.power + ")\n");

  for (const c of champs) {
    const q = `query { anyCard(slug: "${slug}") { ... on NBACard { ${c} } } }`;
    const res = await fetch('https://api.sorare.com/federation/graphql', {
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({query:q})
    });
    const data = await res.json();
    if (data.errors) console.log("[X] " + c.padEnd(38) + " -> " + data.errors[0].message.slice(0,48));
    else console.log("[OK] " + c.padEnd(38) + " -> " + JSON.stringify(data.data.anyCard));
  }
}
run();
