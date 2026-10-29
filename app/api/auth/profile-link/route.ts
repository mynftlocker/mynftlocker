import { NextRequest, NextResponse } from 'next/server';
import { sessionUser, saveUser } from '../../../../lib/users';

// Profils de reseaux saisis a la main (non verifies) : pour l'instant X. Handle vide = suppression.
const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;

export async function POST(request: NextRequest) {
  try {
    const s = await sessionUser(request.cookies.get('mnfl_session')?.value);
    if (!s) return NextResponse.json({ error: 'non_connecte' }, { status: 401 });
    const body = await request.json();
    if (body?.network !== 'x') return NextResponse.json({ error: 'requete_invalide' }, { status: 400 });
    // On accepte "@pseudo" ou un lien x.com/pseudo ou twitter.com/pseudo
    let h = typeof body?.handle === 'string' ? body.handle.trim() : '';
    h = h.replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, '').replace(/[/?#].*$/, '').replace(/^@/, '');
    const profiles = { ...(s.user.profiles || {}) };
    if (!h) delete profiles.x;
    else {
      if (!HANDLE_RE.test(h)) return NextResponse.json({ error: 'handle_invalide' }, { status: 400 });
      profiles.x = h;
    }
    s.user.profiles = profiles;
    await saveUser(s.key, s.user);
    return NextResponse.json({ ok: true, handle: profiles.x || '' });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
