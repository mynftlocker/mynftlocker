import { NextRequest } from 'next/server';
import { redis } from '../../../lib/redis';

// Collection complete d'un manager, en flux (une ligne JSON par paquet de cartes) :
//  - si elle est en cache serveur (15 min) : tout part immediatement ;
//  - sinon on la construit page par page (via /api/cards) en renvoyant chaque paquet des qu'il arrive, puis on la met en cache.
// Les cartes publiques d'un manager sont les memes pour tous les visiteurs : le cache est donc partage.
export const maxDuration = 60;
const TTL = 1800;  // secondes (30 min : avec peu de trafic, un cache plus long = plus de visites instantanees)
const CHUNK = 300; // cartes par cle Redis (reste largement sous la limite de taille d'une requete)
const enc = new TextEncoder();

export async function GET(request: NextRequest) {
  const slug = (request.nextUrl.searchParams.get('slug') || '').trim().toLowerCase();
  if (!/^[a-z0-9_-]{1,80}$/.test(slug)) return new Response(JSON.stringify({ error: 'bad_request' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  const origin = request.nextUrl.origin;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: any) => controller.enqueue(enc.encode(JSON.stringify(o) + '\n'));
      const parse = (v: any) => (typeof v === 'string' ? JSON.parse(v) : v);
      try {
        // 1) Cache serveur
        try {
          const meta = parse(await redis.get('coll:' + slug + ':meta'));
          if (meta && meta.n > 0) {
            const parts = await Promise.all(Array.from({ length: meta.n }, (_, i) => redis.get('coll:' + slug + ':' + i).then(parse)));
            if (parts.every(Array.isArray)) {
              for (const p of parts) send({ cards: p, manager: meta.manager || null });
              send({ done: true, manager: meta.manager || null, cached: true });
              controller.close();
              return;
            }
          }
        } catch (e) { /* cache indisponible : on construit */ }

        // 2) Construction page par page
        const all: any[] = [];
        let cursor = '', manager: string | null = null, more = true, pages = 0;
        while (more) {
          if (++pages > 200) throw new Error('too_many_pages');
          let d: any = null, status = 0;
          for (let attempt = 0; attempt < 4 && !d; attempt++) {
            if (attempt > 0) await new Promise(r => setTimeout(r, 1000 * attempt));
            try {
              const r = await fetch(origin + '/api/cards?slug=' + encodeURIComponent(slug) + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''), { signal: AbortSignal.timeout(20000) });
              status = r.status;
              if (r.ok) { const j = await r.json(); if (j && j.cards) d = j; }
              else if (r.status === 400 || r.status === 404) break; // manager introuvable : inutile de reessayer
            } catch (e) { /* nouvel essai */ }
          }
          if (!d) { send({ error: all.length === 0 && (status === 400 || status === 404) ? 'not_found' : 'incomplete' }); controller.close(); return; }
          all.push(...d.cards);
          if (d.manager) manager = d.manager;
          send({ cards: d.cards, manager });
          more = !!d.hasNextPage;
          cursor = d.cursor || '';
        }
        // 3) Mise en cache (jamais d'une collection incomplete)
        if (all.length > 0) {
          try {
            const n = Math.ceil(all.length / CHUNK);
            await Promise.all([
              ...Array.from({ length: n }, (_, i) => redis.set('coll:' + slug + ':' + i, JSON.stringify(all.slice(i * CHUNK, (i + 1) * CHUNK)), { ex: TTL })),
              redis.set('coll:' + slug + ':meta', JSON.stringify({ n, manager, total: all.length }), { ex: TTL }),
            ]);
          } catch (e) { /* pas de cache : sans consequence */ }
        }
        send({ done: true, manager });
        controller.close();
      } catch (e) {
        try { send({ error: 'server' }); controller.close(); } catch (e2) { /* flux deja ferme */ }
      }
    },
  });
  return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' } });
}
