import { db } from "./db";
import type { ParsedPrefs } from "./ai";

export interface Candidate {
  id: number;
  name: string;
  brand: string;
  year: number | null;
  gender: string | null;
  accords: string[];
  top: string;
  heart: string;
  base: string;
  rating_scent: number | null;
  scent_count: number | null;
  rating_longevity: number | null;
  rating_sillage: number | null;
  image: string | null;
  url: string | null;
  description: string | null;
  slug: string;
}

// Escape a term for FTS5 (quote it as a phrase to avoid syntax errors).
function ftsTerm(t: string): string {
  return `"${t.replace(/"/g, "")}"`;
}

function buildMatch(prefs: ParsedPrefs): string {
  const terms = [...prefs.keywords, ...prefs.accords, ...prefs.notes]
    .map((t) => t.trim())
    .filter(Boolean);
  const uniq = Array.from(new Set(terms.map((t) => t.toLowerCase())));
  if (!uniq.length) return "";
  // OR them so we get a broad candidate pool; AI does the precise ranking.
  return uniq.map(ftsTerm).join(" OR ");
}

export async function retrieveCandidates(
  prefs: ParsedPrefs,
  limit = 40
): Promise<Candidate[]> {
  const client = db();
  const match = buildMatch(prefs);

  const genderFilter =
    prefs.gender && prefs.gender !== "any"
      ? prefs.gender === "unisex"
        ? `AND p.gender = 'unisex'`
        : `AND p.gender IN ('${prefs.gender}', 'unisex')`
      : "";

  let rows;
  if (match) {
    // FTS candidate pool, ranked by relevance blended with popularity.
    const sql = `
      SELECT p.id, p.name, p.brand, p.year, p.gender, p.accords,
             p.top_notes, p.heart_notes, p.base_notes,
             p.rating_scent, p.scent_count, p.rating_longevity, p.rating_sillage,
             p.image, p.url, p.description, p.slug,
             bm25(perfumes_fts) AS rel
      FROM perfumes_fts
      JOIN perfumes p ON p.id = perfumes_fts.rowid
      WHERE perfumes_fts MATCH ? ${genderFilter}
      ORDER BY (COALESCE(p.popularity,0) * 0.6) - (rel * 1.0) DESC
      LIMIT ?`;
    const res = await client.execute({ sql, args: [match, limit] });
    rows = res.rows;
  } else {
    const sql = `
      SELECT p.id, p.name, p.brand, p.year, p.gender, p.accords,
             p.top_notes, p.heart_notes, p.base_notes,
             p.rating_scent, p.scent_count, p.rating_longevity, p.rating_sillage,
             p.image, p.url, p.description, p.slug
      FROM perfumes p
      WHERE 1=1 ${genderFilter}
      ORDER BY COALESCE(p.popularity,0) DESC
      LIMIT ?`;
    const res = await client.execute({ sql, args: [limit] });
    rows = res.rows;
  }

  return rows.map((r) => {
    const raw = r as unknown as Record<string, unknown>;
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
      top: String(raw.top_notes ?? ""),
      heart: String(raw.heart_notes ?? ""),
      base: String(raw.base_notes ?? ""),
      rating_scent: raw.rating_scent != null ? Number(raw.rating_scent) : null,
      scent_count: raw.scent_count != null ? Number(raw.scent_count) : null,
      rating_longevity:
        raw.rating_longevity != null ? Number(raw.rating_longevity) : null,
      rating_sillage: raw.rating_sillage != null ? Number(raw.rating_sillage) : null,
      image: (raw.image as string) ?? null,
      url: (raw.url as string) ?? null,
      description: (raw.description as string) ?? null,
      slug: String(raw.slug ?? ""),
    };
  });
}

// Compact representation sent to the AI ranker (token-efficient).
function capList(s: string, n: number): string {
  const parts = s.split(/\s*\|\s*/).filter(Boolean).slice(0, n);
  return parts.join(", ");
}
export function toAICandidate(c: Candidate) {
  const notes = [
    capList(c.top, 4),
    capList(c.heart, 4),
    capList(c.base, 4),
  ]
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
