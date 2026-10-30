import { NextRequest, NextResponse } from 'next/server';
import { sessionUser, getAccounts } from '../../../../lib/users';
import { verifiedSlug } from '../../../../lib/messages';
import { redis } from '../../../../lib/redis';

export async function GET(request: NextRequest) {
  try {
    const s = await sessionUser(request.cookies.get('mnfl_session')?.value);
    if (!s) return NextResponse.json({ loggedIn: false });
    const user = s.user;
    // Messagerie : index slug Sorare verifie -> compte (permet de retrouver le destinataire d'un message)
    const vs = verifiedSlug(user);
    if (vs && user.id) { try { await redis.set('msgslug:' + vs, user.id); } catch {} }
    return NextResponse.json({
      loggedIn: true,
      pseudo: user.pseudo,
      email: user.email,
      sorareSlug: user.sorareSlug,
      pseudoChangedAt: user.pseudoChangedAt || null,
      hasPassword: !!user.passwordHash,
      msgSlug: vs,
      accounts: getAccounts(user),
      profiles: user.profiles || {},
      connections: [...(user.googleSub ? ['google'] : []), ...((user.identities || []).map((i: any) => i.provider))],
    });
  } catch (e) {
    return NextResponse.json({ loggedIn: false, error: String(e) });
  }
}
