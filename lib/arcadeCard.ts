import { redis } from './redis';
import { getJson } from './ttfl';

// Retrouve la carte Arcade (common, set en cours) d'un joueur NBA a partir de son identifiant ESPN.
// Sorare n'a pas de recherche par nom : le slug d'un joueur = nom + date de naissance (ex. luka-doncic-19990228).
// On recupere la date de naissance chez ESPN, on construit les slugs possibles, et Sorare confirme lequel existe.
const ARCADE_SET = 'divination'; // meme valeur que app/lib/gameplay.ts (a changer a chaque nouveau Set)
const SEASON = 2026;

export type ArcadeCard = { slug: string; playerSlug: string; name: string; pictureUrl: string; kind: 'arcade' | 'classic' };

const gql = async (query: string) => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (process.env.SORARE_API_KEY) headers['APIKEY'] = process.env.SORARE_API_KEY;
  const r = await fetch('https://api.sorare.com/graphql', { method: 'POST', headers, body: JSON.stringify({ query }), signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error('sorare ' + r.status);
  const j = await r.json();
  return j.data;
};
const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const slugName = (n: string, keepSuffix: boolean) => {
  let s = plain(n).replace(/['’.]/g, '');
  if (!keepSuffix) s = s.replace(/\s+(jr|sr|ii|iii|iv)$/, '');
  return s.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
};
const dayStr = (iso: string, shift: number) => { const d = new Date(iso); d.setUTCDate(d.getUTCDate() + shift); return d.toISOString().slice(0, 10).replace(/-/g, ''); };

export async function arcadeCardFor(espnId: string, name: string): Promise<ArcadeCard | null> {
  const key = 'arcade:' + espnId + ':' + ARCADE_SET;
  const hit = await redis.get<ArcadeCard | 'none'>(key).catch(() => null);
  if (hit === 'none') return null;
  if (hit) return hit;
  try {
    const a = await getJson(`https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${espnId}`, 86400);
    const dob: string = a?.athlete?.dateOfBirth;
    if (!dob) return null;
    const names = Array.from(new Set([slugName(name, true), slugName(name, false)]));
    const cands = names.flatMap(n => [0, -1, 1].map(s => `${n}-${dayStr(dob, s)}`));
    const d1 = await gql(`{players(slugs:${JSON.stringify(cands)}){slug displayName}}`);
    const player = d1?.players?.[0];
    if (!player) { await redis.set(key, 'none', { ex: 3600 }).catch(() => {}); return null; }
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
    return out;
  } catch {
    return null;
  }
}
