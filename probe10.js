// Probe 10 : tester l'acces aux stats (L10, scores, bonus) SANS authentification
const champs = [
  "power",
  "powerBreakdown { gameWeek totalBonus }",
  "averageScore",
  "last10 { score }",
  "last10Average",
  "l10",
  "scoringStats { points }",
  "playerGameScores { score }",
  "anyPlayer { ... on NBAPlayer { lastFiveSo5AverageScore } }",
  "anyPlayer { ... on NBAPlayer { lastFifteenSo5AverageScore } }",
  "anyPlayer { ... on NBAPlayer { lastTenPlayedSo5Average } }",
  "anyPlayer { ... on NBAPlayer { averageScore } }",
  "anyPlayer { ... on NBAPlayer { scores { score } } }",
  "anyPlayer { ... on NBAPlayer { gameScores { score } } }",
  "xpLevel",
  "bonus",
  "seasonBonus",
];

async function run() {
  const userQ = `query { user(slug: "memejacquet1998-gmail-com") { cards(first: 5) { nodes { slug } } } }`;
  const r = await fetch('https://api.sorare.com/federation/graphql', {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({query:userQ})
  });
  const d = await r.json();
  const slug = d?.data?.user?.cards?.nodes?.find(c => /\d{8}/.test(c.slug))?.slug;
  console.log("Carte test:", slug + "\n");

  for (const c of champs) {
    const q = `query { anyCard(slug: "${slug}") { ... on NBACard { ${c} } } }`;
    const res = await fetch('https://api.sorare.com/federation/graphql', {
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({query:q})
    });
    const data = await res.json();
    if (data.errors) console.log("[X] " + c.slice(0,45).padEnd(47) + " -> " + data.errors[0].message.slice(0,55));
    else console.log("[OK] " + c.slice(0,45).padEnd(47) + " -> " + JSON.stringify(data.data.anyCard));
  }
}
run();
