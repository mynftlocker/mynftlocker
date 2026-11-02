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

export async function arcadeCardFor(espnId: string, name: string): Promise<ArcadeCard | null> {
  const key = 'arcade2:' + espnId + ':' + ARCADE_SET;
  const hit = await redis.get<ArcadeCard | 'none'>(key).catch(() => null);
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
    const d2 = await gql(`{anyPlayer(slug:${JSON.stringify(player.slug)}){anyCards(first:40,rarities:[common],seasonStartYears:[${SEASON}]){nodes{slug pictureUrl ...on NBACard{specialEdition}}}}}`);
    const nodes: any[] = d2?.anyPlayer?.anyCards?.nodes || [];
    const arc = nodes.filter(n => String(n.specialEdition || '').toLowerCase().startsWith(ARCADE_SET + '_'));
    const pick = arc.find(n => /standard/i.test(n.specialEdition)) || arc[0];
    let out: ArcadeCard | null = null;
    if (pick?.pictureUrl) out = { slug: pick.slug, playerSlug: player.slug, name: player.displayName, pictureUrl: pick.pictureUrl, kind: 'arcade' };
    else {
      const d3 = await gql(`{anyPlayer(slug:${JSON.stringify(player.slug)}){anyCards(first:1,rarities:[limited]){nodes{slug pictureUrl}}}}`);
      const c = d3?.anyPlayer?.anyCards?.nodes?.[0];
      if (c?.pictureUrl) out = { slug: c.slug, playerSlug: player.slug, name: player.displayName, pictureUrl: c.pictureUrl, kind: 'classic' };
    }
    await redis.set(key, out || 'none', { ex: out?.kind === 'arcade' ? 60 * 60 * 24 * 30 : 3600 }).catch(() => {});
    if (out?.kind !== 'arcade') await redis.sadd('arcade:misses', `${espnId} ${name} (${out ? 'carte classique' : 'aucune carte'})`).catch(() => {});
    return out;
  } catch {
    return null;
  }
}
