import { NextRequest, NextResponse } from 'next/server';
import { redis } from '../../../lib/redis';

// Meilleurs scores TTFL d'une nuit NBA, calcules depuis les box scores ESPN (API publique, sans cle ; cdn.nba.com renvoie 403 depuis Vercel).
// Score TTFL = pts + reb + pd + int + contres + tirs reussis + 3pts reussis + LF reussis - tirs rates - 3pts rates - LF rates - balles perdues
// (verifie le 02/11/2026 : Doncic 45 pts 15 reb 6 pd 5 int 1 ct, 12/23 tirs, 8/12 3pts, 13/13 LF, 7 BP = 83 = score TTFL officiel).
// ?date=AAAA-MM-JJ = jour calendaire americain (Est) du match. Sans date : dernier jour dont tous les matchs sont termines.
export const maxDuration = 60;
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
const HEAD = { 'User-Agent': 'Mozilla/5.0 (compatible; myNFTlocker)', Accept: 'application/json' };

type Row = { name: string; team: string; score: number; pts: number; reb: number; ast: number; stl: number; blk: number; to: number };

async function getJson(url: string, revalidate: number) {
  const r = await fetch(url, { headers: HEAD, next: { revalidate } });
  if (!r.ok) throw new Error(url.split('/').pop()?.split('?')[0] + ' ' + r.status);
  return r.json();
}
const pair = (v: any): [number, number] => { const m = String(v ?? '').match(/^(\d+)-(\d+)$/); return m ? [+m[1], +m[2]] : [0, 0]; };
const etToday = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));

async function loadDay(date: string) {
  const sb = await getJson(`${ESPN}/scoreboard?dates=${date.replace(/-/g, '')}&limit=50`, 300);
  const events: any[] = sb?.events || [];
  return { events, finished: events.length > 0 && events.every(e => e?.status?.type?.completed) };
}

export async function GET(req: NextRequest) {
  try {
    let date = req.nextUrl.searchParams.get('date') || '';
    let day: Awaited<ReturnType<typeof loadDay>> | null = null;
    if (date) day = await loadDay(date);
    else {
      const t = etToday();
      for (let i = 0; i < 4 && !day?.finished; i++) {
        const d = new Date(t); d.setDate(t.getDate() - i);
        date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        day = await loadDay(date);
      }
    }
    if (!day || !day.events.length) return NextResponse.json({ ok: false, error: 'aucun match' }, { status: 404 });
    const key = 'ttfl:' + date;
    if (day.finished) {
      const hit = await redis.get<any>(key).catch(() => null);
      if (hit) return NextResponse.json(hit);
    }
    const rows: Row[] = [];
    await Promise.all(day.events.filter(e => e?.status?.type?.completed).map(async e => {
      const sum = await getJson(`${ESPN}/summary?event=${e.id}`, 300);
      for (const team of sum?.boxscore?.players || []) {
        const st = team?.statistics?.[0]; if (!st) continue;
        const L: string[] = st.labels || [];
        const ix = (l: string) => L.indexOf(l);
        for (const a of st.athletes || []) {
          if (a.didNotPlay || !a.stats?.length) continue;
          const g = (l: string) => Number(a.stats[ix(l)] ?? 0) || 0;
          const [fgm, fga] = pair(a.stats[ix('FG')]); const [tpm, tpa] = pair(a.stats[ix('3PT')]); const [ftm, fta] = pair(a.stats[ix('FT')]);
          if (!g('MIN')) continue;
          const score = g('PTS') + g('REB') + g('AST') + g('STL') + g('BLK') + fgm + tpm + ftm - (fga - fgm) - (tpa - tpm) - (fta - ftm) - g('TO');
          rows.push({ name: a.athlete?.displayName, team: team.team?.displayName, score, pts: g('PTS'), reb: g('REB'), ast: g('AST'), stl: g('STL'), blk: g('BLK'), to: g('TO') });
        }
      }
    }));
    rows.sort((a, b) => b.score - a.score);
    const out = { ok: true, date, finished: day.finished, games: day.events.length, top: rows.slice(0, 10) };
    if (day.finished && rows.length) await redis.set(key, out, { ex: 60 * 60 * 24 * 60 }).catch(() => {});
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 502 });
  }
}
