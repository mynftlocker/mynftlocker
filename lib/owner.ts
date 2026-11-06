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

// Testeurs invites du GW Builder (comptes Sorare verifies) : acces a l'outil GW Builder uniquement, avec leurs propres compos et leur propre collection.
export const GW_TESTERS = ['bo0ya', 'benjguib', 'alanders'];
export async function toolSlug(token: string | undefined): Promise<string | null> {
  try { const s = await sessionUser(token); const v = s ? verifiedSlug(s.user) : null; return v && (v === OWNER_SLUG || GW_TESTERS.includes(v)) ? v : null; } catch { return null; }
}
export async function toolUserOnly(req: NextRequest): Promise<NextResponse | null> {
  return (await toolSlug(req.cookies.get('mnfl_session')?.value)) ? null : NextResponse.json({ error: 'not_found' }, { status: 404 });
}
