import { NextResponse } from 'next/server';
import { ADVENT_YEAR, parisNow } from '../../../../lib/advent';
import { buildDay } from '../../../../lib/adventDay';

// Prechauffage quotidien (cron Vercel, voir vercel.json) : calcule la case du jour avant l'ouverture de 9 h
// (box scores, cartes Arcade, scores Sorare mis en cache) pour que le premier visiteur n'attende pas.
export const maxDuration = 60;
export async function GET() {
  const p = parisNow();
  if (p.getFullYear() !== ADVENT_YEAR || p.getMonth() !== 11 || p.getDate() > 24) return NextResponse.json({ ok: true, skipped: true });
  try {
    const r: any = await buildDay(p.getDate());
    return NextResponse.json({ ok: true, day: p.getDate(), open: r.open, players: r.top?.length || 0 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 502 });
  }
}
