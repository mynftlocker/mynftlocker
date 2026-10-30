import { NextRequest, NextResponse } from 'next/server';
import { sessionUser } from '../../../lib/users';
import { checkMessage } from '../../../lib/messageFilter';
import {
  verifiedSlug, makeCid, other, readMeta, hitLimit, recipientBySlug, isBlocked, pushMessage, unreadCount, mailAdmin, esc,
  LIMIT_NEW_PER_DAY, LIMIT_MSG_PER_DAY, MAX_THREAD, SUSPEND_AFTER, SLUG_RE, CARD_RE, type Meta, type Msg,
} from '../../../lib/messages';
import { redis } from '../../../lib/redis';

// Messagerie entre managers (comptes verifies Sorare uniquement). GET : ?view=unread | list | thread&cid=...  POST : {action:'send'|'reply'|'block'|'report', ...}
export const dynamic = 'force-dynamic';
const err = (code: string, status = 400) => NextResponse.json({ error: code }, { status });

async function who(request: NextRequest) {
  const s = await sessionUser(request.cookies.get('mnfl_session')?.value);
  if (!s) return { error: err('login', 401) } as const;
  const me = verifiedSlug(s.user);
  if (!me) return { error: err('not_verified', 403) } as const;
  return { s, me } as const;
}

// Carte (nom, image) + proprietaire actuel, lus chez Sorare (jamais fournis par le navigateur)
async function sorareCard(slug: string): Promise<{ name: string; pictureUrl: string; owner: string | null } | null> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
  const jwt = process.env.SORARE_JWT || '', aud = process.env.SORARE_AUD || '';
  if (jwt && aud) { headers['Authorization'] = `Bearer ${jwt}`; headers['JWT-AUD'] = aud; }
  if (process.env.SORARE_API_KEY) headers['APIKEY'] = process.env.SORARE_API_KEY;
  try {
    const r = await fetch('https://api.sorare.com/graphql', {
      method: 'POST', headers, signal: AbortSignal.timeout(8000),
      body: JSON.stringify({ query: `query{anyCard(slug:"${slug}"){slug name pictureUrl user{slug}}}` }),
    });
    if (!r.ok) return null;
    const c = (await r.json())?.data?.anyCard;
    if (!c) return null;
    return { name: String(c.name || ''), pictureUrl: String(c.pictureUrl || ''), owner: c.user?.slug ? String(c.user.slug).toLowerCase() : null };
  } catch { return null; }
}

export async function GET(request: NextRequest) {
  try {
    const w = await who(request);
    if ('error' in w) return w.error;
    const { me } = w;
    const view = request.nextUrl.searchParams.get('view') || 'list';
    if (view === 'unread') return NextResponse.json({ unread: await unreadCount(me) });
    if (view === 'list') {
      const cids = (await redis.zrange('msg:inbox:' + me, 0, 49, { rev: true })) as string[];
      const metas = (await Promise.all(cids.map(readMeta))).filter(Boolean) as Meta[];
      const blocked = new Set((await redis.smembers('msg:block:' + me)) as string[]);
      return NextResponse.json({
        me,
        convs: metas.map(m => {
          const o = other(m, me);
          return { cid: m.cid, other: o, otherPseudo: m.p?.[o] || o, card: m.card, last: m.last, lastFrom: m.lastFrom, at: m.at, unread: Math.max(0, m.n - (m.r?.[me] || 0)), blocked: blocked.has(o) };
        }),
      });
    }
    if (view === 'thread') {
      const cid = request.nextUrl.searchParams.get('cid') || '';
      const m = await readMeta(cid);
      if (!m || (m.a !== me && m.b !== me)) return err('not_found', 404);
      const raw = (await redis.lrange('msg:conv:' + cid + ':m', 0, MAX_THREAD)) as any[];
      const messages: Msg[] = raw.map(x => (typeof x === 'string' ? JSON.parse(x) : x));
      if ((m.r?.[me] || 0) < m.n) { m.r = { ...(m.r || {}), [me]: m.n }; await redis.set('msg:conv:' + cid, JSON.stringify(m), { keepTtl: true } as any); }
      const o = other(m, me);
      return NextResponse.json({
        me, cid, other: o, otherPseudo: m.p?.[o] || o, card: m.card, messages,
        blockedByMe: await isBlocked(me, o), blockedByThem: await isBlocked(o, me),
      });
    }
    return err('bad_request');
  } catch (e) {
    return err('server', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const w = await who(request);
    if ('error' in w) return w.error;
    const { s, me } = w;
    let body: any = null;
    try { body = await request.json(); } catch { return err('bad_request'); }
    const action = String(body?.action || '');

    if (action === 'block') {
      const target = String(body?.slug || '').toLowerCase();
      if (!SLUG_RE.test(target) || target === me) return err('bad_request');
      if (body?.on === false) await redis.srem('msg:block:' + me, target); else await redis.sadd('msg:block:' + me, target);
      return NextResponse.json({ ok: true });
    }

    if (action === 'report') {
      const cid = String(body?.cid || '');
      const m = await readMeta(cid);
      if (!m || (m.a !== me && m.b !== me)) return err('not_found', 404);
      const target = other(m, me);
      const reason = String(body?.reason || '').slice(0, 300);
      const raw = (await redis.lrange('msg:conv:' + cid + ':m', -30, -1)) as any[];
      const last = raw.map(x => (typeof x === 'string' ? JSON.parse(x) : x));
      await redis.rpush('msg:reports', JSON.stringify({ at: Date.now(), cid, by: me, against: target, reason, last }));
      await redis.sadd('msg:block:' + me, target); // le signalement bloque aussi le manager signale, pour la personne qui signale
      await redis.sadd('msg:reportedby:' + target, me);
      const distinct = (await redis.scard('msg:reportedby:' + target)) as number;
      if (distinct >= SUSPEND_AFTER) await redis.set('msg:suspended:' + target, 'yes');
      await mailAdmin(
        `Signalement messagerie : ${target}`,
        `<p><b>${esc(me)}</b> signale <b>${esc(target)}</b> (${distinct} signalement(s) de managers differents${distinct >= SUSPEND_AFTER ? ' — envoi SUSPENDU' : ''}).</p><p>Motif : ${esc(reason) || '—'}</p><p>Carte : ${esc(m.card?.name || '')}</p><pre style="white-space:pre-wrap">${esc(last.map((x: Msg) => `[${new Date(x.at).toISOString()}] ${x.f}: ${x.t}`).join('\n'))}</pre>`,
      );
      return NextResponse.json({ ok: true });
    }

    if (action !== 'send' && action !== 'reply') return err('bad_request');

    const f = checkMessage(String(body?.text || ''));
    if (!f.ok) return NextResponse.json({ error: 'filtered', code: f.code }, { status: 422 });
    if (String(await redis.get('msg:suspended:' + me)) === 'yes') return err('suspended', 403);

    let meta: Meta | null = null;
    if (action === 'reply') {
      meta = await readMeta(String(body?.cid || ''));
      if (!meta || (meta.a !== me && meta.b !== me)) return err('not_found', 404);
      const o = other(meta, me);
      if ((await isBlocked(o, me)) || (await isBlocked(me, o))) return err('cannot_send', 403);
      if (meta.n >= MAX_THREAD) return err('thread_full', 400);
    } else {
      const to = String(body?.to || '').toLowerCase();
      const card = String(body?.card || '').toLowerCase();
      if (!SLUG_RE.test(to) || !CARD_RE.test(card) || to === me) return err('bad_request');
      const rcp = await recipientBySlug(to);
      if (!rcp) return err('recipient_unavailable', 404);
      if ((await isBlocked(to, me)) || (await isBlocked(me, to))) return err('cannot_send', 403);
      const cid = makeCid(me, to, card);
      meta = await readMeta(cid);
      if (!meta) {
        const sc = await sorareCard(card);
        if (!sc) return err('card_unavailable', 404);
        if (sc.owner && sc.owner !== to) return err('card_not_owned', 400);
        if (!(await hitLimit('new', me, LIMIT_NEW_PER_DAY))) return err('limit_new', 429); // compte seulement les vraies nouvelles conversations
        const [x, y] = [me, to].sort();
        meta = { cid, a: x, b: y, p: { [me]: s.user.pseudo || me, [to]: rcp.user.pseudo || to }, card: { slug: card, name: sc.name, pictureUrl: sc.pictureUrl }, n: 0, r: {}, at: Date.now(), last: '', lastFrom: me };
      }
    }
    if (!(await hitLimit('msg', me, LIMIT_MSG_PER_DAY))) return err('limit_msg', 429);
    meta.p = { ...(meta.p || {}), [me]: s.user.pseudo || me };
    const saved = await pushMessage(meta, me, f.text);
    return NextResponse.json({ ok: true, cid: saved.cid });
  } catch (e) {
    return err('server', 500);
  }
}
