import type { GP } from './gwLineup';

// Donnees publiques d'une GW NBA Sorare : joueurs (etoiles, projection, blessures, matchs) + vraie carte du marche par joueur.
const GQL = 'https://api.sorare.com/graphql';
async function gql(query: string) {
  const r = await fetch(GQL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }), signal: AbortSignal.timeout(20000), next: { revalidate: 600 } });
  const j = await r.json();
  if (!j?.data) throw new Error(JSON.stringify(j?.errors || j).slice(0, 300));
  return j.data;
}
const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

// Cartes LIMITED en vente par joueur (une par saison d'edition) : sert a varier les editions dans les compos
export async function marketPics(slugs: string[]): Promise<Record<string, { pic: string; year: number; is: boolean }[]>> {
  const out: Record<string, { pic: string; year: number; is: boolean }[]> = {};
  await Promise.all(slugs.filter(s => /^[a-z0-9-]{3,80}$/.test(s)).slice(0, 20).map(async s => {
    out[s] = [];
    try {
      const d = await gql(`{ tokens{ liveSingleSaleOffers(sport:NBA first:25 playerSlug:"${s}"){ nodes{ senderSide{ anyCards{ pictureUrl rarityTyped seasonYear inSeasonEligible } } } } } }`);
      const seen = new Set<string>();
      const cs = (d.tokens?.liveSingleSaleOffers?.nodes || []).map((n: any) => n.senderSide?.anyCards?.[0]).filter((c: any) => c && c.pictureUrl && String(c.rarityTyped).toLowerCase() === 'limited');
      cs.sort((a: any, b: any) => Number(!!b.inSeasonEligible) - Number(!!a.inSeasonEligible));
      for (const c of cs) { if (seen.has(c.pictureUrl) || out[s].length >= 6) continue; seen.add(c.pictureUrl); out[s].push({ pic: c.pictureUrl, year: Number(c.seasonYear), is: !!c.inSeasonEligible }); }
    } catch { /* pas de carte : photo du joueur */ }
  }));
  return out;
}

export async function getGw(want = '') {
  const fx = await gql('{ so5{ so5Fixtures(first:6, sport:NBA){ nodes{ slug aasmState startDate endDate gameWeek } } } }');
  const nodes: any[] = fx.so5.so5Fixtures.nodes;
  const fixture = (want && nodes.find(n => n.slug === want)) || nodes.filter(n => n.aasmState === 'opened').sort((a, b) => (a.startDate < b.startDate ? -1 : 1))[0] || nodes[0];
  const f = await gql(`{ so5{ so5Fixture(slug:"${fixture.slug}"){ games{ id date homeTeam{ ... on TeamInterface{ name slug } } awayTeam{ ... on TeamInterface{ name slug } } } } } }`);
  const games: any[] = f.so5.so5Fixture?.games || [];
  const teams: Record<string, { name: string; n: number; opp: string[] }> = {};
  for (const g of games) {
    const h = g.homeTeam, a = g.awayTeam;
    (teams[h.slug] ||= { name: h.name, n: 0, opp: [] }).n++; teams[h.slug].opp.push('vs ' + a.name.split(' ').pop());
    (teams[a.slug] ||= { name: a.name, n: 0, opp: [] }).n++; teams[a.slug].opp.push('@ ' + h.name.split(' ').pop());
  }
  const by: Record<string, string> = {};
  await Promise.all(Object.keys(teams).map(async s => {
    for (let t = 0; t < 2; t++) { try { const d = await gql(`{ team(slug:"${s}"){ ... on Club{ activePlayers(first:30){ nodes{ slug } } } } }`); (d.team?.activePlayers?.nodes || []).forEach((n: any) => { by[n.slug] = s; }); break; } catch { /* nouvel essai */ } }
  }));
  const F = 'slug displayName ... on NBAPlayer{ gameplayTierStars nextClassicFixtureProjectedScore squaredPictureUrl injuries{ status expectedEndDate } playerGameScores(last:10){ score } }';
  const parts = await Promise.all(chunk(Object.keys(by), 12).map(c => gql(`{ players(slugs:${JSON.stringify(c)}){ ${F} } }`).catch(() => ({ players: [] }))));
  const now = Date.now();
  const players: GP[] = parts.flatMap(p => p.players || []).filter((p: any) => p.gameplayTierStars != null && p.nextClassicFixtureProjectedScore != null && p.nextClassicFixtureProjectedScore > 0).map((p: any) => {
    const sc: number[] = (p.playerGameScores || []).map((x: any) => Number(x.score)).filter((x: number) => !isNaN(x));
    const t = teams[by[p.slug]];
    const inj = (p.injuries || []).find((i: any) => !i.expectedEndDate || new Date(i.expectedEndDate).getTime() > now);
    return { slug: p.slug, name: p.displayName, team: by[p.slug], teamName: t.name, games: t.n, opp: t.opp, stars: p.gameplayTierStars, proj: p.nextClassicFixtureProjectedScore, l10: sc.length ? sc.reduce((a, b) => a + b, 0) / sc.length : null, inj: inj?.status || null, pic: p.squaredPictureUrl || null };
  });
  const first = games.map(g => g.date as string).sort()[0] || fixture.startDate;
  return { fixture: { slug: fixture.slug, state: fixture.aasmState as string, gw: fixture.gameWeek as number, start: first, end: fixture.endDate as string, games: games.length }, players };
}
