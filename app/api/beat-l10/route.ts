import { NextRequest, NextResponse } from 'next/server';
import { BEST_APPEARANCE_FRAG, gwRecordOf } from '../../lib/gwRecord';

// Beat L10 : on lit le compteur OFFICIEL de Sorare (card.cardStats.highlightedStats, type BEAT_L10),
// c'est exactement ce qui est affiche au dos de la carte. Sorare gere lui-meme l'echantillon et exclut la presaison.
// On recupere aussi, si disponibles, le nombre de GW (denominateur) et le meilleur score, pour en deduire un pourcentage.
// NB : ce endpoint prend un slug de CARTE (pas de joueur), car cardStats est porte par la carte.
export async function GET(request: NextRequest) {
  const slug = (request.nextUrl.searchParams.get('slug') || '').trim();
  if (!slug) return NextResponse.json({}, { status: 200 });

  const frag = `cardStats{ so5LineupsCount ${BEST_APPEARANCE_FRAG} highlightedStats{ type value } }`;
  const query = `query{ anyCard(slug:"${slug}"){ __typename ...on NBACard{ ${frag} } ...on Card{ ${frag} } } }`;
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
    const cs: any = j?.data?.anyCard?.cardStats;
    if (!cs) return NextResponse.json({}, { status: 200 });
    const hs: any[] = cs.highlightedStats || [];
    const findVal = (re: RegExp) => {
      const x = hs.find((h) => re.test(String(h?.type || '')));
      return x && x.value != null ? Number(x.value) : null;
    };
    const beatL10 = findVal(/BEAT_L10/i);
    // GW = nombre de gameweeks ou la carte a ete alignee (so5LineupsCount) -> denominateur du %
    const gw = (cs.so5LineupsCount != null && Number(cs.so5LineupsCount) > 0) ? Number(cs.so5LineupsCount) : findVal(/GAME_?WEEK|^GW$|PLAYED|APPEARANCE|MATCH/i);
    const highest = gwRecordOf(cs.bestSo5Appearance) != null ? Math.round(gwRecordOf(cs.bestSo5Appearance) as number) : findVal(/HIGHEST/i);
    const pct = (beatL10 != null && gw && gw > 0) ? Math.round((beatL10 / gw) * 100) : null;
    return NextResponse.json({ beatL10, gw, highest, pct, raw: hs.map((h) => ({ type: h?.type, value: h?.value })) });
  } catch (e) {
    return NextResponse.json({}, { status: 200 });
  }
}
