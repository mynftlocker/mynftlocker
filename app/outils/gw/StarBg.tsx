'use client';
import { useEffect, useRef } from 'react';

// Fond etoile (rappel de la page d'ouverture) : ciel sombre + etoiles qui scintillent, plein ecran derriere le contenu.
export default function StarBg() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cvs = ref.current; if (!cvs) return; const ctx = cvs.getContext('2d'); if (!ctx) return;
    const resize = () => { cvs.width = window.innerWidth; cvs.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    const stars = Array.from({ length: 220 }, (_, i) => ({ x: Math.random(), y: Math.random(), sz: i < 60 ? 1.3 + Math.random() * 1.3 : 0.5 + Math.random() * 0.8, tw: Math.random() * 0.002 + 0.0006, off: Math.random() * 6.28, op: 0.35 + Math.random() * 0.65 }));
    let raf = 0;
    const draw = (t: number) => {
      const W = cvs.width, H = cvs.height;
      ctx.fillStyle = 'rgb(3,5,16)'; ctx.fillRect(0, 0, W, H);
      for (const s of stars) { const a = s.op * (0.55 + 0.45 * Math.sin(t * s.tw + s.off)); ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.sz, 0, 6.283); ctx.fillStyle = `rgba(235,245,255,${a})`; ctx.fill(); }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, background: '#030510' }} />;
}
