import { parseQuery, rankCandidates } from "@/lib/ai";
import { retrieveCandidates, toAICandidate, type Candidate } from "@/lib/retrieve";

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
  notes: { top: string; heart: string; base: string };
  rating_scent: number | null;
  scent_count: number | null;
  rating_longevity: number | null;
  rating_sillage: number | null;
  image: string | null;
  url: string | null;
}

export async function POST(request: Request) {
  let query = "";
  try {
    const body = await request.json();
    query = (body?.query ?? "").toString().trim();
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!query || query.length < 2) {
    return Response.json({ error: "Query terlalu pendek" }, { status: 400 });
  }
  if (query.length > 1000) query = query.slice(0, 1000);

  try {
    // 1) parse intent (kimi, fast)
    const prefs = await parseQuery(query);

    // 2) retrieve candidates from DB
    const candidates = await retrieveCandidates(prefs, 18);
    if (!candidates.length) {
      return Response.json({
        prefs,
        results: [],
        message: "Tidak menemukan kandidat. Coba deskripsi yang berbeda.",
      });
    }

    // 3) AI rank + reason (qwen, fallback minimax)
    const ranked = await rankCandidates(
      prefs,
      candidates.map(toAICandidate)
    );

    const byId = new Map<number, Candidate>(candidates.map((c) => [c.id, c]));

    let results: SearchResult[];
    if (ranked.length) {
      results = ranked
        .map((r, i) => {
          const c = byId.get(r.id);
          if (!c) return null;
          return {
            id: c.id,
            rank: i + 1,
            score: r.score,
            reason: r.reason,
            match_tags: r.match_tags,
            name: c.name,
            brand: c.brand,
            year: c.year,
            gender: c.gender,
            accords: c.accords,
            notes: { top: c.top, heart: c.heart, base: c.base },
            rating_scent: c.rating_scent,
            scent_count: c.scent_count,
            rating_longevity: c.rating_longevity,
            rating_sillage: c.rating_sillage,
            image: c.image,
            url: c.url,
          } as SearchResult;
        })
        .filter((x): x is SearchResult => x !== null);
    } else {
      // AI ranking unavailable -> graceful fallback: popularity + keyword match,
      // with a concrete (non-AI) reason built from the perfume's own accords.
      const want = new Set(
        [...prefs.accords, ...prefs.mood].map((s) => s.toLowerCase())
      );
      results = candidates.slice(0, 8).map((c, i) => {
        const hits = c.accords.filter((a) => want.has(a.toLowerCase()));
        const accTxt = c.accords.slice(0, 3).join(", ");
        const reason = hits.length
          ? `Cocok karena karakter ${hits.join(" & ")}-nya sesuai dengan yang kamu cari, didukung nuansa ${accTxt}.`
          : `Pilihan populer dengan karakter ${accTxt}${
              c.rating_scent ? ` dan rating aroma ${c.rating_scent.toFixed(1)}` : ""
            } yang relevan dengan pencarianmu.`;
        return {
          id: c.id,
          rank: i + 1,
          score: Math.round((c.rating_scent ?? 7) * 10),
          reason,
          match_tags: c.accords.slice(0, 3),
          name: c.name,
          brand: c.brand,
          year: c.year,
          gender: c.gender,
          accords: c.accords,
          notes: { top: c.top, heart: c.heart, base: c.base },
          rating_scent: c.rating_scent,
          scent_count: c.scent_count,
          rating_longevity: c.rating_longevity,
          rating_sillage: c.rating_sillage,
          image: c.image,
          url: c.url,
        };
      });
    }

    return Response.json({ prefs, results });
  } catch (e) {
    console.error("search error", e);
    return Response.json(
      { error: "Terjadi kesalahan saat mencari. Coba lagi." },
      { status: 500 }
    );
  }
}
