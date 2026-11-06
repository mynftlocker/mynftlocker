import { best, vary, BONUS_IS, MAX_PER_TEAM, type Cand, type GP, type MCard } from './gwLineup';

// Donnees publiques d'une GW NBA Sorare : joueurs (etoiles, projection, blessures, matchs) + vraie carte du marche par joueur.
const GQL = 'https://api.sorare.com/graphql';
async function gql(query: string) {
  const H: Record<string, string> = { 'Content-Type': 'application/json' }; if (process.env.SORARE_API_KEY) H.APIKEY = process.env.SORARE_API_KEY;
  // 1er essai via le cache (10 min). Une reponse d'erreur (limite de debit, complexite) serait aussi mise en cache : on la contourne par un 2e essai SANS cache.
  for (const fresh of [false, true]) {
    const r = await fetch(GQL, { method: 'POST', headers: H, body: JSON.stringify({ query }), signal: AbortSignal.timeout(20000), ...(fresh ? { cache: 'no-store' as const } : { next: { revalidate: 600 } }) });
    const j = await r.json().catch(() => null);
    if (j?.data) return j.data;
    if (fresh) throw new Error(JSON.stringify(j?.errors || j).slice(0, 300));
  }
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
  const F = 'slug displayName ... on NBAPlayer{ age gameplayTierStars nextClassicFixtureProjectedScore squaredPictureUrl injuries{ status expectedEndDate } playerGameScores(last:20){ score scoreStatus } }';
  // Sans cle API, Sorare limite une requete a 500 de complexite : 8 joueurs par requete. Chaque lot est retente ; trop de lots perdus = erreur claire (pas de liste silencieusement incomplete).
  const lots = chunk(Object.keys(by), 8); let lost = 0;
  const parts = await Promise.all(lots.map(async c => { for (let t = 0; t < 3; t++) { try { return await gql(`{ players(slugs:${JSON.stringify(c)}){ ${F} } }`); } catch { await new Promise(r => setTimeout(r, 400 * (t + 1))); } } lost++; return { players: [] as any[] }; }));
  if (lots.length && lost > lots.length * 0.15) throw new Error('Sorare ne repond pas assez : donnees incompletes, reessaie dans un instant');
  // projection Sorare de chaque match (comme sur la fiche joueur) : une requete par match
  const pmap: Record<string, number> = {};
  await Promise.all(games.map(async (g: any) => {
    try { const d = await gql(`{ anyGame(id:"${g.id}"){ ... on GameOfBasketball{ playerGameScores{ projectedScore anyPlayer{ slug } } } } }`); for (const x of d.anyGame?.playerGameScores || []) if (x?.anyPlayer?.slug && x.projectedScore != null) pmap[g.id + '|' + x.anyPlayer.slug] = Number(x.projectedScore); } catch { /* pas de projection match */ }
  }));
  const now = Date.now();
  const players: GP[] = parts.flatMap(p => p.players || []).filter((p: any) => p.gameplayTierStars != null && p.nextClassicFixtureProjectedScore != null && p.nextClassicFixtureProjectedScore > 0).map((p: any) => {
    // L'API renvoie du PLUS RECENT au plus ancien. Forme = 10 derniers matchs JOUES (un match manque ne compte pas comme 0) ; moins de 5 matchs joues = pas de forme.
    const sc: number[] = (p.playerGameScores || []).filter((x: any) => x.scoreStatus !== 'DID_NOT_PLAY' && Number(x.score) > 0).map((x: any) => Number(x.score)).slice(0, 10);
    const t = teams[by[p.slug]];
    const inj = (p.injuries || []).find((i: any) => !i.expectedEndDate || new Date(i.expectedEndDate).getTime() > now);
    return { slug: p.slug, name: p.displayName, team: by[p.slug], teamName: t.name, games: t.n, opp: t.opp.slice().sort((a, b) => (a.d < b.d ? -1 : 1)).map(x => ({ d: x.d, o: x.o, h: x.h, pj: pmap[x.gid + '|' + p.slug] ?? null })), stars: p.gameplayTierStars, proj: p.nextClassicFixtureProjectedScore, l10: sc.length >= 5 ? sc.reduce((a, b) => a + b, 0) / sc.length : null, inj: inj?.status || null, pic: p.squaredPictureUrl || null, age: p.age ?? null, ceil: sc.length >= 5 ? Math.max(...sc) : null, l5: sc.length >= 5 ? sc.slice(0, 5).reduce((a, b) => a + b, 0) / 5 : null };
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
