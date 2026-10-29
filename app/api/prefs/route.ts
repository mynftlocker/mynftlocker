import { NextRequest, NextResponse } from 'next/server';
import { redis } from '../../../lib/redis';
import { sessionUser } from '../../../lib/users';

// Preferences du compte (HoF, 5 majeur, equipe par defaut, managers favoris, modes) : une simple table cle -> texte, reservee a l'utilisateur connecte.
const KEY_RE = /^(mynftlocker_hof|mynftlocker_default_team_|mynftlocker_lineup|mnfl_arcade|mnfl_gameplay|mnfl_favs)[A-Za-z0-9_-]*$/;
const MAX_KEYS = 600;
const MAX_BYTES = 200_000;

async function currentUserKey(request: NextRequest): Promise<string | null> {
  const s = await sessionUser(request.cookies.get('mnfl_session')?.value);
  return s ? s.key : null;
}

export async function GET(request: NextRequest) {
  try {
    const userKey = await currentUserKey(request);
    if (!userKey) return NextResponse.json({ error: 'non_connecte' }, { status: 401 });
    const raw = await redis.get('prefs:' + userKey);
    const prefs = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {};
    return NextResponse.json({ prefs });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userKey = await currentUserKey(request);
    if (!userKey) return NextResponse.json({ error: 'non_connecte' }, { status: 401 });
    const body = await request.json();
    const input = body?.prefs;
    if (!input || typeof input !== 'object' || Array.isArray(input)) return NextResponse.json({ error: 'requete_invalide' }, { status: 400 });
    const clean: Record<string, string> = {};
    for (const k of Object.keys(input)) {
      if (KEY_RE.test(k) && typeof input[k] === 'string') clean[k] = input[k];
    }
    const json = JSON.stringify(clean);
    if (Object.keys(clean).length > MAX_KEYS || json.length > MAX_BYTES) return NextResponse.json({ error: 'trop_volumineux' }, { status: 413 });
    await redis.set('prefs:' + userKey, json);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
