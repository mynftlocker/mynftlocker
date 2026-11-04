import { NextRequest, NextResponse } from 'next/server';
import { redis } from '../../../../lib/redis';
import { ownerOnly } from '../../../../lib/owner';
import { getJson } from '../../../../lib/ttfl';

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

export async function GET(req: NextRequest) {
  try {
    if (req.nextUrl.searchParams.get('run')) {
      if (!(await redis.set('inj:lock', 1, { nx: true, ex: 3000 }))) return NextResponse.json({ ok: true, skipped: 'recent' });
      return NextResponse.json({ ok: true, espn: await refreshEspn() });
    }
    const deny = await ownerOnly(req); if (deny) return deny;
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
