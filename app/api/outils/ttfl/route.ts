import { NextRequest, NextResponse } from 'next/server';
import { ownerOnly } from '../../../../lib/owner';
import { getDayRows, getJson, ymdLocal } from '../../../../lib/ttfl';
import { redis } from '../../../../lib/redis';
import { ttflEst } from '../../../../lib/ttflEst';

// Historique TTFL par joueur depuis le debut de saison (nuits terminees, date americaine). Outil prive.
export const maxDuration = 60;
const START = '2026-10-21';
export async function GET(req: NextRequest) {
  const deny = await ownerOnly(req); if (deny) return deny;
  try {
    if (req.nextUrl.searchParams.get('summary')) return NextResponse.json(await summary());
    // Planning des journees NBA (jour americain) : matchs et heure du premier coup d'envoi (= cloture du deck TTFL)
    const sched = req.nextUrl.searchParams.get('sched');
    if (sched) {
      const out: Record<string, { first: string | null; games: { h: string; a: string }[] }> = {};
      await Promise.all(sched.split(',').filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(0, 16).map(async d => {
        const sb = await getJson(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${d.replace(/-/g, '')}&limit=50`, 1800).catch(() => null);
        const ev: any[] = sb?.events || [];
        const times = ev.map(e => e.date as string).sort();
        out[d] = { first: times[0] || null, games: ev.map(e => { const c = e.competitions?.[0]?.competitors || []; const h = c.find((x: any) => x.homeAway === 'home'), a = c.find((x: any) => x.homeAway === 'away'); return { h: h?.team?.abbreviation, a: a?.team?.abbreviation }; }).filter(g => g.h && g.a) };
      }));
      // Rapport de blessures ESPN (statuts Out / Day-To-Day) : "long" = absence de plusieurs semaines (chirurgie, fracture, dechirure...)
      const nrm = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
      const inj: Record<string, { s: 'OUT' | 'DTD'; long: boolean }> = {};
      const ij = await getJson('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries', 900).catch(() => null);
      for (const t of ij?.injuries || []) for (const i of t.injuries || []) {
        const n = i.athlete?.displayName; if (!n) continue;
        const txt = `${i.shortComment || ''} ${i.longComment || ''}`;
        inj[nrm(n)] = { s: i.status === 'Out' ? 'OUT' : 'DTD', long: i.status === 'Out' && /surgery|procedure|fractur|torn|tear|ACL|season|weeks|months|indefinite|rupture/i.test(txt) };
      }
      return NextResponse.json({ ok: true, sched: out, inj });
    }
    const dates: string[] = [];
    const end = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
    for (let d = new Date(START + 'T12:00:00'); d <= end; d.setDate(d.getDate() + 1)) dates.push(ymdLocal(d));
    const days = await Promise.all(dates.map(async d => ({ d, rows: await getDayRows(d).catch(() => null) })));
    const hist: Record<string, { d: string; t: number; m: number; tm: string }[]> = {};
    for (const { d, rows } of days) for (const r of rows || []) (hist[r.n] ||= []).push({ d, t: r.t, m: r.m, tm: r.tm });
    return NextResponse.json({ ok: true, nights: days.filter(x => x.rows).length, hist }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 502 });
  }
}

// Journal : estimation faite la veille (snapshot quotidien) contre le vrai score TTFL. Nuit Paris D = jour americain D-1.
const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const parisDay = (t: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date(t));
async function summary() {
  const agg = { n: 0, dnp: 0, abs: 0, bias: 0, top: 0, avg: 0, nights: 0 }; const per: unknown[] = [];
  for (let k = 1; k <= 40; k++) {
    const night = parisDay(Date.now() - k * 86400000);
    const snap = await redis.get<[string, number, number | null, number | null, string | null][]>('ttflog:snap:' + night);
    if (!snap) continue;
    const us = new Date(night + 'T12:00:00Z'); us.setUTCDate(us.getUTCDate() - 1);
    const rows = await getDayRows(us.toISOString().slice(0, 10)).catch(() => null);
    if (!rows) continue;
    const act: Record<string, number> = {}; rows.forEach(r => { act[norm(r.n)] = r.t; });
    const res: { est: number; t: number }[] = [];
    for (const [name, proj, l5, l10, inj] of snap) {
      if (inj && inj !== 'GTD') continue;
      const t = act[norm(name)];
      if (t == null) { agg.dnp++; continue; }
      res.push({ est: ttflEst(proj, l5, l10, inj), t });
    }
    if (res.length < 5) continue;
    const mae = res.reduce((s, x) => s + Math.abs(x.est - x.t), 0) / res.length;
    const top = res.slice().sort((a, b) => b.est - a.est).slice(0, 3).reduce((s, x) => s + x.t, 0) / 3;
    const avg = res.reduce((s, x) => s + x.t, 0) / res.length;
    agg.n += res.length; agg.abs += mae * res.length; agg.bias += res.reduce((s, x) => s + x.est - x.t, 0); agg.top += top; agg.avg += avg; agg.nights++;
    per.push({ night, joueurs: res.length, mae: +mae.toFixed(2), top3: +top.toFixed(1), moyenneNuit: +avg.toFixed(1) });
  }
  const f = (x: number, d: number) => (d ? +(x / d).toFixed(2) : null);
  return { nuits: agg.nights, joueurs: agg.n, dnp: agg.dnp, mae: f(agg.abs, agg.n), biais: f(agg.bias, agg.n), top3Moyen: f(agg.top, agg.nights), moyenneNuit: f(agg.avg, agg.nights), per };
}
