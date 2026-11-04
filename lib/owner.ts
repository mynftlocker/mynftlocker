import { NextRequest, NextResponse } from 'next/server';
import { sessionUser } from './users';
import { verifiedSlug } from './messages';

// Outils perso (Cup Builder, historique, journal) : reserves au proprietaire du site = compte connecte dont le pseudo Sorare verifie est celui-ci.
export const OWNER_SLUG = 'memejacquet1998';
export async function isOwnerToken(token: string | undefined): Promise<boolean> {
  try { const s = await sessionUser(token); return !!s && verifiedSlug(s.user) === OWNER_SLUG; } catch { return false; }
}
// Garde pour les routes API : renvoie une reponse 404 (on ne revele pas l'existence) si ce n'est pas le proprietaire, sinon null.
export async function ownerOnly(req: NextRequest): Promise<NextResponse | null> {
  return (await isOwnerToken(req.cookies.get('mnfl_session')?.value)) ? null : NextResponse.json({ error: 'not_found' }, { status: 404 });
}
