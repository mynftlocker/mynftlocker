// lib/messages.ts
// Messagerie entre managers : courte, liee a UNE carte, reservee aux comptes verifies Sorare.
// Cles Redis :
//   msgslug:<slug sorare>           -> id du compte myNFTlocker qui a verifie ce slug (index, rempli a chaque ouverture du site)
//   msg:conv:<cid>                  -> meta de la conversation (JSON)
//   msg:conv:<cid>:m                -> liste des messages (JSON), conservee 12 mois apres le dernier message
//   msg:inbox:<slug>                -> ensemble trie (score = date du dernier message) des conversations du manager
//   msg:block:<slug>                -> ensemble des slugs bloques par ce manager
//   msg:rl:new|msg:<slug>:<jour>    -> compteurs de limites quotidiennes
//   msg:reports                     -> liste des signalements (avec copie des derniers messages)
//   msg:reportedby:<slug>           -> ensemble des managers differents qui ont signale ce manager
//   msg:suspended:<slug>            -> "1" si l'envoi est suspendu (3 signalements de managers differents)
import { redis } from './redis';
import { readUser, getAccounts, parseJson } from './users';

export const RETENTION_S = 60 * 60 * 24 * 365; // 12 mois
export const LIMIT_NEW_PER_DAY = 5;
export const LIMIT_MSG_PER_DAY = 30;
export const MAX_THREAD = 300;
export const SUSPEND_AFTER = 3;
export const SLUG_RE = /^[a-z0-9_-]{1,80}$/;
export const CARD_RE = /^[a-z0-9_-]{3,200}$/;

export type Meta = {
  cid: string;
  a: string; b: string;                 // les deux managers (slugs Sorare), tries
  p: Record<string, string>;            // pseudos (affichage)
  card: { slug: string; name: string; pictureUrl: string };
  n: number;                            // nombre de messages
  r: Record<string, number>;            // nombre de messages lus par chaque manager
  at: number; last: string; lastFrom: string;
};
export type Msg = { f: string; t: string; at: number };

export const verifiedSlug = (user: any): string | null => {
  const a = getAccounts(user).find(x => x.platform === 'sorare' && x.verified && SLUG_RE.test(String(x.slug || '').toLowerCase()));
  return a ? String(a.slug).toLowerCase() : null;
};
export const makeCid = (x: string, y: string, card: string) => [x, y].sort().join('~') + '~' + card;
export const other = (m: Meta, me: string) => (m.a === me ? m.b : m.a);

export const readMeta = async (cid: string): Promise<Meta | null> => parseJson(await redis.get('msg:conv:' + cid));
const day = () => new Date().toISOString().slice(0, 10);

// Compteur quotidien : renvoie false si la limite est deja atteinte
export async function hitLimit(kind: 'new' | 'msg', slug: string, limit: number): Promise<boolean> {
  const k = `msg:rl:${kind}:${slug}:${day()}`;
  const n = await redis.incr(k);
  if (n === 1) await redis.expire(k, 60 * 60 * 36);
  return n <= limit;
}

// Compte myNFTlocker qui a verifie ce slug Sorare (null si aucun, ou si le lien n'est plus verifie)
export async function recipientBySlug(slug: string): Promise<{ id: string; user: any } | null> {
  const id = await redis.get('msgslug:' + slug);
  if (!id || typeof id !== 'string') return null;
  const user = await readUser('user:' + id);
  if (!user || verifiedSlug(user) !== slug) return null;
  return { id, user };
}

export async function isBlocked(owner: string, target: string): Promise<boolean> {
  return (await redis.sismember('msg:block:' + owner, target)) === 1;
}

export async function pushMessage(meta: Meta, from: string, text: string): Promise<Meta> {
  const msg: Msg = { f: from, t: text, at: Date.now() };
  const mk = 'msg:conv:' + meta.cid + ':m';
  await redis.rpush(mk, JSON.stringify(msg));
  await redis.expire(mk, RETENTION_S);
  meta.n += 1;
  meta.r[from] = meta.n; // l'expediteur a "lu" ses propres messages
  meta.at = msg.at; meta.last = text.slice(0, 90); meta.lastFrom = from;
  await redis.set('msg:conv:' + meta.cid, JSON.stringify(meta), { ex: RETENTION_S });
  await redis.zadd('msg:inbox:' + meta.a, { score: msg.at, member: meta.cid });
  await redis.zadd('msg:inbox:' + meta.b, { score: msg.at, member: meta.cid });
  return meta;
}

export async function unreadCount(slug: string): Promise<number> {
  const cids = (await redis.zrange('msg:inbox:' + slug, 0, 99, { rev: true })) as string[];
  if (!cids.length) return 0;
  const metas = await Promise.all(cids.map(readMeta));
  return metas.reduce((s, m) => s + (m ? Math.max(0, m.n - (m.r?.[slug] || 0)) : 0), 0);
}

// Courriel d'alerte (signalements) a l'adresse de contact du site. Sans consequence si l'envoi echoue.
export async function mailAdmin(subject: string, html: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'myNFTlocker <no-reply@mynftlocker.com>', to: ['contact@mynftlocker.com'], subject, html }),
    });
  } catch { /* pas d'alerte : le signalement reste dans Redis */ }
}
export const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
