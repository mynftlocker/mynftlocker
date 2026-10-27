import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { redis } from '../../../../lib/redis';

// Suppression definitive du compte (utilisateur connecte, mot de passe requis)
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('mnfl_session')?.value;
    if (!token) return NextResponse.json({ error: 'non_connecte' }, { status: 401 });
    const emailKey = await redis.get('session:' + token);
    if (!emailKey || typeof emailKey !== 'string') return NextResponse.json({ error: 'non_connecte' }, { status: 401 });
    const raw = await redis.get(emailKey);
    if (!raw) return NextResponse.json({ error: 'non_connecte' }, { status: 401 });
    const user = typeof raw === 'string' ? JSON.parse(raw) : raw;

    const { password } = await request.json();
    if (typeof password !== 'string' || !(await bcrypt.compare(password, user.passwordHash))) {
      return NextResponse.json({ error: 'mot_de_passe_invalide' }, { status: 403 });
    }
    await redis.del(emailKey);
    await redis.del('session:' + token);
    const res = NextResponse.json({ ok: true });
    res.cookies.set('mnfl_session', '', { path: '/', maxAge: 0 });
    return res;
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
