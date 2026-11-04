import { NextRequest, NextResponse } from 'next/server';
import { ownerOnly } from '../../../../lib/owner';
import { getDayRows, ymdLocal } from '../../../../lib/ttfl';

// Historique TTFL par joueur depuis le debut de saison (nuits terminees, date americaine). Outil prive.
export const maxDuration = 60;
const START = '2026-10-21';
export async function GET(req: NextRequest) {
  const deny = await ownerOnly(req); if (deny) return deny;
  try {
    const dates: string[] = [];
    const end = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
    for (let d = new Date(START + 'T12:00:00'); d <= end; d.setDate(d.getDate() + 1)) dates.push(ymdLocal(d));
    const days = await Promise.all(dates.map(async d => ({ d, rows: await getDayRows(d).catch(() => null) })));
    const hist: Record<string, { d: string; t: number; m: number }[]> = {};
    for (const { d, rows } of days) for (const r of rows || []) (hist[r.n] ||= []).push({ d, t: r.t, m: r.m });
    return NextResponse.json({ ok: true, nights: days.filter(x => x.rows).length, hist }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 502 });
  }
}
