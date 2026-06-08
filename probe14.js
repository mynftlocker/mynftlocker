// Probe 14 : trouver "Beat L10" (nb de fois ou la carte a battu son L10)
const champs = [
  'beatL10',
  'beatScore',
  'l10Beaten',
  'scoresBeatingL10',
  'so5Appearances',
  'appearances',
  'anyPlayer { ... on NBAPlayer { last10: averageScore(type: LAST_TEN_PLAYED_SO5_AVERAGE_SCORE) } }',
  'gameStats { score }',
  'lastTenGames { score }',
  'so5Scores',
  'currentSo5Score',
  'tenGameScores',
  'last10Scores',
  'playedGames',
  'gamesPlayed',
  'inSeasonScores { score }',
  'anyPlayer { ... on NBAPlayer { latestFinalGameStats { score } } }',
  'anyPlayer { ... on NBAPlayer { playerGameScores(last: 10) { score } } }',
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
    if (data.errors) console.log("[X] " + c.slice(0,48).padEnd(50) + " -> " + data.errors[0].message.slice(0,48));
    else console.log("[OK] " + c.slice(0,48).padEnd(50) + " -> " + JSON.stringify(data.data.anyCard));
  }
}
run();
