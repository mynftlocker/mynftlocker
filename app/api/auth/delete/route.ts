import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { redis } from '../../../../lib/redis';
import { sessionUser, removeUser } from '../../../../lib/users';

// Suppression definitive du compte (utilisateur connecte, mot de passe requis ; compte Google sans mot de passe : la session suffit)
export async function POST(request: NextRequest) {
  try {
    const s = await sessionUser(request.cookies.get('mnfl_session')?.value);
    if (!s) return NextResponse.json({ error: 'non_connecte' }, { status: 401 });
    const { key, user, token } = s;

    const { password } = await request.json();
    if (user.passwordHash && (typeof password !== 'string' || !(await bcrypt.compare(password, user.passwordHash)))) {
      return NextResponse.json({ error: 'mot_de_passe_invalide' }, { status: 403 });
    }
    await removeUser(key, user);
    await redis.del('session:' + token);
    const res = NextResponse.json({ ok: true });
    res.cookies.set('mnfl_session', '', { path: '/', maxAge: 0 });
    return res;
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
