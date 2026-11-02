import { NextRequest, NextResponse } from 'next/server';
import { redis } from '../../../lib/redis';

// Meilleurs scores TTFL d'une nuit NBA, calcules depuis les box scores officiels (flux public cdn.nba.com, sans cle).
// Score TTFL = pts + reb + pd + int + contres + tirs reussis + 3pts reussis + LF reussis - tirs rates - 3pts rates - LF rates - balles perdues
// (verifie le 02/11/2026 : Doncic 45 pts 15 reb 6 pd 5 int 1 ct, 12/23 tirs, 8/12 3pts, 13/13 LF, 7 BP = 83 = score TTFL officiel).
// ?date=AAAA-MM-JJ = jour calendaire americain du match (celui du calendrier NBA). Sans date : dernier jour dont tous les matchs sont termines.
export const maxDuration = 60;
const CDN = 'https://cdn.nba.com/static/json';
const HEAD = { 'User-Agent': 'Mozilla/5.0 (compatible; myNFTlocker)', Accept: 'application/json' };

type Row = { name: string; team: string; score: number; pts: number; reb: number; ast: number; stl: number; blk: number; to: number };

const ttfl = (s: any): number =>
  (s.points || 0) + (s.reboundsTotal || 0) + (s.assists || 0) + (s.steals || 0) + (s.blocks || 0) +
  (s.fieldGoalsMade || 0) + (s.threePointersMade || 0) + (s.freeThrowsMade || 0) -
  ((s.fieldGoalsAttempted || 0) - (s.fieldGoalsMade || 0)) -
  ((s.threePointersAttempted || 0) - (s.threePointersMade || 0)) -
  ((s.freeThrowsAttempted || 0) - (s.freeThrowsMade || 0)) -
  (s.turnovers || 0);

async function getJson(url: string, revalidate: number) {
  const r = await fetch(url, { headers: HEAD, next: { revalidate } });
  if (!r.ok) throw new Error(url.split('/').pop() + ' ' + r.status);
  return r.json();
}

export async function GET(req: NextRequest) {
  try {
    const wanted = req.nextUrl.searchParams.get('date') || '';
    const sched = await getJson(`${CDN}/staticData/scheduleLeagueV2.json`, 1800);
    // [{date:'AAAA-MM-JJ', games:[{id,status}]}]
    const days: { date: string; games: { id: string; status: number }[] }[] = (sched?.leagueSchedule?.gameDates || []).map((d: any) => {
      const m = String(d.gameDate).match(/^(\d\d)\/(\d\d)\/(\d{4})/);
      return { date: m ? `${m[3]}-${m[1]}-${m[2]}` : '', games: (d.games || []).map((g: any) => ({ id: g.gameId, status: g.gameStatus })) };
    }).filter((d: any) => d.date && d.games.length);
    let day = wanted ? days.find(d => d.date === wanted) : [...days].reverse().find(d => d.games.every(g => g.status === 3));
    if (!day) return NextResponse.json({ ok: false, error: 'jour introuvable' }, { status: 404 });
    const finished = day.games.every(g => g.status === 3);
    const key = 'ttfl:' + day.date;
    if (finished) {
      const hit = await redis.get<any>(key).catch(() => null);
      if (hit) return NextResponse.json(hit);
    }
    const rows: Row[] = [];
    await Promise.all(day.games.filter(g => g.status === 3).map(async g => {
      const box = await getJson(`${CDN}/liveData/boxscore/boxscore_${g.id}.json`, 300);
      for (const t of [box?.game?.homeTeam, box?.game?.awayTeam]) {
        for (const p of t?.players || []) {
          const s = p?.statistics;
          if (!s || p.status === 'INACTIVE' || p.played === '0') continue;
          rows.push({ name: p.name, team: `${t.teamCity} ${t.teamName}`, score: ttfl(s), pts: s.points || 0, reb: s.reboundsTotal || 0, ast: s.assists || 0, stl: s.steals || 0, blk: s.blocks || 0, to: s.turnovers || 0 });
        }
      }
    }));
    rows.sort((a, b) => b.score - a.score);
    const out = { ok: true, date: day.date, finished, games: day.games.length, top: rows.slice(0, 10) };
    if (finished && rows.length) await redis.set(key, out, { ex: 60 * 60 * 24 * 60 }).catch(() => {});
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 502 });
  }
}
