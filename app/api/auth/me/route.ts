import { NextRequest, NextResponse } from 'next/server';
import { sessionUser } from '../../../../lib/users';

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
    });
  } catch (e) {
    return NextResponse.json({ loggedIn: false, error: String(e) });
  }
}
