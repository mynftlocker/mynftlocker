import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { redis } from '../../../../lib/redis';

const SESSION_DAYS = 30;

export async function POST(request: NextRequest) {
  try {
    const { pseudo, email, password, sorareSlug } = await request.json();

    if (!pseudo || typeof pseudo !== 'string' || pseudo.trim().length < 2) {
      return NextResponse.json({ error: 'pseudo_invalide' }, { status: 400 });
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'email_invalide' }, { status: 400 });
    }
    const pwdOk = typeof password === 'string'
      && password.length >= 8
      && /[A-Z]/.test(password)
      && /[0-9]/.test(password)
      && /[^A-Za-z0-9]/.test(password);
    if (!pwdOk) {
      return NextResponse.json({ error: 'mot_de_passe_invalide' }, { status: 400 });
    }

    const emailKey = 'user:' + email.toLowerCase().trim();
    const existing = await redis.get(emailKey);
    if (existing) {
      return NextResponse.json({ error: 'email_deja_utilise' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();
    const user = {
      id,
      pseudo: pseudo.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      sorareSlug: (typeof sorareSlug === 'string' && sorareSlug.trim()) ? sorareSlug.trim() : null,
      createdAt: Date.now(),
    };

    await redis.set(emailKey, JSON.stringify(user));

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
