import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { openDayNow, tier, tierBg } from '../../../../lib/advent';
import { buildDay } from '../../../../lib/adventDay';

// Image de partage (1200x630) d'une case du calendrier : ?day=N -> carte du jour, noms et scores ; sans jour valide ou case fermee -> visuel generique.
export const runtime = 'nodejs';
export const maxDuration = 60;
const W = 1200, H = 630;

const toDataUrl = async (u: string) => {
  try {
    const r = await fetch(u, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const ct = r.headers.get('content-type') || 'image/png';
    if (!/^image\//i.test(ct)) return null;
    return 'data:' + ct + ';base64,' + Buffer.from(await r.arrayBuffer()).toString('base64');
  } catch (e) { return null; }
};
// Logos du site : on essaie l'adresse courante (Preview protegee = refus), puis la production
const logo = async (origin: string, path: string) => (await toDataUrl(origin + path)) || (await toDataUrl('https://mynftlocker.com' + path));
// QR code aux couleurs du site (meme style que le partage de vestiaire : plaque claire, modules sombres arrondis), rendu en SVG
const qrSvg = async (link: string) => {
  try {
    const QR: any = await import('qrcode');
    const q = (QR.create || QR.default?.create)(link, { errorCorrectionLevel: 'M' });
    const n: number = q.modules.size, m = 100 / (n + 5), off = m * 2.5;
    let r = '';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.modules.get(y, x)) r += `<rect x="${(off + x * m).toFixed(2)}" y="${(off + y * m).toFixed(2)}" width="${(m * 1.04).toFixed(2)}" height="${(m * 1.04).toFixed(2)}" rx="${(m * 0.12).toFixed(2)}"/>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="9" fill="#f4f6ff"/><g fill="#0a0e16">${r}</g></svg>`;
    return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
  } catch (e) { return null; }
};
const loadFont = async () => {
  try {
    const r = await fetch('https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.8/files/inter-latin-700-normal.woff', { signal: AbortSignal.timeout(4000) });
    return r.ok ? await r.arrayBuffer() : null;
  } catch (e) { return null; }
};

export async function GET(req: NextRequest) {
  const day = Math.floor(Number(req.nextUrl.searchParams.get('day')));
  let d: any = null;
  const en = req.nextUrl.searchParams.get('lang') === 'en'; // francais par defaut (communaute TTFL), anglais avec ?lang=en
  const demo = Math.min(24, Math.floor(Number(req.nextUrl.searchParams.get('demo') || 0))); // apercu avant lancement : ?day=2&demo=3
  if (day >= 1 && day <= 24 && (demo > 0 ? day <= demo : day <= openDayNow())) { try { d = await buildDay(day, demo); } catch (e) { d = null; } }
  const w = d?.open ? d.top?.[0] : null;
  const [font, cardImg, pack, ttfl, sorareLogo, qr, rond, ttflText] = await Promise.all([
    loadFont(),
    w?.card?.pictureUrl && /^https:\/\/assets\.sorare\.com\//.test(w.card.pictureUrl) ? toDataUrl(w.card.pictureUrl) : Promise.resolve(null),
    w ? Promise.resolve(null) : toDataUrl(req.nextUrl.origin + '/logo-pack-blank.png'),
    logo(req.nextUrl.origin, '/logo-ttfl.png'),
    logo(req.nextUrl.origin, '/sorare-logo.png'),
    qrSvg('https://mynftlocker.com/calendrier' + (d?.open ? '?day=' + day : '')),
    logo(req.nextUrl.origin, '/logo-rond.png'),
    logo(req.nextUrl.origin, '/logo-ttfl-text.png'),
  ]);
  const s = w?.sorare as number | null | undefined;
  const col = s != null ? tier(s) : '#f0c96e';
  const body = (
    <div style={{ width: W, height: H, display: 'flex', flexDirection: 'column', position: 'relative', padding: '30px 52px 26px', background: 'radial-gradient(circle at 30% 45%, #16233f 0%, #080d18 60%, #04070d 100%)', color: '#fff', fontFamily: font ? 'Inter' : 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {ttfl ? <img src={ttfl} height={48} style={{ objectFit: 'contain' }} /> : <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, letterSpacing: 4, border: '3px solid #fff', borderRadius: 8, padding: '0 12px' }}>TTFL</div>}
          <div style={{ display: 'flex', fontSize: 30, color: '#9fb0c4', margin: '0 16px' }}>×</div>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 34, fontWeight: 700, letterSpacing: 4 }}>{sorareLogo && <img src={sorareLogo} width={44} height={44} style={{ objectFit: 'contain', marginRight: 12 }} />}SORARE <span style={{ color: '#40e8ff', marginLeft: 12 }}>ARCADE</span></div>
        </div>
        <div style={{ display: 'flex', fontSize: en ? 26 : 22, color: '#f5d76e', letterSpacing: en ? 6 : 4 }}>{en ? 'ADVENT CALENDAR' : 'CALENDRIER DE L’AVENT'}</div>
      </div>
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 0, paddingTop: 14 }}>
        {w ? (
          <>
            {cardImg
              ? <img src={cardImg} width={262} height={420} style={{ objectFit: 'contain', borderRadius: 14, boxShadow: `0 0 40px ${col}aa` }} />
              : <div style={{ display: 'flex', width: 262, height: 420, borderRadius: 14, border: `2px solid ${col}` }} />}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: 420, marginLeft: 60, maxWidth: 720 }}>
              <div style={{ display: 'flex', fontSize: 23, color: '#40e8ff', letterSpacing: 3, whiteSpace: 'nowrap' }}>{en ? `DAY ${day} · BEST TTFL OF THE NIGHT` : `JOUR ${day} · MEILLEUR SCORE TTFL DE LA NUIT`}</div>
              <div style={{ display: 'flex', fontSize: 62, fontWeight: 700, lineHeight: 1.05, marginTop: 12 }}>{String(w.name).slice(0, 30)}</div>
              <div style={{ display: 'flex', fontSize: 28, color: '#9fb0c4', marginTop: 8 }}>{w.team}</div>
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 22 }}>
                <span style={{ fontSize: 100, fontWeight: 700, lineHeight: 1 }}>{w.score}</span>
                {ttflText ? <img src={ttflText} height={58} style={{ objectFit: 'contain', marginLeft: 14 }} /> : <span style={{ fontSize: 30, color: '#9fb0c4', marginLeft: 12, letterSpacing: 4 }}>TTFL</span>}
              </div>
              <div style={{ display: 'flex', marginTop: 20 }}>
                {[['PTS', w.pts], ['REB', w.reb], [en ? 'AST' : 'PD', w.ast], [en ? 'STL' : 'INT', w.stl], [en ? 'BLK' : 'CT', w.blk]].map(([l, v]) => (
                  <div key={String(l)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: 14, padding: '6px 18px', borderRadius: 12, background: 'rgba(255,255,255,.07)' }}>
                    <span style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.1 }}>{String(v ?? 0)}</span>
                    <span style={{ fontSize: 15, color: '#9fb0c4', letterSpacing: 3 }}>{l}</span>
                  </div>
                ))}
                {s != null && (
                  <div style={{ display: 'flex', alignItems: 'center', marginLeft: 22, padding: '6px 20px', borderRadius: 12, border: `3px solid ${col}`, background: 'rgba(0,0,0,.35)' }}>
                    <span style={{ fontSize: 40, fontWeight: 700, color: col, lineHeight: 1.1 }}>{s}</span>
                    {sorareLogo && <img src={sorareLogo} width={30} height={30} style={{ objectFit: 'contain', marginLeft: 10 }} />}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {pack && <img src={pack} height={400} style={{ objectFit: 'contain', marginRight: 64 }} />}
            <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 640 }}>
              <div style={{ display: 'flex', fontSize: en ? 72 : 60, fontWeight: 700, lineHeight: 1.08, color: '#f5d76e' }}>{en ? '24 packs. 24 cards. Every morning in December.' : '24 packs. 24 cartes. Chaque matin de décembre.'}</div>
              <div style={{ display: 'flex', fontSize: 30, color: '#9fb0c4', marginTop: 22 }}>{en ? 'The best TTFL score of the NBA night, on its free Sorare Arcade card.' : 'Le meilleur score TTFL de la nuit NBA, sur sa carte Sorare Arcade gratuite.'}</div>
            </div>
          </>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24, color: '#9fb0c4' }}>
        <div style={{ display: 'flex' }}>mynftlocker.com/calendrier</div>
      </div>
      {qr && (
        <div style={{ position: 'absolute', right: 52, bottom: 24, display: 'flex', width: 112, height: 112 }}>
          <img src={qr} width={112} height={112} />
          {rond && <img src={rond} width={26} height={26} style={{ position: 'absolute', left: 43, top: 43, borderRadius: 13 }} />}
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
