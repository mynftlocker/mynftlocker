import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { redis } from '../../../../lib/redis';
import { sessionUser, userKeyByEmail, normEmail } from '../../../../lib/users';
import { sendEmailChangeConfirm, sendEmailChangeAlert } from '../../../../lib/email';

const SITE_URL = 'https://mynftlocker.com';
const HOURS = 24;

// Demande de changement d'adresse e-mail : on n'echange RIEN tant que la nouvelle adresse n'a pas ete confirmee par lien.
export async function POST(request: NextRequest) {
  try {
    const s = await sessionUser(request.cookies.get('mnfl_session')?.value);
    if (!s) return NextResponse.json({ error: 'non_connecte' }, { status: 401 });
    const { key, user } = s;

    const body = await request.json();
    const newEmail = typeof body?.newEmail === 'string' ? normEmail(body.newEmail) : '';
    const lang = body?.lang === 'en' ? 'en' : 'fr';
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) return NextResponse.json({ error: 'email_invalide' }, { status: 400 });
    if (user.email && newEmail === normEmail(user.email)) return NextResponse.json({ error: 'email_identique' }, { status: 400 });

    // Compte avec mot de passe : on le redemande (autorisation). Compte Google seul : la session + la confirmation par lien suffisent.
    if (user.passwordHash) {
      if (typeof body?.password !== 'string' || !(await bcrypt.compare(body.password, user.passwordHash))) {
        return NextResponse.json({ error: 'mot_de_passe_invalide' }, { status: 403 });
      }
    }

    // Limite : 3 demandes par heure
    const rlKey = 'emailchange:rl:' + user.id;
    const n = await redis.incr(rlKey);
    if (n === 1) await redis.expire(rlKey, 3600);
    if (n > 3) return NextResponse.json({ error: 'trop_de_demandes' }, { status: 429 });

    if (await userKeyByEmail(newEmail)) return NextResponse.json({ error: 'email_deja_utilise' }, { status: 409 });

    const token = crypto.randomBytes(32).toString('hex');
    await redis.set('emailchange:' + token, JSON.stringify({ key, oldEmail: user.email ? normEmail(user.email) : '', newEmail }), { ex: 60 * 60 * HOURS });
    const url = `${SITE_URL}/api/auth/email-confirm?token=${token}`;
    try {
      await sendEmailChangeConfirm(newEmail, url, lang);
    } catch (err) {
      await redis.del('emailchange:' + token);
      return NextResponse.json({ error: 'email_non_envoye', detail: String(err) }, { status: 502 });
    }
    // Alerte sur l'ancienne adresse (best effort)
    if (user.email) { try { await sendEmailChangeAlert(user.email, newEmail, lang); } catch {} }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
