import { NextRequest, NextResponse } from 'next/server';
import { redis } from '../../../lib/redis';

// Redirection comptee vers Sorare / TTFL depuis le calendrier : on incremente un compteur (total + par jour), sans aucune donnee perso.
export const TARGETS: Record<string, string> = {
  sorare: 'https://sorare.com/football/invite/pro/BATIKSY', // lien de parrainage de Sylvain (signale comme tel dans le calendrier)
  ttfl: 'https://fantasy.trashtalk.co', // page TTFL (a confirmer par Sylvain)
};
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const to = sp.get('to') || '';
  const url = TARGETS[to];
  if (!url) return NextResponse.json({ ok: false }, { status: 400 });
  const day = Math.floor(Number(sp.get('day')));
  try {
    await Promise.all([
      redis.hincrby('go:total', to, 1),
      day >= 1 && day <= 24 ? redis.hincrby('go:day:' + day, to, 1) : Promise.resolve(0),
    ]);
  } catch {}
  return NextResponse.redirect(url, 302);
}
