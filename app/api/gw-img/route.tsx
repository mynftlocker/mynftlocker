import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { getGw, marketPics } from '../../../lib/gwData';
import { best, vary, BONUS_IS, CAPS, MAX_PER_TEAM, type Cand } from '../../../lib/gwLineup';
import { Slab } from '../../outils/gw/Slab';

// Image 16:9 d'une compo (post X / partage). ?c=champ|cont : compo idéale du builder ; ?d=<json base64url> : compo perso {t,u,c:[Cand allégé]}.
export const maxDuration = 30;
const okHost = (u: string) => /^https:\/\/assets\.sorare\.com\//.test(u);
async function dataUrl(u: string | null) {
  if (!u || !okHost(u)) return null;
  try { const r = await fetch(u, { signal: AbortSignal.timeout(8000) }); if (!r.ok) return null; const b = Buffer.from(await r.arrayBuffer()); return `data:${r.headers.get('content-type') || 'image/png'};base64,${b.toString('base64')}`; } catch { return null; }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  let title = '', sub = '', items: Cand[] = [];
  try {
    if (sp.get('d')) {
      const o = JSON.parse(Buffer.from(sp.get('d')!, 'base64url').toString('utf8'));
      title = String(o.t || '').slice(0, 60); sub = String(o.u || '').slice(0, 80);
      items = (o.c || []).slice(0, 5).map((x: any, i: number): Cand => ({
        id: 'x' + i, v: Number(x.v) || 0, cost: 0, pw: 1 + (Number(x.b) || 0) / 100, is: true, pic: x.p ? String(x.p) : null, real: !!x.p,
        p: { slug: 'x' + i, name: String(x.n).slice(0, 28), team: '', teamName: String(x.tn || '').slice(0, 30), games: Number(x.g?.length) || 0, opp: (x.g || []).slice(0, 4).map((g: any) => ({ d: String(g.d), o: String(g.o).slice(0, 30), h: !!g.h, pj: g.pj == null ? null : Number(g.pj) })), stars: Number(x.s) || 0, proj: 0, l10: null, inj: x.i ? String(x.i).slice(0, 4) : null, pic: null },
      }));
    } else {
      const kind = sp.get('c') === 'cont' ? 'cont' : 'champ';
      const gw = await getGw();
      const ok = gw.players.filter(p => !(p.inj && p.inj !== 'GTD') && p.games > 0);
      const set = best(ok.map(p => ({ id: p.slug, p, v: p.proj * BONUS_IS * (p.inj === 'GTD' ? 0.88 : 1), cost: Math.round(p.stars * 2), pw: BONUS_IS, is: true, pic: p.pic, real: false })), CAPS[kind] * 2, MAX_PER_TEAM);
      items = vary(set, await marketPics(set.map(c => c.p.slug)));
      title = `Compo ${kind === 'champ' ? 'Champion' : 'Contender'} · GW ${gw.fixture.gw}`;
      sub = `${items.reduce((t, c) => t + c.v, 0).toFixed(1)} pts · ${CAPS[kind]} étoiles max`;
    }
  } catch { return new Response('bad request', { status: 400 }); }
  const imgs = await Promise.all(items.map(i => dataUrl(i.real ? i.pic : null)));
  const W = 208;
  const orbs = Array.from({ length: 26 }, (_, i) => ({ x: (i * 463 + 91) % 1200, y: (i * 271 + 40) % 675, r: 3 + (i % 4) * 1.6, o: 0.5 + (i % 3) * 0.2 }));
  const dots = Array.from({ length: 70 }, (_, i) => ({ x: (i * 977) % 1200, y: (i * 613) % 675, r: 0.8 + (i % 3) * 0.5, o: 0.25 + (i % 5) * 0.12 }));
  return new ImageResponse((
    <div style={{ width: 1200, height: 675, display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg,#030510,#050a1a)', position: 'relative', color: '#fff', padding: '26px 40px' }}>
      {dots.map((s, i) => <div key={'d' + i} style={{ position: 'absolute', left: s.x, top: s.y, width: s.r * 2, height: s.r * 2, borderRadius: 99, background: '#e1f0ff', opacity: s.o }} />)}
      {orbs.map((s, i) => <div key={'o' + i} style={{ position: 'absolute', left: s.x - s.r * 3, top: s.y - s.r * 3, width: s.r * 6, height: s.r * 6, borderRadius: 99, background: `radial-gradient(circle,rgba(200,250,255,${s.o}) 0%,rgba(64,232,255,${s.o * 0.5}) 30%,rgba(64,232,255,0) 70%)` }} />)}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', fontSize: 38, fontWeight: 700 }}>{title}</div>
        <div style={{ display: 'flex', fontSize: 26, color: '#40e8ff' }}>{sub}</div>
      </div>
      <div style={{ display: 'flex', gap: 16, flex: 1 }}>
        {items.map((it, i) => <div key={i} style={{ display: 'flex', width: W }}><Slab c={it} u={n => `${((n * W) / 100).toFixed(2)}px`} art={imgs[i]} /></div>)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 19, color: '#9ab' }}>
        <div style={{ display: 'flex' }}>Projection Sorare × bonus de la carte</div>
        <div style={{ display: 'flex', color: '#40e8ff', fontWeight: 700 }}>mynftlocker.com</div>
      </div>
    </div>
  ), { width: 1200, height: 675, headers: { 'Cache-Control': 'public, s-maxage=600' } });
}
