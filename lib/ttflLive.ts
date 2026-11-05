import { getJson } from './ttfl';

// Matchs NBA en direct (ESPN, API publique) : score, 5 majeur, score TTFL joueur par joueur et son evolution reconstruite depuis le play-by-play.
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
const pair = (v: any): [number, number] => { const m = String(v ?? '').match(/^(\d+)-(\d+)$/); return m ? [+m[1], +m[2]] : [0, 0]; };

export type LiveGame = {
  id: string; state: 'pre' | 'in' | 'post'; detail: string; period: number; clock: string; start: string;
  home: { abbr: string; name: string; score: number; logo: string; q: number[] };
  away: { abbr: string; name: string; score: number; logo: string; q: number[] };
};
export type LivePlayer = {
  id: string; name: string; team: string; starter: boolean; dnp: boolean; min: number;
  pts: number; reb: number; ast: number; stl: number; blk: number; to: number;
  fgm: number; fga: number; tpm: number; tpa: number; ftm: number; fta: number; ttfl: number;
  curve: [number, number][]; // [minute ecoulee du match, score TTFL]
};

// Jour americain (ET) correspondant a une nuit Paris : nuit D = jour americain D-1.
export const usDate = (night: string) => { const d = new Date(night + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10).replace(/-/g, ''); };

const teamOf = (c: any) => ({ abbr: c?.team?.abbreviation || '', name: c?.team?.displayName || '', score: Number(c?.score) || 0, logo: c?.team?.logo || '', q: (c?.linescores || []).map((l: any) => Number(l?.value) || 0) });
function parseGame(e: any): LiveGame {
  const comp = e.competitions?.[0]; const cs: any[] = comp?.competitors || [];
  const st = e.status || comp?.status || {};
  return {
    id: String(e.id), state: st.type?.state || 'pre', detail: st.type?.shortDetail || '', period: st.period || 0, clock: st.displayClock || '', start: e.date,
    home: teamOf(cs.find(c => c.homeAway === 'home')), away: teamOf(cs.find(c => c.homeAway === 'away')),
  };
}

export async function liveNight(night: string): Promise<LiveGame[]> {
  const sb = await getJson(`${ESPN}/scoreboard?dates=${usDate(night)}&limit=50`, 10);
  return (sb?.events || []).map(parseGame).sort((a: LiveGame, b: LiveGame) => (a.start < b.start ? -1 : 1));
}

// Minutes ecoulees depuis le debut du match (4 x 12 min, prolongations de 5 min) depuis le quart-temps et l'horloge restante.
const elapsed = (period: number, clock: string) => {
  const m = String(clock).match(/^(\d+):(\d+)$/); const rem = m ? +m[1] + +m[2] / 60 : parseFloat(clock) / 60 || 0;
  return period <= 4 ? (period - 1) * 12 + (12 - rem) : 48 + (period - 5) * 5 + (5 - rem);
};

export async function liveGame(id: string): Promise<{ game: LiveGame; players: LivePlayer[] } | null> {
  const sum = await getJson(`${ESPN}/summary?event=${id}`, 10);
  const comp = sum?.header?.competitions?.[0]; if (!comp) return null;
  const game = parseGame({ id, date: comp.date, status: comp.status, competitions: [comp] });
  const by: Record<string, LivePlayer> = {};
  for (const team of sum?.boxscore?.players || []) {
    const st = team?.statistics?.[0]; if (!st) continue;
    const L: string[] = st.labels || []; const ix = (l: string) => L.indexOf(l);
    for (const a of st.athletes || []) {
      const g = (l: string) => Number(a.stats?.[ix(l)] ?? 0) || 0;
      const [fgm, fga] = pair(a.stats?.[ix('FG')]); const [tpm, tpa] = pair(a.stats?.[ix('3PT')]); const [ftm, fta] = pair(a.stats?.[ix('FT')]);
      const played = !a.didNotPlay && !!a.stats?.length;
      by[String(a.athlete?.id)] = {
        id: String(a.athlete?.id), name: a.athlete?.displayName || '', team: team.team?.abbreviation || '', starter: !!a.starter, dnp: !played, min: g('MIN'),
        pts: g('PTS'), reb: g('REB'), ast: g('AST'), stl: g('STL'), blk: g('BLK'), to: g('TO'), fgm, fga, tpm, tpa, ftm, fta,
        ttfl: played ? g('PTS') + g('REB') + g('AST') + g('STL') + g('BLK') + fgm + tpm + ftm - (fga - fgm) - (tpa - tpm) - (fta - ftm) - g('TO') : 0, curve: [],
      };
    }
  }
  // Evolution : on rejoue le play-by-play. La courbe est recalee sur le score exact du box score (le play-by-play peut s'ecarter de 1-2 points).
  const tot: Record<string, number> = {}; const curve: Record<string, [number, number][]> = {};
  const add = (pid: string | undefined, v: number, t: number) => { if (!pid || !by[pid]) return; tot[pid] = (tot[pid] || 0) + v; (curve[pid] ||= []).push([+t.toFixed(2), tot[pid]]); };
  for (const x of sum?.plays || []) {
    const ps: string[] = (x.participants || []).map((q: any) => String(q.athlete?.id)).filter((s: string) => s && s !== 'undefined');
    const ty: string = x.type?.text || ''; const tx: string = x.text || ''; const a = ps[0];
    const t = elapsed(x.period?.number || 1, x.clock?.displayValue || '0:00');
    if (/Rebound/.test(ty)) { add(a, 1, t); continue; }
    if (/Turnover/.test(ty) || /turnover/.test(tx)) { add(a, -1, t); if (/steals/.test(tx)) add(ps[1], 1, t); continue; }
    if (x.shootingPlay) {
      const ft = /Free Throw/.test(ty); const three = /three point/i.test(tx);
      if (x.scoringPlay) { add(a, ft ? 2 : three ? 5 : 3, t); if (ps[1] && /assists/.test(tx)) add(ps[1], 1, t); }
      else { add(a, ft ? -1 : three ? -2 : -1, t); if (/blocks/.test(tx)) add(ps[1], 1, t); }
    }
  }
  const now = game.state === 'pre' ? 0 : game.state === 'post' ? Math.max(48, elapsed(game.period, '0:00')) : elapsed(game.period, game.clock);
  for (const p of Object.values(by)) {
    if (p.dnp) continue;
    const c = curve[p.id] || []; const last = c.length ? c[c.length - 1][1] : 0; const gap = p.ttfl - last;
    // Le point d'ecart est repousse sur le dernier point pour que la courbe finisse exactement sur le vrai score.
    if (c.length && gap) c[c.length - 1] = [c[c.length - 1][0], p.ttfl];
    p.curve = [[0, 0], ...c, ...(c.length && c[c.length - 1][0] < now ? [[+now.toFixed(2), p.ttfl] as [number, number]] : [])];
  }
  return { game, players: Object.values(by) };
}
