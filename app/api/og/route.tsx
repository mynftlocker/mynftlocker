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
    if (!/^image\//i.test(ct)) return null; // ex. page de connexion Vercel (Preview protegee) : jamais une image
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
  const small = req.nextUrl.searchParams.get('s') === 'sm'; // version legere (600x315, < 300 Ko) pour WhatsApp
  let snap: any = null;
  if (/^[a-z0-9_-]{1,80}$/.test(slug)) {
    try { const raw = await redis.get('share:' + slug); snap = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null; } catch (e) { /* pas de vestiaire partage */ }
  }
  // Manager sans vestiaire partage : apercu automatique avec 5 de ses cartes (requete Sorare legere, 4 s max)
  if (!snap && /^[a-z0-9_-]{1,80}$/.test(slug) && !req.nextUrl.searchParams.get('card')) {
    try {
      const h: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
      if (process.env.SORARE_API_KEY) h['APIKEY'] = process.env.SORARE_API_KEY;
      const r = await fetch('https://api.sorare.com/graphql', { method: 'POST', headers: h, body: JSON.stringify({ query: `query{user(slug:"${slug}"){nickname cards(first:5){nodes{name pictureUrl}}}}` }), signal: AbortSignal.timeout(4000) });
      const u = r.ok ? (await r.json())?.data?.user : null;
      const cs = (u?.cards?.nodes || []).filter((c: any) => /^https:\/\/assets\.sorare\.com\//.test(String(c?.pictureUrl || ''))).map((c: any) => ({ n: String(c.name || ''), u: String(c.pictureUrl) }));
      if (cs.length) snap = { m: String(u?.nickname || slug).slice(0, 30), t: '', cards: cs };
    } catch (e) { /* apercu generique */ }
  }
  // ?card=<slug de carte> : apercu d'UNE carte (lien de partage d'une carte)
  const cardParam = (req.nextUrl.searchParams.get('card') || '').trim().toLowerCase();
  let one: any = null;
  if (/^[a-z0-9_-]{3,200}$/.test(cardParam)) {
    try {
      const r = await fetch(req.nextUrl.origin + '/api/cards?card=' + encodeURIComponent(cardParam), { signal: AbortSignal.timeout(7000) });
      if (r.ok) { const j = await r.json(); if (j?.card?.pictureUrl && /^https:\/\/assets\.sorare\.com\//.test(String(j.card.pictureUrl))) one = j.card; }
    } catch (e) { /* retombe sur l'apercu du vestiaire */ }
  }
  const cards: any[] = one ? [] : (snap && Array.isArray(snap.cards) ? snap.cards.slice(0, 5) : []);
  const [imgs, pack, font, oneImg] = await Promise.all([
    Promise.all(cards.map((c) => toDataUrl(String(c.u || '')))),
    (cards.length || one) ? Promise.resolve(null) : toDataUrl(req.nextUrl.origin + '/logo-pack.png'),
    loadFont(),
    one ? toDataUrl(String(one.pictureUrl)) : Promise.resolve(null),
  ]);
  const manager = String(snap?.m || slug || '').slice(0, 30);
  const title = String(snap?.t || '').toUpperCase().slice(0, 40);

  // Toutes les dimensions passent par n() : version legere = moitie de taille, dessinee directement (pas de transform)
  const k = small ? 0.5 : 1;
  const n = (v: number) => Math.round(v * k);
  const listBody = (
    <div style={{ width: n(W), height: n(H), display: 'flex', flexDirection: 'column', padding: `${n(40)}px ${n(56)}px`, background: 'radial-gradient(circle at 50% 35%, #16233f 0%, #080d18 60%, #04070d 100%)', color: '#fff', fontFamily: font ? 'Inter' : 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: n(50), fontWeight: 700, color: '#f5d76e' }}>myNFTlocker</div>
          <div style={{ display: 'flex', fontSize: n(24), color: '#9fb0c4', marginTop: n(2) }}>mynftlocker.com</div>
        </div>
        {manager && cards.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', fontSize: n(22), color: '#40e8ff', letterSpacing: n(4) }}>MANAGER</div>
            <div style={{ display: 'flex', fontSize: n(52), fontWeight: 700, color: '#ffffff' }}>{manager}</div>
          </div>
        )}
      </div>
      {cards.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, alignItems: 'center' }}>
          {title && <div style={{ display: 'flex', fontSize: n(34), fontWeight: 700, color: '#ffd060', letterSpacing: n(8), marginTop: n(4) }}>{title}</div>}
          <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {imgs.map((src, i) => src
              ? <img key={i} src={src} width={n(196)} height={n(294)} style={{ objectFit: 'contain', borderRadius: n(12), marginLeft: i ? n(24) : 0, boxShadow: `0 0 ${n(26)}px rgba(245,215,110,0.45)` }} />
              : <div key={i} style={{ display: 'flex', width: n(196), height: n(294), borderRadius: n(12), marginLeft: i ? n(24) : 0, border: '2px solid rgba(245,215,110,0.4)' }} />)}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {pack && <img src={pack} height={n(380)} style={{ objectFit: 'contain', marginRight: n(56) }} />}
          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: n(620) }}>
            {slug && <div style={{ display: 'flex', fontSize: n(30), color: '#40e8ff', letterSpacing: n(4) }}>VESTIAIRE DE</div>}
            <div style={{ display: 'flex', fontSize: n(slug ? 64 : 58), fontWeight: 700, color: '#ffffff', lineHeight: 1.1 }}>{slug || 'Ta galerie et ton vestiaire Sorare'}</div>
            <div style={{ display: 'flex', fontSize: n(28), color: '#9fb0c4', marginTop: n(18) }}>NBA · Foot · Filtres · Stats · Partage</div>
          </div>
        </div>
      )}
    </div>
  );
  const RAR: Record<string, [string, string]> = { limited: ['LIMITED', '#f5c542'], rare: ['RARE', '#ff4d4d'], super_rare: ['SUPER RARE', '#4aa3ff'], unique: ['UNIQUE', '#c8a2ff'], common: ['COMMON', '#9ca3af'], custom_series: ['CUSTOM SERIES', '#9ca3af'] };
  const [rLabel, rColor] = RAR[String(one?.rarityTyped || '')] || ['', '#f5d76e'];
  const cardView = (
    <div style={{ width: n(W), height: n(H), display: 'flex', flexDirection: 'column', padding: `${n(40)}px ${n(56)}px`, background: 'radial-gradient(circle at 35% 50%, #16233f 0%, #080d18 60%, #04070d 100%)', color: '#fff', fontFamily: font ? 'Inter' : 'sans-serif' }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', fontSize: n(50), fontWeight: 700, color: '#f5d76e' }}>myNFTlocker</div>
        <div style={{ display: 'flex', fontSize: n(24), color: '#9fb0c4', marginTop: n(2) }}>mynftlocker.com</div>
      </div>
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {oneImg
          ? <img src={oneImg} width={n(290)} height={n(435)} style={{ objectFit: 'contain', borderRadius: n(14), boxShadow: `0 0 ${n(34)}px ${rColor}88` }} />
          : <div style={{ display: 'flex', width: n(290), height: n(435), borderRadius: n(14), border: '2px solid rgba(245,215,110,0.4)' }} />}
        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: n(64), maxWidth: n(560) }}>
          {rLabel && <div style={{ display: 'flex', fontSize: n(58), fontWeight: 700, color: rColor, letterSpacing: n(6) }}>{rLabel}</div>}
          <div style={{ display: 'flex', fontSize: n(26), color: '#40e8ff', letterSpacing: n(4), marginTop: n(22) }}>MANAGER</div>
          <div style={{ display: 'flex', fontSize: n(54), fontWeight: 700, color: '#ffffff', lineHeight: 1.1 }}>{manager || slug}</div>
          <div style={{ display: 'flex', fontSize: n(26), color: '#9fb0c4', marginTop: n(18) }}>Carte Sorare · vestiaire myNFTlocker</div>
        </div>
      </div>
    </div>
  );
  const body = one ? cardView : listBody;
  return new ImageResponse(body, {
    width: n(W), height: n(H),
    ...(font ? { fonts: [{ name: 'Inter', data: font, weight: 700 as const, style: 'normal' as const }] } : {}),
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400' },
  });
}
