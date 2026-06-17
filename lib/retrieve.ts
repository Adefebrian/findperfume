import { db } from "./db";
import type { ParsedPrefs } from "./ai";
import { brandsForType, type PerfumeType } from "./perfumeType";

export interface NoteIcon {
  n: string; // name
  i: string; // image url
}
export interface NotesStruct {
  top: NoteIcon[];
  heart: NoteIcon[];
  base: NoteIcon[];
}

export interface Candidate {
  id: number;
  name: string;
  brand: string;
  year: number | null;
  gender: string | null;
  accords: string[];
  notes: NotesStruct;
  rating_scent: number | null;
  scent_count: number | null;
  rating_longevity: number | null;
  rating_sillage: number | null;
  image: string | null;
  url: string | null;
  description: string | null;
  slug: string;
}

const EMPTY_NOTES: NotesStruct = { top: [], heart: [], base: [] };

function parseNotes(raw: unknown): NotesStruct {
  if (typeof raw !== "string" || !raw) return EMPTY_NOTES;
  try {
    const j = JSON.parse(raw);
    return {
      top: Array.isArray(j.top) ? j.top : [],
      heart: Array.isArray(j.heart) ? j.heart : [],
      base: Array.isArray(j.base) ? j.base : [],
    };
  } catch {
    return EMPTY_NOTES;
  }
}

// Cap the number of LIKE terms. Each term adds OR predicates evaluated per
// scanned row; ~12 is plenty to express a request.
const MAX_MATCH_TERMS = 12;

// Build an accord/note LIKE filter from the parsed preferences.
//
// We deliberately do NOT use the FTS bm25 index for retrieval: bm25 ranking
// over a broad OR-match across the 1M+ row index forces FTS5 to score every
// matching row, which measured ~24s on prod Turso (vs an 860ms ping) and blew
// past the route's maxDuration -> 504. Instead we walk the popularity index
// (idx_pop, popularity DESC) top-down and apply these LIKE predicates as a
// residual filter, so SQLite early-terminates at LIMIT. That returns the most
// popular on-theme perfumes in ~1s; the deterministic scoreCandidate ranker
// then refines relevance over the pool.
function buildLikeFilter(prefs: ParsedPrefs): { clause: string; args: string[] } {
  const terms = Array.from(
    new Set(
      [...prefs.accords, ...prefs.notes, ...prefs.keywords]
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 2)
    )
  ).slice(0, MAX_MATCH_TERMS);
  if (!terms.length) return { clause: "", args: [] };

  const parts: string[] = [];
  const args: string[] = [];
  for (const t of terms) {
    // strip LIKE wildcards so the term matches literally (params handle quoting)
    const pat = `%${t.replace(/[%_]/g, "")}%`;
    parts.push("lower(p.accords_txt) LIKE ?", "lower(p.notes_txt) LIKE ?");
    args.push(pat, pat);
  }
  return { clause: `AND (${parts.join(" OR ")})`, args };
}

// Race a libSQL query against a hard timeout. Remote Turso queries have no
// built-in deadline, so a slow/stalled query would otherwise hang until the
// route's 90s maxDuration and return a 504. On timeout we throw, the route's
// catch returns a clean error fast, and the function never gets killed.
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms
    );
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}
// Healthy queries return in ~1-2s; this only catches a genuinely stalled DB,
// well under the route's 90s maxDuration so the catch can return cleanly.
const DB_TIMEOUT_MS = 15000;

function rowToCandidate(raw: Record<string, unknown>): Candidate {
  let accords: string[] = [];
  try {
    accords = JSON.parse((raw.accords as string) || "[]");
  } catch {
    accords = [];
  }
  return {
    id: Number(raw.id),
    name: String(raw.name ?? ""),
    brand: String(raw.brand ?? ""),
    year: raw.year != null ? Number(raw.year) : null,
    gender: (raw.gender as string) ?? null,
    accords,
    notes: parseNotes(raw.notes_json),
    rating_scent: raw.rating_scent != null ? Number(raw.rating_scent) : null,
    scent_count: raw.scent_count != null ? Number(raw.scent_count) : null,
    rating_longevity: raw.rating_longevity != null ? Number(raw.rating_longevity) : null,
    rating_sillage: raw.rating_sillage != null ? Number(raw.rating_sillage) : null,
    image: (raw.image as string) ?? null,
    url: (raw.url as string) ?? null,
    description: (raw.description as string) ?? null,
    slug: String(raw.slug ?? ""),
  };
}

const SELECT_COLS = `p.id, p.name, p.brand, p.year, p.gender, p.accords, p.notes_json,
  p.rating_scent, p.scent_count, p.rating_longevity, p.rating_sillage,
  p.image, p.url, p.description, p.slug`;

export async function retrieveCandidates(
  prefs: ParsedPrefs,
  limit = 18,
  type?: PerfumeType
): Promise<Candidate[]> {
  const client = db();
  const like = buildLikeFilter(prefs);

  // The leading `+` suppresses idx_gender so the optimizer keeps idx_pop as the
  // ORDER BY driver (and thus early-terminates at LIMIT). Without it, SQLite
  // picks idx_gender, then temp-sorts the whole gender-matched set by popularity
  // — ~350k rows on prod, multi-second.
  const genderFilter =
    prefs.gender && prefs.gender !== "any"
      ? prefs.gender === "unisex"
        ? `AND +p.gender = 'unisex'`
        : `AND +p.gender IN ('${prefs.gender}', 'unisex')`
      : "";

  // Type (dupe/designer/niche) -> restrict to that type's brand list.
  const brands = type ? brandsForType(type) : [];
  const brandFilter = brands.length
    ? `AND lower(p.brand) IN (${brands.map(() => "?").join(",")})`
    : "";

  // `popularity IS NOT NULL` + raw `popularity DESC` (no COALESCE) is what lets
  // SQLite use idx_pop for ordering and early-terminate at LIMIT. The gender /
  // brand / accord filters are applied as residuals during the indexed scan.
  const sql = `
    SELECT ${SELECT_COLS}
    FROM perfumes p
    WHERE p.popularity IS NOT NULL ${genderFilter} ${brandFilter} ${like.clause}
    ORDER BY p.popularity DESC
    LIMIT ?`;
  const res = await withTimeout(
    client.execute({ sql, args: [...brands, ...like.args, limit] }),
    DB_TIMEOUT_MS,
    "retrieve"
  );

  return res.rows.map((r) =>
    rowToCandidate(r as unknown as Record<string, unknown>)
  );
}

// Compact representation sent to the AI ranker (token-efficient).
export function toAICandidate(c: Candidate) {
  const cap = (arr: NoteIcon[], n: number) => arr.slice(0, n).map((x) => x.n).join(", ");
  const notes = [cap(c.notes.top, 4), cap(c.notes.heart, 4), cap(c.notes.base, 4)]
    .filter(Boolean)
    .join(" / ");
  return {
    id: c.id,
    name: c.name,
    brand: c.brand,
    gender: c.gender,
    accords: c.accords.slice(0, 5),
    notes,
    rating: c.rating_scent,
    votes: c.scent_count,
  };
}
