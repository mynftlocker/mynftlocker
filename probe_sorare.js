// Lance: node probe_sorare.js
// Depuis ton dossier sorare-gallery (là où tu as Node)
const slug = process.argv[2] || 'memejacquet1998-gmail-com';

const queries = [
  {
    name: '1. Query minimale (juste le slug)',
    q: `{ user(slug:"${slug}") { slug } }`
  },
  {
    name: '2. Cards simples first:5 sans inline fragment',
    q: `{ user(slug:"${slug}") { cards(first:5) { nodes { slug name rarityTyped } pageInfo { hasNextPage endCursor } } } }`
  },
  {
    name: '3. NBACard sans playerGameScores first:5',
    q: `{ user(slug:"${slug}") { cards(first:5) { nodes { slug name rarityTyped pictureUrl ...on NBACard { seasonYear power xp anyTeam{name} anyPlayer{lastName} } } pageInfo{hasNextPage endCursor} } } }`
  },
];

const headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json, */*',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
  'Origin': 'https://sorare.com',
  'Referer': 'https://sorare.com/',
  'JWT-AUD': 'ext-api-2',
};

(async () => {
  for (const {name, q} of queries) {
    console.log(`\n=== ${name} ===`);
    try {
      const r = await fetch('https://api.sorare.com/federation/graphql', {
        method: 'POST', headers, body: JSON.stringify({query: q})
      });
      console.log('HTTP Status:', r.status);
      const text = await r.text();
      try {
        const j = JSON.parse(text);
        if (j.errors) console.log('ERRORS:', JSON.stringify(j.errors, null, 2));
        else console.log('DATA:', JSON.stringify(j.data, null, 2).slice(0, 400));
      } catch { console.log('Raw:', text.slice(0, 300)); }
    } catch(e) { console.log('FETCH ERROR:', e.message); }
  }
})();
