// Verification d'un slug Sorare (pseudo en minuscules) via l'API publique Sorare.
// found = le manager existe ; missing = il n'existe pas ; error = Sorare injoignable (on ne bloque pas l'utilisateur pour autant).
export type SlugCheck = { status: 'found'; nickname: string | null } | { status: 'missing' } | { status: 'error' };

export async function checkSorareSlug(slug: string): Promise<SlugCheck> {
  if (!/^[a-z0-9_-]{2,80}$/.test(slug)) return { status: 'missing' };
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    if (process.env.SORARE_API_KEY) headers['APIKEY'] = process.env.SORARE_API_KEY;
    const r = await fetch('https://api.sorare.com/graphql', {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: `query{user(slug:"${slug}"){slug nickname}}` }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return { status: 'error' };
    const j = await r.json();
    if (j.errors?.length) return { status: 'error' };
    const u = j?.data?.user;
    return u ? { status: 'found', nickname: u.nickname || null } : { status: 'missing' };
  } catch {
    return { status: 'error' };
  }
}
