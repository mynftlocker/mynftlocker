import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.APIFOOTBALL_KEY || '';
const KV_URL = process.env.KV_REST_API_URL || '';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || '';
const CACHE_TTL = 60 * 60 * 24 * 7; // 7 jours en secondes

// ── KV helpers (Upstash REST API) ─────────────────────────────────────────────
async function kvGet(key: string): Promise<any> {
  if (!KV_URL || !KV_TOKEN) return null;
  try {
    const r = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
      signal: AbortSignal.timeout(2000),
    });
    const j = await r.json();
    return j?.result ? JSON.parse(j.result) : null;
  } catch { return null; }
}

async function kvSet(key: string, value: any): Promise<void> {
  if (!KV_URL || !KV_TOKEN) return;
  try {
    await fetch(`${KV_URL}/set/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: JSON.stringify(value), ex: CACHE_TTL }),
      signal: AbortSignal.timeout(2000),
    });
  } catch {}
}

// ── Recherche joueur API-Football ─────────────────────────────────────────────
async function findPlayer(name: string, team: string): Promise<number | null> {
  // Essai 1 : recherche par nom complet
  const url = `https://v3.football.api-sports.io/players/profiles?search=${encodeURIComponent(name)}`;
  const r = await fetch(url, {
    headers: { 'x-apisports-key': API_KEY },
    signal: AbortSignal.timeout(5000),
  });
  if (!r.ok) return null;
  const j = await r.json();
  const players: any[] = j?.response || [];
  if (!players.length) return null;
  if (!team) return players[0]?.player?.id ?? null;
  const tl = team.toLowerCase();
  const match = players.find((p: any) =>
    (p?.statistics || []).some((s: any) =>
      (s?.team?.name || '').toLowerCase().includes(tl) ||
      tl.includes((s?.team?.name || '').toLowerCase())
    )
  );
  return (match || players[0])?.player?.id ?? null;
}

// ── Stats saison API-Football ──────────────────────────────────────────────────
async function fetchStats(playerId: number, season: number): Promise<any[]> {
  const url = `https://v3.football.api-sports.io/players?id=${playerId}&season=${season}`;
  const r = await fetch(url, {
    headers: { 'x-apisports-key': API_KEY },
    signal: AbortSignal.timeout(5000),
  });
  if (!r.ok) return [];
  const j = await r.json();
  return j?.response?.[0]?.statistics || [];
}

// ── Agréger toutes compétitions ───────────────────────────────────────────────
function aggregate(stats: any[]) {
  let gp = 0, goals = 0, assists = 0, minutes = 0, yc = 0, rc = 0;
  for (const s of stats) {
    gp      += s?.games?.appearences || 0;
    goals   += s?.goals?.total       || 0;
    assists += s?.goals?.assists     || 0;
    minutes += s?.games?.minutes     || 0;
    yc      += s?.cards?.yellow      || 0;
    rc      += s?.cards?.red         || 0;
  }
  return { gp: gp || null, goals: goals || null, assists: assists || null,
           minutes: minutes || null, yc: yc || null, rc: rc || null };
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const u = req.nextUrl;
  const name   = (u.searchParams.get('name') || '').trim();
  const team   = (u.searchParams.get('team') || '').trim();
  const syRaw  = parseInt(u.searchParams.get('season') || '0', 10);
  const debug  = u.searchParams.get('debug') === '1';
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const season = syRaw > 2000 ? syRaw : new Date().getFullYear() - (new Date().getMonth() < 7 ? 1 : 0);
  const cacheKey = `foot:${name.toLowerCase().replace(/\s+/g,'-')}:${season}`;

  // Cache hit
  const cached = await kvGet(cacheKey);
  if (cached) {
    if (debug) return NextResponse.json({ source: 'cache', ...cached });
    return NextResponse.json(cached);
  }

  if (!API_KEY) return NextResponse.json({ error: 'no api key' }, { status: 500 });

  try {
    const playerId = await findPlayer(name, team);
    if (!playerId) {
      if (debug) return NextResponse.json({ error: 'player not found', name, team });
      return NextResponse.json({}, { status: 200 });
    }

    const rawStats = await fetchStats(playerId, season);
    if (!rawStats.length) {
      if (debug) return NextResponse.json({ error: 'no stats', playerId, season });
      return NextResponse.json({}, { status: 200 });
    }

    const result = { ...aggregate(rawStats), playerId, season };
    await kvSet(cacheKey, result);

    if (debug) return NextResponse.json({ source: 'api', ...result });
    return NextResponse.json(result);
  } catch (e) {
    if (debug) return NextResponse.json({ error: String(e) });
    return NextResponse.json({}, { status: 200 });
  }
}
