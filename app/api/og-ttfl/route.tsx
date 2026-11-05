import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

// Apercu (1200x630) du lien /ttfl : top 3 des projections de la nuit. ?s=sm = version legere (WhatsApp, < 300 Ko).
export const runtime = 'nodejs';
const W = 1200, H = 630;
const loadFont = async () => {
  try { const r = await fetch('https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.8/files/inter-latin-700-normal.woff', { signal: AbortSignal.timeout(4000) }); return r.ok ? await r.arrayBuffer() : null; } catch (e) { return null; }
};
const toDataUrl = async (u: string) => {
  try { const r = await fetch(u, { signal: AbortSignal.timeout(5000) }); if (!r.ok || !/^image\//i.test(r.headers.get('content-type') || '')) return null; return 'data:' + r.headers.get('content-type') + ';base64,' + Buffer.from(await r.arrayBuffer()).toString('base64'); } catch (e) { return null; }
};

export async function GET(req: NextRequest) {
  const small = req.nextUrl.searchParams.get('s') === 'sm'; const k = small ? 0.5 : 1; const n = (v: number) => Math.round(v * k);
  const night = /^\d{4}-\d{2}-\d{2}$/.test(req.nextUrl.searchParams.get('night') || '') ? req.nextUrl.searchParams.get('night')! : new Date().toISOString().slice(0, 10);
  let top: { name: string; est: number; opp: string; home: boolean }[] = [];
  try {
    const r = await fetch(req.nextUrl.origin + '/api/ttfl?night=' + night, { signal: AbortSignal.timeout(7000) });
    const j = r.ok ? await r.json() : null;
    if (j?.ok) top = (j.rows as any[]).filter(x => !x.status || x.status === 'GTD' ? true : false).sort((a, b) => b.est - a.est).slice(0, 3).map(x => ({ name: String(x.name), est: x.est, opp: String(x.opp || '').split(' ').pop() || '', home: !!x.home }));
  } catch (e) { /* carte generique */ }
  const [font, pack] = await Promise.all([loadFont(), small ? Promise.resolve(null) : toDataUrl(req.nextUrl.origin + '/logo-pack.png')]);
  const day = new Date(night + 'T12:00:00Z').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const body = (
    <div style={{ width: n(W), height: n(H), display: 'flex', flexDirection: 'column', padding: `${n(44)}px ${n(60)}px`, background: 'radial-gradient(circle at 70% 40%, #16233f 0%, #080d18 60%, #04070d 100%)', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', fontSize: n(46), fontWeight: 700, color: '#f5d76e' }}>myNFTlocker</div>
        <div style={{ display: 'flex', fontSize: n(26), color: '#9fb0c4' }}>mynftlocker.com/ttfl</div>
      </div>
      <div style={{ display: 'flex', flex: 1, alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', fontSize: n(30), color: '#40e8ff', letterSpacing: n(6) }}>TTFL · NBA</div>
          <div style={{ display: 'flex', fontSize: n(76), fontWeight: 700, lineHeight: 1.05, marginTop: n(8) }}>Projections de la nuit</div>
          <div style={{ display: 'flex', fontSize: n(30), color: '#9fb0c4', marginTop: n(10) }}>{day} · best picks, blessures, forme</div>
          {top.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: n(30) }}>
              {top.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'baseline', marginTop: i ? n(10) : 0 }}>
                  <div style={{ display: 'flex', width: n(130), flexShrink: 0, fontSize: n(46), fontWeight: 700, color: '#40e8ff' }}>{p.est.toFixed(1)}</div>
                  <div style={{ display: 'flex', fontSize: n(36), fontWeight: 700 }}>{p.name}</div>
                  <div style={{ display: 'flex', fontSize: n(26), color: '#9fb0c4', marginLeft: n(14) }}>{p.home ? 'vs' : '@'} {p.opp}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        {pack && <img src={pack} height={n(380)} style={{ objectFit: 'contain', marginLeft: n(30) }} />}
      </div>
    </div>
  );
  return new ImageResponse(body, { width: n(W), height: n(H), ...(font ? { fonts: [{ name: 'Inter', data: font, weight: 700 as const, style: 'normal' as const }] } : {}), headers: { 'Cache-Control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=3600' } });
}
