import { getNight, lastFinishedDate } from './ttfl';
import { arcadeCardFor, sorareScoreFor, editionForDay } from './arcadeCard';

// Donnees d'une case : la nuit NBA du jour americain N-1 (Est), ses meilleurs scores TTFL, leur carte Arcade et leur score Sorare.
// demo = K : avant le lancement, les K premieres cases utilisent les vraies dernieres nuits (apercu du design).
export async function buildDay(day: number, demo = 0) {
  let date: string;
  if (demo > 0) {
    if (day > demo) return { ok: true, open: false, day };
    let d = (await lastFinishedDate()) as string;
    for (let i = 0; i < demo - day; i++) { const prev = await lastFinishedDate(d); if (!prev) break; d = prev; }
    date = d;
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
