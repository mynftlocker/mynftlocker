// lib/oauth.ts
// Liaison de comptes externes (Sorare, Discord, X, Facebook) au compte myNFTlocker.
// Principe : on LIE un reseau a son compte depuis "Informations personnelles" ; une fois lie il peut aussi servir a se connecter.
// Aucun compte n'est cree par ces reseaux (la creation reste e-mail ou Google).
import crypto from 'crypto';

export const SITE_URL = 'https://mynftlocker.com';
export type ProviderId = 'sorare' | 'discord' | 'x' | 'facebook';
export type Profile = { sub: string; name?: string; slug?: string };

type Provider = {
  id: ProviderId;
  label: string;
  idEnv: string;
  secretEnv: string;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  pkce?: boolean;
  basicAuth?: boolean;
  profile: (accessToken: string) => Promise<Profile | null>;
};

const j = async (url: string, init: RequestInit) => {
  const r = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
  if (!r.ok) return null;
  return r.json().catch(() => null);
};

export const PROVIDERS: Record<ProviderId, Provider> = {
  sorare: {
    id: 'sorare', label: 'Sorare', idEnv: 'SORARE_OAUTH_CLIENT_ID', secretEnv: 'SORARE_OAUTH_CLIENT_SECRET',
    authorizeUrl: 'https://sorare.com/oauth/authorize', tokenUrl: 'https://api.sorare.com/oauth/token', scope: '',
    profile: async (t) => {
      const d = await j('https://api.sorare.com/graphql', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ query: 'query{currentUser{slug nickname}}' }),
      });
      const u = d?.data?.currentUser;
      return u?.slug ? { sub: String(u.slug), slug: String(u.slug), name: u.nickname || u.slug } : null;
    },
  },
  discord: {
    id: 'discord', label: 'Discord', idEnv: 'DISCORD_CLIENT_ID', secretEnv: 'DISCORD_CLIENT_SECRET',
    authorizeUrl: 'https://discord.com/oauth2/authorize', tokenUrl: 'https://discord.com/api/oauth2/token', scope: 'identify',
    profile: async (t) => {
      const d = await j('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${t}` } });
      return d?.id ? { sub: String(d.id), name: d.global_name || d.username } : null;
    },
  },
  x: {
    id: 'x', label: 'X', idEnv: 'X_CLIENT_ID', secretEnv: 'X_CLIENT_SECRET',
    authorizeUrl: 'https://x.com/i/oauth2/authorize', tokenUrl: 'https://api.x.com/2/oauth2/token', scope: 'users.read tweet.read',
    pkce: true, basicAuth: true,
    profile: async (t) => {
      const d = await j('https://api.x.com/2/users/me', { headers: { Authorization: `Bearer ${t}` } });
      return d?.data?.id ? { sub: String(d.data.id), name: d.data.username ? '@' + d.data.username : d.data.name } : null;
    },
  },
  facebook: {
    id: 'facebook', label: 'Facebook', idEnv: 'FACEBOOK_APP_ID', secretEnv: 'FACEBOOK_APP_SECRET',
    authorizeUrl: 'https://www.facebook.com/v21.0/dialog/oauth', tokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token', scope: 'public_profile',
    profile: async (t) => {
      const d = await j(`https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${encodeURIComponent(t)}`, {});
      return d?.id ? { sub: String(d.id), name: d.name } : null;
    },
  },
};

export const isProvider = (p: string): p is ProviderId => Object.prototype.hasOwnProperty.call(PROVIDERS, p);
export const isConfigured = (p: Provider) => !!(process.env[p.idEnv] && process.env[p.secretEnv]);
export const redirectUri = (p: ProviderId) => `${SITE_URL}/api/auth/oauth/${p}/callback`;

export const b64url = (b: Buffer) => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const newPkce = () => {
  const verifier = b64url(crypto.randomBytes(32));
  return { verifier, challenge: b64url(crypto.createHash('sha256').update(verifier).digest()) };
};

export async function exchangeCode(p: Provider, code: string, verifier?: string): Promise<string | null> {
  const id = process.env[p.idEnv] || '';
  const secret = process.env[p.secretEnv] || '';
  const body = new URLSearchParams({ code, grant_type: 'authorization_code', redirect_uri: redirectUri(p.id), client_id: id });
  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (p.basicAuth) headers.Authorization = 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64');
  else body.set('client_secret', secret);
  if (verifier) body.set('code_verifier', verifier);
  const d = await j(p.tokenUrl, { method: 'POST', headers, body: body.toString() });
  return d?.access_token || null;
}
