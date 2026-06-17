// AI router for Findperfume. Talks to the OpenCode Zen gateway.
// Core system: OpenCode Zen free models (OpenAI-compatible gateway).
// The four requested free models are cycled as a fallback chain; the first
// that returns non-empty content wins, so any single model being rate-limited
// or down auto-falls-through to the next.

import { db } from "./db";

// AI core: OpenCode Zen gateway (OpenAI-compatible).
const BASE = process.env.ZEN_BASE_URL || "https://opencode.ai/zen/v1";
const KEY = process.env.ZEN_API_KEY || "";

// Ordered fallback chain across the four requested free models.
export const MODEL_CHAIN = [
  "deepseek-v4-flash-free", // fast, clean strict JSON -> primary
  "minimax-m3-free",
  "mimo-v2.5-free",
  "nemotron-3-ultra-free",
] as const;

export const MODELS = {
  parse: MODEL_CHAIN[0],
  rank: MODEL_CHAIN[0],
  rankFallback: MODEL_CHAIN[1],
} as const;

interface ChatOpts {
  model: string;
  system?: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

// Try the whole MODEL_CHAIN in order until one returns non-empty content.
// Used so a single gateway/balance/rate error on one model auto-falls-through.
async function chatChain(
  opts: Omit<ChatOpts, "model">,
  chain: readonly string[] = MODEL_CHAIN
): Promise<string> {
  let lastErr: unknown = null;
  for (const model of chain) {
    try {
      const out = await chat({ ...opts, model });
      if (out && out.trim()) return out;
    } catch (e) {
      lastErr = e;
      console.error(`model ${model} failed, trying next`, String(e).slice(0, 160));
    }
  }
  if (lastErr) throw lastErr;
  return "";
}

async function chat(opts: ChatOpts): Promise<string> {
  const messages = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  messages.push({ role: "user", content: opts.user });

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 60000);
  try {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: opts.model,
        messages,
        temperature: opts.temperature ?? 0.3,
        // ZEN free models are reasoning models: they spend a few hundred hidden
        // reasoning_tokens before visible output. A low cap returns EMPTY content
        // (finish_reason=length). Keep this generous.
        max_tokens: opts.maxTokens ?? 4000,
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`AI ${opts.model} HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? "";
  } finally {
    clearTimeout(t);
  }
}

// Pull the first {...} JSON object out of a model reply (handles <think> noise,
// ```json fences, prose around it).
export function extractJSON<T = unknown>(text: string): T | null {
  if (!text) return null;
  // strip <think>...</think>
  let s = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  // strip code fences
  s = s.replace(/```(?:json)?/gi, "").replace(/```/g, "");
  const start = s.indexOf("{");
  const arrStart = s.indexOf("[");
  const begin =
    start === -1 ? arrStart : arrStart === -1 ? start : Math.min(start, arrStart);
  if (begin === -1) return null;
  // find matching end by scanning
  const open = s[begin];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  for (let i = begin; i < s.length; i++) {
    if (s[i] === open) depth++;
    else if (s[i] === close) {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(s.slice(begin, i + 1)) as T;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

// ---------- 1) Parse user query -> structured preferences ----------
export interface ParsedPrefs {
  gender: "male" | "female" | "unisex" | "any";
  keywords: string[];      // notes/accords/vibe words for FTS (English)
  accords: string[];       // desired accord families
  notes: string[];         // desired specific notes
  avoid: string[];         // accords/notes that would be INAPPROPRIATE for this request
  mood: string[];          // personality / occasion descriptors
  season?: string;
  intensity?: "subtle" | "moderate" | "strong" | "any";
  summary: string;         // one-line restatement of what they want
}

const PARSE_SYS = `You are a world-class EXPERT PERFUMER and fragrance consultant with encyclopedic knowledge of notes, accords, olfactive families, seasonality, occasions, longevity & sillage, and the classic do's and don'ts of fragrance selection.

A user writes (in ANY language) about their personality, mood, occasion, time of day, season, or the kind of scent they want. Infer what they ACTUALLY need and translate it into a precise English search structure. Apply professional reasoning so results are HIGHLY relevant — the recommended notes MUST fit the request.

Olfactive guidance (apply rigorously):
- NIGHT / evening / date / dinner / club / sensual / seductive -> rich, deep, warm: Amber, Oud, Woody, Spicy, Leather, Tobacco, Incense, Vanilla, Animalic, Resinous; higher intensity & sillage. AVOID light watery/aquatic colognes and sheer citrus.
- DAY / daytime / office / work / school / daily / casual -> Fresh, Citrus, Aromatic, Green, Aquatic, Clean, Tea, light Floral; moderate, inoffensive sillage. AVOID heavy/cloying/very sweet gourmands, dense Oud, strong Amber for daytime office.
- SUMMER / hot / beach -> Citrus, Aquatic, Marine, Fresh, Green, light Floral. AVOID heavy resinous, dense Gourmand, Oud.
- WINTER / cold / rainy -> Amber, Woody, Spicy, Gourmand, Vanilla, Oud, Leather, Incense. AVOID thin sheer citrus as the main theme.
- GYM / sport / active -> Fresh, Aquatic, Citrus, Aromatic; clean and energetic.
- WEDDING / formal / elegant / luxury -> refined Floral, Woody, Powdery, Amber, Iris; sophisticated and polished.
- Personality: confident -> bold Woody/Spicy/Amber; calm/relaxed -> soft Woody/Musk/Clean; romantic -> Floral/Sweet/Powdery; mysterious -> Oud/Incense/dark Woody; playful/youthful -> Fruity/Citrus/Sweet; mature/sophisticated -> Chypre/Woody/Leather.
Always honor any specific notes the user explicitly names. Use the AVOID list to actively exclude families that would clash with the request (e.g. for a fresh daytime request, avoid: Sweet, Gourmand, Vanilla, Oud).

Return ONLY this JSON, no prose:
{
  "gender": "male" | "female" | "unisex" | "any",
  "keywords": ["8-12 english accord/note/vibe terms for full-text retrieval — the RECOMMENDED profile"],
  "accords": ["recommended, occasion-appropriate accord families: Fresh, Woody, Sweet, Citrus, Floral, Spicy, Smoky, Powdery, Gourmand, Amber, Aquatic, Leather, Green, Oud"],
  "notes": ["specific recommended notes: Vanilla, Bergamot, Oud, Rose, Sandalwood, Amber, Vetiver, Jasmine, etc."],
  "avoid": ["accords/notes that are INAPPROPRIATE for this request"],
  "mood": ["personality/occasion descriptors: confident, romantic, office, night-out, summer-daily"],
  "season": "spring|summer|fall|winter|any",
  "intensity": "subtle|moderate|strong|any",
  "summary": "one expert sentence describing the ideal scent profile for them"
}
If gender unclear, use "any". Be decisive: pick a coherent, occasion-appropriate profile rather than a generic spread.`;

// Cache AI-parsed prefs by query so repeat / suggestion clicks skip the ~10s
// free-model call (these are reasoning models; ~10s is their floor).
let _parseCacheReady = false;
async function ensureParseCache(): Promise<void> {
  if (_parseCacheReady) return;
  await db().execute(
    `CREATE TABLE IF NOT EXISTS parse_cache (q TEXT PRIMARY KEY, prefs TEXT, created_at INTEGER)`
  );
  _parseCacheReady = true;
}

export async function parseQuery(userText: string): Promise<ParsedPrefs> {
  const key = userText.trim().toLowerCase().slice(0, 300);

  try {
    await ensureParseCache();
    const hit = await db().execute({ sql: `SELECT prefs FROM parse_cache WHERE q = ?`, args: [key] });
    const cached = hit.rows[0]?.prefs;
    if (typeof cached === "string") {
      try {
        return JSON.parse(cached) as ParsedPrefs;
      } catch {
        /* corrupt row -> re-parse */
      }
    }
  } catch {
    /* cache unavailable -> just parse */
  }

  let prefs: ParsedPrefs;
  let fromAI = false;
  try {
    const out = await chatChain({
      system: PARSE_SYS,
      user: userText,
      temperature: 0.2,
      maxTokens: 3000,
      timeoutMs: 30000,
    });
    const j = extractJSON<ParsedPrefs>(out);
    if (j && Array.isArray(j.keywords)) {
      prefs = normalizePrefs(j, userText);
      fromAI = true;
    } else {
      prefs = normalizePrefs(localParse(userText), userText);
    }
  } catch (e) {
    console.error("parseQuery failed", e);
    // fallback: rule-based local parse (ID + EN vibe words -> english terms)
    prefs = normalizePrefs(localParse(userText), userText);
  }

  // Only cache high-quality AI parses, not the rule-based fallback.
  if (fromAI) {
    try {
      await db().execute({
        sql: `INSERT OR REPLACE INTO parse_cache (q, prefs, created_at) VALUES (?, ?, ?)`,
        args: [key, JSON.stringify(prefs), Date.now()],
      });
    } catch {
      /* ignore cache write failures */
    }
  }
  return prefs;
}

// Lightweight offline parser used when the AI gateway is unavailable / rate-limited.
// Maps common Indonesian & English scent/personality words to English search terms,
// so DB retrieval stays relevant even without the LLM.
const VIBE_MAP: Record<string, string[]> = {
  // freshness
  segar: ["Fresh", "Citrus"], fresh: ["Fresh"], citrus: ["Citrus"], jeruk: ["Citrus"],
  aquatic: ["Aquatic"], laut: ["Aquatic", "Marine"], ocean: ["Aquatic"],
  // sweet / gourmand
  manis: ["Sweet"], sweet: ["Sweet"], vanilla: ["Vanilla", "Sweet"], vanila: ["Vanilla"],
  cokelat: ["Chocolate", "Gourmand"], kopi: ["Coffee"], coffee: ["Coffee"],
  karamel: ["Caramel"], gourmand: ["Gourmand"], madu: ["Honey"],
  // woody / warm
  woody: ["Woody"], kayu: ["Woody"], cedar: ["Cedarwood"], sandalwood: ["Sandalwood"],
  oud: ["Oud"], hangat: ["Warm Spicy", "Amber"], warm: ["Warm Spicy"], amber: ["Amber"],
  // floral
  floral: ["Floral"], bunga: ["Floral"], mawar: ["Rose"], rose: ["Rose"],
  melati: ["Jasmine"], jasmine: ["Jasmine"], lavender: ["Lavender"],
  // spicy / smoky / leather
  spicy: ["Spicy"], pedas: ["Spicy"], rempah: ["Spicy"], smoky: ["Smoky"],
  asap: ["Smoky"], leather: ["Leather"], kulit: ["Leather"], tembakau: ["Tobacco"],
  // powdery / clean / musky
  powdery: ["Powdery"], bedak: ["Powdery"], musk: ["Musk"], bersih: ["Clean", "Soapy"],
  // personality / occasion (mood)
  elegan: ["Sophisticated"], misterius: ["Mysterious"], malam: ["Night"], night: ["Night"],
  percaya: ["Confident"], confident: ["Confident"], romantis: ["Romantic"], romantic: ["Romantic"],
  kerja: ["Office"], office: ["Office"], kantor: ["Office"], "sehari-hari": ["Daily"],
  daily: ["Daily"], kencan: ["Date"], date: ["Date"], santai: ["Casual"], seksi: ["Seductive"],
};

function localParse(text: string): Partial<ParsedPrefs> {
  const lower = text.toLowerCase();
  let gender: ParsedPrefs["gender"] = "any";
  if (/\b(cowok|pria|laki|lelaki|men|man|male|maskulin|masculine)\b/.test(lower)) gender = "male";
  else if (/\b(cewek|wanita|perempuan|women|woman|female|feminin|feminine)\b/.test(lower)) gender = "female";
  else if (/\b(unisex|netral)\b/.test(lower)) gender = "unisex";

  const accords = new Set<string>();
  const mood: string[] = [];
  for (const [word, mapped] of Object.entries(VIBE_MAP)) {
    if (lower.includes(word)) {
      for (const m of mapped) {
        // mood-ish descriptors go to mood, scent families to accords
        if (["Night","Confident","Romantic","Office","Daily","Date","Casual","Seductive","Sophisticated","Mysterious"].includes(m))
          mood.push(m);
        else accords.add(m);
      }
    }
  }
  // Occasion / time-of-day expert mapping (recommended accords + what to avoid).
  const avoid = new Set<string>();
  let season = "any";
  const add = (...xs: string[]) => xs.forEach((x) => accords.add(x));
  const isNight = /\b(malam|night|evening|dinner|date|kencan|club|clubbing|seductive|seksi|sensual|sexy)\b/.test(lower);
  const isDay = /\b(siang|day|daytime|office|kantor|kerja|work|school|sekolah|daily|sehari-hari|casual|santai)\b/.test(lower);
  const isSummer = /\b(panas|summer|hot|beach|pantai|gerah)\b/.test(lower);
  const isWinter = /\b(dingin|winter|cold|hujan|rainy|musim dingin)\b/.test(lower);
  const isSport = /\b(gym|olahraga|sport|workout|lari)\b/.test(lower);
  const isFormal = /\b(wedding|nikah|formal|elegan|elegant|mewah|luxury|gala)\b/.test(lower);
  if (isNight) { add("Amber","Woody","Spicy","Oud","Leather","Vanilla"); ["Aquatic","Marine","Citrus"].forEach((a)=>avoid.add(a)); season = "fall"; }
  if (isDay) { add("Fresh","Citrus","Aromatic","Green","Aquatic"); ["Sweet","Gourmand","Vanilla","Oud","Amber"].forEach((a)=>avoid.add(a)); }
  if (isSummer) { add("Citrus","Aquatic","Fresh","Green","Marine"); ["Gourmand","Oud","Amber","Sweet"].forEach((a)=>avoid.add(a)); season = "summer"; }
  if (isWinter) { add("Amber","Woody","Spicy","Gourmand","Vanilla","Oud"); avoid.add("Citrus"); season = "winter"; }
  if (isSport) { add("Fresh","Aquatic","Citrus","Aromatic"); ["Gourmand","Oud","Amber"].forEach((a)=>avoid.add(a)); }
  if (isFormal) { add("Floral","Woody","Powdery","Amber","Iris"); }
  // a desired accord must never also be in avoid
  for (const a of accords) avoid.delete(a);

  const keywords = Array.from(new Set(Array.from(accords).concat(mood)));
  // if nothing matched, fall back to meaningful words (drop stopwords)
  if (!keywords.length) {
    const stop = new Set(["the","for","and","yang","untuk","dan","aku","saya","ingin","suka","dengan","di","ke","a","an"]);
    keywords.push(...text.split(/\s+/).filter((w) => w.length > 2 && !stop.has(w.toLowerCase())).slice(0, 8));
  }
  return {
    gender,
    keywords,
    accords: Array.from(accords),
    notes: [],
    avoid: Array.from(avoid),
    mood,
    season,
    intensity: "any",
    summary: text,
  };
}

function normalizePrefs(p: Partial<ParsedPrefs>, raw: string): ParsedPrefs {
  const arr = (x: unknown): string[] =>
    Array.isArray(x) ? x.filter((v) => typeof v === "string" && v.trim()).map((v) => v.trim()) : [];
  const g = (p.gender || "any").toLowerCase();
  return {
    gender: (["male", "female", "unisex", "any"].includes(g) ? g : "any") as ParsedPrefs["gender"],
    keywords: arr(p.keywords),
    accords: arr(p.accords),
    notes: arr(p.notes),
    avoid: arr(p.avoid),
    mood: arr(p.mood),
    season: typeof p.season === "string" ? p.season : "any",
    intensity: (p.intensity as ParsedPrefs["intensity"]) || "any",
    summary: p.summary || raw,
  };
}

// ---------- 2) Rank candidates + explain ----------
export interface RankedItem {
  id: number;
  score: number;        // 0-100 match score
  reason: string;       // why this is a great pick (Indonesian)
  match_tags: string[]; // short tags e.g. ["Woody", "Office", "Long-lasting"]
}

// HYBRID ranking. The free reasoning models are too slow to rank a whole list
// inside Vercel limits, and asking them to invent scores risks hallucination.
// Instead we score every candidate deterministically from its OWN data (accord/
// note/mood overlap + rating), then make ONE short AI call only to phrase the
// reasons for the top 8. The AI never picks or scores, so it cannot hallucinate
// the ranking; it only writes prose grounded in the data we pass it.
interface AICand {
  id: number;
  name: string;
  brand: string;
  gender: string | null;
  accords: string[];
  notes: string;
  rating: number | null;
  votes: number | null;
}

function scoreCandidate(prefs: ParsedPrefs, c: AICand): { score: number; tags: string[] } {
  const want = new Set(
    [...prefs.accords, ...prefs.notes, ...prefs.mood, ...prefs.keywords].map((s) =>
      s.toLowerCase()
    )
  );
  const avoid = new Set(prefs.avoid.map((s) => s.toLowerCase()));
  const notesLower = (c.notes || "").toLowerCase();
  const accLower = c.accords.map((a) => a.toLowerCase());

  const tags: string[] = [];
  let hits = 0;
  for (const a of c.accords) {
    if (want.has(a.toLowerCase())) {
      hits++;
      if (tags.length < 4) tags.push(a);
    }
  }
  // partial keyword presence in notes
  let noteHits = 0;
  for (const w of want) {
    if (w.length > 3 && notesLower.includes(w)) noteHits++;
  }

  // count accords/notes that the expert flagged as inappropriate for this request
  let avoidHits = 0;
  for (const w of avoid) {
    if (!w) continue;
    if (accLower.includes(w)) avoidHits++;
    else if (w.length > 3 && notesLower.includes(w)) avoidHits++;
  }

  const accScore = c.accords.length
    ? (hits / Math.max(1, Math.min(want.size, c.accords.length))) * 55
    : 0;
  const noteScore = Math.min(noteHits * 6, 20);
  const ratingScore = c.rating ? (c.rating / 10) * 20 : 10;
  const voteBoost = Math.min((c.votes || 0) / 1000, 1) * 5;
  // strong penalty so e.g. a sweet gourmand never ranks for a fresh daytime query
  const avoidPenalty = avoidHits * 18;

  let score = Math.round(accScore + noteScore + ratingScore + voteBoost - avoidPenalty);
  score = Math.max(20, Math.min(99, score));
  if (!tags.length) tags.push(...c.accords.slice(0, 3));
  return { score, tags };
}

// Grounded, deterministic reason builder. Cites ONLY the item's real accords +
// notes, so it can never hallucinate or describe a different perfume.
//
// We deliberately do NOT make a second AI call here. The free reasoning models
// spend their whole token budget on hidden reasoning for a multi-item prompt
// and return empty visible content, which made the fallback chain burn ~45s
// per search for output we discard. Intent parsing (parseQuery) is where the
// AI adds value; ranking is deterministic and phrasing is templated.
function buildReason(prefs: ParsedPrefs, c: AICand, tags: string[]): string {
  const character = tags.slice(0, 2).join(" and ") || c.accords.slice(0, 2).join(" and ");
  const realNotes = (c.notes || "")
    .split(/[/,]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);
  const fit = prefs.mood[0] || prefs.summary || "what you described";
  return `A ${character || "well-rounded"} scent${
    realNotes.length ? ` led by ${realNotes.join(", ")}` : ""
  }, a fitting match for ${fit}.`;
}

export async function rankCandidates(
  prefs: ParsedPrefs,
  candidates: Array<Record<string, unknown>>
): Promise<RankedItem[]> {
  const cands = candidates as unknown as AICand[];
  // Deterministic scoring + ranking (instant, grounded, no hallucination).
  const scored = cands
    .map((c) => {
      const { score, tags } = scoreCandidate(prefs, c);
      return { c, score, tags };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return scored.map(({ c, score, tags }) => ({
    id: c.id,
    score,
    match_tags: tags.slice(0, 4),
    reason: buildReason(prefs, c, tags),
  }));
}
