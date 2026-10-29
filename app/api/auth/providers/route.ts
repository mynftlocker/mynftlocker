import { NextResponse } from 'next/server';
import { PROVIDERS, isConfigured } from '../../../../lib/oauth';

// Quels reseaux sont prets (cles presentes sur Vercel) : les boutons ne s'affichent que pour eux.
export async function GET() {
  const out: Record<string, boolean> = {};
  for (const id of Object.keys(PROVIDERS) as (keyof typeof PROVIDERS)[]) out[id] = isConfigured(PROVIDERS[id]);
  return NextResponse.json(out);
}
