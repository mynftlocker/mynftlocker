import { NextRequest, NextResponse } from 'next/server';
import { redis } from '../../../../lib/redis';
import { checkSorareSlug } from '../../../../lib/sorareUser';

// Modification du slug Sorare lie au compte (utilisateur connecte).
// Le slug est verifie chez Sorare avant d'etre enregistre : impossible de sauvegarder une faute de frappe.
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('mnfl_session')?.value;
    if (!token) return NextResponse.json({ error: 'non_connecte' }, { status: 401 });
    const emailKey = await redis.get('session:' + token);
    if (!emailKey || typeof emailKey !== 'string') return NextResponse.json({ error: 'non_connecte' }, { status: 401 });
    const raw = await redis.get(emailKey);
    if (!raw) return NextResponse.json({ error: 'non_connecte' }, { status: 401 });
    const user = typeof raw === 'string' ? JSON.parse(raw) : raw;

    const body = await request.json();
    const slug = typeof body?.slug === 'string' ? body.slug.trim().toLowerCase() : '';
    if (!/^[a-z0-9_-]{2,80}$/.test(slug)) return NextResponse.json({ error: 'slug_invalide' }, { status: 400 });

    const chk = await checkSorareSlug(slug);
    if (chk.status === 'missing') return NextResponse.json({ error: 'slug_introuvable' }, { status: 404 });
    if (chk.status === 'error') return NextResponse.json({ error: 'sorare_indisponible' }, { status: 502 });

    user.sorareSlug = slug;
    await redis.set(emailKey, JSON.stringify(user));
    return NextResponse.json({ ok: true, slug });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
