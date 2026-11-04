import { NextRequest, NextResponse } from 'next/server';

// Outil perso NBA Cup : liste les joueurs des matchs d'une nuit (date Europe/Paris du coup d'envoi)
// avec etoiles, projection Sorare, scores recents. Donnees 100% publiques (API Sorare), rien de prive.
export const revalidate = 600;
export const maxDuration = 30;

const GQL = 'https://api.sorare.com/graphql';
async function gql(query: string) {
  const r = await fetch(GQL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }), signal: AbortSignal.timeout(20000), next: { revalidate: 600 },
  });
  const j = await r.json();
  if (!j?.data) throw new Error(JSON.stringify(j?.errors || j).slice(0, 300));
  return j.data;
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
      const d = await gql(`{ team(slug:"${s}"){ ... on Club{ activePlayers(first:30){ nodes{ slug } } } } }`);
      (d.team?.activePlayers?.nodes || []).forEach((n: any) => { bySlug[n.slug] = s; });
    }));

    // 3) Details joueurs
    const F = 'slug displayName ... on NBAPlayer{ gameplayTierStars nextClassicFixtureProjectedScore injuries{ status expectedEndDate } playerGameScores(last:10){ score } }';
    const parts = await Promise.all(chunk(Object.keys(bySlug), 12).map((c) => gql(`{ players(slugs:${JSON.stringify(c)}){ ${F} } }`)));
    const now = Date.now();
    const players = parts.flatMap((p) => p.players || []).map((p: any) => {
      const sc: number[] = (p.playerGameScores || []).map((x: any) => Number(x.score)).filter((x: number) => !isNaN(x));
      const avg = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
      const l5 = sc.slice(0, 5), l10 = sc.slice(0, 10);
      const m = avg(l10);
      const sd = m == null || l10.length < 3 ? null : Math.sqrt(l10.reduce((s, x) => s + (x - m) ** 2, 0) / l10.length);
      const inj = (p.injuries || []).find((i: any) => !i.expectedEndDate || new Date(i.expectedEndDate).getTime() > now);
      const t = teams[bySlug[p.slug]];
      return {
        slug: p.slug, name: p.displayName, team: t.name, opp: t.opp, home: t.home, time: t.time,
        stars: p.gameplayTierStars, proj: p.nextClassicFixtureProjectedScore,
        l5: avg(l5), l10: m, sd, max: sc.length ? Math.max(...sc) : null, n: l10.length, inj: inj?.status || null,
      };
    }).filter((p: any) => p.stars != null && p.proj != null);
    // Projection Sorare du MATCH de cette nuit (fiche joueur : anyFutureGames -> playerGameScore.projectedScore), a la place de la projection GW
    // File d'attente limitee (8 requetes a la fois, 1 nouvel essai) pour ne pas surcharger l'API Sorare ; joueurs sans projection utile ignores.
    const todo = players.filter((pl: any) => pl.proj >= 10);
    let next = 0;
    const worker = async () => {
      while (next < todo.length) {
        const pl: any = todo[next++];
        for (let k = 0; k < 2; k++) {
          try {
            const d = await gql(`{ anyPlayer(slug:"${pl.slug}"){ ... on NBAPlayer{ anyFutureGames(first:6){ nodes{ ... on GameOfBasketball{ date playerGameScore(playerSlug:"${pl.slug}"){ projectedScore } } } } } } }`);
            const g = (d.anyPlayer?.anyFutureGames?.nodes || []).find((x: any) => berlinDay(x.date) === night);
            const v = g?.playerGameScore?.projectedScore;
            if (v != null && isFinite(Number(v))) { pl.projGw = pl.proj; pl.proj = Number(v); pl.pm = true; }
            break;
          } catch { /* nouvel essai puis on garde la projection GW */ }
        }
      }
    };
    await Promise.all(Array.from({ length: 8 }, worker));
    return NextResponse.json({ night, games: games.length, players });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
