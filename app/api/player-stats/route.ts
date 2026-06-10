import { NextResponse } from 'next/server';

const UA = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
};
const seasonStr = (sy: number) => (sy && sy > 2000 ? `${sy}-${String(sy + 1).slice(2)}` : '');

// 1. Resoudre le nom du joueur en ID athlete ESPN (search/v2)
async function findAthleteId(name: string): Promise<string | null> {
  const url = `https://site.web.api.espn.com/apis/search/v2?limit=10&query=${encodeURIComponent(name)}`;
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(4500) });
  if (!r.ok) return null;
  const j = await r.json();
  const s = JSON.stringify(j);
  const m1 = s.match(/l:46~a:(\d+)/);
  const m2 = s.match(/nba\/player\/_\/id\/(\d+)/);
  return (m1 && m1[1]) || (m2 && m2[1]) || null;
}

// 2. Recuperer les stats de l'athlete (endpoint /stats, decoupe par saison)
async function getStats(id: string): Promise<any> {
  const url = `https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${id}/stats`;
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(4500) });
  if (!r.ok) return null;
  return r.json();
}

function parseStats(data: any, sy: number) {
  const cats: any[] = data?.categories || [];
  if (!cats.length) return null;
  const avg = cats.find((c) => c.name === 'averages');
  const misc = cats.find((c) => c.name === 'miscellaneous');
  if (!avg) return null;

  const target = seasonStr(sy); // ex: "2024-25"
  // Choisir la ligne de la saison demandee, sinon la plus recente
  const pickRow = (cat: any) => {
    const rows: any[] = cat?.statistics || [];
    if (!rows.length) return null;
    if (target) { const m = rows.find((rr: any) => rr?.season?.displayName === target); if (m) return m; }
    return rows[rows.length - 1];
  };
  const avgRow = pickRow(avg);
  const miscRow = pickRow(misc);
  if (!avgRow) return null;

  const num = (v: any) => { if (v == null || v === '') return null; const n = parseFloat(String(v).replace('%', '').replace(',', '.')); return isNaN(n) ? null : n; };
  const get = (cat: any, row: any, name: string) => {
    if (!cat || !row) return null;
    const i = (cat.names || []).indexOf(name);
    return i >= 0 ? row.stats?.[i] : null;
  };

  const out = {
    pts: num(get(avg, avgRow, 'avgPoints')),
    ast: num(get(avg, avgRow, 'avgAssists')),
    reb: num(get(avg, avgRow, 'avgRebounds')),
    stl: num(get(avg, avgRow, 'avgSteals')),
    blk: num(get(avg, avgRow, 'avgBlocks')),
    tov: num(get(avg, avgRow, 'avgTurnovers')),
    min: num(get(avg, avgRow, 'avgMinutes')),
    fgp: num(get(avg, avgRow, 'fieldGoalPct')),
    tp: num(get(avg, avgRow, 'threePointFieldGoalPct')),
    ftp: num(get(avg, avgRow, 'freeThrowPct')),
    dd: num(get(misc, miscRow, 'doubleDouble')),
    td: num(get(misc, miscRow, 'tripleDouble')),
    gp: num(get(avg, avgRow, 'gamesPlayed')),
    season: avgRow?.season?.displayName || target || undefined,
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
    const id = await findAthleteId(name);
    if (!id) {
      if (debug) return NextResponse.json({ stage: 'search', name, id: null });
      return NextResponse.json({}, { status: 200 });
    }
    const data = await getStats(id);
    const parsed = parseStats(data, sy);
    if (debug) return NextResponse.json({ stage: 'stats', id, target: seasonStr(sy), parsed });
    if (!parsed) return NextResponse.json({}, { status: 200 });
    return NextResponse.json({ ...parsed, _id: id });
  } catch (e) {
    if (debug) return NextResponse.json({ error: String(e) });
    return NextResponse.json({}, { status: 200 });
  }
}
