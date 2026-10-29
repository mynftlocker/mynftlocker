import { NextRequest, NextResponse } from 'next/server';
import { redis } from '../../../lib/redis';
import { sessionUser, getAccounts } from '../../../lib/users';

// Enregistre le dernier vestiaire partage d'un manager : sert a l'image d'apercu des liens (/api/og).
// Reserve a un compte connecte dont le slug fait partie des comptes sport lies. Les images doivent venir de assets.sorare.com.
const IMG_RE = /^https:\/\/assets\.sorare\.com\/[A-Za-z0-9_\-./]+$/;
const clean = (v: any, n: number) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);

export async function POST(request: NextRequest) {
  try {
    const s = await sessionUser(request.cookies.get('mnfl_session')?.value);
    if (!s) return NextResponse.json({ error: 'non_connecte' }, { status: 401 });
    const b = await request.json();
    const slug = clean(b?.slug, 80).toLowerCase();
    if (!/^[a-z0-9_-]{1,80}$/.test(slug)) return NextResponse.json({ error: 'requete_invalide' }, { status: 400 });
    if (!getAccounts(s.user).some((a: any) => String(a.slug || '').toLowerCase() === slug)) return NextResponse.json({ error: 'slug_non_lie' }, { status: 403 });
    const cards = (Array.isArray(b?.cards) ? b.cards : []).slice(0, 5)
      .map((c: any) => ({ n: clean(c?.name, 80), u: String(c?.pictureUrl || '') }))
      .filter((c: any) => IMG_RE.test(c.u));
    if (cards.length === 0) return NextResponse.json({ error: 'aucune_carte' }, { status: 400 });
    if (!(await redis.set('share:rl:' + s.key, 1, { nx: true, ex: 3 }))) return NextResponse.json({ ok: true, skipped: true });
    const snap = { m: clean(b?.manager, 30) || slug, t: clean(b?.title, 40), n: Math.max(0, Math.min(100000, Number(b?.total) || 0)), cards, ts: Date.now() };
    await redis.set('share:' + slug, JSON.stringify(snap), { ex: 60 * 60 * 24 * 60 });
    // prechauffe l'image d'apercu (le robot de X / Discord n'attend pas longtemps) : fire-and-forget
    fetch(request.nextUrl.origin + '/api/og?slug=' + encodeURIComponent(slug)).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
