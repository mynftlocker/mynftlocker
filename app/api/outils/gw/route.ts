import { NextRequest, NextResponse } from 'next/server';

// Outil perso « Compos GW » : joueurs d'une Game Week NBA Sorare (projection de la GW, etoiles, blessures, matchs) + images de cartes reelles du marche.
// Donnees 100 % publiques (API Sorare). GET ?fixture=<slug> (defaut : la GW ouverte) ; GET ?pics=slug1,slug2 : une vraie carte du marche par joueur.
export const maxDuration = 30;
const GQL = 'https://api.sorare.com/graphql';
async function gql(query: string) {
  const r = await fetch(GQL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }), signal: AbortSignal.timeout(20000), next: { revalidate: 600 } });
  const j = await r.json();
  if (!j?.data) throw new Error(JSON.stringify(j?.errors || j).slice(0, 300));
  return j.data;
}
const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const pics = (sp.get('pics') || '').split(',').filter(s => /^[a-z0-9-]{3,80}$/.test(s)).slice(0, 12);
    if (pics.length) {
      const out: Record<string, string | null> = {};
      await Promise.all(pics.map(async s => {
        try { const d = await gql(`{ tokens{ liveSingleSaleOffers(sport:NBA first:1 playerSlug:"${s}"){ nodes{ senderSide{ anyCards{ pictureUrl } } } } } }`); out[s] = d.tokens?.liveSingleSaleOffers?.nodes?.[0]?.senderSide?.anyCards?.[0]?.pictureUrl || null; } catch { out[s] = null; }
      }));
      return NextResponse.json({ pics: out });
    }
    const fx = await gql('{ so5{ so5Fixtures(first:6, sport:NBA){ nodes{ slug aasmState startDate endDate gameWeek } } } }');
    const nodes: any[] = fx.so5.so5Fixtures.nodes;
    const want = (sp.get('fixture') || '').trim();
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
    const players = parts.flatMap(p => p.players || []).filter((p: any) => p.gameplayTierStars != null && p.nextClassicFixtureProjectedScore != null && p.nextClassicFixtureProjectedScore > 0).map((p: any) => {
      const sc: number[] = (p.playerGameScores || []).map((x: any) => Number(x.score)).filter((x: number) => !isNaN(x));
      const t = teams[by[p.slug]];
      const inj = (p.injuries || []).find((i: any) => !i.expectedEndDate || new Date(i.expectedEndDate).getTime() > now);
      return { slug: p.slug, name: p.displayName, team: by[p.slug], teamName: t.name, games: t.n, opp: t.opp, stars: p.gameplayTierStars, proj: p.nextClassicFixtureProjectedScore, l10: sc.length ? sc.reduce((a, b) => a + b, 0) / sc.length : null, inj: inj?.status || null, pic: p.squaredPictureUrl || null };
    });
    const first = games.map(g => g.date as string).sort()[0] || fixture.startDate;
    return NextResponse.json({ fixture: { slug: fixture.slug, state: fixture.aasmState, gw: fixture.gameWeek, start: first, end: fixture.endDate, games: games.length }, fixtures: nodes.map(n => ({ slug: n.slug, state: n.aasmState, gw: n.gameWeek })), players });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
