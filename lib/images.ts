import { db } from "./db";

// ---------------------------------------------------------------------------
// Image resolver.
//
// The scraped `perfumes.image` column is corrupt: ~97% of rows point at the
// bottle photo of an UNRELATED perfume (the scrape misaligned image<->row).
// We must never render those, or the card shows the wrong bottle.
//
// Instead we resolve the *correct* image on demand from each perfume's real
// parfumo page (the `url` column is intact) by reading its og:image meta tag,
// and cache the result so each perfume is fetched at most once.
//
// parfumo sits behind Cloudflare and rate-limit-blocks server fetches,
// especially from datacenter IPs. When a fetch is blocked or fails we cache a
// null and the UI falls back to a clean placeholder -- so the worst case is
// "no image", never "wrong image".
// ---------------------------------------------------------------------------

const NULL_TTL_MS = 6 * 60 * 60 * 1000; // re-try a previously-blocked perfume after 6h
const FETCH_TIMEOUT_MS = 9000;
const POOL = 3; // keep small: parfumo/Cloudflare blocks bursts

let _ensured = false;
async function ensureTable(): Promise<void> {
  if (_ensured) return;
  await db().execute(
    `CREATE TABLE IF NOT EXISTS image_cache (
       id INTEGER PRIMARY KEY,
       image TEXT,
       fetched_at INTEGER
     )`
  );
  _ensured = true;
}

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Upgrade-Insecure-Requests": "1",
};

async function fetchOgImage(pageUrl: string): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(pageUrl, { headers: BROWSER_HEADERS, signal: ctrl.signal });
    if (!res.ok) return null; // 403/404/Cloudflare "Access Denied"
    const html = await res.text();
    const m =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    const src = m?.[1]?.trim();
    if (!src || !/^https?:\/\//i.test(src)) return null;
    return src;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export interface ImageResolvable {
  id: number;
  url: string | null;
}

/**
 * Returns a map of perfume id -> verified image URL (or null when unknown).
 * Reads cache first, fetches only the misses, persists everything it learns.
 * Callers should treat null as "show placeholder".
 */
export async function resolveImages(
  items: ImageResolvable[]
): Promise<Map<number, string | null>> {
  await ensureTable();
  const client = db();
  const out = new Map<number, string | null>();
  const ids = items.map((i) => i.id);
  if (!ids.length) return out;

  // 1) load cache
  const placeholders = ids.map(() => "?").join(",");
  const cached = await client.execute({
    sql: `SELECT id, image, fetched_at FROM image_cache WHERE id IN (${placeholders})`,
    args: ids,
  });
  const now = Date.now();
  const fresh = new Set<number>();
  for (const r of cached.rows) {
    const id = Number(r.id);
    const image = (r.image as string) ?? null;
    const fetchedAt = Number(r.fetched_at) || 0;
    // non-null is kept forever; a cached null is retried after NULL_TTL_MS
    if (image !== null || now - fetchedAt < NULL_TTL_MS) {
      out.set(id, image);
      fresh.add(id);
    }
  }

  // 2) fetch the misses (bounded concurrency)
  const misses = items.filter((i) => i.url && !fresh.has(i.id));
  for (let i = 0; i < misses.length; i += POOL) {
    const batch = misses.slice(i, i + POOL);
    await Promise.all(
      batch.map(async (it) => {
        const img = await fetchOgImage(it.url as string);
        out.set(it.id, img);
        await client.execute({
          sql: `INSERT OR REPLACE INTO image_cache (id, image, fetched_at) VALUES (?, ?, ?)`,
          args: [it.id, img, Date.now()],
        });
      })
    );
  }

  // ids with no url at all -> null
  for (const it of items) if (!out.has(it.id)) out.set(it.id, null);
  return out;
}
