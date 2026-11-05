import { NextRequest, NextResponse } from 'next/server';
import { liveGame, liveNight } from '../../../../lib/ttflLive';

// API publique : ?night=YYYY-MM-DD (matchs de la nuit Paris) ou ?game=ID (detail joueurs + courbes). Cache court.
export const maxDuration = 30;
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams; const H = { 'Cache-Control': 'public, s-maxage=8, stale-while-revalidate=20' };
  try {
    const game = sp.get('game');
    if (game) {
      if (!/^\d{6,12}$/.test(game)) return NextResponse.json({ ok: false, error: 'game invalide' }, { status: 400 });
      const g = await liveGame(game); if (!g) return NextResponse.json({ ok: false, error: 'match introuvable' }, { status: 404 });
      return NextResponse.json({ ok: true, ...g }, { headers: H });
    }
    const night = sp.get('night') || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) return NextResponse.json({ ok: false, error: 'night=YYYY-MM-DD requis' }, { status: 400 });
    return NextResponse.json({ ok: true, games: await liveNight(night) }, { headers: H });
  } catch (e) { return NextResponse.json({ ok: false, error: String(e).slice(0, 200) }, { status: 502 }); }
}
