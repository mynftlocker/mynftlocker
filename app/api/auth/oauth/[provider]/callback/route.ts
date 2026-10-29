import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { redis } from '../../../../../../lib/redis';
import { PROVIDERS, isProvider, isConfigured, exchangeCode, SITE_URL } from '../../../../../../lib/oauth';
import { sessionUser, readUser, saveUser, upsertAccount, SESSION_SECONDS } from '../../../../../../lib/users';

// Etape 2 : retour du reseau. Mode "link" : on rattache le reseau au compte connecte. Mode "login" : on ouvre le compte auquel ce reseau est deja lie.
export async function GET(request: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const done = (why: string) => {
    const r = NextResponse.redirect(`${SITE_URL}/?oauth=${why}&p=${provider}`);
    r.cookies.delete('mnfl_ostate');
    return r;
  };
  try {
    if (!isProvider(provider) || !isConfigured(PROVIDERS[provider])) return done('error');
    const p = PROVIDERS[provider];
    const sp = request.nextUrl.searchParams;
    if (sp.get('error')) return done('cancelled');
    const code = sp.get('code') || '';
    const state = sp.get('state') || '';
    let saved: { s: string; m: string; v: string | null } | null = null;
    try { saved = JSON.parse(request.cookies.get('mnfl_ostate')?.value || 'null'); } catch {}
    if (!code || !state || !saved || saved.s !== state) return done('error');

    const token = await exchangeCode(p, code, saved.v || undefined);
    if (!token) return done('error');
    const prof = await p.profile(token);
    if (!prof) return done('error');
    const idxKey = `oauth:${provider}:${prof.sub}`;
    const ownerId = await redis.get(idxKey);

    if (saved.m === 'link') {
      const s = await sessionUser(request.cookies.get('mnfl_session')?.value);
      if (!s) return done('nolink');
      if (ownerId && ownerId !== s.user.id) return done('already'); // deja lie a un autre compte myNFTlocker
      if (provider === 'sorare') {
        // Slug prouve par Sorare lui-meme : compte "verifie"
        upsertAccount(s.user, { platform: 'sorare', slug: prof.slug || prof.sub, verified: true, linkedAt: Date.now() });
      } else {
        const list = (s.user.identities || []).filter((i: any) => i.provider !== provider);
        list.push({ provider, sub: prof.sub, name: prof.name || '', linkedAt: Date.now() });
        s.user.identities = list;
      }
      await redis.set(idxKey, s.user.id);
      await saveUser(s.key, s.user);
      return done('linked');
    }

    // Connexion avec un reseau deja lie
    if (!ownerId || typeof ownerId !== 'string') return done('notlinked');
    const key = 'user:' + ownerId;
    const user = await readUser(key);
    if (!user) return done('notlinked');
    const sess = crypto.randomBytes(32).toString('hex');
    await redis.set('session:' + sess, key, { ex: SESSION_SECONDS });
    const res = NextResponse.redirect(`${SITE_URL}/?oauth=ok&p=${provider}`);
    res.cookies.set('mnfl_session', sess, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: SESSION_SECONDS, path: '/' });
    res.cookies.delete('mnfl_ostate');
    return res;
  } catch {
    return done('error');
  }
}
