import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { redis } from '../../../../lib/redis';
import { sendVerificationEmail } from '../../../../lib/email';

const VERIFY_HOURS = 24;
const SITE_URL = 'https://mynftlocker.vercel.app'; // TODO: remplacer par le vrai domaine une fois créé

export async function POST(request: NextRequest) {
  try {
    const { pseudo, email, password, sorareSlug } = await request.json();
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
    const emailKey = 'user:' + email.toLowerCase().trim();
    const existing = await redis.get(emailKey);
    if (existing) {
      return NextResponse.json({ error: 'email_deja_utilise' }, { status: 409 });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();
    const user = {
      id,
      pseudo: pseudo.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      sorareSlug: (typeof sorareSlug === 'string' && sorareSlug.trim()) ? sorareSlug.trim() : null,
      createdAt: Date.now(),
      emailVerified: false,
    };
    await redis.set(emailKey, JSON.stringify(user));

    const verifyToken = crypto.randomBytes(32).toString('hex');
    await redis.set('verify:' + verifyToken, emailKey, { ex: 60 * 60 * VERIFY_HOURS });

    const verifyUrl = `${SITE_URL}/api/auth/verify?token=${verifyToken}`;

    try {
      await sendVerificationEmail(user.email, verifyUrl);
    } catch (emailErr) {
      // L'email n'est pas parti : on annule proprement la creation (compte + token de verif),
      // pour ne jamais laisser de compte fantome qui bloquerait l'adresse email.
      await redis.del(emailKey);
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
