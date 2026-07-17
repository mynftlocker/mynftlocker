import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { redis } from '../../../../lib/redis';

const SESSION_DAYS = 30;

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return NextResponse.json({ error: 'identifiants_manquants' }, { status: 400 });
    }

    const emailKey = 'user:' + email.toLowerCase().trim();
    const raw = await redis.get(emailKey);
    if (!raw) {
      return NextResponse.json({ error: 'identifiants_invalides' }, { status: 401 });
    }

    const user = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return NextResponse.json({ error: 'identifiants_invalides' }, { status: 401 });
    }

    if (!user.emailVerified) {
      return NextResponse.json({ error: 'email_non_verifie' }, { status: 403 });
    }
    const token = crypto.randomBytes(32).toString('hex');
    await redis.set('session:' + token, emailKey, { ex: 60 * 60 * 24 * SESSION_DAYS });

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
      maxAge: 60 * 60 * 24 * SESSION_DAYS,
      path: '/',
    });
    return res;
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
