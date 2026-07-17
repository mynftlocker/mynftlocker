import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { redis } from '../../../../lib/redis';

const SESSION_DAYS = 30;
const SITE_URL = 'https://mynftlocker.vercel.app'; // TODO: remplacer par le vrai domaine une fois créé

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token') || '';
    if (!token) {
      return NextResponse.redirect(`${SITE_URL}/?verify=missing_token`);
    }

    const verifyKey = 'verify:' + token;
    const emailKey = await redis.get(verifyKey);
    if (!emailKey || typeof emailKey !== 'string') {
      // Token inexistant ou déjà expiré (Redis l'a supprimé automatiquement après 24h)
      return NextResponse.redirect(`${SITE_URL}/?verify=expired`);
    }

    const raw = await redis.get(emailKey);
    if (!raw) {
      return NextResponse.redirect(`${SITE_URL}/?verify=user_not_found`);
    }
    const user = typeof raw === 'string' ? JSON.parse(raw) : raw;

    user.emailVerified = true;
    await redis.set(emailKey, JSON.stringify(user));

    // Le lien ne doit pouvoir servir qu'une seule fois
    await redis.del(verifyKey);

    const sessionToken = crypto.randomBytes(32).toString('hex');
    await redis.set('session:' + sessionToken, emailKey, { ex: 60 * 60 * 24 * SESSION_DAYS });

    const res = NextResponse.redirect(`${SITE_URL}/?verify=success`);
    res.cookies.set('mnfl_session', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * SESSION_DAYS,
      path: '/',
    });
    return res;
  } catch (e) {
    return NextResponse.redirect(`${SITE_URL}/?verify=error`);
  }
}
