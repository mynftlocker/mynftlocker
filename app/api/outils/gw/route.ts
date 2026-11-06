import { NextRequest, NextResponse } from 'next/server';
import { getGw, marketPics } from '../../../../lib/gwData';

// Compos GW : joueurs d'une GW NBA (donnees publiques Sorare). GET ?fixture=<slug> ; GET ?pics=slug1,slug2 : une vraie carte du marche par joueur.
export const maxDuration = 30;
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const pics = (sp.get('pics') || '').split(',').filter(Boolean);
    if (pics.length) return NextResponse.json({ pics: await marketPics(pics) });
    // Cache CDN 2 min (+ 10 min de secours) : pic de trafic avant la deadline = une seule execution par fenetre, pas une par visiteur
    return NextResponse.json(await getGw((sp.get('fixture') || '').trim()), { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' } });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
