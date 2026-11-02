import { getNight, lastFinishedDate } from './ttfl';
import { arcadeCardFor, sorareScoreFor, editionForDay } from './arcadeCard';
import { tier } from './advent';
import { redis } from './redis';

// Donnees d'une case : la nuit NBA du jour americain N-1 (Est), ses meilleurs scores TTFL, leur carte Arcade et leur score Sorare.
// demo = K : avant le lancement, les K premieres cases utilisent les vraies dernieres nuits (apercu du design).
// Dates de la demo : parmi les dernieres vraies nuits, on prend celles dont le meilleur pick a des scores Sorare de couleurs variees
// (un peu de chaque couleur), classees de la plus ancienne (case 1) a la plus recente. Mis en cache quelques heures.
const inflight = new Map<number, Promise<string[]>>();
const demoDates = (demo: number) => { let p = inflight.get(demo); if (!p) { p = computeDemoDates(demo).finally(() => setTimeout(() => inflight.delete(demo), 60000)); inflight.set(demo, p); } return p; };
async function computeDemoDates(demo: number): Promise<string[]> {
  const latest = (await lastFinishedDate()) as string;
  const key = 'advdemo:v1:' + latest + ':' + demo;
  const hit = await redis.get<string[]>(key).catch(() => null);
  if (hit?.length) return hit;
  const dates: string[] = [latest];
  for (let d = latest; dates.length < 14;) { const prev = await lastFinishedDate(d); if (!prev) break; dates.push(prev); d = prev; }
  const info = await Promise.all(dates.map(async date => {
    try {
      const n = await getNight(date, 1); const w = n?.top?.[0]; if (!w) return { date, col: 'none' };
      const c = await arcadeCardFor(w.id, w.name, 'standard'); const sc = c ? await sorareScoreFor(c.playerSlug, date) : null;
      return { date, col: sc == null ? 'none' : tier(sc) };
    } catch { return { date, col: 'none' }; }
  }));
  const picked: string[] = []; const seen = new Set<string>();
  for (const x of info) if (picked.length < demo && x.col !== 'none' && !seen.has(x.col)) { seen.add(x.col); picked.push(x.date); }
  for (const x of info) if (picked.length < demo && !picked.includes(x.date)) picked.push(x.date);
  const out = picked.sort();
  await redis.set(key, out, { ex: 6 * 3600 }).catch(() => {});
  return out;
}

export async function buildDay(day: number, demo = 0) {
  demo = Math.max(0, Math.min(24, Math.floor(demo) || 0)); // plafonne : evite de multiplier les calculs/caches avec des valeurs fantaisistes
  let date: string;
  if (demo > 0) {
    if (day > demo) return { ok: true, open: false, day };
    const ds = await demoDates(demo);
    date = ds[day - 1] || ds[ds.length - 1];
  } else {
    date = new Date(Date.UTC(2026, 11, day - 1)).toISOString().slice(0, 10); // jour americain N-1
  }
  const night = await getNight(date, 10);
  if (!night || !night.finished) return { ok: true, open: false, day, pending: true };
  const cards = await Promise.all(night.top.map(r => arcadeCardFor(r.id, r.name, editionForDay(day))));
  const sc = await Promise.all(night.top.map((r, i) => (i < 5 && cards[i]) ? sorareScoreFor(cards[i]!.playerSlug, night.date) : Promise.resolve(null)));
  const top = night.top.map((r, i) => ({ ...r, card: cards[i], sorare: sc[i] }));
  return { ok: true, open: true, day, edition: editionForDay(day), date: night.date, games: night.games, top };
}
