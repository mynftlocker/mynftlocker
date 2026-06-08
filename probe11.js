// Probe 11 : averageScore avec argument type (probablement le L10) + power detail
const champs = [
  'averageScore(type: LAST_TEN_PLAYED_SO5_AVERAGE_SCORE)',
  'averageScore(type: LAST_TEN_SO5_AVERAGE_SCORE)',
  'averageScore(type: LAST_FIFTEEN_SO5_AVERAGE_SCORE)',
  'averageScore(type: LAST_FIVE_SO5_AVERAGE_SCORE)',
  'anyPlayer { ... on NBAPlayer { averageScore(type: LAST_TEN_PLAYED_SO5_AVERAGE_SCORE) } }',
  'anyPlayer { ... on NBAPlayer { averageScore(type: LAST_TEN_SO5_AVERAGE_SCORE) } }',
  'power',
  'powerBreakdown { power xp seasonality }',
  'powerBreakdown',
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
    if (data.errors) console.log("[X] " + c.slice(0,55).padEnd(57) + " -> " + data.errors[0].message.slice(0,50));
    else console.log("[OK] " + c.slice(0,55).padEnd(57) + " -> " + JSON.stringify(data.data.anyCard));
  }
}
run();
