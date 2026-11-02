import { NextRequest, NextResponse } from 'next/server';
import { getNight, lastFinishedDate } from '../../../lib/ttfl';
import { arcadeCardFor } from '../../../lib/arcadeCard';

// Calendrier de l'Avent TTFL x Sorare Arcade : la case N (N decembre) revele le meilleur score TTFL de la nuit NBA precedente
// (matchs du jour americain N-1, soit la nuit du N-1 au N en France), illustre par sa carte Arcade.
// ?day=N (1-24) ; ?demo=K : avant le lancement, K cases "ouvertes" avec les vraies dernieres nuits (apercu du design).
export const maxDuration = 60;
const YEAR = 2026;
const pad = (n: number) => String(n).padStart(2, '0');
const parisNow = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const day = Math.floor(Number(sp.get('day')));
    const demo = Math.floor(Number(sp.get('demo') || 0));
    if (!(day >= 1 && day <= 24)) return NextResponse.json({ ok: false, error: 'jour invalide' }, { status: 400 });
    let date: string;
    if (demo > 0) {
      if (day > demo) return NextResponse.json({ ok: true, open: false, day });
      // case demo : on remonte dans le temps depuis la derniere nuit terminee (la case `demo` = la plus recente)
      let d = (await lastFinishedDate()) as string;
      for (let i = 0; i < demo - day; i++) { const prev = await lastFinishedDate(d); if (!prev) break; d = prev; }
      date = d;
    } else {
      const p = parisNow();
      const open = p.getFullYear() > YEAR || (p.getFullYear() === YEAR && p.getMonth() === 11 && p.getDate() >= day);
      if (!open) return NextResponse.json({ ok: true, open: false, day });
      const dd = new Date(Date.UTC(YEAR, 11, day - 1)); // jour americain N-1
      date = dd.toISOString().slice(0, 10);
    }
    const night = await getNight(date, 10);
    if (!night || !night.finished) return NextResponse.json({ ok: true, open: false, day, pending: true });
    const cards = await Promise.all(night.top.map(r => arcadeCardFor(r.id, r.name)));
    const top = night.top.map((r, i) => ({ ...r, card: cards[i] }));
    return NextResponse.json({ ok: true, open: true, day, date: night.date, games: night.games, top }, { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600' } });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 502 });
  }
}
