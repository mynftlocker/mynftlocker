import { NextRequest, NextResponse } from 'next/server';

// Outil perso NBA Cup : liste les joueurs des matchs d'une nuit (date Europe/Paris du coup d'envoi)
// avec etoiles, projection Sorare, scores recents. Donnees 100% publiques (API Sorare), rien de prive.
export const revalidate = 600;
export const maxDuration = 30;

const GQL = 'https://api.sorare.com/graphql';
async function gql(query: string) {
  const H: Record<string, string> = { 'Content-Type': 'application/json' }; if (process.env.SORARE_API_KEY) H.APIKEY = process.env.SORARE_API_KEY;
  // 1er essai via le cache (10 min) ; une reponse d'erreur serait aussi mise en cache : on la contourne par un 2e essai sans cache
  for (const fresh of [false, true]) {
    const r = await fetch(GQL, { method: 'POST', headers: H, body: JSON.stringify({ query }), signal: AbortSignal.timeout(20000), ...(fresh ? { cache: 'no-store' as const } : { next: { revalidate: 600 } }) });
    const j = await r.json().catch(() => null);
    if (j?.data) return j.data;
    if (fresh) throw new Error(JSON.stringify(j?.errors || j).slice(0, 300));
  }
}
const berlinDay = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date(iso));
const berlinHour = (iso: string) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

export async function GET(req: NextRequest) {
  const night = (req.nextUrl.searchParams.get('night') || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) return NextResponse.json({ error: 'night=YYYY-MM-DD requis' }, { status: 400 });
  try {
    // 1) Matchs de la nuit : on parcourt les GW NBA recentes/ouvertes
    const fx = await gql('{ so5{ so5Fixtures(first:5, sport:NBA){ nodes{ slug } } } }');
    const slugs: string[] = fx.so5.so5Fixtures.nodes.map((n: any) => n.slug);
    const games: any[] = [];
    const seen = new Set<string>();
    const fxGames = await Promise.all(slugs.map((s) => gql(`{ so5{ so5Fixture(slug:"${s}"){ games{ id date homeTeam{ ... on TeamInterface{ name slug } } awayTeam{ ... on TeamInterface{ name slug } } } } } }`)));
    for (const d of fxGames) {
      for (const g of d.so5.so5Fixture?.games || []) {
        if (seen.has(g.id)) continue; seen.add(g.id);
        if (berlinDay(g.date) === night) games.push(g);
      }
    }
    if (!games.length) return NextResponse.json({ night, games: [], players: [] });

    // 2) Equipes -> joueurs actifs
    const teams: Record<string, { name: string; opp: string; home: boolean; time: string }> = {};
    for (const g of games) {
      const h = g.homeTeam, a = g.awayTeam, t = berlinHour(g.date);
      if (!teams[h.slug]) teams[h.slug] = { name: h.name, opp: a.name, home: true, time: t };
      if (!teams[a.slug]) teams[a.slug] = { name: a.name, opp: h.name, home: false, time: t };
    }
    const tslugs = Object.keys(teams);
    const bySlug: Record<string, string> = {};
    await Promise.all(tslugs.map(async (s) => {
      // un echec ponctuel sur une equipe ne doit pas faire tomber toute la nuit : un 2e essai, puis on continue sans elle
      for (let t = 0; t < 2; t++) {
        try { const d = await gql(`{ team(slug:"${s}"){ ... on Club{ activePlayers(first:30){ nodes{ slug } } } } }`); (d.team?.activePlayers?.nodes || []).forEach((n: any) => { bySlug[n.slug] = s; }); break; } catch { /* nouvel essai */ }
      }
    }));

    // 3) Details joueurs
    const F = 'slug displayName ... on NBAPlayer{ gameplayTierStars nextClassicFixtureProjectedScore injuries{ status expectedEndDate } playerGameScores(last:20){ score scoreStatus } }';
    const parts = await Promise.all(chunk(Object.keys(bySlug), 8).map((c) => gql(`{ players(slugs:${JSON.stringify(c)}){ ${F} } }`).catch(() => gql(`{ players(slugs:${JSON.stringify(c)}){ ${F} } }`).catch(() => ({ players: [] })))));
    const now = Date.now();
    const players = parts.flatMap((p) => p.players || []).map((p: any) => {
      const sc: number[] = (p.playerGameScores || []).filter((x: any) => x.scoreStatus !== 'DID_NOT_PLAY' && Number(x.score) > 0).map((x: any) => Number(x.score)).slice(0, 10);   // recent -> ancien, matchs JOUES seulement
      const avg = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
      const l5 = sc.slice(0, 5), l10 = sc.slice(0, 10);
      const m = avg(l10);
      const sd = m == null || l10.length < 3 ? null : Math.sqrt(l10.reduce((s, x) => s + (x - m) ** 2, 0) / l10.length);
      const inj = (p.injuries || []).find((i: any) => !i.expectedEndDate || new Date(i.expectedEndDate).getTime() > now);
      const t = teams[bySlug[p.slug]];
      return {
        slug: p.slug, name: p.displayName, team: t.name, opp: t.opp, home: t.home, time: t.time,
        stars: p.gameplayTierStars, proj: p.nextClassicFixtureProjectedScore,
        l5: avg(l5), l10: m, sd, max: sc.length ? Math.max(...sc) : null, sc: l10, n: l10.length, inj: inj?.status || null,
      };
    }).filter((p: any) => p.stars != null && p.proj != null);
    // Projection Sorare du MATCH de cette nuit (fiche joueur : anyFutureGames -> playerGameScore.projectedScore), a la place de la projection GW
    // Projection Sorare du MATCH de la nuit (comme sur la fiche joueur) : une seule requete par match (anyGame -> playerGameScores.projectedScore)
    const pmap: Record<string, number> = {}; let nErr = 0; let lastErr = '';
    await Promise.all(games.map(async (g: any) => {
      try {
        const d = await gql(`{ anyGame(id:"${g.id}"){ ... on GameOfBasketball{ playerGameScores{ projectedScore anyPlayer{ slug } } } } }`);
        for (const x of d.anyGame?.playerGameScores || []) if (x?.anyPlayer?.slug && x.projectedScore != null) pmap[x.anyPlayer.slug] = Number(x.projectedScore);
      } catch (e: any) { nErr++; lastErr = String(e?.message || e).slice(0, 160); }
    }));
    for (const pl of players as any[]) { const v = pmap[pl.slug]; if (v != null && isFinite(v)) { pl.projGw = pl.proj; pl.proj = v; pl.pm = true; } }
    return NextResponse.json({ night, games: games.length, players, pmCount: players.filter((p: any) => p.pm).length, pmTodo: games.length, pmErr: nErr, pmLastErr: lastErr });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
