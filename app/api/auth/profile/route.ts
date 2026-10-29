import { NextRequest, NextResponse } from 'next/server';
import { sessionUser, saveUser } from '../../../../lib/users';

const COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000; // pseudo modifiable une fois tous les 3 mois

// Changement de pseudo (utilisateur connecte)
export async function POST(request: NextRequest) {
  try {
    const s = await sessionUser(request.cookies.get('mnfl_session')?.value);
    if (!s) return NextResponse.json({ error: 'non_connecte' }, { status: 401 });
    const { key, user } = s;

    const body = await request.json();
    const pseudo = typeof body?.pseudo === 'string' ? body.pseudo.trim() : '';
    if (pseudo.length < 2 || pseudo.length > 30) return NextResponse.json({ error: 'pseudo_invalide' }, { status: 400 });
    if (pseudo === user.pseudo) return NextResponse.json({ ok: true, pseudo, pseudoChangedAt: user.pseudoChangedAt || null });

    const last = typeof user.pseudoChangedAt === 'number' ? user.pseudoChangedAt : 0;
    if (last && Date.now() - last < COOLDOWN_MS) {
      return NextResponse.json({ error: 'pseudo_trop_recent', nextAt: last + COOLDOWN_MS }, { status: 429 });
    }
    user.pseudo = pseudo;
    user.pseudoChangedAt = Date.now();
    await saveUser(key, user);
    return NextResponse.json({ ok: true, pseudo, pseudoChangedAt: user.pseudoChangedAt });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
