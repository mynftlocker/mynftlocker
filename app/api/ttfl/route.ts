import { NextRequest, NextResponse } from 'next/server';
import { espnPlayer } from '../../../lib/ttflPlayer';
import { redis } from '../../../lib/redis';
import { getDayRows, ymdLocal } from '../../../lib/ttfl';
import { ttflEst, myProj } from '../../../lib/ttflEst';

// API publique des projections TTFL : estimation du score TTFL de chaque joueur pour une nuit (jour Paris du coup d'envoi).
// GET ?night=YYYY-MM-DD -> joueurs ; GET ?inj=1 -> blessures et retours (sans le texte des news). Aucune donnee privee.
export const maxDuration = 60;
const START = '2026-10-20';
const nrm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
type InjRow = { name: string; team: string; status: 'OUT' | 'GTD' | 'PROB'; until: string | null; untilKind: 'return' | 'reeval' | null; src: string; updated: string };
type Stat = { l10: number | null; n: number; last: number | null; gp: number; tg: number; g: [string, number, number][] };
const HDR = { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800' };

async function injTable(): Promise<{ updated: string; rows: InjRow[] }> {
  return (await redis.get<{ updated: string; rows: InjRow[] }>('inj:table').catch(() => null)) || { updated: '', rows: [] };
}

// Historique TTFL depuis le debut de saison : moyenne des 10 derniers, dernier score, presence. Mis en cache 15 min.
async function stats(): Promise<{ nights: number; by: Record<string, Stat> }> {
  const hit = await redis.get<{ nights: number; by: Record<string, Stat> }>('ttfl:pub:stats2').catch(() => null);
  if (hit) return hit;
  const dates: string[] = [];
  const end = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  for (let d = new Date(START + 'T12:00:00'); d <= end; d.setDate(d.getDate() + 1)) dates.push(ymdLocal(d));
  const days = await Promise.all(dates.map(async d => ({ d, rows: await getDayRows(d).catch(() => null) })));
  const hist: Record<string, { d: string; t: number; m: number; tm: string }[]> = {};
  const teamDays: Record<string, Set<string>> = {};
  for (const { d, rows } of days) for (const r of rows || []) { (hist[nrm(r.n)] ||= []).push({ d, t: r.t, m: r.m, tm: r.tm }); if (r.tm) (teamDays[r.tm] ||= new Set()).add(d); }
  const by: Record<string, Stat> = {};
  for (const [k, g0] of Object.entries(hist)) {
    const g = g0.sort((a, b) => (a.d < b.d ? -1 : 1)); const l = g.slice(-10);
    const tm = g[g.length - 1].tm;
    by[k] = { l10: l.length ? +(l.reduce((s, x) => s + x.t, 0) / l.length).toFixed(1) : null, n: l.length, last: l.length ? l[l.length - 1].t : null, gp: g.length, tg: tm ? teamDays[tm]?.size ?? 0 : 0, g: g.slice(-40).map(x => [x.d, x.t, Math.round(x.m)] as [string, number, number]) };
  }
  const out = { nights: days.filter(x => x.rows).length, by };
  await redis.set('ttfl:pub:stats2', out, { ex: 900 }).catch(() => {});
  return out;
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    if (sp.get('inj')) {
      const [t, st] = await Promise.all([injTable(), stats()]);
      const fix: Record<string, string> = {};
      await Promise.all(t.rows.filter(r => !r.team).map(async r => { const k = nrm(r.name); const hit = await redis.hget<string>('ttfl:teamfix', k).catch(() => null); if (hit) { fix[k] = String(hit); return; } const ep = await espnPlayer(r.name).catch(() => null); if (ep?.team) { fix[k] = ep.team; await redis.hset('ttfl:teamfix', { [k]: ep.team }).catch(() => {}); } }));
      return NextResponse.json({ ok: true, updated: t.updated, rows: t.rows.map(({ name, team, status, until, untilKind, src, updated }) => { const s = st.by[nrm(name)]; return { name, team: team || fix[nrm(name)] || '', status, until, untilKind, src, updated, l10: s?.l10 ?? null, n: s?.n ?? 0 }; }) }, { headers: HDR });
    }
    const night = (sp.get('night') || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) return NextResponse.json({ ok: false, error: 'night=YYYY-MM-DD requis' }, { status: 400 });
    const [cupR, st, tb] = await Promise.all([
      fetch(`${req.nextUrl.origin}/api/outils/cup?night=${night}`, { next: { revalidate: 600 } }).then(r => r.json()),
      stats(), injTable(),
    ]);
    if (cupR.error) return NextResponse.json({ ok: false, error: cupR.error }, { status: 502 });
    const tbl: Record<string, InjRow> = {}; for (const r of tb.rows) tbl[nrm(r.name)] = r;
    // Les absents (OUT) restent dans la liste meme avec une projection Sorare nulle : la case « Masquer les absents » doit pouvoir les montrer.
    const isOut = (p: any) => { const ti = tbl[nrm(p.name)]; return (p.inj && p.inj !== 'GTD') || (!!ti && ti.status === 'OUT' && (!ti.until || night < ti.until)); };
    const rows = (cupR.players || []).filter((p: any) => p.proj >= 5 || isOut(p)).map((p: any) => {
      const s = st.by[nrm(p.name)]; const ti = tbl[nrm(p.name)];
      const tOut = !!ti && ti.status === 'OUT' && (!ti.until || night < ti.until);
      const status: 'OUT' | 'GTD' | null = (p.inj && p.inj !== 'GTD') || tOut ? 'OUT' : p.inj === 'GTD' ? 'GTD' : null;
      return {
        name: p.name, slug: p.slug, team: p.team, opp: p.opp, home: p.home, time: p.time,
        est: +ttflEst(p.proj, p.l5, p.l10, p.inj).toFixed(1), proj: +myProj(p.proj, p.l5, p.l10, p.inj).toFixed(1),
        l10: s?.l10 ?? null, n: s?.n ?? 0, g: s?.g ?? [], last: s?.last ?? null, gp: s?.gp ?? 0, tg: s?.tg ?? 0,
        status, until: tOut ? ti.until : null,
      };
    }).sort((a: any, b: any) => b.est - a.est);
    return NextResponse.json({ ok: true, night, games: cupR.games, nights: st.nights, updated: new Date().toISOString(), rows }, { headers: HDR });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e).slice(0, 200) }, { status: 502 });
  }
}
