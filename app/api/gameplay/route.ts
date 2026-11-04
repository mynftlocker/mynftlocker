import { NextRequest, NextResponse } from 'next/server';

// Mode Gameplay (liste) : pour une liste de joueurs NBA -> L5, plafond (max 10 matchs), minutes recentes,
// + les matchs de la prochaine GW (adversaires). Donnees 100% publiques de l'API Sorare, rien de prive.
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
const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const avg = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);

export async function GET(req: NextRequest) {
  const slugs = (req.nextUrl.searchParams.get('slugs') || '').split(',').map((s) => s.trim()).filter((s) => /^[a-z0-9-]{3,80}$/.test(s)).slice(0, 60);
  const wantGames = req.nextUrl.searchParams.get('games') === '1';
  try {
    let fixture: any = null; const games: Record<string, { date: string; opp: string; home: boolean }[]> = {};
    if (wantGames) {
      const fx = await gql('{ so5{ so5Fixtures(first:4, sport:NBA){ nodes{ slug gameWeek startDate endDate aasmState } } } }');
      const nodes: any[] = fx.so5.so5Fixtures.nodes;
      fixture = nodes.find((n) => n.aasmState === 'opened') || nodes[0];
      const d = await gql(`{ so5{ so5Fixture(slug:"${fixture.slug}"){ games{ date homeTeam{ ... on TeamInterface{ name } } awayTeam{ ... on TeamInterface{ name } } } } } }`);
      for (const g of d.so5.so5Fixture?.games || []) {
        (games[g.homeTeam.name] ||= []).push({ date: g.date, opp: g.awayTeam.name, home: true });
        (games[g.awayTeam.name] ||= []).push({ date: g.date, opp: g.homeTeam.name, home: false });
      }
      for (const k of Object.keys(games)) games[k].sort((a, b) => a.date.localeCompare(b.date));
    }
    const F = 'slug ... on NBAPlayer{ playerGameScores(last:10){ score anyPlayerGameStats{ ... on PlayerGameStatsBasketball{ minsPlayed } } } }';
    const parts = await Promise.all(chunk(slugs, 6).map((c) => gql(`{ players(slugs:${JSON.stringify(c)}){ ${F} } }`)));
    const players: Record<string, any> = {};
    for (const p of parts.flatMap((x) => x.players || [])) {
      const rows: any[] = p.playerGameScores || []; // du plus recent au plus ancien
      const sc = rows.map((x) => Number(x.score)).filter((x) => !isNaN(x));
      const mn = rows.map((x) => Number(x.anyPlayerGameStats?.minsPlayed)).filter((x) => !isNaN(x));
      players[p.slug] = {
        l5: avg(sc.slice(0, 5)), l10: avg(sc), max: sc.length ? Math.max(...sc) : null,
        min5: avg(mn.slice(0, 5)), min10: avg(mn), n: sc.length,
      };
    }
    return NextResponse.json({ fixture, games, players });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
