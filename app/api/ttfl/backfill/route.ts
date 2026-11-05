import { NextRequest, NextResponse } from 'next/server';
import { ownerOnly } from '../../../../lib/owner';
import { redis } from '../../../../lib/redis';
import { getJson } from '../../../../lib/ttfl';

// Reprise de l'historique des 3 saisons precedentes (box scores ESPN, saison reguliere + playoffs), jour par jour en remontant le temps.
// Stockage : hash par joueur ttfl:ph:<idESPN> (champ = id du match), index nom -> id ttfl:pidx, equipes du jour ttfl:td:<date>. Reprenable (curseur).
// Usage (proprietaire) : GET ?run=1 -> traite autant de jours que possible en ~45 s ; GET ?status=1 -> avancement.
export const maxDuration = 60;
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
const TOP = '2026-10-19', BOTTOM = '2023-10-24', CUR = 'ttfl:bf:cursor';
const nrm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const pair = (v: any): [number, number] => { const m = String(v ?? '').match(/^(\d+)-(\d+)$/); return m ? [+m[1], +m[2]] : [0, 0]; };
const prev = (d: string) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() - 1); return x.toISOString().slice(0, 10); };

// [date, equipe, adversaire, domicile(1/0), minutes, TTFL, pts, reb, ast, stl, blk, to, fgm, fga, tpm, tpa, ftm, fta, idMatch, playoffs(1/0)]
type Row = (string | number)[];
async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = []; let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } }));
  return out;
}

async function loadDay(date: string): Promise<{ id: string; ps: number; home: string; away: string }[]> {
  const sb = await getJson(`${ESPN}/scoreboard?dates=${date.replace(/-/g, '')}&limit=50`, 3600);
  const ev: any[] = sb?.events || [];
  return ev.filter(e => ['regular-season', 'post-season'].includes(e.season?.slug) && e.status?.type?.completed).map(e => {
    const cs: any[] = e.competitions?.[0]?.competitors || [];
    return { id: String(e.id), ps: e.season?.slug === 'post-season' ? 1 : 0, home: cs.find(c => c.homeAway === 'home')?.team?.abbreviation, away: cs.find(c => c.homeAway === 'away')?.team?.abbreviation };
  });
}

export async function GET(req: NextRequest) {
  const deny = await ownerOnly(req); if (deny) return deny;
  const sp = req.nextUrl.searchParams;
  const cursor = (await redis.get<string>(CUR).catch(() => null)) || TOP;
  if (sp.get('status')) return NextResponse.json({ ok: true, cursor, done: cursor < BOTTOM, from: TOP, to: BOTTOM });
  if (!sp.get('run')) return NextResponse.json({ ok: false, error: 'run=1 ou status=1' }, { status: 400 });
  const t0 = Date.now(); let d = cursor; let days = 0, games = 0, rows = 0; const missing: string[] = [];
  try {
    while (d >= BOTTOM && Date.now() - t0 < 40000) {
      // lot de 6 jours
      const batch: string[] = []; for (let k = 0, x = d; k < 6 && x >= BOTTOM; k++, x = prev(x)) batch.push(x);
      const lists = await pool(batch, 6, async day => ({ day, ev: await loadDay(day) }));
      const byPlayer: Record<string, Record<string, Row>> = {}; const names: Record<string, Set<string>> = {};
      const jobs = lists.flatMap(l => l.ev.map(e => ({ ...e, day: l.day })));
      await pool(jobs, 12, async e => {
        let sum: any = null; let gone = false;
        for (let i = 0; i < 3 && !sum && !gone; i++) sum = await getJson(`${ESPN}/summary?event=${e.id}`, 86400).catch((err: Error) => { if (/ 404$/.test(err.message)) gone = true; return null; });
        if (gone) { missing.push(e.id); return; } // match sans box score chez ESPN (annule, etc.) : ignore
        if (!sum) throw new Error('summary ' + e.id);
        for (const team of sum?.boxscore?.players || []) {
          const st = team?.statistics?.[0]; if (!st) continue;
          const L: string[] = st.labels || []; const ix = (l: string) => L.indexOf(l);
          const tm = team.team?.abbreviation; const home = tm === e.home;
          for (const a of st.athletes || []) {
            if (a.didNotPlay || !a.stats?.length) continue;
            const g = (l: string) => Number(a.stats[ix(l)] ?? 0) || 0;
            const [fgm, fga] = pair(a.stats[ix('FG')]); const [tpm, tpa] = pair(a.stats[ix('3PT')]); const [ftm, fta] = pair(a.stats[ix('FT')]);
            if (!g('MIN') || !a.athlete?.id) continue;
            const t = g('PTS') + g('REB') + g('AST') + g('STL') + g('BLK') + fgm + tpm + ftm - (fga - fgm) - (tpa - tpm) - (fta - ftm) - g('TO');
            const id = String(a.athlete.id);
            (byPlayer[id] ||= {})[e.id] = [e.day, tm, (home ? e.away : e.home) || '', home ? 1 : 0, Math.round(g('MIN')), t, g('PTS'), g('REB'), g('AST'), g('STL'), g('BLK'), g('TO'), fgm, fga, tpm, tpa, ftm, fta, e.id, e.ps];
            (names[nrm(a.athlete.displayName || '')] ||= new Set()).add(id); rows++;
          }
        }
        games++;
      });
      // ecriture : un HSET par joueur, index des noms, equipes de chaque jour
      const pl = redis.pipeline();
      for (const [id, m] of Object.entries(byPlayer)) pl.hset('ttfl:ph:' + id, m);
      for (const l of lists) pl.set('ttfl:td:' + l.day, l.ev.flatMap(e => [e.home, e.away]));
      await pl.exec();
      const keys = Object.keys(names).filter(Boolean);
      if (keys.length) {
        const cur = (await redis.hmget<Record<string, string>>('ttfl:pidx', ...keys)) || {};
        const upd: Record<string, string> = {};
        for (const k of keys) { const have = new Set(String(cur[k] || '').split(',').filter(Boolean)); names[k].forEach(i => have.add(i)); upd[k] = [...have].join(','); }
        await redis.hset('ttfl:pidx', upd);
      }
      days += batch.length; d = prev(batch[batch.length - 1]);
      await redis.set(CUR, d);
    }
    if (missing.length) await redis.sadd('ttfl:bf:missing', missing[0], ...missing.slice(1)).catch(() => {});
    return NextResponse.json({ ok: true, cursor: d, done: d < BOTTOM, days, games, rows, missing: missing.length, ms: Date.now() - t0 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e).slice(0, 200), cursor: d, days, games, rows }, { status: 502 });
  }
}
