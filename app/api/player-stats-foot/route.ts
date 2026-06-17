import { NextResponse } from 'next/server';

const UA = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
};

// 1. Resoudre le nom du joueur en ID athlete ESPN soccer (search/v2)
async function findAthleteId(name: string): Promise<string | null> {
  const url = `https://site.web.api.espn.com/apis/search/v2?limit=10&query=${encodeURIComponent(name)}`;
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(4500) });
  if (!r.ok) return null;
  const j = await r.json();
  // Chercher le 1er resultat de type player avec sport soccer
  const groups: any[] = j?.results || [];
  for (const g of groups) {
    if (g?.type !== 'player') continue;
    for (const c of (g.contents || [])) {
      if (c?.sport === 'soccer' && c?.uid) {
        const m = String(c.uid).match(/a:(\d+)/);
        if (m) return m[1];
      }
    }
  }
  // Fallback : regex brute sur tout le JSON
  const s = JSON.stringify(j);
  const m = s.match(/soccer\/player\/_\/id\/(\d+)/) || s.match(/s:600~a:(\d+)/);
  return m ? m[1] : null;
}

// 2. Recuperer l'overview du joueur (contient statistics.splits par competition)
async function getOverview(id: string): Promise<any> {
  const url = `https://site.web.api.espn.com/apis/common/v3/sports/soccer/all/athletes/${id}/overview`;
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(4500) });
  if (!r.ok) return null;
  return r.json();
}

// Classer une competition en categorie : championnat / coupe / continental / selection
function classify(displayName: string, leagueSlug: string): string {
  const d = (displayName || '').toLowerCase();
  const l = (leagueSlug || '').toLowerCase();
  // Selection nationale
  if (/fifa|world cup|friendly|nations league|euro |copa america|qualif|international|afcon|concacaf|asian cup/.test(d)
      || /fifa|uefa\.nations|uefa\.euro/.test(l)) return 'selection';
  // Continental (clubs) — UEFA/CONMEBOL/AFC/CAF uniquement
  if (/champions league|europa league|conference league|libertadores|sudamericana|afc champions|caf champions/.test(d)
      || /uefa\.champions|uefa\.europa|uefa\.conf|conmebol|afc\.champions|caf\.champions/.test(l)) return 'continental';
  // UEFA Super Cup (europeenne) = continental, mais PAS les supercoupes nationales
  if (/uefa super cup/.test(d) || /uefa\.super_cup/.test(l)) return 'continental';
  // Coupe nationale (inclut les supercoupes nationales type German SuperCup)
  if (/cup|pokal|copa|coupe|coppa|trophy|beker|super_cup|supercup|supercopa/.test(d)
      || /\.cup|pokal|\.fa|copa_del_rey|coupe_de_france|super_cup/.test(l)) return 'coupe';
  // Sinon championnat
  return 'championnat';
}

function parseStats(data: any) {
  const st = data?.statistics;
  if (!st || !st.names || !st.splits) return null;
  const names: string[] = st.names;
  const idx = {
    starts: names.indexOf('starts'),
    goals: names.indexOf('totalGoals'),
    assists: names.indexOf('goalAssists'),
    sog: names.indexOf('shotsOnTarget'),
    yc: names.indexOf('yellowCards'),
    rc: names.indexOf('redCards'),
  };
  // Categories accumulees
  const empty = () => ({ titu: 0, b: 0, pd: 0, tc: 0, cj: 0, cr: 0 });
  const cats: Record<string, any> = {
    championnat: empty(), coupe: empty(), continental: empty(), selection: empty(),
  };
  const num = (v: any) => { const n = parseInt(String(v), 10); return isNaN(n) ? 0 : n; };

  for (const sp of st.splits) {
    const cat = classify(sp.displayName || '', sp.leagueSlug || '');
    const s = sp.stats || [];
    cats[cat].titu += num(s[idx.starts]);
    cats[cat].b    += num(s[idx.goals]);
    cats[cat].pd   += num(s[idx.assists]);
    cats[cat].tc   += num(s[idx.sog]);
    cats[cat].cj   += num(s[idx.yc]);
    cats[cat].cr   += num(s[idx.rc]);
  }

  // Total
  const total = empty();
  for (const k of Object.keys(cats)) {
    total.titu += cats[k].titu; total.b += cats[k].b; total.pd += cats[k].pd;
    total.tc += cats[k].tc; total.cj += cats[k].cj; total.cr += cats[k].cr;
  }

  // Ne garder que les categories avec au moins 1 titularisation (ligne non vide)
  const rows: any[] = [];
  const order = [
    ['championnat', 'Championnat'], ['coupe', 'Coupe'],
    ['continental', 'Continental'], ['selection', 'Selection'],
  ];
  for (const [key, label] of order) {
    const c = cats[key];
    if (c.titu > 0 || c.b > 0 || c.pd > 0 || c.tc > 0 || c.cj > 0 || c.cr > 0) {
      rows.push({ label, ...c });
    }
  }
  if (!rows.length) return null;
  return { rows, total };
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const name = (u.searchParams.get('name') || '').trim();
  const debug = u.searchParams.get('debug') === '1';
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  try {
    const id = await findAthleteId(name);
    if (!id) {
      if (debug) return NextResponse.json({ stage: 'search', name, id: null });
      return NextResponse.json({}, { status: 200 });
    }
    const data = await getOverview(id);
    const parsed = parseStats(data);
    if (debug) return NextResponse.json({ stage: 'stats', id, parsed });
    if (!parsed) return NextResponse.json({}, { status: 200 });
    return NextResponse.json({ ...parsed, _id: id });
  } catch (e) {
    if (debug) return NextResponse.json({ error: String(e) });
    return NextResponse.json({}, { status: 200 });
  }
}
