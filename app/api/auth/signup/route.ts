import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { redis } from '../../../../lib/redis';
import { sendVerificationEmail } from '../../../../lib/email';
import { checkSorareSlug } from '../../../../lib/sorareUser';
import { userKeyByEmail, createUser, removeUser, normEmail } from '../../../../lib/users';

const VERIFY_HOURS = 24;
const SITE_URL = 'https://mynftlocker.com';

export async function POST(request: NextRequest) {
  // Inscriptions fermees tant que NEXT_PUBLIC_SIGNUP_OPEN n'est pas 'true' (protege aussi contre les appels directs a l'API)
  if (process.env.NEXT_PUBLIC_SIGNUP_OPEN !== 'true') return NextResponse.json({ error: 'Les inscriptions ne sont pas encore ouvertes.' }, { status: 403 });
  try {
    const { pseudo, email, password, sorareSlug, lang } = await request.json();
    if (!pseudo || typeof pseudo !== 'string' || pseudo.trim().length < 2) {
      return NextResponse.json({ error: 'pseudo_invalide' }, { status: 400 });
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'email_invalide' }, { status: 400 });
    }
    const pwdOk = typeof password === 'string'
      && password.length >= 8
      && /[A-Z]/.test(password)
      && /[0-9]/.test(password)
      && /[^A-Za-z0-9]/.test(password);
    if (!pwdOk) {
      return NextResponse.json({ error: 'mot_de_passe_invalide' }, { status: 400 });
    }
    if (!sorareSlug || typeof sorareSlug !== 'string' || sorareSlug.trim().length < 2) {
      return NextResponse.json({ error: 'slug_requis' }, { status: 400 });
    }
    // Le slug Sorare doit exister (verifie chez Sorare) : evite un compte lie a une faute de frappe. Si Sorare est injoignable, on ne bloque pas.
    const slugCheck = await checkSorareSlug(sorareSlug.trim().toLowerCase());
    if (slugCheck.status === 'missing') return NextResponse.json({ error: 'slug_introuvable' }, { status: 400 });
    const existing = await userKeyByEmail(email);
    if (existing) {
      return NextResponse.json({ error: 'email_deja_utilise' }, { status: 409 });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();
    const user = {
      id,
      pseudo: pseudo.trim(),
      email: normEmail(email),
      passwordHash,
      sorareSlug: (typeof sorareSlug === 'string' && sorareSlug.trim()) ? sorareSlug.trim() : null,
      createdAt: Date.now(),
      emailVerified: false,
    };
    const emailKey = await createUser(user); // cle stable : user:<id> (+ index e-mail)
    if (!emailKey) return NextResponse.json({ error: 'email_deja_utilise' }, { status: 409 });

    const verifyToken = crypto.randomBytes(32).toString('hex');
    await redis.set('verify:' + verifyToken, emailKey, { ex: 60 * 60 * VERIFY_HOURS });

    const verifyUrl = `${SITE_URL}/api/auth/verify?token=${verifyToken}`;

    try {
      await sendVerificationEmail(user.email, verifyUrl, lang === 'en' ? 'en' : 'fr');
    } catch (emailErr) {
      // L'email n'est pas parti : on annule proprement la creation (compte + token de verif),
      // pour ne jamais laisser de compte fantome qui bloquerait l'adresse email.
      await removeUser(emailKey, user);
      await redis.del('verify:' + verifyToken);
      return NextResponse.json({ error: 'email_non_envoye', detail: String(emailErr) }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      pendingVerification: true,
      email: user.email,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
