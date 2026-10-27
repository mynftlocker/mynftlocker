import { NextResponse } from 'next/server';
import { redis } from '../../../lib/redis';

// Ping quotidien (cron Vercel, voir vercel.json) : une ecriture Redis par jour
// pour que la base Upstash gratuite ne soit jamais supprimee pour inactivite (14 jours).
export async function GET() {
  try {
    await redis.set('keepalive', Date.now());
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
