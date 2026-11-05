import { startsFor, isEarlyFR } from '../../../../lib/ttflStart';
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '../../../../lib/redis';
import { espnPlayer } from '../../../../lib/ttflPlayer';
import { allFull, NBA_TEAMS, type FullRow } from '../../../../lib/ttflFull';

type FR = FullRow & { ps?: number };
const seasonOf = (d: string) => { const y = +d.slice(0, 4), m = +d.slice(5, 7); const a = m >= 9 ? y : y - 1; return `${a}-${String(a + 1).slice(2)}`; };

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
  let slug = (req.nextUrl.searchParams.get('slug') || '').trim();
  if (!/^[a-z0-9-]{3,80}$/.test(slug)) return NextResponse.json({ ok: false, error: 'slug invalide' }, { status: 400 });
  // Anti-abus : 60 fiches par minute et par adresse IP (chaque slug inconnu declenche des appels ESPN / Sorare)
  try {
    const ip = (req.headers.get('x-forwarded-for') || 'x').split(',')[0].trim().slice(0, 45); const rk = 'rl:ttfl:player:' + ip + ':' + Math.floor(Date.now() / 60000);
    const n = await redis.incr(rk); if (n === 1) await redis.expire(rk, 90);
    if (n > 60) return NextResponse.json({ ok: false, error: 'Trop de requêtes, réessaie dans une minute.' }, { status: 429 });
  } catch (e) { /* sans limite si Redis indisponible */ }
  try {
    // Lien par nom (ex. onglet blessures) : n-<nom sans accents ni espaces> -> slug Sorare (nom-AAAAMMJJ) via la date de naissance ESPN.
    if (slug.startsWith('n-')) {
      const nm = slug.slice(2); const known = await redis.hget<string>('ttfl:slugmap', nm).catch(() => null);
      if (known) slug = String(known);
      else {
        const ep = await espnPlayer(nm.replace(/-/g, ' '));
        if (!ep || !ep.dob || !ep.name) return NextResponse.json({ ok: false, error: 'Joueur introuvable' }, { status: 404 });
        const dn = ep.name, dob = ep.dob;
        const cand = dn.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + dob;
        const chk = await gql(`{ players(slugs:["${cand}"]){ slug } }`).catch(() => null);
        if (!chk?.players?.[0]) return NextResponse.json({ ok: false, error: 'Joueur introuvable chez Sorare' }, { status: 404 });
        slug = cand; await redis.hset('ttfl:slugmap', { [nm]: cand }).catch(() => {});
      }
    }
    const key = 'ttfl:pub:player3:' + slug;
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
    const all: FR[] = full.rows.filter(r => nrm(r.n) === nrm(p.displayName)).sort((a, b) => (a.d < b.d ? -1 : 1));
    // Historique des 3 saisons precedentes (reprise ESPN) : lignes du joueur par son id ESPN, puis back-to-back via les equipes de la veille.
    const curId = all.length ? (full.rows.find(r => nrm(r.n) === nrm(p.displayName))?.id || '') : '';
    let pid = curId;
    if (!pid) { const ids = String((await redis.hget<string>('ttfl:pidx', nrm(p.displayName)).catch(() => '')) || '').split(',').filter(Boolean); pid = ids[ids.length - 1] || ''; }
    const past: FR[] = [];
    if (pid) {
      const h = await redis.hgetall<Record<string, (string | number)[]>>('ttfl:ph:' + pid).catch(() => null);
      for (const r of Object.values(h || {})) if (NBA_TEAMS.has(String(r[1])) && NBA_TEAMS.has(String(r[2]))) past.push({ id: pid, n: p.displayName, d: String(r[0]), tm: String(r[1]), opp: String(r[2]), home: r[3] === 1, m: +r[4], t: +r[5], pts: +r[6], reb: +r[7], ast: +r[8], stl: +r[9], blk: +r[10], to: +r[11], fgm: +r[12], fga: +r[13], tpm: +r[14], tpa: +r[15], ftm: +r[16], fta: +r[17], gid: String(r[18]), ps: +r[19] });
      past.sort((a, b) => (a.d < b.d ? -1 : 1));
    }
    const prevDay = (d: string) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() - 1); return x.toISOString().slice(0, 10); };
    const prevDates = [...new Set(past.map(r => prevDay(r.d)))];
    const td: Record<string, string[]> = {};
    if (prevDates.length) { const vals = await redis.mget<(string[] | null)[]>(...prevDates.map(d => 'ttfl:td:' + d)).catch(() => []); prevDates.forEach((d, i) => { td[d] = vals?.[i] || []; }); }
    const teamDays = new Set(full.rows.map(r => r.tm + '|' + r.d));
    // Matchs "europeens" (coup d'envoi a 23 h Paris au plus tard) : saison en cours uniquement
    const starts = await startsFor(all.map(r => r.d)).catch(() => ({} as Record<string, Record<string, string>>));
    const isEarly = (r: FR) => isEarlyFR(starts[r.d]?.[r.tm]);
    const isB2b = (r: FR) => (td[prevDay(r.d)] ? td[prevDay(r.d)].includes(r.tm) : teamDays.has(r.tm + '|' + prevDay(r.d)));
    const bundle = (rows: FR[]) => {
      const best = rows.length ? rows.reduce((m, x) => (x.t > m.t ? x : m)) : null; const worst = rows.length ? rows.reduce((m, x) => (x.t < m.t ? x : m)) : null;
      const byOpp: Record<string, FR[]> = {}; rows.forEach(r => (byOpp[r.opp] ||= []).push(r));
      const opps = Object.entries(byOpp).map(([opp, g]) => ({ opp, n: g.length, avg: avg(g.map(x => x.t)) as number })).sort((a, b) => b.avg - a.avg);
      const mean = avg(rows.map(x => x.t)) as number;
      const sd = rows.length > 1 ? +Math.sqrt(rows.reduce((s, x) => s + (x.t - mean) ** 2, 0) / rows.length).toFixed(1) : null;
      return { avg: { season: lines(rows), l10: lines(rows.slice(-10)), l5: lines(rows.slice(-5)), home: lines(rows.filter(r => r.home)), away: lines(rows.filter(r => !r.home)), b2b: lines(rows.filter(isB2b)), rest: lines(rows.filter(r => !isB2b(r))), early: lines(rows.filter(r => isEarly(r) === true)) },
        best: best && { t: best.t, opp: best.opp, d: best.d, gid: best.gid }, worst: worst && { t: worst.t, opp: worst.opp, d: worst.d, gid: worst.gid }, opps, sd };
    };
    const cur = bundle(all); const everything = [...past, ...all];
    const bySeason: Record<string, FR[]> = {}; everything.forEach(r => (bySeason[seasonOf(r.d)] ||= []).push(r));
    const seasons = Object.entries(bySeason).sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([season, g]) => ({ season, n: g.length, ttfl: avg(g.map(x => x.t)), max: Math.max(...g.map(x => x.t)), min: Math.min(...g.map(x => x.t)), min_m: avg(g.map(x => x.m)) }));
    const slim = (r: FR) => ({ e: isEarly(r), b2b: isB2b(r), d: r.d, opp: r.opp, home: r.home, gid: r.gid, t: r.t, m: Math.round(r.m), pts: r.pts, reb: r.reb, ast: r.ast, stl: r.stl, blk: r.blk, to: r.to, fgm: r.fgm, fga: r.fga, tpm: r.tpm, tpa: r.tpa, ftm: r.ftm, fta: r.fta, ps: r.ps ? 1 : 0 });
    const out = {
      ok: true,
      player: { slug: p.slug, name: p.displayName, birthDay: p.birthDay || null, country: p.country || null, stars: p.gameplayTierStars ?? null, pic: p.squaredPictureUrl || null, team: (await espnPlayer(p.displayName).catch(() => null))?.team || (all.length ? all[all.length - 1].tm : (past.length ? past[past.length - 1].tm : null)) },
      card,
      games: all.map(slim), pastGames: past.map(slim),
      ...cur,
      ext: past.length ? bundle(everything) : null, seasons,
    };
    if (!full.failed) await redis.set(key, out, { ex: 600 }).catch(() => {});
    return NextResponse.json(out, { headers: full.failed ? { 'Cache-Control': 'no-store' } : H });
  } catch (e) { return NextResponse.json({ ok: false, error: String(e).slice(0, 200) }, { status: 502 }); }
}
