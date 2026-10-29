import { NextRequest, NextResponse } from 'next/server';
import { redis } from '../../../../lib/redis';
import { readUser, saveUser, userKeyByEmail, normEmail, parseJson } from '../../../../lib/users';

const SITE_URL = 'https://mynftlocker.com';

// Clic sur le lien recu a la NOUVELLE adresse : c'est la qu'on bascule l'e-mail du compte.
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token') || '';
    if (!token) return NextResponse.redirect(`${SITE_URL}/?email=error`);
    const data = parseJson(await redis.get('emailchange:' + token));
    if (!data || !data.key || !data.newEmail) return NextResponse.redirect(`${SITE_URL}/?email=expired`);

    const user = await readUser(data.key);
    if (!user || (user.email ? normEmail(user.email) : '') !== data.oldEmail) return NextResponse.redirect(`${SITE_URL}/?email=error`);

    const taken = await userKeyByEmail(data.newEmail);
    if (taken && taken !== data.key) return NextResponse.redirect(`${SITE_URL}/?email=taken`);

    await redis.set('email:' + data.newEmail, user.id);
    if (data.oldEmail) await redis.del('email:' + data.oldEmail);
    user.email = data.newEmail;
    user.emailVerified = true;
    await saveUser(data.key, user);
    await redis.del('emailchange:' + token);
    return NextResponse.redirect(`${SITE_URL}/?email=changed`);
  } catch {
    return NextResponse.redirect(`${SITE_URL}/?email=error`);
  }
}
