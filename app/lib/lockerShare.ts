// Export image du vestiaire (5 cartes visibles) : composition 100 % canvas (pas de capture DOM -> pas de bug d'animation/ombre/mobile).
// Deux formats : 'wide' (paysage, X / Discord / web) et 'ig' (Instagram 4:5, 1080x1350).
import { getManager, galleryLink } from '../lib-share';

export type LockerLayout = { slots: { left: number; w: number }[]; cardTop: number; plateX: number[]; plateTop: number; teamX: number; teamY: number };
export type LockerShareOpts = {
  cards: any[];            // les cartes a montrer (max 5)
  names: string[];         // nom de famille affiche sur chaque plaque
  bg: string;              // decor, ex. '/locker-hof.png'
  title: [string, string]; // titre 2 lignes (NBA) ex. ['DETROIT','PISTONS']
  showTeamTitle: boolean;  // true = titre dessine dans le decor (NBA) ; false = decor sans zone titre (foot)
  caption: string;         // titre une ligne (utilise quand le decor n'a pas de zone titre)
  layout: LockerLayout;
};
export type LockerFormat = 'wide' | 'ig';

const SCENE_RATIO = 768 / 1376; // proportions du decor (identiques a la scene a l'ecran)

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
}

// Charge une image. Images distantes (cartes Sorare) : fetch CORS -> blob (meme technique que l'export de carte). Echec -> null (jamais d'exception).
async function loadImage(src: string): Promise<HTMLImageElement | null> {
  const fromUrl = (u: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('img')); i.src = u; });
  try {
    if (!/^https?:/i.test(src)) return await withTimeout(fromUrl(src), 12000);
    for (const cache of ['default', 'reload'] as RequestCache[]) {
      try {
        const r = await withTimeout(fetch(src, { mode: 'cors', cache }), 12000);
        if (!r.ok) continue;
        const u = URL.createObjectURL(await r.blob());
        setTimeout(() => URL.revokeObjectURL(u), 60000);
        return await withTimeout(fromUrl(u), 12000);
      } catch (e) { /* on retente */ }
    }
  } catch (e) { /* ignore */ }
  return null;
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
}
function setSpacing(ctx: CanvasRenderingContext2D, v: string) { try { (ctx as any).letterSpacing = v; } catch (e) { /* non supporte : pas d'espacement */ } }

// Texte reduit automatiquement pour tenir dans maxW
function fitText(ctx: CanvasRenderingContext2D, txt: string, weight: number, size: number, minSize: number, maxW: number, family: string) {
  let fs = size; ctx.font = weight + ' ' + fs + 'px ' + family;
  while (fs > minSize && ctx.measureText(txt).width > maxW) { fs -= 1; ctx.font = weight + ' ' + fs + 'px ' + family; }
  return fs;
}

const plateFsPct = (l: number) => (l <= 7 ? 0.8 : l <= 9 ? 0.72 : l <= 11 ? 0.64 : l <= 13 ? 0.5 : 0.44);

// ---- Scene : decor + titre + 5 cartes + plaques, a la position (x,y) et la largeur w ----
function drawScene(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, o: LockerShareOpts, bg: HTMLImageElement | null, imgs: (HTMLImageElement | null)[]) {
  const h = w * SCENE_RATIO, L = o.layout;
  if (bg) ctx.drawImage(bg, x, y, w, h); else { ctx.fillStyle = '#0a0503'; ctx.fillRect(x, y, w, h); }
  // Titre equipe (NBA) : 2 lignes dorees lumineuses
  if (o.showTeamTitle) {
    const fs = w * 0.017, cx = x + w * L.teamX / 100, cy = y + h * L.teamY / 100;
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '900 ' + fs + 'px Georgia, serif'; setSpacing(ctx, '0.12em'); ctx.fillStyle = '#ffd060';
    const lines = [o.title[0], o.title[1]];
    lines.forEach((t, i) => {
      const ly = cy + (i === 0 ? -fs * 0.525 : fs * 0.525);
      ctx.shadowColor = 'rgba(255,160,0,0.85)'; ctx.shadowBlur = fs * 1.1; ctx.fillText(t, cx, ly);
      ctx.shadowColor = 'rgba(255,200,60,0.9)'; ctx.shadowBlur = fs * 0.4; ctx.fillText(t, cx, ly);
    });
    ctx.restore();
  }
  // Cartes
  o.cards.slice(0, 5).forEach((c, i) => {
    const s = L.slots[i]; if (!s) return;
    const cw = w * s.w / 100, cxl = x + w * s.left / 100 - cw / 2, cyt = y + h * L.cardTop / 100;
    const im = imgs[i];
    const ch = im ? cw * im.naturalHeight / im.naturalWidth : cw * 1.5;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = cw * 0.1; ctx.shadowOffsetY = cw * 0.12; ctx.fillStyle = '#0b1018'; rr(ctx, cxl, cyt, cw, ch, cw * 0.04); ctx.fill(); ctx.restore();
    if (im) { ctx.save(); rr(ctx, cxl, cyt, cw, ch, cw * 0.04); ctx.clip(); ctx.drawImage(im, cxl, cyt, cw, ch); ctx.restore(); }
    else { ctx.save(); ctx.strokeStyle = 'rgba(245,215,110,0.5)'; ctx.lineWidth = Math.max(1, cw * 0.01); rr(ctx, cxl, cyt, cw, ch, cw * 0.04); ctx.stroke(); ctx.restore(); }
  });
  // Plaques de noms
  o.cards.slice(0, 5).forEach((c, i) => {
    const name = String(o.names[i] || '').toUpperCase(); if (!name) return;
    const px = x + w * L.plateX[i] / 100, py = y + h * L.plateTop / 100, maxW = w * 0.07 - 2;
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; setSpacing(ctx, '0.03em');
    const fam = 'Georgia, serif';
    fitText(ctx, name, 900, w * plateFsPct(name.length) / 100, 6, maxW, fam);
    ctx.fillStyle = 'rgba(255,230,150,0.55)'; ctx.fillText(name, px, py + 1);
    ctx.fillStyle = '#1a0d00'; ctx.fillText(name, px, py);
    ctx.restore();
  });
}

async function drawQr(ctx: CanvasRenderingContext2D, link: string, qx: number, qy: number, size: number) {
  try {
    const QR: any = await import('qrcode');
    const q = (QR.create || QR.default?.create)(link, { errorCorrectionLevel: 'M' });
    const n: number = q.modules.size, m = size / (n + 5), off = m * 2.5;
    ctx.fillStyle = '#f4f6ff'; rr(ctx, qx, qy, size, size, size * 0.09); ctx.fill();
    ctx.fillStyle = '#0a0e16';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { if (q.modules.get(r, c)) { rr(ctx, qx + off + c * m, qy + off + r * m, m * 1.04, m * 1.04, m * 0.12); ctx.fill(); } }
    const Ls = size * 0.2, cx = qx + size / 2, cy = qy + size / 2;
    const lg = await loadImage('/logo-rond.png');
    if (lg) {
      ctx.fillStyle = '#f4f6ff'; ctx.beginPath(); ctx.arc(cx, cy, Ls * 0.62, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, Ls * 0.5, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(lg, cx - Ls / 2, cy - Ls / 2, Ls, Ls); ctx.restore();
    }
  } catch (e) { console.error('qr failed', e); }
}

function paintBackground(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const bg = ctx.createRadialGradient(W / 2, H * 0.42, W * 0.1, W / 2, H * 0.5, W * 0.9);
  bg.addColorStop(0, '#101826'); bg.addColorStop(1, '#04070d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
}

// Bloc signature : marque a gauche, MANAGER + pseudo a droite (aligne sur textRight)
function drawBrand(ctx: CanvasRenderingContext2D, x: number, baseY: number, big: number, small: number, align: CanvasTextAlign) {
  ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(245,215,110,0.95)'; ctx.font = '800 ' + big + 'px system-ui, sans-serif'; ctx.fillText('myNFTlocker', x, baseY);
  ctx.fillStyle = 'rgba(207,216,230,0.7)'; ctx.font = '600 ' + small + 'px system-ui, sans-serif'; ctx.fillText('mynftlocker.com', x, baseY + Math.round(big * 1.1));
}
function drawManager(ctx: CanvasRenderingContext2D, mgr: string, xRight: number, baseY: number, big: number, small: number, maxW: number) {
  if (!mgr) return;
  ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(64,232,255,0.85)'; ctx.font = '700 ' + small + 'px ui-monospace, Menlo, Consolas, monospace'; ctx.fillText('MANAGER', xRight, baseY);
  fitText(ctx, mgr, 800, big, small, maxW, 'system-ui, sans-serif');
  ctx.fillStyle = 'rgba(245,247,255,0.97)'; ctx.fillText(mgr, xRight, baseY + Math.round(big * 1.1));
}

export async function exportLockerImage(o: LockerShareOpts, format: LockerFormat): Promise<{ blob: Blob; file: File; fname: string }> {
  const [bg, ...cardImgs] = await Promise.all([loadImage(o.bg), ...o.cards.slice(0, 5).map(c => loadImage(String(c.pictureUrl || '')))]);
  const mgr = getManager(), link = galleryLink();
  let cv: HTMLCanvasElement, ctx: CanvasRenderingContext2D | null;

  if (format === 'wide') {
    const W = 1920, sceneH = Math.round(W * SCENE_RATIO), footH = 208, H = sceneH + footH;
    cv = document.createElement('canvas'); cv.width = W; cv.height = H; ctx = cv.getContext('2d'); if (!ctx) throw new Error('canvas');
    paintBackground(ctx, W, H);
    drawScene(ctx, 0, 0, W, o, bg, cardImgs);
    // filet dore entre la scene et la signature
    const ln = ctx.createLinearGradient(0, 0, W, 0); ln.addColorStop(0, 'rgba(245,215,110,0)'); ln.addColorStop(0.5, 'rgba(245,215,110,0.7)'); ln.addColorStop(1, 'rgba(245,215,110,0)');
    ctx.fillStyle = ln; ctx.fillRect(0, sceneH, W, 2);
    const pad = 64, qrS = 150, qy = sceneH + (footH - qrS) / 2, mid = sceneH + footH / 2;
    drawBrand(ctx, pad, mid - 6, 54, 30, 'left');
    const hasQr = !!link, xr = hasQr ? W - pad - qrS - 40 : W - pad;
    drawManager(ctx, mgr, xr, mid - 6, 54, 28, 520);
    if (hasQr) await drawQr(ctx, link, W - pad - qrS, qy, qrS);
  } else {
    const W = 1080, H = 1350, headH = 250, sw = 1350, sh = Math.round(sw * SCENE_RATIO);
    cv = document.createElement('canvas'); cv.width = W; cv.height = H; ctx = cv.getContext('2d'); if (!ctx) throw new Error('canvas');
    paintBackground(ctx, W, H);
    // En-tete : marque a gauche, manager a droite
    drawBrand(ctx, 56, headH / 2 - 8, 56, 30, 'left');
    drawManager(ctx, mgr, W - 56, headH / 2 - 8, 56, 28, 460);
    // Scene recadree sur le centre (les 5 cartes restent entieres, en plus grand)
    ctx.save(); ctx.beginPath(); ctx.rect(0, headH, W, sh); ctx.clip();
    drawScene(ctx, (W - sw) / 2, headH, sw, o, bg, cardImgs);
    ctx.restore();
    const ln = ctx.createLinearGradient(0, 0, W, 0); ln.addColorStop(0, 'rgba(245,215,110,0)'); ln.addColorStop(0.5, 'rgba(245,215,110,0.7)'); ln.addColorStop(1, 'rgba(245,215,110,0)');
    ctx.fillStyle = ln; ctx.fillRect(0, headH, W, 2); ctx.fillRect(0, headH + sh - 2, W, 2);
    // Pied : titre (decor sans zone titre) + QR + lien
    const footTop = headH + sh;
    if (!o.showTeamTitle && o.caption) {
      ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; setSpacing(ctx, '0.12em');
      const fs = fitText(ctx, o.caption, 900, 52, 28, W - 160, 'Georgia, serif');
      ctx.fillStyle = '#ffd060'; ctx.shadowColor = 'rgba(255,160,0,0.7)'; ctx.shadowBlur = fs * 0.6; ctx.fillText(o.caption, W / 2, footTop + 52); ctx.restore();
    }
    if (link) {
      const qrS = 190, qy = footTop + (H - footTop - qrS) / 2 + (o.showTeamTitle ? -8 : 20);
      await drawQr(ctx, link, (W - qrS) / 2, qy, qrS);
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = 'rgba(207,216,230,0.75)'; ctx.font = '600 28px system-ui, sans-serif'; ctx.fillText('mynftlocker.com', W / 2, H - 28);
    } else {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(245,215,110,0.95)'; ctx.font = '800 56px system-ui, sans-serif'; ctx.fillText('mynftlocker.com', W / 2, footTop + (H - footTop) / 2);
    }
  }
  const blob: Blob | null = await new Promise(r => cv.toBlob(r, 'image/png'));
  if (!blob) throw new Error('blob');
  const base = (o.caption || 'vestiaire').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'vestiaire';
  const fname = 'mynftlocker-vestiaire-' + base + '-' + (format === 'ig' ? 'instagram' : 'paysage') + '.png';
  return { blob, file: new File([blob], fname, { type: 'image/png' }), fname };
}
