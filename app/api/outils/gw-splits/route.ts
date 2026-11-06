import { NextRequest, NextResponse } from 'next/server';
import { ownerOnly } from '../../../../lib/owner';
import { redis } from '../../../../lib/redis';
import { getGw } from '../../../../lib/gwData';

// Ecarts par joueur calcules sur l'historique TTFL (3 saisons de box scores) : domicile / exterieur / back-to-back, en rapport a sa moyenne.
// Rapports lisses (plus l'echantillon est petit, plus on revient vers 1) et bornes. Reserve au proprietaire.
export const maxDuration = 30;
const nrm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
type Row = (string | number)[];
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const shrink = (ratio: number, n: number, k: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, 1 + (ratio - 1) * (n / (n + k))));

export async function GET(req: NextRequest) {
  const deny = await ownerOnly(req); if (deny) return deny;
  try {
    const gw: any = await getGw('');
    const players: { slug: string; name: string }[] = gw.players;
    const keys = [...new Set(players.map(p => nrm(p.name)))];
    const idx = (await redis.hmget<Record<string, string>>('ttfl:pidx', ...keys)) || {};
    const ids = players.map(p => String(idx[nrm(p.name)] || '').split(',').filter(Boolean));
    const pl = redis.pipeline(); ids.forEach(a => a.forEach(id => pl.hgetall('ttfl:ph:' + id)));
    const res = (await pl.exec()) as (Record<string, Row> | null)[];
    let k = 0; const out: Record<string, { home: number; away: number; b2b: number; n: number }> = {};
    players.forEach((p, i) => {
      let best: Row[] = [];
      ids[i].forEach(() => { const rows = Object.values(res[k++] || {}) as Row[]; if (rows.length > best.length) best = rows; });
      const rows = best.filter(r => Number(r[4]) >= 12).sort((a, b) => String(a[0]).localeCompare(String(b[0])));
      if (rows.length < 20) return;
      const all = mean(rows.map(r => Number(r[5])));
      if (all <= 0) return;
      const home = rows.filter(r => r[3] === 1).map(r => Number(r[5])), away = rows.filter(r => r[3] === 0).map(r => Number(r[5]));
      const days = new Set(rows.map(r => String(r[0])));
      const prev = (d: string) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() - 1); return x.toISOString().slice(0, 10); };
      const b = rows.filter(r => days.has(prev(String(r[0])))).map(r => Number(r[5]));
      out[p.slug] = {
        home: +shrink(mean(home) / all, home.length, 30, 0.9, 1.1).toFixed(3),
        away: +shrink(mean(away) / all, away.length, 30, 0.9, 1.1).toFixed(3),
        b2b: b.length >= 5 ? +shrink(mean(b) / all, b.length, 20, 0.88, 1.05).toFixed(3) : 1,
        n: rows.length,
      };
    });
    return NextResponse.json({ splits: out, players: players.length, covered: Object.keys(out).length }, { headers: { 'Cache-Control': 'private, max-age=3600' } });
  } catch (e: any) { return NextResponse.json({ error: String(e?.message || e) }, { status: 502 }); }
}
