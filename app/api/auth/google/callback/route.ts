import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { redis } from '../../../../../lib/redis';

const SESSION_DAYS = 30;
const SITE_URL = 'https://mynftlocker.com';

// Etape 2 : Google nous renvoie ici avec un code. On le verifie, on retrouve (ou on cree) le compte, on ouvre la session.
export async function GET(request: NextRequest) {
  const fail = (why = 'error') => {
    const r = NextResponse.redirect(`${SITE_URL}/?google=${why}`);
    r.cookies.delete('mnfl_gstate');
    return r;
  };
  try {
    const sp = request.nextUrl.searchParams;
    const code = sp.get('code') || '';
    const state = sp.get('state') || '';
    const saved = request.cookies.get('mnfl_gstate')?.value || '';
    if (!code || !state || !saved || state !== saved) return fail();

    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    if (!clientId || !clientSecret) return fail();

    const tr = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: clientId, client_secret: clientSecret,
        redirect_uri: `${SITE_URL}/api/auth/google/callback`, grant_type: 'authorization_code',
      }).toString(),
      signal: AbortSignal.timeout(8000),
    });
    if (!tr.ok) return fail();
    const tok = await tr.json();
    if (!tok.access_token) return fail();

    const ur = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tok.access_token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!ur.ok) return fail();
    const info = await ur.json();
    const email = typeof info.email === 'string' ? info.email.toLowerCase().trim() : '';
    if (!email || info.email_verified !== true) return fail();

    const emailKey = 'user:' + email;
    const raw = await redis.get(emailKey);
    let user: any;
    if (raw) {
      user = typeof raw === 'string' ? JSON.parse(raw) : raw;
      // Google a verifie cette adresse : le compte existant (cree par e-mail) est donc bien le sien
      if (!user.emailVerified) { user.emailVerified = true; await redis.set(emailKey, JSON.stringify(user)); }
    } else {
      // Nouveau compte : meme regle que l'inscription classique (fermee tant que NEXT_PUBLIC_SIGNUP_OPEN n'est pas 'true')
      if (process.env.NEXT_PUBLIC_SIGNUP_OPEN !== 'true') return fail('closed');
      const nameRaw = String(info.name || info.given_name || email.split('@')[0]).trim().slice(0, 30);
      user = {
        id: crypto.randomUUID(),
        pseudo: nameRaw.length >= 2 ? nameRaw : email.split('@')[0],
        email,
        passwordHash: null,
        sorareSlug: null,
        createdAt: Date.now(),
        emailVerified: true,
        authProviders: ['google'],
      };
      await redis.set(emailKey, JSON.stringify(user));
    }

    const token = crypto.randomBytes(32).toString('hex');
    await redis.set('session:' + token, emailKey, { ex: 60 * 60 * 24 * SESSION_DAYS });
    const res = NextResponse.redirect(`${SITE_URL}/?google=${user.sorareSlug ? 'ok' : 'new'}`);
    res.cookies.set('mnfl_session', token, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * SESSION_DAYS, path: '/' });
    res.cookies.delete('mnfl_gstate');
    return res;
  } catch {
    return fail();
  }
}
