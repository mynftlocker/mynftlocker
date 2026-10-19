import { NextRequest, NextResponse } from 'next/server';

// "Beat L10" = % de matchs JOUES ou le joueur a depasse son score moyen L10.
// Source Sorare : playerGameScores(last:50){score} (renvoyes du plus RECENT au plus ancien) vs averageScore(LAST_TEN_PLAYED_SO5_AVERAGE_SCORE).
// Comparabilite : on fixe une fenetre constante = les WINDOW derniers matchs JOUES (score>0, les 0 = non-joues/DNP exclus).
// On n'affiche pas si moins de MIN matchs joues (echantillon non significatif).
const WINDOW = 25;
const MIN = 15;

export async function GET(request: NextRequest) {
  const slug = (request.nextUrl.searchParams.get('slug') || '').trim();
  if (!slug) return NextResponse.json({}, { status: 200 });

  const frag = `averageScore(type:LAST_TEN_PLAYED_SO5_AVERAGE_SCORE) playerGameScores(last:60){ score }`;
  const query = `query{ players(slugs:["${slug}"]){ ...on Player{ ${frag} } ...on NBAPlayer{ ${frag} } } }`;
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    const jwt = process.env.SORARE_JWT || '';
    const aud = process.env.SORARE_AUD || '';
    if (jwt && aud) { headers['Authorization'] = `Bearer ${jwt}`; headers['JWT-AUD'] = aud; }

    const r = await fetch('https://api.sorare.com/graphql', {
      method: 'POST', headers, body: JSON.stringify({ query }), signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return NextResponse.json({}, { status: 200 });
    const j = await r.json();
    const p: any = j?.data?.players?.[0];
    if (!p) return NextResponse.json({}, { status: 200 });
    const l10 = p.averageScore != null ? Number(p.averageScore) : null;
    // les scores arrivent du plus recent au plus ancien -> on garde l'ordre, on filtre les joues, on prend les WINDOW plus recents
    const played: number[] = (p.playerGameScores || []).map((g: any) => Number(g?.score)).filter((s: number) => s > 0).slice(0, WINDOW);
    if (l10 == null || played.length < MIN) {
      return NextResponse.json({ l10: l10 != null ? Math.round(l10) : null, games: played.length, insufficient: true }, { status: 200 });
    }
    const beat = played.filter((s) => s > l10).length;
    const pct = Math.round((beat / played.length) * 100);
    return NextResponse.json({ pct, beat, games: played.length, l10: Math.round(l10) });
  } catch (e) {
    return NextResponse.json({}, { status: 200 });
  }
}
