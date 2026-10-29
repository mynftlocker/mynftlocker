import { NextRequest, NextResponse } from 'next/server';
import { checkSorareSlug } from '../../../../lib/sorareUser';
import { sessionUser, saveUser } from '../../../../lib/users';

// Modification du slug Sorare lie au compte (utilisateur connecte).
// Le slug est verifie chez Sorare avant d'etre enregistre : impossible de sauvegarder une faute de frappe.
// A la toute premiere configuration (compte cree via Google : pas encore de slug), le pseudo peut etre choisi en meme temps, sans delai.
export async function POST(request: NextRequest) {
  try {
    const s = await sessionUser(request.cookies.get('mnfl_session')?.value);
    if (!s) return NextResponse.json({ error: 'non_connecte' }, { status: 401 });
    const { key, user } = s;

    const body = await request.json();
    const slug = typeof body?.slug === 'string' ? body.slug.trim().toLowerCase() : '';
    if (!/^[a-z0-9_-]{2,80}$/.test(slug)) return NextResponse.json({ error: 'slug_invalide' }, { status: 400 });

    let newPseudo: string | null = null;
    if (!user.sorareSlug && typeof body?.pseudo === 'string') {
      const p = body.pseudo.trim();
      if (p.length < 2 || p.length > 30) return NextResponse.json({ error: 'pseudo_invalide' }, { status: 400 });
      newPseudo = p;
    }

    const chk = await checkSorareSlug(slug);
    if (chk.status === 'missing') return NextResponse.json({ error: 'slug_introuvable' }, { status: 404 });
    if (chk.status === 'error') return NextResponse.json({ error: 'sorare_indisponible' }, { status: 502 });

    user.sorareSlug = slug;
    if (newPseudo) user.pseudo = newPseudo;
    await saveUser(key, user);
    return NextResponse.json({ ok: true, slug, pseudo: user.pseudo });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
