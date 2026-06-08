// Probe 12 : derniers champs manquants (bonus detail, high score, GW)
const champs = [
  'powerBreakdown { totalBonus xpBonus seasonBonus }',
  'powerBreakdown { totalBonus }',
  'powerBreakdown { bonus }',
  'averageScore(type: LAST_TEN_PLAYED_SO5_AVERAGE_SCORE)',
  'anyPlayer { ... on NBAPlayer { averageScore(type: LAST_FIVE_SO5_AVERAGE_SCORE) } }',
  'anyScores { score }',
  'anyPlayer { ... on NBAPlayer { activeClub { name } } }',
  'so5Scores { score }',
  'gameWeekScore',
  'highestScore',
  'maxScore',
  'anyPlayer { ... on NBAPlayer { latestFinalGameStats { score } } }',
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
    if (data.errors) console.log("[X] " + c.slice(0,52).padEnd(54) + " -> " + data.errors[0].message.slice(0,50));
    else console.log("[OK] " + c.slice(0,52).padEnd(54) + " -> " + JSON.stringify(data.data.anyCard));
  }
}
run();
