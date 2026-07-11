import { NextRequest, NextResponse } from 'next/server';
import { redis } from '../../../../lib/redis';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('mnfl_session')?.value;
    if (!token) {
      return NextResponse.json({ loggedIn: false });
    }
    const emailKey = await redis.get('session:' + token);
    if (!emailKey || typeof emailKey !== 'string') {
      return NextResponse.json({ loggedIn: false });
    }
    const raw = await redis.get(emailKey);
    if (!raw) {
      return NextResponse.json({ loggedIn: false });
    }
    const user = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return NextResponse.json({
      loggedIn: true,
      pseudo: user.pseudo,
      email: user.email,
      sorareSlug: user.sorareSlug,
    });
  } catch (e) {
    return NextResponse.json({ loggedIn: false, error: String(e) });
  }
}
