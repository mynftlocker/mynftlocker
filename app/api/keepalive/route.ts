import { NextRequest, NextResponse, after } from 'next/server';
import { redis } from '../../../lib/redis';

// Ping quotidien (cron Vercel, voir vercel.json) : une ecriture Redis par jour
// pour que la base Upstash gratuite ne soit jamais supprimee pour inactivite (14 jours).
export const maxDuration = 60;
export async function GET(req: NextRequest) {
  try {
    await redis.set('keepalive', Date.now());
    // journal estimation / reel du Cup Builder (en tache de fond, ne bloque pas le ping)
    const origin = req.nextUrl.origin;
    after(async () => { try { await fetch(`${origin}/api/outils/cup-log?run=1`, { cache: 'no-store' }); } catch {} });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
