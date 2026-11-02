import { redis } from './redis';
import { getJson } from './ttfl';

// Retrouve la carte Arcade (common, set en cours) d'un joueur NBA a partir de son identifiant ESPN.
// Sorare n'a pas de recherche par nom : le slug d'un joueur = nom + date de naissance (ex. luka-doncic-19990228).
// On recupere la date de naissance chez ESPN, on construit les slugs possibles, et Sorare confirme lequel existe.
const ARCADE_SET = 'divination'; // meme valeur que app/lib/gameplay.ts (a changer a chaque nouveau Set)
const SEASON = 2026;

export type ArcadeCard = { slug: string; playerSlug: string; name: string; pictureUrl: string; kind: 'arcade' | 'classic' };

// Joueurs dont la date de naissance Sorare differe d'ESPN (slug Sorare = nom + date de naissance) : identifiant ESPN -> slug Sorare.
// A completer quand un joueur n'est pas retrouve (les absences sont listees dans Redis : cle arcade:misses).
const OVERRIDES: Record<string, string> = {
  '4702382': 'tristan-da-silva-20010522', // Tristan da Silva (ESPN : 15/05/2001, Sorare : 22/05/2001)
};
const retry = async <T,>(fn: () => Promise<T>): Promise<T> => { try { return await fn(); } catch { await new Promise(r => setTimeout(r, 400)); return fn(); } };
const gql = (query: string) => retry(async () => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (process.env.SORARE_API_KEY) headers['APIKEY'] = process.env.SORARE_API_KEY;
  const r = await fetch('https://api.sorare.com/graphql', { method: 'POST', headers, body: JSON.stringify({ query }), signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error('sorare ' + r.status);
  const j = await r.json();
  return j.data;
});
const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const slugName = (n: string, keepSuffix: boolean) => {
  let s = plain(n).replace(/['’.]/g, '');
  if (!keepSuffix) s = s.replace(/\s+(jr|sr|ii|iii|iv)$/, '');
  return s.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
};
const dayStr = (iso: string, shift: number) => { const d = new Date(iso); d.setUTCDate(d.getUTCDate() + shift); return d.toISOString().slice(0, 10).replace(/-/g, ''); };

// Editions d'une carte Arcade (4 versions) : on en montre une par jour, en rotation tous les 4 jours ; le jour 24 = la carte limited.
export const EDITIONS = ['standard', 'shiny', 'shiny_variant_1', 'holo'];
export const editionForDay = (day: number) => (day >= 24 ? 'limited' : EDITIONS[(day - 1) % EDITIONS.length]);
const edKey = (se: string) => se.toLowerCase().slice(ARCADE_SET.length + 1).replace(/_base$/, '');

type Resolved = { playerSlug: string; name: string; eds: Record<string, { slug: string; pictureUrl: string }> };

// Retrouve le joueur Sorare + ses cartes Arcade (toutes editions) ; mis en cache.
async function resolvePlayer(espnId: string, name: string): Promise<Resolved | null> {
  const key = 'arcade3:' + espnId + ':' + ARCADE_SET;
  const hit = await redis.get<Resolved | 'none'>(key).catch(() => null);
  if (hit === 'none') return null;
  if (hit) return hit;
  try {
    const a = OVERRIDES[espnId] ? null : await retry(() => getJson(`https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/athletes/${espnId}`, 86400));
    const dob: string = a?.dateOfBirth; // ISO (le champ displayDOB de l'autre point d'acces change de format selon le pays du serveur)
    if (!dob && !OVERRIDES[espnId]) return null;
    const names = Array.from(new Set([slugName(name, true), slugName(name, false)]));
    const cands = OVERRIDES[espnId] ? [OVERRIDES[espnId]] : names.flatMap(n => [0, -1, 1].map(s => `${n}-${dayStr(dob, s)}`));
    const d1 = await gql(`{players(slugs:${JSON.stringify(cands)}){slug displayName}}`);
    const player = d1?.players?.[0];
    if (!player) { await redis.set(key, 'none', { ex: 3600 }).catch(() => {}); await redis.sadd('arcade:misses', `${espnId} ${name}`).catch(() => {}); return null; }
    const d2 = await gql(`{anyPlayer(slug:${JSON.stringify(player.slug)}){anyCards(first:100,rarities:[common],seasonStartYears:[${SEASON}]){nodes{slug pictureUrl ...on NBACard{specialEdition}}}}}`);
    const nodes: any[] = d2?.anyPlayer?.anyCards?.nodes || [];
    const eds: Resolved['eds'] = {};
    for (const n of nodes) {
      const se = String(n.specialEdition || '').toLowerCase();
      if (!se.startsWith(ARCADE_SET + '_') || !n.pictureUrl) continue;
      const k = edKey(se); if (!eds[k]) eds[k] = { slug: n.slug, pictureUrl: n.pictureUrl };
    }
    const out: Resolved = { playerSlug: player.slug, name: player.displayName, eds };
    await redis.set(key, out, { ex: Object.keys(eds).length ? 60 * 60 * 24 * 30 : 3600 }).catch(() => {});
    if (!Object.keys(eds).length) await redis.sadd('arcade:misses', `${espnId} ${name} (aucune carte Arcade)`).catch(() => {});
    return out;
  } catch {
    return null;
  }
}

async function limitedCard(playerSlug: string, name: string): Promise<ArcadeCard | null> {
  const key = 'arcadeL:' + playerSlug;
  const hit = await redis.get<ArcadeCard | 'none'>(key).catch(() => null);
  if (hit === 'none') return null;
  if (hit) return hit;
  try {
    const d3 = await gql(`{anyPlayer(slug:${JSON.stringify(playerSlug)}){anyCards(first:1,rarities:[limited]){nodes{slug pictureUrl}}}}`);
    const c = d3?.anyPlayer?.anyCards?.nodes?.[0];
    const out: ArcadeCard | null = c?.pictureUrl ? { slug: c.slug, playerSlug, name, pictureUrl: c.pictureUrl, kind: 'classic' } : null;
    await redis.set(key, out || 'none', { ex: out ? 60 * 60 * 24 * 30 : 3600 }).catch(() => {});
    return out;
  } catch {
    return null;
  }
}

// Carte du joueur pour une edition donnee (par defaut standard ; 'limited' = la carte limited). Repli : standard, puis une autre edition Arcade, puis la limited.
export async function arcadeCardFor(espnId: string, name: string, edition = 'standard'): Promise<ArcadeCard | null> {
  const r = await resolvePlayer(espnId, name);
  if (!r) return null;
  if (edition === 'limited') { const l = await limitedCard(r.playerSlug, r.name); if (l) return l; edition = 'standard'; }
  const pick = r.eds[edition] || r.eds.standard || Object.values(r.eds)[0];
  if (pick) return { slug: pick.slug, playerSlug: r.playerSlug, name: r.name, pictureUrl: pick.pictureUrl, kind: 'arcade' };
  const l = await limitedCard(r.playerSlug, r.name);
  if (l) await redis.sadd('arcade:misses', `${espnId} ${name} (carte classique)`).catch(() => {});
  return l;
}

// Score Sorare du joueur pour la nuit NBA `usDate` (jour americain AAAA-MM-JJ). La date des matchs Sorare est en UTC :
// on retire 12 h pour retomber sur le jour americain. Null si le score n'est pas (encore) publie.
export async function sorareScoreFor(playerSlug: string, usDate: string): Promise<number | null> {
  const key = 'sscore:' + playerSlug + ':' + usDate;
  const hit = await redis.get<number | 'none'>(key).catch(() => null);
  if (hit === 'none') return null;
  if (typeof hit === 'number') return hit;
  try {
    const d = await gql(`{anyPlayer(slug:${JSON.stringify(playerSlug)}){... on NBAPlayer{playerGameScores(last:6){score anyGame{date}}}}}`);
    const list: any[] = d?.anyPlayer?.playerGameScores || [];
    const m = list.find(g => g?.anyGame?.date && new Date(new Date(g.anyGame.date).getTime() - 12 * 3600e3).toISOString().slice(0, 10) === usDate);
    const s = m && typeof m.score === 'number' ? Math.round(m.score) : null;
    await redis.set(key, s ?? 'none', { ex: s != null ? 60 * 60 * 24 * 60 : 1800 }).catch(() => {});
    return s;
  } catch {
    return null;
  }
}
