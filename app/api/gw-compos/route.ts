import { NextRequest, NextResponse } from 'next/server';
import { redis } from '../../../lib/redis';
import { sessionUser } from '../../../lib/users';

// Compos de GW sauvegardees pour le compte connecte : une entree par Game Week (hash gwc:<compte>, champ = numero de GW).
const MAX_BYTES = 120_000, MAX_ROOMS = 40, KEEP = 20;
const userKey = async (req: NextRequest) => (await sessionUser(req.cookies.get('mnfl_session')?.value))?.key || null;
const parse = (raw: any) => (raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null);

export async function GET(req: NextRequest) {
  try {
    const k = await userKey(req); if (!k) return NextResponse.json({ error: 'non_connecte' }, { status: 401 });
    const gw = req.nextUrl.searchParams.get('gw') || '';
    if (!/^\d{1,4}$/.test(gw)) return NextResponse.json({ error: 'requete_invalide' }, { status: 400 });
    return NextResponse.json({ saved: parse(await redis.hget('gwc:' + k, gw)) });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const k = await userKey(req); if (!k) return NextResponse.json({ error: 'non_connecte' }, { status: 401 });
    const b = await req.json();
    const gw = String(b?.gw || '');
    if (!/^\d{1,4}$/.test(gw) || !Array.isArray(b?.rooms) || b.rooms.length > MAX_ROOMS) return NextResponse.json({ error: 'requete_invalide' }, { status: 400 });
    const doc = JSON.stringify({ rooms: b.rooms, plan: b.plan && typeof b.plan === 'object' ? b.plan : {}, at: Date.now() });
    if (doc.length > MAX_BYTES) return NextResponse.json({ error: 'trop_volumineux' }, { status: 413 });
    await redis.hset('gwc:' + k, { [gw]: doc });
    const all = Object.keys((await redis.hgetall('gwc:' + k)) || {}).sort((a, b) => +b - +a);
    if (all.length > KEEP) await redis.hdel('gwc:' + k, ...all.slice(KEEP));
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
