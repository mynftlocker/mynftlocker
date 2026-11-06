import { NextRequest, NextResponse } from 'next/server';
import { ownerOnly } from '../../../../lib/owner';
import { redis } from '../../../../lib/redis';

// Seuils reels des Arena Rooms NBA (API publique Sorare, GW deja terminees) par type de room et par rarete : score de la 5e place (limite de rentabilite),
// du podium et du 1er, + les recompenses de la room. Reserve au proprietaire. Cache 6 h.
// v3 (audit 06/11) : le niveau des scores depend surtout du NOMBRE DE MATCHS de la GW (backtest : correlation 0,96 a 0,99 entre nb de matchs et score de la 5e place).
// On echantillonne jusqu'a 6 GW terminees, on ajuste score = a + b x nb de matchs par type/rarete, puis on ramene chaque room au nombre de matchs de la GW EN COURS.
export const maxDuration = 60;
const H: Record<string, string> = { 'Content-Type': 'application/json' };
async function gq(q: string) {
  if (process.env.SORARE_API_KEY) H['APIKEY'] = process.env.SORARE_API_KEY;
  const r = await fetch('https://api.sorare.com/graphql', { method: 'POST', headers: H, body: JSON.stringify({ query: q }), signal: AbortSignal.timeout(25000) });
  const j = await r.json(); if (!j?.data) throw new Error(JSON.stringify(j?.errors || j).slice(0, 200)); return j.data;
}
const med = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const TYPES: Record<string, string> = { Champion: 'champ', Contender: 'cont', Uncapped: 'unc', Veterans: 'vet', U23: 'u23' };
const ROOMS_PER_GW = 10, MAX_GW = 6;

// Droite des moindres carres y = a + b x (b borne a [0, bmax] pour rester prudent)
function line(xs: number[], ys: number[], bmax = 4) {
  const n = xs.length, mx = xs.reduce((s, v) => s + v, 0) / n, my = ys.reduce((s, v) => s + v, 0) / n;
  const sxx = xs.reduce((s, v) => s + (v - mx) ** 2, 0), sxy = xs.reduce((s, v, i) => s + (v - mx) * (ys[i] - my), 0);
  const b = sxx > 0 ? Math.max(0, Math.min(bmax, sxy / sxx)) : 0;
  return (x: number) => my + b * (x - mx);
}

export async function GET(req: NextRequest) {
  const deny = await ownerOnly(req); if (deny) return deny;
  const KEY = 'gwb:arena:v3';
  if (!req.nextUrl.searchParams.get('fresh')) { const hit = await redis.get<any>(KEY).catch(() => null); if (hit) return NextResponse.json(hit); }
  try {
    const all = (await gq('{ so5{ so5Fixtures(first:10, sport:NBA){ nodes{ slug gameWeek aasmState } } } }')).so5.so5Fixtures.nodes as { slug: string; gameWeek: number; aasmState: string }[];
    const gamesOf = async (slug: string) => ((await gq(`{ so5{ so5Fixture(slug:"${slug}"){ games{ id } } } }`)).so5.so5Fixture?.games || []).length as number;
    const cur = all.filter(f => f.aasmState === 'opened').sort((a, b) => a.gameWeek - b.gameWeek)[0];
    const curGames = cur ? await gamesOf(cur.slug) : 0;
    // GW terminees d'une saison reguliere (10 a 40 matchs : on ecarte les fixtures de playoffs / intersaison)
    const done: { slug: string; gw: number; g: number }[] = [];
    for (const f of all.filter(f => f.aasmState === 'closed' || f.aasmState === 'computed').sort((a, b) => b.gameWeek - a.gameWeek)) {
      if (done.length >= MAX_GW) break;
      const g = await gamesOf(f.slug); if (g >= 10 && g <= 40) done.push({ slug: f.slug, gw: f.gameWeek, g });
    }
    type Room = { key: string; gw: number; g: number; slug: string; top: number[] };
    const groups: Record<string, { slug: string; gw: number; g: number }[]> = {};
    const rewardSlug: Record<string, string> = {};
    for (const f of done) {
      const L = (await gq(`{ so5{ so5Fixture(slug:"${f.slug}"){ so5Leaderboards{ slug displayName } } } }`)).so5.so5Fixture.so5Leaderboards as { slug: string; displayName: string }[];
      for (const l of L) { const m = l.slug.match(/_(limited|rare|super_rare)_arena_/); const t = TYPES[l.displayName]; if (!m || !t) continue; const k = `${m[1]}|${t}`; (groups[k] ||= []).push({ slug: l.slug, gw: f.gw, g: f.g }); if (m[1] === 'limited' && !rewardSlug[t]) rewardSlug[t] = l.slug; }
    }
    // echantillon : ROOMS_PER_GW rooms par GW et par cle
    const jobs: { k: string; slug: string; gw: number; g: number }[] = [];
    for (const [k, ls] of Object.entries(groups)) for (const f of done) jobs.push(...ls.filter(l => l.gw === f.gw).sort(() => Math.random() - 0.5).slice(0, ROOMS_PER_GW).map(l => ({ k, ...l })));
    const rooms: Room[] = [];
    const batches: typeof jobs[] = []; for (let i = 0; i < jobs.length; i += 5) batches.push(jobs.slice(i, i + 5));
    let bi = 0;
    await Promise.all(Array.from({ length: 4 }, async () => { while (bi < batches.length) {
      const b = batches[bi++];
      try { const d = await gq('{ so5{ ' + b.map((x, j) => `r${j}: so5Leaderboard(slug:"${x.slug}"){ so5Rankings(first:5){ nodes{ ranking score } } }`).join(' ') + ' } }');
        b.forEach((x, j) => { const n = d.so5[`r${j}`]?.so5Rankings?.nodes || []; if (n.length < 5) return; rooms.push({ key: x.k, gw: x.gw, g: x.g, slug: x.slug, top: n.map((z: any) => z.score as number) }); }); } catch { /* lot ignore */ }
    } }));
    // recompenses (cartes shards / Essence) des 5 premieres places, par type
    const rew: Record<string, number[]> = {};
    await Promise.all(Object.entries(rewardSlug).map(async ([t, slug]) => {
      try { const d = await gq(`{ so5{ so5Leaderboard(slug:"${slug}"){ rewardsConfig{ ranking{ rewardConfigs{ ... on CardShardRewardConfig{ quantity } } } } } } }`);
        const q = (d.so5.so5Leaderboard.rewardsConfig.ranking as any[]).map(x => Number(x.rewardConfigs?.[0]?.quantity) || 0); if (q.length === 5) rew[t] = q; } catch { /* pas de recompenses : pas de ROI */ }
    }));
    const out: Record<string, { fifth: number; podium: number; first: number; rooms: number; list: number[]; tops: number[][]; rew: number[] | null; slope: number; gws: number }> = {};
    const byKey: Record<string, Room[]> = {}; for (const r of rooms) (byKey[r.key] ||= []).push(r);
    // Niveau RELATIF de chaque GW (mediane de la 5e place / mediane globale), mesure sur les deux types les mieux fournis (Champion et Contender, rarete Limited),
    // puis droite niveau = f(nombre de matchs). Meme facteur applique a tous les types : plus fiable que d'ajuster chaque type avec peu de rooms.
    const refPts: Record<number, { g: number; v: number[] }> = {};
    for (const k of ['limited|cont', 'limited|champ']) {
      const rs = byKey[k] || []; if (!rs.length) continue; const all = med(rs.map(r => r.top[4]));
      for (const gw of new Set(rs.map(r => r.gw))) { const x = rs.filter(r => r.gw === gw); if (x.length >= 3) (refPts[gw] ||= { g: x[0].g, v: [] }).v.push(med(x.map(r => r.top[4])) / all); }
    }
    const pts = Object.values(refPts).map(p => ({ g: p.g, L: p.v.reduce((a, b) => a + b, 0) / p.v.length }));
    const f = pts.length >= 3 && new Set(pts.map(p => p.g)).size >= 3 ? line(pts.map(p => p.g), pts.map(p => p.L), 0.05) : null;
    const ratio = (r: Room) => (f && curGames ? Math.max(0.8, Math.min(1.25, f(curGames) / f(r.g))) : 1);   // ramene la room au nombre de matchs de la GW en cours
    const slope = f && curGames ? +((f(curGames + 1) / f(curGames) - 1) * 100).toFixed(1) : 0;   // % de score par match supplementaire
    for (const [k, rs] of Object.entries(byKey)) {
      const tops = rs.map(r => r.top.map(v => v * ratio(r)));
      const fifths = tops.map(t => t[4]).sort((x, y) => x - y);
      out[k] = { fifth: +med(fifths).toFixed(1), podium: +med(tops.map(t => t[2])).toFixed(1), first: +med(tops.map(t => t[0])).toFixed(1), rooms: rs.length, list: fifths.map(v => +v.toFixed(1)), tops: tops.slice(0, 40).map(t => t.map(v => +v.toFixed(1))), rew: rew[k.split('|')[1]] || null, slope, gws: new Set(rs.map(r => r.gw)).size };
    }
    const res = { thresholds: out, gws: done.map(f => f.gw), games: curGames, at: new Date().toISOString() };
    if (Object.keys(out).length) await redis.set(KEY, res, { ex: 21600 }).catch(() => {});
    return NextResponse.json(res);
  } catch (e: any) { return NextResponse.json({ error: String(e?.message || e) }, { status: 502 }); }
}
