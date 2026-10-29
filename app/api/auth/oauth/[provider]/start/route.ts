import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { PROVIDERS, isProvider, isConfigured, redirectUri, newPkce, SITE_URL } from '../../../../../../lib/oauth';

// Etape 1 : on envoie l'utilisateur chez le reseau. ?link=1 = lier ce reseau au compte connecte ; sinon = se connecter avec un reseau deja lie.
export async function GET(request: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  if (!isProvider(provider) || !isConfigured(PROVIDERS[provider])) return NextResponse.redirect(`${SITE_URL}/?oauth=error`);
  const p = PROVIDERS[provider];
  const link = request.nextUrl.searchParams.get('link') === '1';
  if (link && !request.cookies.get('mnfl_session')?.value) return NextResponse.redirect(`${SITE_URL}/?oauth=nolink`);

  const state = crypto.randomBytes(24).toString('hex');
  const pk = p.pkce ? newPkce() : null;
  const url = new URL(p.authorizeUrl);
  url.searchParams.set('client_id', process.env[p.idEnv] || '');
  url.searchParams.set('redirect_uri', redirectUri(p.id));
  url.searchParams.set('response_type', 'code');
  if (p.scope) url.searchParams.set('scope', p.scope);
  else url.searchParams.set('scope', '');
  url.searchParams.set('state', state);
  if (pk) { url.searchParams.set('code_challenge', pk.challenge); url.searchParams.set('code_challenge_method', 'S256'); }

  const res = NextResponse.redirect(url.toString());
  res.cookies.set('mnfl_ostate', JSON.stringify({ s: state, m: link ? 'link' : 'login', v: pk?.verifier || null }), {
    httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/',
  });
  return res;
}
