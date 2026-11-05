'use client';
import { useEffect, useRef } from 'react';

// Fond etoile (rappel de la page d'ouverture) : ciel sombre + etoiles qui scintillent, plein ecran derriere le contenu.
export default function StarBg() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cvs = ref.current; if (!cvs) return; const ctx = cvs.getContext('2d'); if (!ctx) return;
    const resize = () => { cvs.width = window.innerWidth; cvs.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    const stars = Array.from({ length: 160 }, () => ({ x: Math.random(), y: Math.random(), sz: 0.4 + Math.random() * 0.9, tw: Math.random() * 0.002 + 0.0006, off: Math.random() * 6.28, op: 0.3 + Math.random() * 0.6 }));
    const orbs = Array.from({ length: 34 }, () => ({ x: Math.random(), y: Math.random(), r: 2 + Math.random() * 4.5, vy: 0.00002 + Math.random() * 0.00004, tw: Math.random() * 0.0015 + 0.0005, off: Math.random() * 6.28 }));
    let raf = 0;
    const draw = (t: number) => {
      const W = cvs.width, H = cvs.height;
      ctx.fillStyle = 'rgb(3,5,16)'; ctx.fillRect(0, 0, W, H);
      for (const s of stars) { const a = s.op * (0.55 + 0.45 * Math.sin(t * s.tw + s.off)); ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.sz, 0, 6.283); ctx.fillStyle = `rgba(225,240,255,${a})`; ctx.fill(); }
      for (const o of orbs) {
        o.y = (o.y + o.vy * 16 + 1) % 1; const a = 0.45 + 0.4 * Math.sin(t * o.tw + o.off); const x = o.x * W, y = o.y * H;
        const g = ctx.createRadialGradient(x, y, 0, x, y, o.r * 3.2); g.addColorStop(0, `rgba(64,232,255,${a})`); g.addColorStop(0.35, `rgba(64,232,255,${a * 0.45})`); g.addColorStop(1, 'rgba(64,232,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, o.r * 3.2, 0, 6.283); ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, o.r * 0.55, 0, 6.283); ctx.fillStyle = `rgba(200,250,255,${Math.min(1, a + 0.2)})`; ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, background: '#030510' }} />;
}
