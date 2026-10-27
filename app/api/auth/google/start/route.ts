import { NextResponse } from 'next/server';
import crypto from 'crypto';

const SITE_URL = 'https://mynftlocker.com';

// Etape 1 de "Continuer avec Google" : on envoie l'utilisateur chez Google (avec un jeton anti-falsification "state").
export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return NextResponse.redirect(`${SITE_URL}/?google=error`);
  const state = crypto.randomBytes(24).toString('hex');
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', `${SITE_URL}/api/auth/google/callback`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'select_account');
  const res = NextResponse.redirect(url.toString());
  res.cookies.set('mnfl_gstate', state, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/' });
  return res;
}
