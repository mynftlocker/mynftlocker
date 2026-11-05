import { NextRequest, NextResponse } from 'next/server';
import { redis } from '../../../../lib/redis';
import { allFull, type FullRow } from '../../../../lib/ttflFull';

// Fiche joueur TTFL publique : identite (Sorare), historique complet des scores TTFL et moyennes de stats, carte Sorare.
export const maxDuration = 60;
const nrm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const GQL = 'https://api.sorare.com/graphql';
async function gql(query: string) {
  const r = await fetch(GQL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }), signal: AbortSignal.timeout(20000), next: { revalidate: 3600 } });
  const j = await r.json(); if (!j?.data) throw new Error(JSON.stringify(j?.errors || j).slice(0, 200)); return j.data;
}
const avg = (a: number[]) => (a.length ? +(a.reduce((s, x) => s + x, 0) / a.length).toFixed(1) : null);
const lines = (g: FullRow[]) => ({
  n: g.length, ttfl: avg(g.map(x => x.t)), min: avg(g.map(x => x.m)), pts: avg(g.map(x => x.pts)), reb: avg(g.map(x => x.reb)), ast: avg(g.map(x => x.ast)), stl: avg(g.map(x => x.stl)), blk: avg(g.map(x => x.blk)), to: avg(g.map(x => x.to)),
  fgm: avg(g.map(x => x.fgm)), fgmiss: avg(g.map(x => x.fga - x.fgm)), tpm: avg(g.map(x => x.tpm)), tpmiss: avg(g.map(x => x.tpa - x.tpm)), ftm: avg(g.map(x => x.ftm)), ftmiss: avg(g.map(x => x.fta - x.ftm)),
});

export async function GET(req: NextRequest) {
  const slug = (req.nextUrl.searchParams.get('slug') || '').trim();
  if (!/^[a-z0-9-]{3,80}$/.test(slug)) return NextResponse.json({ ok: false, error: 'slug invalide' }, { status: 400 });
  try {
    const key = 'ttfl:pub:player:' + slug;
    const hit = await redis.get<any>(key).catch(() => null);
    const H = { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' };
    if (hit) return NextResponse.json(hit, { headers: H });
    const d = await gql(`{ players(slugs:["${slug}"]){ slug displayName ...on NBAPlayer{ birthDay country{ name code } gameplayTierStars squaredPictureUrl } } }`);
    const p = d.players?.[0]; if (!p) return NextResponse.json({ ok: false, error: 'Joueur introuvable' }, { status: 404 });
    // Plus belle carte : Limited In-Season de la saison la plus recente (a defaut, la plus recente).
    let card: { slug: string; pic: string; year: number } | null = null;
    try {
      const c = await gql(`{ tokens{ allCards(first:50, sport:NBA, playerSlug:"${slug}", rarities:[limited]){ nodes{ slug pictureUrl seasonYear inSeasonEligible } } } }`);
      const cs: any[] = (c.tokens?.allCards?.nodes || []).filter((x: any) => x.pictureUrl).sort((a: any, b: any) => (Number(b.inSeasonEligible) - Number(a.inSeasonEligible)) || (Number(b.seasonYear) - Number(a.seasonYear)));
      if (cs[0]) card = { slug: cs[0].slug, pic: cs[0].pictureUrl, year: Number(cs[0].seasonYear) };
    } catch { /* pas de carte */ }
    const full = await allFull();
    const all = full.rows.filter(r => nrm(r.n) === nrm(p.displayName)).sort((a, b) => (a.d < b.d ? -1 : 1));
    const best = all.length ? all.reduce((m, x) => (x.t > m.t ? x : m)) : null; const worst = all.length ? all.reduce((m, x) => (x.t < m.t ? x : m)) : null;
    const byOpp: Record<string, FullRow[]> = {}; all.forEach(r => (byOpp[r.opp] ||= []).push(r));
    const opps = Object.entries(byOpp).map(([opp, g]) => ({ opp, n: g.length, avg: avg(g.map(x => x.t)) as number })).sort((a, b) => b.avg - a.avg);
    const mean = avg(all.map(x => x.t)) as number;
    const sd = all.length > 1 ? +Math.sqrt(all.reduce((s, x) => s + (x.t - mean) ** 2, 0) / all.length).toFixed(1) : null;
    const out = {
      ok: true,
      player: { slug: p.slug, name: p.displayName, birthDay: p.birthDay || null, country: p.country || null, stars: p.gameplayTierStars ?? null, pic: p.squaredPictureUrl || null, team: all.length ? all[all.length - 1].tm : null },
      card,
      games: all.map(r => ({ d: r.d, opp: r.opp, home: r.home, gid: r.gid, t: r.t, m: Math.round(r.m), pts: r.pts, reb: r.reb, ast: r.ast, stl: r.stl, blk: r.blk, to: r.to, fgm: r.fgm, fga: r.fga, tpm: r.tpm, tpa: r.tpa, ftm: r.ftm, fta: r.fta })),
      avg: { season: lines(all), l10: lines(all.slice(-10)), l5: lines(all.slice(-5)), home: lines(all.filter(r => r.home)), away: lines(all.filter(r => !r.home)) },
      best: best && { t: best.t, opp: best.opp, d: best.d, gid: best.gid }, worst: worst && { t: worst.t, opp: worst.opp, d: worst.d, gid: worst.gid }, opps, sd,
    };
    if (!full.failed) await redis.set(key, out, { ex: 600 }).catch(() => {});
    return NextResponse.json(out, { headers: full.failed ? { 'Cache-Control': 'no-store' } : H });
  } catch (e) { return NextResponse.json({ ok: false, error: String(e).slice(0, 200) }, { status: 502 }); }
}
