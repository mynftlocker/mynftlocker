import { redis } from './redis';
import { getJson } from './ttfl';

// Retrouve un joueur ESPN a partir de son nom : index des reprises (ttfl:pidx), sinon recherche ESPN. Renvoie l'id et la fiche ESPN (equipe actuelle, naissance).
const nrm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
export async function espnPlayer(name: string): Promise<{ id: string; name: string; team: string; dob: string } | null> {
  const nm = nrm(name);
  let id = String((await redis.hget<string>('ttfl:pidx', nm).catch(() => '')) || '').split(',').filter(Boolean).pop() || '';
  if (!id) {
    const s: any = await getJson(`https://site.web.api.espn.com/apis/common/v3/search?query=${encodeURIComponent(name)}&limit=8&type=player`, 86400).catch(() => null);
    const hit = (s?.items || []).find((x: any) => nrm(String(x.displayName || '')) === nm && (!x.sport || x.sport === 'basketball'));
    id = String(hit?.id || '');
  }
  if (!id) return null;
  const [a, core]: any[] = await Promise.all([
    getJson(`https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${id}`, 86400).then(j => j?.athlete).catch(() => null),
    getJson(`https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/athletes/${id}`, 86400).catch(() => null),
  ]);
  if (!a && !core) return null;
  return { id, name: String(a?.displayName || core?.displayName || ''), team: String(a?.team?.abbreviation || ''), dob: String(core?.dateOfBirth || '').slice(0, 10).replace(/-/g, '') };
}
