// lib/users.ts
// Comptes : la cle STABLE est l'identifiant interne ("user:<uuid>"). L'e-mail n'est plus qu'un index ("email:<adresse>" -> uuid),
// ce qui permet de le changer, et de rattacher plus tard d'autres connexions (Google, Sorare...) au meme compte.
// Les anciens comptes ("user:<adresse e-mail>") sont migres automatiquement, a la volee, au premier passage.
import crypto from 'crypto';
import { redis } from './redis';

export const ID_KEY_RE = /^user:[0-9a-f-]{36}$/;
export const SESSION_SECONDS = 60 * 60 * 24 * 30;
export const normEmail = (e: string) => e.toLowerCase().trim();
export const parseJson = (raw: any) => (raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null);

export async function readUser(key: string): Promise<any | null> {
  return parseJson(await redis.get(key));
}
export async function saveUser(key: string, user: any): Promise<void> {
  await redis.set(key, JSON.stringify(user));
}

// Ancien format -> nouveau format (copie d'abord, suppression de l'ancienne cle seulement a la fin)
async function migrateLegacy(email: string): Promise<string | null> {
  const legacyKey = 'user:' + email;
  const user = parseJson(await redis.get(legacyKey));
  if (!user) return null;
  const id: string = user.id || crypto.randomUUID();
  user.id = id;
  const key = 'user:' + id;
  await redis.set(key, JSON.stringify(user));
  await redis.set('email:' + email, id);
  const prefs = await redis.get('prefs:' + legacyKey);
  if (prefs !== null && prefs !== undefined) await redis.set('prefs:' + key, typeof prefs === 'string' ? prefs : JSON.stringify(prefs));
  await redis.del(legacyKey);
  await redis.del('prefs:' + legacyKey);
  return key;
}

// Cle du compte a partir d'une adresse e-mail (null si aucun compte)
export async function userKeyByEmail(email: string): Promise<string | null> {
  const e = normEmail(email);
  const id = await redis.get('email:' + e);
  if (id && typeof id === 'string') return 'user:' + id;
  return migrateLegacy(e);
}

// Cle du compte a partir d'un identifiant Google (champ "sub")
export async function userKeyByGoogle(sub: string): Promise<string | null> {
  const id = await redis.get('google:' + sub);
  return id && typeof id === 'string' ? 'user:' + id : null;
}

// Convertit une cle stockee avant la migration (session, lien de verification) en cle d'identifiant
export async function resolveKey(k: unknown): Promise<string | null> {
  if (typeof k !== 'string' || !k.startsWith('user:')) return null;
  if (ID_KEY_RE.test(k)) return k;
  return userKeyByEmail(k.slice(5));
}

// Utilisateur connecte a partir du cookie de session
export async function sessionUser(token: string | undefined): Promise<{ key: string; user: any; token: string } | null> {
  if (!token) return null;
  const stored = await redis.get('session:' + token);
  const key = await resolveKey(stored);
  if (!key) return null;
  if (key !== stored) await redis.set('session:' + token, key, { ex: SESSION_SECONDS });
  const user = await readUser(key);
  if (!user) return null;
  return { key, user, token };
}

// Reserve une adresse e-mail pour un compte (false si deja prise)
export async function claimEmail(email: string, id: string): Promise<boolean> {
  const res = await redis.set('email:' + normEmail(email), id, { nx: true });
  return res === 'OK';
}

export async function createUser(user: any): Promise<string | null> {
  const key = 'user:' + user.id;
  if (user.email && !(await claimEmail(user.email, user.id))) return null;
  await redis.set(key, JSON.stringify(user));
  if (user.googleSub) await redis.set('google:' + user.googleSub, user.id);
  return key;
}

export async function removeUser(key: string, user: any): Promise<void> {
  await redis.del(key);
  await redis.del('prefs:' + key);
  if (user?.email) await redis.del('email:' + normEmail(user.email));
  if (user?.googleSub) await redis.del('google:' + user.googleSub);
  for (const i of user?.identities || []) await redis.del('oauth:' + i.provider + ':' + i.sub);
  for (const a of user?.accounts || []) if (a.verified && a.platform) await redis.del('oauth:' + a.platform + ':' + a.slug);
}

// Comptes de sport lies (Sorare aujourd'hui, d'autres plus tard). Derive de l'ancien champ sorareSlug tant que "accounts" n'existe pas.
export type SportAccount = { platform: string; slug: string; verified: boolean; linkedAt?: number };
export function getAccounts(user: any): SportAccount[] {
  if (Array.isArray(user?.accounts)) return user.accounts;
  return user?.sorareSlug ? [{ platform: 'sorare', slug: user.sorareSlug, verified: false }] : [];
}
// Ajoute ou met a jour un compte de sport ; sorareSlug reste le miroir du compte Sorare principal (le reste du site le lit)
export function upsertAccount(user: any, acc: SportAccount): void {
  const list = getAccounts(user).filter(a => a.platform !== acc.platform);
  list.push(acc);
  user.accounts = list;
  if (acc.platform === 'sorare') user.sorareSlug = acc.slug;
}
