import { redis } from './redis';

// Meilleurs scores TTFL d'une nuit NBA, calcules depuis les box scores ESPN (API publique, sans cle ; cdn.nba.com renvoie 403 depuis Vercel).
// Score TTFL = pts + reb + pd + int + contres + tirs reussis + 3pts reussis + LF reussis - tirs rates - 3pts rates - LF rates - balles perdues
// (verifie le 02/11/2026 : Doncic 45 pts 15 reb 6 pd 5 int 1 ct, 12/23 tirs, 8/12 3pts, 13/13 LF, 7 BP = 83 = score TTFL officiel ; top 10 identique).
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
const HEAD = { 'User-Agent': 'Mozilla/5.0 (compatible; myNFTlocker)', Accept: 'application/json' };

export type TtflRow = { id: string; name: string; team: string; score: number; pts: number; reb: number; ast: number; stl: number; blk: number; to: number };
export type Night = { ok: true; date: string; finished: boolean; games: number; top: TtflRow[] };

export async function getJson(url: string, revalidate = 300) {
  const r = await fetch(url, { headers: HEAD, next: { revalidate } });
  if (!r.ok) throw new Error(url.split('/').pop()?.split('?')[0] + ' ' + r.status);
  return r.json();
}
const pair = (v: any): [number, number] => { const m = String(v ?? '').match(/^(\d+)-(\d+)$/); return m ? [+m[1], +m[2]] : [0, 0]; };
const etToday = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
export const ymdLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

async function loadDay(date: string) {
  const sb = await getJson(`${ESPN}/scoreboard?dates=${date.replace(/-/g, '')}&limit=50`);
  const events: any[] = sb?.events || [];
  return { events, finished: events.length > 0 && events.every(e => e?.status?.type?.completed) };
}

// Dernier jour (date americaine, fuseau Est) dont tous les matchs sont termines, en remontant de `back` jours max.
export async function lastFinishedDate(before?: string): Promise<string | null> {
  const t = before ? new Date(before + 'T12:00:00') : etToday();
  for (let i = before ? 1 : 0; i < 6; i++) {
    const d = new Date(t); d.setDate(t.getDate() - i);
    const date = ymdLocal(d);
    if ((await loadDay(date)).finished) return date;
  }
  return null;
}

// Top 10 d'une nuit (date americaine AAAA-MM-JJ). Resultat definitif mis en cache 60 jours une fois tous les matchs termines.
export async function getNight(date: string, top = 10): Promise<Night | null> {
  const day = await loadDay(date);
  if (!day.events.length) return null;
  const key = 'ttfl:' + date;
  if (day.finished) {
    const hit = await redis.get<Night>(key).catch(() => null);
    if (hit?.top?.[0]?.id) return { ...hit, top: hit.top.slice(0, top) };
  }
  const rows: TtflRow[] = [];
  await Promise.all(day.events.filter(e => e?.status?.type?.completed).map(async e => {
    const sum = await getJson(`${ESPN}/summary?event=${e.id}`);
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
        rows.push({ id: String(a.athlete?.id || ''), name: a.athlete?.displayName, team: team.team?.displayName, score, pts: g('PTS'), reb: g('REB'), ast: g('AST'), stl: g('STL'), blk: g('BLK'), to: g('TO') });
      }
    }
  }));
  rows.sort((a, b) => b.score - a.score);
  const out: Night = { ok: true, date, finished: day.finished, games: day.events.length, top: rows.slice(0, 10) };
  if (day.finished && rows.length) await redis.set(key, out, { ex: 60 * 60 * 24 * 60 }).catch(() => {});
  return { ...out, top: out.top.slice(0, top) };
}
