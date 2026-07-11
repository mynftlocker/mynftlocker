import { NextRequest, NextResponse } from 'next/server';
import { redis } from '../../../../lib/redis';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('mnfl_session')?.value;
    if (token) {
      await redis.del('session:' + token);
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set('mnfl_session', '', { path: '/', maxAge: 0 });
    return res;
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
