import { NextRequest, NextResponse } from 'next/server';
import { redis } from '../../../../lib/redis';
import { ownerOnly } from '../../../../lib/owner';
import { getJson } from '../../../../lib/ttfl';
import { parseNews, toState, TEAMS } from '../../../../lib/rotowire';

// Tableau des blessures NBA partage (site + fil SORARE 2) : une ligne par joueur avec statut, date de retour OU de reevaluation, source et date de mise a jour.
// Sources par ordre de fiabilite : rotowire / underdog / manual (saisis par Claude) > espn (releve automatique quotidien via le cron, sert de base).
// GET (prive) : lit le tableau.  POST (prive) : { rows:[...] } upsert par nom, { remove:[noms] } suppression.  GET ?run=1 (cron) : met a jour la base ESPN.
export const maxDuration = 30;
export type InjRow = { name: string; team: string; status: 'OUT' | 'GTD' | 'PROB'; until: string | null; untilKind: 'return' | 'reeval' | null; detail: string; src: 'espn' | 'rotowire' | 'underdog' | 'manual'; updated: string };
const KEY = 'inj:table';
const nrm = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());
type Table = { updated: string; rows: InjRow[] };

async function load(): Promise<Table> { return (await redis.get<Table>(KEY).catch(() => null)) || { updated: '', rows: [] }; }
// Une ligne non-ESPN disparait une fois sa date de retour passee ; une ligne ESPN disparait quand ESPN ne la liste plus.
function prune(rows: InjRow[]) { const t = today(); return rows.filter(r => !(r.src !== 'espn' && r.until && r.until < t)); }

async function refreshEspn(): Promise<number> {
  const t = await load();
  const ij = await getJson('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries', 0);
  const fresh: InjRow[] = [];
  for (const tm of ij?.injuries || []) for (const i of tm.injuries || []) {
    const name = i.athlete?.displayName; if (!name) continue;
    fresh.push({ name, team: tm.displayName || '', status: i.status === 'Out' ? 'OUT' : 'GTD', until: null, untilKind: null, detail: String(i.shortComment || i.longComment || '').slice(0, 220), src: 'espn', updated: new Date().toISOString() });
  }
  const keep = prune(t.rows).filter(r => r.src !== 'espn');
  const kept = new Set(keep.map(r => nrm(r.name)));
  const rows = [...keep, ...fresh.filter(r => !kept.has(nrm(r.name)))];
  await redis.set(KEY, { updated: new Date().toISOString(), rows } as Table);
  return fresh.length;
}

// News publiques Rotowire (page generale + une page par equipe) : la news la plus recente de chaque joueur donne son etat ; les delais (« 4-6 weeks ») donnent la date de retour / reevaluation.
async function refreshRotowire(debug = false): Promise<any> {
  const urls = ['https://www.rotowire.com/basketball/news.php', ...Object.keys(TEAMS).map(t => `https://www.rotowire.com/basketball/news.php?team=${t}`)];
  const pages = await Promise.all(urls.map(u => fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; myNFTlockerBot/1.0)', Accept: 'text/html' }, signal: AbortSignal.timeout(15000), cache: 'no-store' }).then(r => (r.ok ? r.text() : '')).catch(() => '')));
  const items = pages.flatMap(parseNews);
  if (debug) return { pages: pages.map(p => p.length), items: items.length, sample: items.slice(0, 3) };
  if (!items.length) return { items: 0 };
  const latest = new Map<string, (typeof items)[number]>();
  for (const it of items) { const k = nrm(it.name); const c = latest.get(k); if (!c || it.date > c.date) latest.set(k, it); }
  const tday = today(); const t = await load(); const map = new Map(t.rows.map(r => [nrm(r.name), r]));
  let upserts = 0, clears = 0;
  for (const [k, it] of latest) {
    const st = toState(it, tday); const cur = map.get(k);
    if (!st) continue;
    // Ne jamais ecraser une ligne Underdog/manuelle plus recente que la news Rotowire
    if (cur && (cur.src === 'underdog' || cur.src === 'manual') && cur.updated.slice(0, 10) >= it.date) continue;
    if (st.status === 'OK') { if (cur && cur.src === 'rotowire') { map.delete(k); clears++; } continue; } // disponible : on retire seulement une ligne Rotowire perimee
    map.set(k, { name: it.name, team: st.team || cur?.team || '', status: st.status, until: st.until, untilKind: st.untilKind, detail: st.detail, src: 'rotowire', updated: new Date().toISOString() });
    upserts++;
  }
  await redis.set(KEY, { updated: new Date().toISOString(), rows: [...map.values()] } as Table);
  return { items: items.length, players: latest.size, upserts, clears };
}

export async function GET(req: NextRequest) {
  try {
    if (req.nextUrl.searchParams.get('run')) {
      if (!(await redis.set('inj:lock', 1, { nx: true, ex: 3000 }))) return NextResponse.json({ ok: true, skipped: 'recent' });
      const espn = await refreshEspn();
      const rw = await refreshRotowire().catch((e: any) => ({ error: String(e).slice(0, 120) }));
      return NextResponse.json({ ok: true, espn, rotowire: rw });
    }
    const deny = await ownerOnly(req); if (deny) return deny;
    if (req.nextUrl.searchParams.get('debug') === 'rw') return NextResponse.json(await refreshRotowire(true));
    const t = await load();
    return NextResponse.json({ ok: true, updated: t.updated, rows: prune(t.rows) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) { return NextResponse.json({ ok: false, error: String(e) }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  const deny = await ownerOnly(req); if (deny) return deny;
  try {
    const b = await req.json(); const t = await load(); const map = new Map(t.rows.map(r => [nrm(r.name), r]));
    for (const n of b.remove || []) map.delete(nrm(String(n)));
    for (const r of b.rows || []) {
      if (typeof r?.name !== 'string' || !['OUT', 'GTD', 'PROB'].includes(r.status)) continue;
      const until = /^\d{4}-\d{2}-\d{2}$/.test(r.until || '') ? r.until : null;
      map.set(nrm(r.name), { name: r.name.slice(0, 80), team: String(r.team || '').slice(0, 60), status: r.status, until, untilKind: until ? (r.untilKind === 'reeval' ? 'reeval' : 'return') : null, detail: String(r.detail || '').slice(0, 220), src: ['rotowire', 'underdog', 'manual'].includes(r.src) ? r.src : 'manual', updated: new Date().toISOString() });
    }
    const rows = [...map.values()];
    await redis.set(KEY, { updated: new Date().toISOString(), rows } as Table);
    return NextResponse.json({ ok: true, rows: rows.length });
  } catch (e) { return NextResponse.json({ ok: false, error: String(e) }, { status: 400 }); }
}
