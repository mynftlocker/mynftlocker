import { best, vary, BONUS_IS, MAX_PER_TEAM, type Cand, type GP, type MCard } from './gwLineup';

// Donnees publiques d'une GW NBA Sorare : joueurs (etoiles, projection, blessures, matchs) + vraie carte du marche par joueur.
const GQL = 'https://api.sorare.com/graphql';
async function gql(query: string) {
  const r = await fetch(GQL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }), signal: AbortSignal.timeout(20000), next: { revalidate: 600 } });
  const j = await r.json();
  if (!j?.data) throw new Error(JSON.stringify(j?.errors || j).slice(0, 300));
  return j.data;
}
const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

// Cartes LIMITED In-Season existantes par joueur (toutes les cartes emises, en vente ou non) : sert a l'image des compos du builder
export async function marketPics(slugs: string[]): Promise<Record<string, { pic: string; year: number; is: boolean }[]>> {
  const out: Record<string, { pic: string; year: number; is: boolean }[]> = {};
  await Promise.all(slugs.filter(s => /^[a-z0-9-]{3,80}$/.test(s)).slice(0, 20).map(async s => {
    out[s] = [];
    try {
      let after = '';
      for (let page = 0; page < 3 && !out[s].length; page++) {
        const d = await gql(`{ tokens{ allCards(first:50${after ? `, after:"${after}"` : ''}, sport:NBA, playerSlug:"${s}", rarities:[limited]){ nodes{ pictureUrl seasonYear inSeasonEligible } pageInfo{ hasNextPage endCursor } } } }`);
        const ac = d.tokens?.allCards;
        for (const c of ac?.nodes || []) if (c.pictureUrl && c.inSeasonEligible && out[s].length < 6) out[s].push({ pic: c.pictureUrl, year: Number(c.seasonYear), is: true });
        if (!ac?.pageInfo?.hasNextPage) break;
        after = ac.pageInfo.endCursor;
      }
    } catch { /* pas de carte : joueur ecarte du builder */ }
  }));
  return out;
}

export async function getGw(want = '') {
  const fx = await gql('{ so5{ so5Fixtures(first:6, sport:NBA){ nodes{ slug aasmState startDate endDate gameWeek } } } }');
  const nodes: any[] = fx.so5.so5Fixtures.nodes;
  const fixture = (want && nodes.find(n => n.slug === want)) || nodes.filter(n => n.aasmState === 'opened').sort((a, b) => (a.startDate < b.startDate ? -1 : 1))[0] || nodes[0];
  const f = await gql(`{ so5{ so5Fixture(slug:"${fixture.slug}"){ games{ id date homeTeam{ ... on TeamInterface{ name slug } } awayTeam{ ... on TeamInterface{ name slug } } } } } }`);
  const games: any[] = f.so5.so5Fixture?.games || [];
  const teams: Record<string, { name: string; n: number; opp: { d: string; o: string; h: boolean; gid: string }[] }> = {};
  for (const g of games) {
    const h = g.homeTeam, a = g.awayTeam;
    (teams[h.slug] ||= { name: h.name, n: 0, opp: [] }).n++; teams[h.slug].opp.push({ d: g.date, o: a.name, h: true, gid: g.id });
    (teams[a.slug] ||= { name: a.name, n: 0, opp: [] }).n++; teams[a.slug].opp.push({ d: g.date, o: h.name, h: false, gid: g.id });
  }
  const by: Record<string, string> = {};
  await Promise.all(Object.keys(teams).map(async s => {
    for (let t = 0; t < 2; t++) { try { const d = await gql(`{ team(slug:"${s}"){ ... on Club{ activePlayers(first:30){ nodes{ slug } } } } }`); (d.team?.activePlayers?.nodes || []).forEach((n: any) => { by[n.slug] = s; }); break; } catch { /* nouvel essai */ } }
  }));
  const F = 'slug displayName ... on NBAPlayer{ gameplayTierStars nextClassicFixtureProjectedScore squaredPictureUrl injuries{ status expectedEndDate } playerGameScores(last:10){ score } }';
  const parts = await Promise.all(chunk(Object.keys(by), 12).map(c => gql(`{ players(slugs:${JSON.stringify(c)}){ ${F} } }`).catch(() => ({ players: [] }))));
  // projection Sorare de chaque match (comme sur la fiche joueur) : une requete par match
  const pmap: Record<string, number> = {};
  await Promise.all(games.map(async (g: any) => {
    try { const d = await gql(`{ anyGame(id:"${g.id}"){ ... on GameOfBasketball{ playerGameScores{ projectedScore anyPlayer{ slug } } } } }`); for (const x of d.anyGame?.playerGameScores || []) if (x?.anyPlayer?.slug && x.projectedScore != null) pmap[g.id + '|' + x.anyPlayer.slug] = Number(x.projectedScore); } catch { /* pas de projection match */ }
  }));
  const now = Date.now();
  const players: GP[] = parts.flatMap(p => p.players || []).filter((p: any) => p.gameplayTierStars != null && p.nextClassicFixtureProjectedScore != null && p.nextClassicFixtureProjectedScore > 0).map((p: any) => {
    const sc: number[] = (p.playerGameScores || []).map((x: any) => Number(x.score)).filter((x: number) => !isNaN(x));
    const t = teams[by[p.slug]];
    const inj = (p.injuries || []).find((i: any) => !i.expectedEndDate || new Date(i.expectedEndDate).getTime() > now);
    return { slug: p.slug, name: p.displayName, team: by[p.slug], teamName: t.name, games: t.n, opp: t.opp.slice().sort((a, b) => (a.d < b.d ? -1 : 1)).map(x => ({ d: x.d, o: x.o, h: x.h, pj: pmap[x.gid + '|' + p.slug] ?? null })), stars: p.gameplayTierStars, proj: p.nextClassicFixtureProjectedScore, l10: sc.length ? sc.reduce((a, b) => a + b, 0) / sc.length : null, inj: inj?.status || null, pic: p.squaredPictureUrl || null };
  });
  const first = games.map(g => g.date as string).sort()[0] || fixture.startDate;
  return { fixture: { slug: fixture.slug, state: fixture.aasmState as string, gw: fixture.gameWeek as number, start: first, end: fixture.endDate as string, games: games.length }, players };
}

// Compo ideale du builder : 5 joueurs, cartes In-Season reelles en vente (un joueur sans carte IS en vente est ecarte), +5 % de bonus
export async function idealLineup(players: GP[], capStars: number): Promise<Cand[]> {
  const ok = players.filter(p => !(p.inj && p.inj !== 'GTD') && p.games > 0);
  const pics: Record<string, MCard[]> = {}; const banned = new Set<string>();
  for (let it = 0; it < 8; it++) {
    const set = best(ok.filter(p => !banned.has(p.slug)).map(p => ({ id: p.slug, p, v: p.proj * BONUS_IS * (p.inj === 'GTD' ? 0.88 : 1), cost: Math.round(p.stars * 2), pw: BONUS_IS, is: true, pic: p.pic, real: false })), capStars * 2, MAX_PER_TEAM);
    const need = set.map(c => c.p.slug).filter(s => !pics[s]);
    if (need.length) Object.assign(pics, await marketPics(need));
    const bad = set.filter(c => !pics[c.p.slug]?.some(x => x.is));
    if (!bad.length) return vary(set, pics);
    bad.forEach(c => banned.add(c.p.slug));
  }
  return [];
}
