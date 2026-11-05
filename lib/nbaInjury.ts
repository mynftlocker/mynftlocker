// Injury report officiel NBA (PDF public, publie toutes les 30 min dans la journee americaine) : statuts Out / Doubtful / Questionable / Probable.
import { extractText, getDocumentProxy } from 'unpdf';

export type NbaInj = { name: string; team: string; status: 'OUT' | 'DOUBT' | 'QUEST' | 'PROB'; detail: string };
const TEAMS = ['Atlanta Hawks', 'Boston Celtics', 'Brooklyn Nets', 'Charlotte Hornets', 'Chicago Bulls', 'Cleveland Cavaliers', 'Dallas Mavericks', 'Denver Nuggets', 'Detroit Pistons', 'Golden State Warriors', 'Houston Rockets', 'Indiana Pacers', 'LA Clippers', 'Los Angeles Clippers', 'Los Angeles Lakers', 'Memphis Grizzlies', 'Miami Heat', 'Milwaukee Bucks', 'Minnesota Timberwolves', 'New Orleans Pelicans', 'New York Knicks', 'Oklahoma City Thunder', 'Orlando Magic', 'Philadelphia 76ers', 'Phoenix Suns', 'Portland Trail Blazers', 'Sacramento Kings', 'San Antonio Spurs', 'Toronto Raptors', 'Utah Jazz', 'Washington Wizards'];
const MAP: Record<string, NbaInj['status'] | 'OK'> = { Out: 'OUT', Doubtful: 'DOUBT', Questionable: 'QUEST', Probable: 'PROB', Available: 'OK' };

// Nom de fichier : Injury-Report_AAAA-MM-JJ_hh_mmAM.pdf (heure de l'Est, pas de 30 min ; on teste aussi 15 min par securite).
function slots(): string[] {
  const out: string[] = []; const now = Math.floor(Date.now() / 900000) * 900000;
  for (let k = 0; k < 56; k++) {
    const d = new Date(now - k * 15 * 60000);
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }).formatToParts(d).map(x => [x.type, x.value]));
    out.push(`${p.year}-${p.month}-${p.day}_${p.hour}_${p.minute}${String(p.dayPeriod).toUpperCase()}`);
  }
  return out;
}

export function parseNbaReport(text: string): NbaInj[] {
  const rows: NbaInj[] = []; let team = '';
  for (let raw of text.split(/\n+/)) {
    let l = raw.replace(/\s+/g, ' ').trim();
    if (!l || /^Injury Report:|^Page \d+ of \d+|^Game Date|^GameDate/i.test(l)) continue;
    l = l.replace(/^\d{2}\/\d{2}\/\d{4}\s+/, '').replace(/^\d{2}:\d{2}\s*\(ET\)\s*/, '').replace(/^[A-Z]{2,4}@[A-Z]{2,4}\s+/, '');
    l = l.replace(/NOT YET SUBMITTED/g, '');
    for (const t of TEAMS) if (l.startsWith(t)) { team = t; l = l.slice(t.length).trim(); break; }
    const m = l.match(/^([\p{Lu}][\p{L}'’.\- ]*?),\s+([\p{L}'’.\-]+)\s+(Out|Doubtful|Questionable|Probable|Available)\b\s*(.*)$/u);
    if (!m || !team) continue;
    const st = MAP[m[3]]; const detail = m[4] || '';
    if (/G League/i.test(detail)) continue; // assignation G League : sans effet sur le match NBA
    if (st === 'OK') continue;
    rows.push({ name: `${m[2]} ${m[1]}`, team, status: st, detail: detail.slice(0, 200) });
  }
  return rows;
}

export async function fetchNbaReport(dbg?: string[]): Promise<{ file: string; rows: NbaInj[] } | null> {
  for (const s of slots()) {
    const file = `Injury-Report_${s}.pdf`;
    const r = await fetch('https://ak-static.cms.nba.com/referee/injury/' + file, { cache: 'no-store', signal: AbortSignal.timeout(15000) }).catch(() => null);
    if (dbg && dbg.length < 4) dbg.push(file + ':' + (r ? r.status : 'err'));
    if (!r || !r.ok) continue;
    const pdf = await getDocumentProxy(new Uint8Array(await r.arrayBuffer()));
    const { text } = await extractText(pdf, { mergePages: true });
    return { file, rows: parseNbaReport(text) };
  }
  return null;
}
