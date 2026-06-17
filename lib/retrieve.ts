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

function ftsTerm(t: string): string {
  return `"${t.replace(/"/g, "")}"`;
}

function buildMatch(prefs: ParsedPrefs): string {
  const terms = [...prefs.keywords, ...prefs.accords, ...prefs.notes]
    .map((t) => t.trim())
    .filter(Boolean);
  const uniq = Array.from(new Set(terms.map((t) => t.toLowerCase())));
  if (!uniq.length) return "";
  return uniq.map(ftsTerm).join(" OR ");
}

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
  const match = buildMatch(prefs);

  const genderFilter =
    prefs.gender && prefs.gender !== "any"
      ? prefs.gender === "unisex"
        ? `AND p.gender = 'unisex'`
        : `AND p.gender IN ('${prefs.gender}', 'unisex')`
      : "";

  // Type (dupe/designer/niche) -> restrict to that type's brand list.
  const brands = type ? brandsForType(type) : [];
  const brandFilter = brands.length
    ? `AND lower(p.brand) IN (${brands.map(() => "?").join(",")})`
    : "";

  let rows;
  if (match) {
    const sql = `
      SELECT ${SELECT_COLS}, bm25(perfumes_fts) AS rel
      FROM perfumes_fts
      JOIN perfumes p ON p.id = perfumes_fts.rowid
      WHERE perfumes_fts MATCH ? ${genderFilter} ${brandFilter}
      ORDER BY (COALESCE(p.popularity,0) * 0.6) - (rel * 1.0) DESC
      LIMIT ?`;
    const res = await client.execute({ sql, args: [match, ...brands, limit] });
    rows = res.rows;
  } else {
    const sql = `
      SELECT ${SELECT_COLS}
      FROM perfumes p
      WHERE 1=1 ${genderFilter} ${brandFilter}
      ORDER BY COALESCE(p.popularity,0) DESC
      LIMIT ?`;
    const res = await client.execute({ sql, args: [...brands, limit] });
    rows = res.rows;
  }

  return rows.map((r) => rowToCandidate(r as unknown as Record<string, unknown>));
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
