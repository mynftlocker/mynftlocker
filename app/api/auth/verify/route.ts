import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { redis } from '../../../../lib/redis';
import { resolveKey, readUser, saveUser, SESSION_SECONDS } from '../../../../lib/users';

const SITE_URL = 'https://mynftlocker.com';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token') || '';
    if (!token) {
      return NextResponse.redirect(`${SITE_URL}/?verify=missing_token`);
    }

    const verifyKey = 'verify:' + token;
    const stored = await redis.get(verifyKey);
    const userKey = await resolveKey(stored);
    if (!userKey) {
      // Token inexistant ou déjà expiré (Redis l'a supprimé automatiquement après 24h)
      return NextResponse.redirect(`${SITE_URL}/?verify=expired`);
    }

    const user = await readUser(userKey);
    if (!user) {
      return NextResponse.redirect(`${SITE_URL}/?verify=user_not_found`);
    }

    user.emailVerified = true;
    await saveUser(userKey, user);

    // Le lien ne doit pouvoir servir qu'une seule fois
    await redis.del(verifyKey);

    const sessionToken = crypto.randomBytes(32).toString('hex');
    await redis.set('session:' + sessionToken, userKey, { ex: SESSION_SECONDS });

    const res = NextResponse.redirect(`${SITE_URL}/?verify=success`);
    res.cookies.set('mnfl_session', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: SESSION_SECONDS,
      path: '/',
    });
    return res;
  } catch (e) {
    return NextResponse.redirect(`${SITE_URL}/?verify=error`);
  }
}
