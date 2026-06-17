import { parseQuery, rankCandidates } from "@/lib/ai";
import {
  retrieveCandidates,
  toAICandidate,
  type Candidate,
  type NotesStruct,
} from "@/lib/retrieve";
import { isType } from "@/lib/perfumeType";

export const runtime = "nodejs";
export const maxDuration = 90;

export interface SearchResult {
  id: number;
  rank: number;
  score: number;
  reason: string;
  match_tags: string[];
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
}

function base(c: Candidate) {
  return {
    id: c.id,
    name: c.name,
    brand: c.brand,
    year: c.year,
    gender: c.gender,
    accords: c.accords,
    notes: c.notes,
    rating_scent: c.rating_scent,
    scent_count: c.scent_count,
    rating_longevity: c.rating_longevity,
    rating_sillage: c.rating_sillage,
    // c.image is corrupt (wrong perfume); resolved separately from c.url below.
    image: null as string | null,
    url: c.url,
  };
}

export async function POST(request: Request) {
  let query = "";
  let typeRaw = "";
  try {
    const body = await request.json();
    query = (body?.query ?? "").toString().trim();
    typeRaw = (body?.type ?? "").toString().trim();
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!query || query.length < 2) {
    return Response.json({ error: "Query too short" }, { status: 400 });
  }
  if (query.length > 1000) query = query.slice(0, 1000);
  const type = isType(typeRaw) ? typeRaw : undefined;

  try {
    const prefs = await parseQuery(query);
    // Pull a deeper pool when a type filter is active so ranking still has choices.
    const candidates = await retrieveCandidates(prefs, type ? 40 : 18, type);
    if (!candidates.length) {
      return Response.json({
        prefs,
        results: [],
        message: "No matching candidates. Try a different description.",
      });
    }

    const ranked = await rankCandidates(prefs, candidates.map(toAICandidate));
    const byId = new Map<number, Candidate>(candidates.map((c) => [c.id, c]));

    let results: SearchResult[];
    if (ranked.length) {
      results = ranked
        .map((r, i) => {
          const c = byId.get(r.id);
          if (!c) return null;
          return {
            ...base(c),
            rank: i + 1,
            score: r.score,
            reason: r.reason,
            match_tags: r.match_tags,
          } as SearchResult;
        })
        .filter((x): x is SearchResult => x !== null);
    } else {
      // AI unavailable: popularity + keyword match, concrete reason from accords.
      const want = new Set(
        prefs.accords.concat(prefs.mood).map((s) => s.toLowerCase())
      );
      results = candidates.slice(0, 5).map((c, i) => {
        const hits = c.accords.filter((a) => want.has(a.toLowerCase()));
        const accTxt = c.accords.slice(0, 3).join(", ");
        const reason = hits.length
          ? `A strong match: its ${hits.join(" and ")} character lines up with what you described, backed by ${accTxt} facets.`
          : `A popular pick with a ${accTxt} character${
              c.rating_scent ? ` and a ${c.rating_scent.toFixed(1)} scent rating` : ""
            } that fits your search.`;
        return {
          ...base(c),
          rank: i + 1,
          score: Math.round((c.rating_scent ?? 7) * 10),
          reason,
          match_tags: c.accords.slice(0, 3),
        } as SearchResult;
      });
    }

    // Images are resolved lazily per-card via /api/image (keeps search fast).
    return Response.json({ prefs, results });
  } catch (e) {
    console.error("search error", e);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
