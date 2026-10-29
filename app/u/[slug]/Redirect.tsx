'use client';
import { useEffect } from 'react';

// Les robots (X, Discord...) lisent les meta de la page ; les visiteurs sont envoyes aussitot sur la galerie.
export default function Redirect({ slug }: { slug: string }) {
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    q.set('u', slug);
    window.location.replace('/?' + q.toString());
  }, [slug]);
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#04070d', color: '#9fb0c4', fontFamily: 'system-ui, sans-serif', letterSpacing: '0.2em', fontSize: '0.8rem' }}>
      myNFTlocker…
    </div>
  );
}
