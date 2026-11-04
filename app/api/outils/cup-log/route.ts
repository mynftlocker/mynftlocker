import { NextRequest, NextResponse } from 'next/server';
import { redis } from '../../../../lib/redis';
import { ownerOnly } from '../../../../lib/owner';

// Journal estimation / reel du Cup Builder : chaque jour on garde l'estimation de la nuit suivante, puis on relit les vrais scores.
// ?run=1 : (appele par le cron quotidien) snapshot de demain + relevé des scores des nuits de plus de 2 jours. Sans parametre : resume de precision.
export const maxDuration = 60;
const GQL = 'https://api.sorare.com/graphql';
async function gql(query: string) {
  const r = await fetch(GQL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }), signal: AbortSignal.timeout(20000), cache: 'no-store' });
  const j = await r.json(); if (!j?.data) throw new Error(JSON.stringify(j?.errors || j).slice(0, 200)); return j.data;
}
const day = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(d);
const plus = (n: number) => day(new Date(Date.now() + n * 86400000));
type Snap = { t: number; p: [string, number, number | null, number | null, number | null, number | null, string | null][] };

async function snapshot(origin: string, night: string) {
  const [haveC, haveT] = await Promise.all([redis.get(`cuplog:snap:${night}`), redis.get(`ttflog:snap:${night}`)]);
  if (haveC && haveT) return 'deja';
  const r = await fetch(`${origin}/api/outils/cup?night=${night}`, { cache: 'no-store' });
  const j = await r.json(); const pl: any[] = (j.players || []).filter((p: any) => p.pm);
  if (!pl.length) return 'vide';
  const snap: Snap = { t: Date.now(), p: pl.map(p => [p.slug, p.proj, p.l5 ?? null, p.l10 ?? null, p.sd ?? null, p.max ?? null, p.inj ?? null]) };
  if (!haveC) await redis.set(`cuplog:snap:${night}`, snap, { ex: 60 * 86400 });
  // Journal TTFL : memes entrees mais avec le nom (le score TTFL reel est relu par nom dans les box-scores ESPN)
  if (!haveT) await redis.set(`ttflog:snap:${night}`, pl.map(p => [p.name, p.proj, p.l5 ?? null, p.l10 ?? null, p.inj ?? null]), { ex: 60 * 86400 }).catch(() => {});
  return pl.length;
}
async function settle(night: string) {
  if (await redis.get(`cuplog:res:${night}`)) return 'deja';
  const snap = await redis.get<Snap>(`cuplog:snap:${night}`); if (!snap) return 'sans-snap';
  const slugs = snap.p.map(x => x[0]); const res: Record<string, number> = {};
  const groups: string[][] = []; for (let i = 0; i < slugs.length; i += 6) groups.push(slugs.slice(i, i + 6));
  let gi = 0;
  await Promise.all(Array.from({ length: 4 }, async () => { for (;;) { const g = groups[gi++]; if (!g) return;
    try { const d = await gql(`{ players(slugs:${JSON.stringify(g)}){ slug ... on NBAPlayer{ playerGameScores(last:4){ score anyGame{ ... on GameOfBasketball{ date } } } } } }`);
      for (const p of d.players || []) for (const s of p.playerGameScores || []) if (s?.anyGame?.date && day(new Date(s.anyGame.date)) === night && s.score != null) res[p.slug] = Number(s.score);
    } catch {} } }));
  await redis.set(`cuplog:res:${night}`, res, { ex: 120 * 86400 }); return Object.keys(res).length;
}

export async function GET(req: NextRequest) {
  try {
    if (req.nextUrl.searchParams.get('run')) {
      if (!(await redis.set('cuplog:lock', 1, { nx: true, ex: 1800 }))) return NextResponse.json({ ok: true, skipped: 'recent' });
      const out: Record<string, unknown> = {};
      out.snapshot = await snapshot(req.nextUrl.origin, plus(1));
      for (let k = 2; k <= 9; k++) { const n = plus(-k); if (await redis.get(`cuplog:snap:${n}`)) out[n] = await settle(n); }
      return NextResponse.json({ ok: true, ...out });
    }
    // resume : prive
    const deny = await ownerOnly(req); if (deny) return deny;
    const nights: string[] = []; for (let k = 2; k <= 60; k++) nights.push(plus(-k));
    const agg = { n: 0, dnp: 0, sP: 0, sM: 0, s5: 0, s10: 0, bP: 0, bM: 0, big: 0, bigPred: 0 }; const per: any[] = [];
    for (const n of nights) {
      const [snap, res] = await Promise.all([redis.get<Snap>(`cuplog:snap:${n}`), redis.get<Record<string, number>>(`cuplog:res:${n}`)]);
      if (!snap || !res) continue; let c = 0, e = 0;
      for (const [slug, proj, l5, l10, , , inj] of snap.p) {
        const s = res[slug]; if (s == null || proj < 5 || inj === 'OUT') continue;
        if (!(s > 0)) { agg.dnp++; continue; }
        const a = l5 ?? proj, b = l10 ?? proj, mix = 0.7 * proj + 0.1 * a + 0.2 * b;
        agg.n++; c++; agg.sP += Math.abs(s - proj); agg.sM += Math.abs(s - mix); agg.s5 += Math.abs(s - a); agg.s10 += Math.abs(s - b); agg.bP += s - proj; agg.bM += s - mix; e += Math.abs(s - proj);
      }
      if (c) per.push({ night: n, joueurs: c, maeSorare: +(e / c).toFixed(2) });
    }
    const f = (x: number) => (agg.n ? +(x / agg.n).toFixed(2) : null);
    return NextResponse.json({ nuits: per.length, joueurs: agg.n, dnp: agg.dnp, maeSorare: f(agg.sP), maeMix: f(agg.sM), maeL5: f(agg.s5), maeL10: f(agg.s10), biaisSorare: f(agg.bP), biaisMix: f(agg.bM), per });
  } catch (e: any) { return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 }); }
}
