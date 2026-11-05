import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { getGw, marketPics } from '../../../lib/gwData';
import { best, vary, BONUS_IS, CAPS, MAX_PER_TEAM } from '../../../lib/gwLineup';

// Image 16:9 d'une compo (post X / partage). ?c=champ|cont : compo idéale du builder ; ?d=<json base64url> : compo perso {t,c:[{n,v,p,s,b}]}.
export const maxDuration = 30;
type It = { n: string; v: number; p: string | null; s: number; b: number };
const okHost = (u: string) => /^https:\/\/assets\.sorare\.com\//.test(u);
async function dataUrl(u: string | null) {
  if (!u || !okHost(u)) return null;
  try { const r = await fetch(u, { signal: AbortSignal.timeout(8000) }); if (!r.ok) return null; const b = Buffer.from(await r.arrayBuffer()); return `data:${r.headers.get('content-type') || 'image/png'};base64,${b.toString('base64')}`; } catch { return null; }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  let title = '', sub = '', items: It[] = [];
  try {
    if (sp.get('d')) {
      const o = JSON.parse(Buffer.from(sp.get('d')!, 'base64url').toString('utf8'));
      title = String(o.t || '').slice(0, 60); sub = String(o.u || '').slice(0, 80);
      items = (o.c || []).slice(0, 5).map((x: any) => ({ n: String(x.n).slice(0, 28), v: Number(x.v) || 0, p: x.p ? String(x.p) : null, s: Number(x.s) || 0, b: Number(x.b) || 0 }));
    } else {
      const kind = sp.get('c') === 'cont' ? 'cont' : 'champ';
      const gw = await getGw();
      const ok = gw.players.filter(p => !(p.inj && p.inj !== 'GTD') && p.games > 0);
      const set = best(ok.map(p => ({ id: p.slug, p, v: p.proj * BONUS_IS * (p.inj === 'GTD' ? 0.88 : 1), cost: Math.round(p.stars * 2), pw: BONUS_IS, is: true, pic: p.pic, real: false })), CAPS[kind] * 2, MAX_PER_TEAM);
      const v = vary(set, await marketPics(set.map(c => c.p.slug)));
      title = `Compo ${kind === 'champ' ? 'Champion' : 'Contender'} · GW ${gw.fixture.gw}`;
      sub = `${v.reduce((t, c) => t + c.v, 0).toFixed(1)} pts · ${CAPS[kind]} étoiles max`;
      items = v.map(c => ({ n: c.p.name, v: c.v, p: c.real ? c.pic : null, s: c.p.stars, b: Math.round((c.pw - 1) * 100) }));
    }
  } catch { return new Response('bad request', { status: 400 }); }
  const imgs = await Promise.all(items.map(i => dataUrl(i.p)));
  const stars = Array.from({ length: 90 }, (_, i) => ({ x: (i * 977) % 1200, y: (i * 613) % 675, r: 1 + (i % 3) * 0.7, o: 0.3 + (i % 5) * 0.14 }));
  return new ImageResponse((
    <div style={{ width: 1200, height: 675, display: 'flex', flexDirection: 'column', background: 'linear-gradient(160deg,#050a1c,#030510 60%,#0a1420)', position: 'relative', color: '#fff', padding: '34px 40px' }}>
      {stars.map((s, i) => <div key={i} style={{ position: 'absolute', left: s.x, top: s.y, width: s.r * 2, height: s.r * 2, borderRadius: 99, background: '#fff', opacity: s.o }} />)}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 22 }}>
        <div style={{ display: 'flex', fontSize: 42, fontWeight: 700 }}>{title}</div>
        <div style={{ display: 'flex', fontSize: 28, color: '#19d3e6' }}>{sub}</div>
      </div>
      <div style={{ display: 'flex', gap: 18, flex: 1 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', width: 204 }}>
            <div style={{ display: 'flex', position: 'relative', width: 204, height: 286, borderRadius: 14, overflow: 'hidden', border: '3px solid #d4af37', background: '#0b1d26' }}>
              {imgs[i] && <img src={imgs[i]!} width={204} height={286} style={{ position: 'absolute', left: 0, top: 0, width: 204, height: 286, objectFit: 'cover' }} />}
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 88, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 8, background: 'linear-gradient(transparent,#000d 60%)' }}>
                <div style={{ display: 'flex', fontSize: 44, fontWeight: 800, lineHeight: 1 }}>{it.v.toFixed(1)}</div>
                <div style={{ display: 'flex', fontSize: 15, color: '#9fe' }}>{it.b ? `bonus +${it.b} %` : 'projection'}</div>
              </div>
              <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', background: '#000b', borderRadius: 8, padding: '3px 9px', fontSize: 18, alignItems: 'center', gap: 4 }}>{it.s}<svg width="16" height="16" viewBox="0 0 24 24"><polygon points="12,2 15,9 22,9.3 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9.3 9,9" fill="#fff" /></svg></div>
            </div>
            <div style={{ display: 'flex', marginTop: 10, fontSize: 21, fontWeight: 700 }}>{it.n}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, color: '#9ab', marginTop: 8 }}>
        <div style={{ display: 'flex' }}>Projection Sorare × bonus de la carte</div>
        <div style={{ display: 'flex', color: '#19d3e6', fontWeight: 700 }}>mynftlocker.com</div>
      </div>
    </div>
  ), { width: 1200, height: 675, headers: { 'Cache-Control': 'public, s-maxage=600' } });
}
