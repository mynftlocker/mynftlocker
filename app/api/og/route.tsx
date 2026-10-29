import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { redis } from '../../../lib/redis';

// Image d'apercu (1200x630) affichee quand un lien myNFTlocker est colle dans X / Discord / WhatsApp...
// ?slug=<manager> -> son dernier vestiaire partage (voir /api/share-snapshot) ; sans slug ou sans vestiaire partage -> carte "marque".
export const runtime = 'nodejs';
const W = 1200, H = 630;

const toDataUrl = async (u: string) => {
  try {
    const r = await fetch(u, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return null;
    const ct = r.headers.get('content-type') || 'image/png';
    return 'data:' + ct + ';base64,' + Buffer.from(await r.arrayBuffer()).toString('base64');
  } catch (e) { return null; }
};
const loadFont = async () => {
  try {
    const r = await fetch('https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.8/files/inter-latin-700-normal.woff', { signal: AbortSignal.timeout(4000) });
    return r.ok ? await r.arrayBuffer() : null;
  } catch (e) { return null; }
};

export async function GET(req: NextRequest) {
  const slug = (req.nextUrl.searchParams.get('slug') || '').trim().toLowerCase();
  let snap: any = null;
  if (/^[a-z0-9_-]{1,80}$/.test(slug)) {
    try { const raw = await redis.get('share:' + slug); snap = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null; } catch (e) { /* pas de vestiaire partage */ }
  }
  const cards: any[] = snap && Array.isArray(snap.cards) ? snap.cards.slice(0, 5) : [];
  const [imgs, pack, font] = await Promise.all([
    Promise.all(cards.map((c) => toDataUrl(String(c.u || '')))),
    cards.length ? Promise.resolve(null) : toDataUrl(req.nextUrl.origin + '/logo-pack.png'),
    loadFont(),
  ]);
  const manager = String(snap?.m || slug || '').slice(0, 30);
  const title = String(snap?.t || '').toUpperCase().slice(0, 40);

  const body = (
    <div style={{ width: W, height: H, display: 'flex', flexDirection: 'column', padding: '40px 56px', background: 'radial-gradient(circle at 50% 35%, #16233f 0%, #080d18 60%, #04070d 100%)', color: '#fff', fontFamily: font ? 'Inter' : 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 50, fontWeight: 700, color: '#f5d76e' }}>myNFTlocker</div>
          <div style={{ display: 'flex', fontSize: 24, color: '#9fb0c4', marginTop: 2 }}>mynftlocker.com</div>
        </div>
        {manager && cards.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', fontSize: 22, color: '#40e8ff', letterSpacing: 4 }}>MANAGER</div>
            <div style={{ display: 'flex', fontSize: 52, fontWeight: 700, color: '#ffffff' }}>{manager}</div>
          </div>
        )}
      </div>
      {cards.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, alignItems: 'center' }}>
          {title && <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, color: '#ffd060', letterSpacing: 8, marginTop: 4 }}>{title}</div>}
          <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {imgs.map((src, i) => src
              ? <img key={i} src={src} width={196} height={294} style={{ objectFit: 'contain', borderRadius: 12, marginLeft: i ? 24 : 0, boxShadow: '0 0 26px rgba(245,215,110,0.45)' }} />
              : <div key={i} style={{ display: 'flex', width: 196, height: 294, borderRadius: 12, marginLeft: i ? 24 : 0, border: '2px solid rgba(245,215,110,0.4)' }} />)}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {pack && <img src={pack} height={380} style={{ objectFit: 'contain', marginRight: 56 }} />}
          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 620 }}>
            {slug && <div style={{ display: 'flex', fontSize: 30, color: '#40e8ff', letterSpacing: 4 }}>VESTIAIRE DE</div>}
            <div style={{ display: 'flex', fontSize: slug ? 64 : 58, fontWeight: 700, color: '#ffffff', lineHeight: 1.1 }}>{slug || 'Ta galerie et ton vestiaire Sorare'}</div>
            <div style={{ display: 'flex', fontSize: 28, color: '#9fb0c4', marginTop: 18 }}>NBA · Foot · Filtres · Stats · Partage</div>
          </div>
        </div>
      )}
    </div>
  );
  return new ImageResponse(body, {
    width: W, height: H,
    ...(font ? { fonts: [{ name: 'Inter', data: font, weight: 700 as const, style: 'normal' as const }] } : {}),
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400' },
  });
}
