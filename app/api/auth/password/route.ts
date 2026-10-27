import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { redis } from '../../../../lib/redis';

// Changement de mot de passe (utilisateur connecte, mot de passe actuel requis)
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('mnfl_session')?.value;
    if (!token) return NextResponse.json({ error: 'non_connecte' }, { status: 401 });
    const emailKey = await redis.get('session:' + token);
    if (!emailKey || typeof emailKey !== 'string') return NextResponse.json({ error: 'non_connecte' }, { status: 401 });
    const raw = await redis.get(emailKey);
    if (!raw) return NextResponse.json({ error: 'non_connecte' }, { status: 401 });
    const user = typeof raw === 'string' ? JSON.parse(raw) : raw;

    const { current, next } = await request.json();
    if (typeof current !== 'string' || typeof next !== 'string') return NextResponse.json({ error: 'requete_invalide' }, { status: 400 });
    if (!(await bcrypt.compare(current, user.passwordHash))) return NextResponse.json({ error: 'mot_de_passe_actuel_invalide' }, { status: 403 });
    const pwdOk = next.length >= 10 && /[A-Za-z]/.test(next) && /[0-9]/.test(next);
    if (!pwdOk) return NextResponse.json({ error: 'mot_de_passe_invalide' }, { status: 400 });

    user.passwordHash = await bcrypt.hash(next, 10);
    await redis.set(emailKey, JSON.stringify(user));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
