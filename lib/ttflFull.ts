import { redis } from './redis';
import { getJson, ymdLocal } from './ttfl';

// Lignes de stats completes par joueur et par match (box scores ESPN), nuits terminees. Cache 60 jours. Sert aux fiches joueur TTFL.
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
export const START = '2026-10-20';
export type FullRow = { id: string; n: string; tm: string; opp: string; home: boolean; gid: string; d: string; m: number; t: number; pts: number; reb: number; ast: number; stl: number; blk: number; to: number; fgm: number; fga: number; tpm: number; tpa: number; ftm: number; fta: number };
export const NBA_TEAMS = new Set('ATL BOS BKN CHA CHI CLE DAL DEN DET GS GSW HOU IND LAC LAL MEM MIA MIL MIN NO NOP NY NYK OKC ORL PHI PHX POR SAC SA SAS TOR UTA UTAH WAS WSH'.split(' '));
const pair = (v: any): [number, number] => { const m = String(v ?? '').match(/^(\d+)-(\d+)$/); return m ? [+m[1], +m[2]] : [0, 0]; };

export async function getDayFull(date: string): Promise<FullRow[] | null> {
  const sb = await getJson(`${ESPN}/scoreboard?dates=${date.replace(/-/g, '')}&limit=50`, 300).catch(() => null);
  const events: any[] = sb?.events || [];
  if (!events.length || !events.every(e => e?.status?.type?.completed)) return null;
  const key = 'ttfl:full:' + date;
  const hit = await redis.get<FullRow[]>(key).catch(() => null);
  if (hit?.length) return hit;
  const rows: FullRow[] = [];
  await Promise.all(events.map(async e => {
    const cs: any[] = e.competitions?.[0]?.competitors || [];
    const home = cs.find(c => c.homeAway === 'home')?.team?.abbreviation, away = cs.find(c => c.homeAway === 'away')?.team?.abbreviation;
    if (!NBA_TEAMS.has(home) || !NBA_TEAMS.has(away)) return; // All-Star & co : pas de vrais matchs
    let sum: any = null;
    for (let i = 0; i < 3 && !sum; i++) sum = await getJson(`${ESPN}/summary?event=${e.id}`, 3600).catch(() => null);
    if (!sum) throw new Error('summary ' + e.id); // jour incomplet : non mis en cache, reessaye au prochain appel
    for (const team of sum?.boxscore?.players || []) {
      const st = team?.statistics?.[0]; if (!st) continue;
      const L: string[] = st.labels || []; const ix = (l: string) => L.indexOf(l);
      const tm = team.team?.abbreviation; const isHome = tm === home;
      for (const a of st.athletes || []) {
        if (a.didNotPlay || !a.stats?.length) continue;
        const g = (l: string) => Number(a.stats[ix(l)] ?? 0) || 0;
        const [fgm, fga] = pair(a.stats[ix('FG')]); const [tpm, tpa] = pair(a.stats[ix('3PT')]); const [ftm, fta] = pair(a.stats[ix('FT')]);
        if (!g('MIN')) continue;
        rows.push({ id: String(a.athlete?.id), n: a.athlete?.displayName, tm, opp: (isHome ? away : home) || '', home: isHome, gid: String(e.id), d: date, m: g('MIN'), pts: g('PTS'), reb: g('REB'), ast: g('AST'), stl: g('STL'), blk: g('BLK'), to: g('TO'), fgm, fga, tpm, tpa, ftm, fta,
          t: g('PTS') + g('REB') + g('AST') + g('STL') + g('BLK') + fgm + tpm + ftm - (fga - fgm) - (tpa - tpm) - (fta - ftm) - g('TO') });
      }
    }
  }));
  if (rows.length) await redis.set(key, rows, { ex: 60 * 60 * 24 * 60 }).catch(() => {});
  return rows;
}

export async function allFull(): Promise<{ rows: FullRow[]; failed: number }> {
  const dates: string[] = [];
  const end = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  for (let d = new Date(START + 'T12:00:00'); d <= end; d.setDate(d.getDate() + 1)) dates.push(ymdLocal(d));
  let failed = 0;
  const all = await Promise.all(dates.map(d => getDayFull(d).catch(() => { failed++; return null; })));
  return { rows: all.flatMap(r => r || []), failed };
}
