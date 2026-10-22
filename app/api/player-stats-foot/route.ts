import { NextRequest, NextResponse } from 'next/server';

// Stats foot = source Sorare (total saison officiel via allTotalStats + appearances).
// On recupere le total par joueur (slug), pas de decoupage par competition cote Sorare.
export async function GET(request: NextRequest) {
  const slug = (request.nextUrl.searchParams.get('slug') || '').trim();
  if (!slug) return NextResponse.json({}, { status: 200 });

  const query = `query{players(slugs:["${slug}"]){slug ...on Player{lastFifteenSo5Appearances allTotalStats{stat value}}}}`;
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    const jwt = process.env.SORARE_JWT || '';
    const aud = process.env.SORARE_AUD || '';
    if (jwt && aud) { headers['Authorization'] = `Bearer ${jwt}`; headers['JWT-AUD'] = aud; }
    if(process.env.SORARE_API_KEY){headers['APIKEY']=process.env.SORARE_API_KEY;}

    const r = await fetch('https://api.sorare.com/graphql', {
      method: 'POST', headers, body: JSON.stringify({ query }), signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return NextResponse.json({}, { status: 200 });
    const j = await r.json();
    const p = j?.data?.players?.[0];
    if (!p) return NextResponse.json({}, { status: 200 });

    const tot: Record<string, number> = Object.fromEntries((p.allTotalStats || []).map((s: any) => [s.stat, s.value]));
    const n = (k: string) => { const v = tot[k]; return v == null ? null : Number(v); };

    const out = {
      goals: n('GOALS'),
      assists: n('GOAL_ASSIST'),
      shots: n('ONTARGET_SCORING_ATT'),
      passes: n('ACCURATE_PASS'),
      matches: p.lastFifteenSo5Appearances ?? null,
      starts: n('GAME_STARTED'),
      cleanSheet: n('CLEAN_SHEET'),
      duelWon: n('DUEL_WON'),
      recov: n('POSS_WON'),
      yellow: n('YELLOW_CARD'),
      red: n('RED_CARD'),
      mins: n('MINS_PLAYED'),
    };
    // Si aucune donnee exploitable, on renvoie vide (affichage "stats non disponibles")
    const hasData = Object.values(out).some((v) => v != null && v !== 0) || (out.matches != null && out.matches > 0);
    if (!hasData) return NextResponse.json({}, { status: 200 });
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json({}, { status: 200 });
  }
}
