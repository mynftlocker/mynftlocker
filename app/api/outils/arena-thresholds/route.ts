import { NextRequest, NextResponse } from 'next/server';
import { ownerOnly } from '../../../../lib/owner';
import { redis } from '../../../../lib/redis';

// Seuils reels des Arena Rooms NBA (API publique Sorare, GW deja terminees) : score de la 5e place (limite de rentabilite), du podium et du 1er,
// par type de room et par rarete. Mediane sur un echantillon de rooms. Cache 6 h. Reserve au proprietaire.
export const maxDuration = 60;
const H: Record<string, string> = { 'Content-Type': 'application/json' };
async function gq(q: string) {
  if (process.env.SORARE_API_KEY) H['APIKEY'] = process.env.SORARE_API_KEY;
  const r = await fetch('https://api.sorare.com/graphql', { method: 'POST', headers: H, body: JSON.stringify({ query: q }), signal: AbortSignal.timeout(25000) });
  const j = await r.json(); if (!j?.data) throw new Error(JSON.stringify(j?.errors || j).slice(0, 200)); return j.data;
}
const med = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const TYPES: Record<string, string> = { Champion: 'champ', Contender: 'cont', Uncapped: 'unc', Veterans: 'vet', U23: 'u23' };

export async function GET(req: NextRequest) {
  const deny = await ownerOnly(req); if (deny) return deny;
  const KEY = 'gwb:arena:v2';
  if (!req.nextUrl.searchParams.get('fresh')) { const hit = await redis.get<any>(KEY).catch(() => null); if (hit) return NextResponse.json(hit); }
  try {
    const fx = (await gq('{ so5{ so5Fixtures(first:6, sport:NBA){ nodes{ slug gameWeek aasmState } } } }')).so5.so5Fixtures.nodes.filter((f: any) => f.aasmState === 'closed').slice(0, 2);
    const groups: Record<string, { slug: string }[]> = {};
    for (const f of fx) {
      const L = (await gq(`{ so5{ so5Fixture(slug:"${f.slug}"){ so5Leaderboards{ slug displayName } } } }`)).so5.so5Fixture.so5Leaderboards as { slug: string; displayName: string }[];
      for (const l of L) { const m = l.slug.match(/_(limited|rare|super_rare)_arena_/); const t = TYPES[l.displayName]; if (!m || !t) continue; (groups[`${m[1]}|${t}`] ||= []).push(l); }
    }
    const jobs = Object.entries(groups).flatMap(([k, ls]) => ls.sort(() => Math.random() - 0.5).slice(0, 14).map(l => ({ k, slug: l.slug })));
    const acc: Record<string, { f: number[]; p: number[]; w: number[] }> = {};
    const batches: typeof jobs[] = []; for (let i = 0; i < jobs.length; i += 5) batches.push(jobs.slice(i, i + 5));
    let bi = 0;
    await Promise.all(Array.from({ length: 4 }, async () => { while (bi < batches.length) {
      const b = batches[bi++];
      try { const d = await gq('{ so5{ ' + b.map((x, j) => `r${j}: so5Leaderboard(slug:"${x.slug}"){ so5Rankings(first:5){ nodes{ ranking score } } }`).join(' ') + ' } }');
        b.forEach((x, j) => { const n = d.so5[`r${j}`]?.so5Rankings?.nodes || []; if (n.length < 5) return; const a = (acc[x.k] ||= { f: [], p: [], w: [] }); a.f.push(n[4].score); a.p.push(n[2].score); a.w.push(n[0].score); }); } catch { /* lot ignore */ }
    } }));
    const out: Record<string, { fifth: number; podium: number; first: number; rooms: number; list: number[] }> = {};
    for (const [k, a] of Object.entries(acc)) out[k] = { fifth: +med(a.f).toFixed(1), podium: +med(a.p).toFixed(1), first: +med(a.w).toFixed(1), rooms: a.f.length, list: [...a.f].sort((x, y) => x - y).map(v => +v.toFixed(1)) };
    const res = { thresholds: out, gws: fx.map((f: any) => f.gameWeek), at: new Date().toISOString() };
    if (Object.keys(out).length) await redis.set(KEY, res, { ex: 21600 }).catch(() => {});
    return NextResponse.json(res);
  } catch (e: any) { return NextResponse.json({ error: String(e?.message || e) }, { status: 502 }); }
}
