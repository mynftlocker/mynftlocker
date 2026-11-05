import { redis } from './redis';
import { getJson } from './ttfl';

// Heure de coup d'envoi (ISO) de chaque equipe par jour americain, via le scoreboard ESPN. Cache 90 jours quand tous les matchs du jour sont finis.
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
type DayStarts = Record<string, string>;
export async function startsFor(dates: string[]): Promise<Record<string, DayStarts>> {
  const out: Record<string, DayStarts> = {}; const uniq = [...new Set(dates)];
  if (!uniq.length) return out;
  const hits = await redis.mget<(DayStarts | null)[]>(...uniq.map(d => 'ttfl:st:' + d)).catch(() => [] as (DayStarts | null)[]);
  const todo: number[] = []; uniq.forEach((d, i) => { if (hits?.[i]) out[d] = hits[i]!; else todo.push(i); });
  let q = 0; // 10 requetes ESPN en parallele au maximum
  await Promise.all(Array.from({ length: Math.min(10, todo.length) }, async () => { for (;;) { const i = todo[q++]; if (i == null) return; const d = uniq[i];
    const sb = await getJson(`${ESPN}/scoreboard?dates=${d.replace(/-/g, '')}&limit=50`, 300).catch(() => null);
    const ev: any[] = sb?.events || []; const m: DayStarts = {};
    for (const e of ev) for (const c of e.competitions?.[0]?.competitors || []) if (c?.team?.abbreviation && e.date) m[c.team.abbreviation] = String(e.date);
    out[d] = m;
    if (ev.length && ev.every(e => e?.status?.type?.completed)) await redis.set('ttfl:st:' + d, m, { ex: 60 * 60 * 24 * 90 }).catch(() => {});
  } }));
  return out;
}
// Coup d'envoi au plus tard a 23 h, heure de Paris (matchs "europeens")
export const isEarlyFR = (iso?: string) => {
  if (!iso) return undefined;
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso)).split(':').map(Number);
  const mn = p[0] * 60 + p[1]; return mn <= 23 * 60 && mn >= 12 * 60;
};
