// Test champ par champ sur NBACard (introspection desactivee)
const champs = [
  "serialNumber",
  "rarityTyped",
  "seasonYear",
  "inSeasonEligible",
  "collection { name }",
  "collection { slug }",
  "rarity",
  "variant",
  "edition",
  "specialEdition",
  "isSpecialEdition",
  "cardEdition",
  "collectionCard { name }",
  "treatment",
  "level",
  "grade",
  "positions",
  "shirtNumber",
  "cardCollection { name }",
  "season { name }",
  "season { startYear }",
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
    if (data.errors) console.log("[X] " + c.padEnd(28) + " -> " + data.errors[0].message.slice(0,60));
    else console.log("[OK] " + c.padEnd(28) + " -> " + JSON.stringify(data.data.anyCard));
  }
}
run();
