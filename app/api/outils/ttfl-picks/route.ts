import { NextRequest, NextResponse } from 'next/server';
import { redis } from '../../../../lib/redis';
import { ownerOnly } from '../../../../lib/owner';

// Picks TTFL du proprietaire (historique + decks poses a l'avance), relus sur fantasy.trashtalk.co puis deposes ici. Dates = jour americain (comme TTFL).
export const maxDuration = 15;
export type Picks = { updated: string; history: { d: string; n: string; s: number | null }[]; planned: { d: string; n: string }[] };
const KEY = 'ttfl:picks';
export async function GET(req: NextRequest) {
  const deny = await ownerOnly(req); if (deny) return deny;
  const v = await redis.get<Picks>(KEY).catch(() => null);
  return NextResponse.json({ ok: true, picks: v || { updated: '', history: [], planned: [] } }, { headers: { 'Cache-Control': 'no-store' } });
}
export async function POST(req: NextRequest) {
  const deny = await ownerOnly(req); if (deny) return deny;
  try {
    const b = await req.json();
    const ok = (a: unknown) => Array.isArray(a) && a.every((x: any) => /^\d{4}-\d{2}-\d{2}$/.test(x?.d) && typeof x?.n === 'string' && x.n.length < 80);
    if (!ok(b.history) || !ok(b.planned)) return NextResponse.json({ ok: false, error: 'format' }, { status: 400 });
    const v: Picks = { updated: new Date().toISOString(), history: b.history.map((x: any) => ({ d: x.d, n: x.n, s: typeof x.s === 'number' ? x.s : null })), planned: b.planned.map((x: any) => ({ d: x.d, n: x.n })) };
    await redis.set(KEY, v);
    return NextResponse.json({ ok: true, history: v.history.length, planned: v.planned.length });
  } catch (e) { return NextResponse.json({ ok: false, error: String(e) }, { status: 400 }); }
}
