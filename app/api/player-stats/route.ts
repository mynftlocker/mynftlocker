import { NextResponse } from 'next/server';

const UA = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
};
const seasonStr = (sy: number) => (sy && sy > 2000 ? `${sy}-${String(sy + 1).slice(2)}` : '');

// 1. Resoudre le nom du joueur en ID athlete ESPN (endpoint search/v2)
async function findAthlete(name: string): Promise<{ id: string | null; url: string; raw?: any; httpError?: number }> {
  const url = `https://site.web.api.espn.com/apis/search/v2?limit=10&query=${encodeURIComponent(name)}`;
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(4500) });
  if (!r.ok) return { id: null, url, httpError: r.status };
  const j = await r.json();
  const s = JSON.stringify(j);
  // Motifs d'ID athlete NBA : uid (l:46~a:ID) ou lien de page joueur (/nba/player/_/id/ID)
  const m1 = s.match(/l:46~a:(\d+)/);
  const m2 = s.match(/nba\/player\/_\/id\/(\d+)/);
  const id = (m1 && m1[1]) || (m2 && m2[1]) || null;
  return { id, url, raw: j };
}

// 2. Recuperer les moyennes de saison de l'athlete
async function getOverview(id: string): Promise<any> {
  const url = `https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${id}/overview`;
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(4500) });
  if (!r.ok) return null;
  return r.json();
}

function parseStats(overview: any) {
  const st = overview?.statistics;
  if (!st) return null;
  const names: string[] = st.names || [];
  const labels: string[] = st.labels || [];
  let split: any = st.splits;
  if (Array.isArray(split)) split = split.find((x: any) => /regular/i.test(x?.displayName || x?.name || '')) || split[0];
  const vals: any[] = split?.stats || split?.statistics || [];
  if (!vals.length) return null;
  const map: Record<string, any> = {};
  names.forEach((nm, i) => { map[nm] = vals[i]; });
  labels.forEach((lb, i) => { if (map[lb] == null) map[lb] = vals[i]; });
  const num = (v: any) => { if (v == null || v === '') return null; const n = parseFloat(String(v).replace('%', '').replace(',', '.')); return isNaN(n) ? null : n; };
  const pick = (...keys: string[]) => { for (const k of keys) { if (map[k] != null && map[k] !== '') return map[k]; } return null; };
  const out = {
    pts: num(pick('avgPoints', 'PTS', 'points')),
    ast: num(pick('avgAssists', 'AST', 'assists')),
    reb: num(pick('avgRebounds', 'REB', 'rebounds', 'avgTotalRebounds')),
    stl: num(pick('avgSteals', 'STL', 'steals')),
    blk: num(pick('avgBlocks', 'BLK', 'blocks')),
    tov: num(pick('avgTurnovers', 'TO', 'TOV', 'turnovers')),
    min: num(pick('avgMinutes', 'MIN', 'minutes')),
    fgp: num(pick('fieldGoalPct', 'FG%', 'fieldGoalPercentage')),
    tp: num(pick('threePointFieldGoalPct', '3P%', 'threePointFieldGoalPercentage')),
    ftp: num(pick('freeThrowPct', 'FT%', 'freeThrowPercentage')),
    fta: num(pick('avgFreeThrowsAttempted', 'FTA', 'freeThrowsAttempted')),
    pm: num(pick('avgPlusMinus', 'plusMinus', '+/-', 'PlusMinus')),
    gp: num(pick('gamesPlayed', 'GP', 'games')),
  };
  if (out.pts == null && out.reb == null && out.ast == null) return null;
  return out;
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const name = (u.searchParams.get('name') || '').trim();
  const sy = parseInt(u.searchParams.get('season') || '0', 10);
  const debug = u.searchParams.get('debug') === '1';
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  try {
    const found = await findAthlete(name);
    if (!found.id) {
      if (debug) return NextResponse.json({ stage: 'search', name, searchUrl: found.url, httpError: found.httpError ?? null, searchRaw: found.raw ?? null });
      return NextResponse.json({}, { status: 200 });
    }
    const overview = await getOverview(found.id);
    if (debug) {
      return NextResponse.json({ stage: 'overview', id: found.id, parsed: parseStats(overview), rawStatistics: overview?.statistics ?? null });
    }
    const stats = parseStats(overview);
    if (!stats) return NextResponse.json({}, { status: 200 });
    return NextResponse.json({ ...stats, season: seasonStr(sy) || undefined, _id: found.id });
  } catch (e) {
    if (debug) return NextResponse.json({ error: String(e) });
    return NextResponse.json({}, { status: 200 });
  }
}
