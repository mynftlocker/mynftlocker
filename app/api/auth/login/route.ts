import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { redis } from '../../../../lib/redis';
import { userKeyByEmail, readUser, SESSION_SECONDS } from '../../../../lib/users';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return NextResponse.json({ error: 'identifiants_manquants' }, { status: 400 });
    }

    const userKey = await userKeyByEmail(email);
    const user = userKey ? await readUser(userKey) : null;
    if (!userKey || !user) {
      return NextResponse.json({ error: 'identifiants_invalides' }, { status: 401 });
    }

    // Compte cree via Google : pas de mot de passe, connexion par le bouton Google
    const match = user.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!match) {
      return NextResponse.json({ error: 'identifiants_invalides' }, { status: 401 });
    }

    if (!user.emailVerified) {
      return NextResponse.json({ error: 'email_non_verifie' }, { status: 403 });
    }
    const token = crypto.randomBytes(32).toString('hex');
    await redis.set('session:' + token, userKey, { ex: SESSION_SECONDS });

    const res = NextResponse.json({
      ok: true,
      pseudo: user.pseudo,
      email: user.email,
      sorareSlug: user.sorareSlug,
    });
    res.cookies.set('mnfl_session', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: SESSION_SECONDS,
      path: '/',
    });
    return res;
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
