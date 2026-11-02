import type { Metadata } from 'next';
import { redis } from '../../../lib/redis';

// Compteurs de clics du calendrier (agregats anonymes). Page non referencee.
export const metadata: Metadata = { title: 'Stats calendrier', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function Stats() {
  const total = (await redis.hgetall<Record<string, number>>('go:total').catch(() => null)) || {};
  const days = await Promise.all(Array.from({ length: 24 }, (_, i) => redis.hgetall<Record<string, number>>('go:day:' + (i + 1)).catch(() => null)));
  const th = { textAlign: 'left' as const, padding: '.4rem .8rem', color: '#8fa3bd' };
  return (
    <main style={{ minHeight: '100vh', background: '#050912', color: '#cfe4fb', padding: '2rem', fontFamily: 'system-ui' }}>
      <h1 style={{ color: '#f0c96e' }}>Calendrier : clics sortants</h1>
      <p>Total Sorare : <b>{total.sorare || 0}</b> · Total TTFL : <b>{total.ttfl || 0}</b></p>
      <table style={{ borderCollapse: 'collapse', marginTop: '1rem' }}>
        <thead><tr><th style={th}>Jour</th><th style={th}>Sorare</th><th style={th}>TTFL</th></tr></thead>
        <tbody>
          {days.map((d, i) => (d && (d.sorare || d.ttfl)) ? <tr key={i}><td style={{ padding: '.3rem .8rem' }}>{i + 1}</td><td style={{ padding: '.3rem .8rem' }}>{d.sorare || 0}</td><td style={{ padding: '.3rem .8rem' }}>{d.ttfl || 0}</td></tr> : null)}
        </tbody>
      </table>
    </main>
  );
}
