import { NextRequest, NextResponse } from 'next/server';
import { checkSorareSlug } from '../../../../lib/sorareUser';

// Verification en direct d'un slug Sorare (utilisee pendant la saisie : inscription, correction de slug).
export async function GET(request: NextRequest) {
  const slug = (request.nextUrl.searchParams.get('slug') || '').trim().toLowerCase();
  const res = await checkSorareSlug(slug);
  return NextResponse.json(
    res.status === 'found' ? { status: 'found', nickname: res.nickname } : { status: res.status, detail: (res as any).detail },
    { headers: { 'Cache-Control': 'private, max-age=60' } },
  );
}
