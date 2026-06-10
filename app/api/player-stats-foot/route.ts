import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const API_KEY = process.env.APIFOOTBALL_KEY || '';
const CACHE_FILE = path.join('/tmp', 'foot_stats_cache.json');
const CACHE_TTL = 60 * 60 * 24 * 1000; // 24h

// Catégorisation des compétitions
const CAT = (name: string): 'NATIONAL' | 'CUP' | 'CONTINENTAL' => {
  const n = name.toLowerCase();
  if (/champions|europa|conference|libertadores|sudamericana|acl|afcon|copa africa/.test(n)) return 'CONTINENTAL';
  if (/cup|coupe|copa|pokal|coppa|fa cup|league cup|carabao|trophée|supercoupe|supercopa|supercoppa/.test(n)) return 'CUP';
  return 'NATIONAL';
};

// Lecture / écriture cache fichier
async function readCache(): Promise<Record<string, any>> {
  try { return JSON.parse(await fs.readFile(CACHE_FILE, 'utf8')); } catch { return {}; }
}
async function writeCache(data: Record<string, any>): Promise<void> {
  try { await fs.writeFile(CACHE_FILE, JSON.stringify(data), 'utf8'); } catch {}
}

// Recherche joueur dans API-Football
async function searchPlayer(name: string, team: string): Promise<number | null> {
  const url = `https://v3.football.api-sports.io/players/profiles?search=${encodeURIComponent(name)}`;
  const r = await fetch(url, { headers: { 'x-apisports-key': API_KEY }, signal: AbortSignal.timeout(5000) });
  if (!r.ok) return null;
  const j = await r.json();
  const players: any[] = j?.response || [];
  if (!players.length) return null;
  // Chercher le joueur dont l'équipe correspond
  const tl = team.toLowerCase();
  const match = players.find((p: any) => {
    const stats = p?.statistics || [];
    return stats.some((s: any) => s?.team?.name?.toLowerCase().includes(tl) || tl.includes(s?.team?.name?.toLowerCase() || '~~'));
  });
  if (match) return match?.player?.id;
  return players[0]?.player?.id ?? null;
}

// Stats d'une saison pour un joueur
async function fetchSeasonStats(playerId: number, season: number): Promise<any[]> {
  const url = `https://v3.football.api-sports.io/players?id=${playerId}&season=${season}`;
  const r = await fetch(url, { headers: { 'x-apisports-key': API_KEY }, signal: AbortSignal.timeout(5000) });
  if (!r.ok) return [];
  const j = await r.json();
  return j?.response?.[0]?.statistics || [];
}

// Valeur marchande depuis transfermarkt-datasets (GitHub)
async function fetchMarketValue(name: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(name.toLowerCase().replace(/\s+/g, '-'));
    const url = `https://raw.githubusercontent.com/dcaribou/transfermarkt-datasets/master/data/cur_players.csv`;
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return null;
    const csv = await r.text();
    const rows = csv.split('\n');
    const header = rows[0].split(',');
    const nameIdx = header.findIndex((h: string) => h.includes('name') || h.includes('player'));
    const mvIdx = header.findIndex((h: string) => h.includes('market_value'));
    if (nameIdx < 0 || mvIdx < 0) return null;
    const nl = name.toLowerCase();
    const row = rows.slice(1).find((r: string) => {
      const cols = r.split(',');
      return (cols[nameIdx] || '').toLowerCase().includes(nl.split(' ').pop() || nl);
    });
    if (!row) return null;
    const cols = row.split(',');
    const mv = parseInt(cols[mvIdx]);
    if (!mv || isNaN(mv)) return null;
    if (mv >= 1_000_000) return `${(mv / 1_000_000).toFixed(0)}M€`;
    if (mv >= 1_000) return `${(mv / 1_000).toFixed(0)}K€`;
    return `${mv}€`;
  } catch { return null; }
}

// Agréger stats par catégorie
function aggregate(stats: any[]): Record<'NATIONAL' | 'CUP' | 'CONTINENTAL', any> {
  const empty = () => ({ games: 0, wins: 0, goals: 0, assists: 0, minutes: 0, started: 0 });
  const r: Record<string, ReturnType<typeof empty>> = { NATIONAL: empty(), CUP: empty(), CONTINENTAL: empty() };
  for (const s of stats) {
    const cat = CAT(s?.league?.name || '');
    const g = r[cat];
    g.games += s?.games?.appearences || 0;
    g.wins += 0; // API-Football ne donne pas W/L par joueur
    g.goals += s?.goals?.total || 0;
    g.assists += s?.goals?.assists || 0;
    g.minutes += s?.games?.minutes || 0;
    g.started += s?.games?.lineups || 0;
  }
  return r as any;
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const name = (u.searchParams.get('name') || '').trim();
  const team = (u.searchParams.get('team') || '').trim();
  const seasonYear = parseInt(u.searchParams.get('season') || '0', 10);
  const debug = u.searchParams.get('debug') === '1';
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const cacheKey = `${name}__${team}__${seasonYear}`;
  const season = seasonYear > 2000 ? seasonYear : new Date().getFullYear() - (new Date().getMonth() < 7 ? 1 : 0);

  // Cache hit ?
  const cache = await readCache();
  if (cache[cacheKey] && Date.now() - (cache[cacheKey]._ts || 0) < CACHE_TTL) {
    if (debug) return NextResponse.json({ source: 'cache', ...cache[cacheKey] });
    const { _ts, ...data } = cache[cacheKey];
    return NextResponse.json(data);
  }

  try {
    // 1. Trouver l'ID joueur
    const playerId = await searchPlayer(name, team);
    if (!playerId) {
      if (debug) return NextResponse.json({ error: 'player not found', name, team });
      return NextResponse.json({}, { status: 200 });
    }

    // 2. Stats saison + valeur marchande (en parallèle)
    const [rawStats, marketValue] = await Promise.all([
      fetchSeasonStats(playerId, season),
      fetchMarketValue(name),
    ]);

    if (!rawStats.length) {
      if (debug) return NextResponse.json({ error: 'no stats', playerId, season });
      return NextResponse.json({}, { status: 200 });
    }

    // 3. Agréger
    const agg = aggregate(rawStats);

    // 4. % start et % min pour chaque catégorie
    const pct = (val: number, total: number) => total > 0 ? Math.round((val / total) * 100) : null;
    const result: Record<string, any> = { playerId, season, marketValue };
    for (const cat of ['NATIONAL', 'CUP', 'CONTINENTAL'] as const) {
      const a = agg[cat];
      result[cat] = {
        games: a.games || null,
        goals: a.goals || null,
        assists: a.assists || null,
        pctStart: pct(a.started, a.games),
        pctMin: a.games > 0 ? Math.round(a.minutes / (a.games * 90) * 100) : null,
      };
    }

    // 5. Lien Transfermarkt (slug depuis le nom)
    const tmSlug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    result.tmUrl = `https://www.transfermarkt.com/${tmSlug}/profil/spieler/0`;

    // Cache
    cache[cacheKey] = { ...result, _ts: Date.now() };
    await writeCache(cache);

    if (debug) return NextResponse.json({ source: 'api', ...result });
    const { _ts, ...data } = cache[cacheKey];
    return NextResponse.json(data);
  } catch (e) {
    if (debug) return NextResponse.json({ error: String(e) });
    return NextResponse.json({}, { status: 200 });
  }
}
