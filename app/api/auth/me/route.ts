import { NextRequest, NextResponse } from 'next/server';
import { sessionUser, getAccounts } from '../../../../lib/users';

export async function GET(request: NextRequest) {
  try {
    const s = await sessionUser(request.cookies.get('mnfl_session')?.value);
    if (!s) return NextResponse.json({ loggedIn: false });
    const user = s.user;
    return NextResponse.json({
      loggedIn: true,
      pseudo: user.pseudo,
      email: user.email,
      sorareSlug: user.sorareSlug,
      pseudoChangedAt: user.pseudoChangedAt || null,
      hasPassword: !!user.passwordHash,
      accounts: getAccounts(user),
      profiles: user.profiles || {},
      connections: [...(user.googleSub ? ['google'] : []), ...((user.identities || []).map((i: any) => i.provider))],
    });
  } catch (e) {
    return NextResponse.json({ loggedIn: false, error: String(e) });
  }
}
