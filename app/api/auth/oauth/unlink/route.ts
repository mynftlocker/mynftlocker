import { NextRequest, NextResponse } from 'next/server';
import { redis } from '../../../../../lib/redis';
import { isProvider } from '../../../../../lib/oauth';
import { sessionUser, saveUser } from '../../../../../lib/users';

// Delier un reseau (Discord, X, Facebook). On refuse si c'etait le dernier moyen d'acceder au compte.
export async function POST(request: NextRequest) {
  try {
    const s = await sessionUser(request.cookies.get('mnfl_session')?.value);
    if (!s) return NextResponse.json({ error: 'non_connecte' }, { status: 401 });
    const { provider } = await request.json();
    if (typeof provider !== 'string' || !isProvider(provider) || provider === 'sorare') return NextResponse.json({ error: 'requete_invalide' }, { status: 400 });
    const ids: any[] = s.user.identities || [];
    const target = ids.find(i => i.provider === provider);
    if (!target) return NextResponse.json({ ok: true });
    const otherWays = (s.user.passwordHash ? 1 : 0) + (s.user.googleSub ? 1 : 0) + (ids.length - 1);
    if (otherWays < 1) return NextResponse.json({ error: 'dernier_acces' }, { status: 409 });
    s.user.identities = ids.filter(i => i.provider !== provider);
    await redis.del(`oauth:${provider}:${target.sub}`);
    await saveUser(s.key, s.user);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
