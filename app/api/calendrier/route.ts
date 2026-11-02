import { NextRequest, NextResponse } from 'next/server';
import { openDayNow } from '../../../lib/advent';
import { buildDay } from '../../../lib/adventDay';

// Calendrier de l'Avent TTFL x Sorare Arcade : la case N (N decembre, ouverte a 9 h heure de Paris) revele le meilleur score TTFL
// de la nuit NBA precedente (matchs du jour americain N-1), illustre par sa carte Arcade.
// ?day=N (1-24) ; ?demo=K : avant le lancement, K cases "ouvertes" avec les vraies dernieres nuits (apercu du design).
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const day = Math.floor(Number(sp.get('day')));
    const demo = Math.floor(Number(sp.get('demo') || 0));
    if (!(day >= 1 && day <= 24)) return NextResponse.json({ ok: false, error: 'jour invalide' }, { status: 400 });
    if (!(demo > 0) && day > openDayNow()) return NextResponse.json({ ok: true, open: false, day });
    const out: any = await buildDay(day, demo);
    return NextResponse.json(out, { headers: out.open ? { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600' } : undefined });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 502 });
  }
}
