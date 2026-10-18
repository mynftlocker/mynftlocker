import { NextRequest, NextResponse } from 'next/server';

// Stats NBA = source Sorare (moyennes sur la fenetre recente ~10 matchs, alignee avec le L10).
// allAverageStats = moyennes par match ; allTotalStats = totaux (pour DD/TD comptes + deduire les matchs joues).
export async function GET(request: NextRequest) {
  const slug = (request.nextUrl.searchParams.get('slug') || '').trim();
  if (!slug) return NextResponse.json({}, { status: 200 });

  const query = `query{players(slugs:["${slug}"]){slug ...on NBAPlayer{allAverageStats{stat value} allTotalStats{stat value}}}}`;
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
    const p = j?.data?.players?.[0];
    if (!p) return NextResponse.json({}, { status: 200 });

    const a: Record<string, number> = Object.fromEntries((p.allAverageStats || []).map((s: any) => [s.stat, s.value]));
    const t: Record<string, number> = Object.fromEntries((p.allTotalStats || []).map((s: any) => [s.stat, s.value]));
    const av = (k: string) => (a[k] == null ? null : Number(a[k]));
    const to = (k: string) => (t[k] == null ? null : Number(t[k]));
    // Matchs joues deduits : total minutes / moyenne minutes
    const gp = a.MINS_PLAYED ? Math.round(Number(t.MINS_PLAYED) / Number(a.MINS_PLAYED)) : null;

    const out = {
      pts: av('POINTS'),
      reb: av('REBOUNDS'),
      ast: av('ASSISTS'),
      stl: av('STEALS'),
      blk: av('BLOCKS'),
      tov: av('TURNOVERS'),
      min: av('MINS_PLAYED'),
      tpm: av('THREE_POINTS_MADE'),
      dd: to('DOUBLE_DOUBLE'),
      td: to('TRIPLE_DOUBLE'),
      gp,
    };
    const hasData = out.pts != null || out.reb != null || out.ast != null;
    if (!hasData) return NextResponse.json({}, { status: 200 });
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json({}, { status: 200 });
  }
}
