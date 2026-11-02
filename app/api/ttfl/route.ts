import { NextRequest, NextResponse } from 'next/server';
import { getNight, lastFinishedDate } from '../../../lib/ttfl';

// Top TTFL d'une nuit NBA. ?date=AAAA-MM-JJ (jour americain, fuseau Est) ; sans date : dernier jour termine.
export const maxDuration = 60;
export async function GET(req: NextRequest) {
  try {
    const date = req.nextUrl.searchParams.get('date') || (await lastFinishedDate());
    if (!date) return NextResponse.json({ ok: false, error: 'aucun match' }, { status: 404 });
    const night = await getNight(date);
    if (!night) return NextResponse.json({ ok: false, error: 'aucun match' }, { status: 404 });
    return NextResponse.json(night);
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 502 });
  }
}
