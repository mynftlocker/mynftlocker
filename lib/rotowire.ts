// Lecture des news publiques Rotowire NBA (pages serveur) -> etat de disponibilite par joueur (le plus recent gagne).
// Le rapport complet de Rotowire est reserve aux abonnes : seules les news publiques et leurs delais (« 4-6 weeks », « re-evaluated in two weeks »...) sont exploitables.
export type RwItem = { name: string; team: string; headline: string; inj: string; date: string; text: string };
export type RwState = { name: string; team: string; status: 'OUT' | 'GTD' | 'QUEST' | 'DOUBT' | 'PROB' | 'OK'; until: string | null; untilKind: 'return' | 'reeval' | null; detail: string };

export const TEAMS: Record<string, string> = { ATL: 'Atlanta Hawks', BKN: 'Brooklyn Nets', BOS: 'Boston Celtics', CHA: 'Charlotte Hornets', CHI: 'Chicago Bulls', CLE: 'Cleveland Cavaliers', DAL: 'Dallas Mavericks', DEN: 'Denver Nuggets', DET: 'Detroit Pistons', GSW: 'Golden State Warriors', HOU: 'Houston Rockets', IND: 'Indiana Pacers', LAC: 'LA Clippers', LAL: 'Los Angeles Lakers', MEM: 'Memphis Grizzlies', MIA: 'Miami Heat', MIL: 'Milwaukee Bucks', MIN: 'Minnesota Timberwolves', NOP: 'New Orleans Pelicans', NYK: 'New York Knicks', OKC: 'Oklahoma City Thunder', ORL: 'Orlando Magic', PHI: 'Philadelphia 76ers', PHX: 'Phoenix Suns', POR: 'Portland Trail Blazers', SAC: 'Sacramento Kings', SAS: 'San Antonio Spurs', TOR: 'Toronto Raptors', UTA: 'Utah Jazz', WAS: 'Washington Wizards' };
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const clean = (s: string) => s.replace(/<[^>]*>/g, ' ').replace(/&#039;|&#x27;|&rsquo;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const pick = (b: string, cls: string) => { const m = b.match(new RegExp(`news-update__${cls}[^>]*>([\\s\\S]*?)</${cls === 'news' ? 'div' : '(?:a|div|b|span)'}>`)); return m ? clean(m[1]) : ''; };

export function parseNews(html: string): RwItem[] {
  const out: RwItem[] = [];
  for (const b of html.split(/class="news-update\s/).slice(1)) {
    const name = pick(b, 'player-link'); if (!name) continue;
    const ts = pick(b, 'timestamp').toLowerCase().match(/([a-z]+)\s+(\d{1,2}),\s*(\d{4})/);
    const mi = ts ? MONTHS.indexOf(ts[1]) : -1; if (mi < 0) continue;
    const date = `${ts![3]}-${String(mi + 1).padStart(2, '0')}-${String(Number(ts![2])).padStart(2, '0')}`;
    const logo = b.match(/news-update__logo[^>]*?(?:alt|src)="[^"]*?([A-Z]{2,3})(?:\.[a-z]+)?"/);
    const inj = /(^|\s)is-injured/.test(b.slice(0, 80)) ? pick(b, 'inj') || 'injured' : '';
    out.push({ name, team: TEAMS[logo?.[1] || ''] || logo?.[1] || '', headline: pick(b, 'headline'), inj, date, text: pick(b, 'news') });
  }
  return out;
}

const addDays = (d: string, n: number) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const NUM: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12 };
const num = (s: string) => NUM[s.toLowerCase()] ?? Number(s);

// Etat deduit de la news la plus recente d'un joueur. today = AAAA-MM-JJ (Paris). null = rien d'exploitable.
export function toState(it: RwItem, today: string): RwState | null {
  const t = `${it.headline}. ${it.text}`; const age = Math.round((new Date(today + 'T12:00:00Z').getTime() - new Date(it.date + 'T12:00:00Z').getTime()) / 86400000);
  const base = { name: it.name, team: it.team, detail: it.text.slice(0, 200) };
  if (/season[- ]ending|out for the (rest of the )?season|miss the rest of the season/i.test(t)) return { ...base, status: 'OUT', until: null, untilKind: null };
  const wk = t.match(/(\d+|one|two|three|four|five|six|eight|ten|twelve)(?:\s*(?:-|to|–)\s*(\d+|two|three|four|five|six|eight|ten|twelve))?\s*(weeks?|months?)/i);
  if (wk && /(out|miss|sidelined|re-?evaluat|expected|timeline|return|surgery)/i.test(t)) {
    const n = num(wk[1]); const days = /month/i.test(wk[3]) ? n * 30 : n * 7;
    const until = addDays(it.date, days);
    if (until >= today) return { ...base, status: 'OUT', until, untilKind: /re-?evaluat/i.test(t) ? 'reeval' : 'return' };
    return null; // delai deja ecoule : la news ne dit plus rien d'actuel
  }
  const dy = t.match(/(?:at least\s+)?(\d+)(?:\s*(?:-|to|–)\s*\d+)?\s+(?:more\s+)?days/i);
  if (dy && /(out|miss|sidelined|expected|timeline)/i.test(t) && !/re-?evaluat/i.test(t)) { const until = addDays(it.date, Number(dy[1])); if (until >= today) return { ...base, status: 'OUT', until, untilKind: 'return' }; return null; }
  if (/re-?evaluated|reevaluated/i.test(t) && /day|week/i.test(t)) {
    const m = t.match(/(\d+|one|two|three|four|five|six|seven|ten)\s*(days?|weeks?)/i);
    if (m) { const until = addDays(it.date, num(m[1]) * (/week/i.test(m[2]) ? 7 : 1)); if (until >= today) return { ...base, status: 'OUT', until, untilKind: 'reeval' }; }
  }
  if (age > 1) return null; // statut d'un seul match trop ancien : on ne le garde pas
  if (/(not listed|removed from (the )?injury report|good to go|cleared to play|available|will play|expected to play|probable|upgraded)/i.test(t) && !/(out|doubtful|ruled out|won't play|will not play)/i.test(it.headline)) return { ...base, status: /probable/i.test(t) ? 'PROB' : 'OK', until: null, untilKind: null };
  if (/(out|ruled out|won't play|will not play|sidelined|inactive|miss)/i.test(it.headline) || /(listed as out|is out|ruled out|will miss|won't play)/i.test(it.text)) return { ...base, status: 'OUT', until: addDays(it.date, 1), untilKind: 'reeval' };
  if (/doubtful/i.test(t) && !/questionable/i.test(t)) return { ...base, status: 'DOUBT', until: null, untilKind: null };
  if (/questionable/i.test(t)) return { ...base, status: 'QUEST', until: null, untilKind: null };
  if (/(game-time decision|iffy|downgraded|uncertain)/i.test(t)) return { ...base, status: 'GTD', until: null, untilKind: null };
  return null;
}
