// AI router for Findperfume. Talks to the Dahono gateway.
// Model roles (chosen by measured performance):
//   kimi-k2.6     (~1.6s)  -> fast intent parsing (query -> structured prefs)
//   qwen3.7-max   (~18s)   -> ranking + reasoning (primary, smartest)
//   minimax-m3    (~3.4s)  -> reasoning fallback if qwen is slow/fails
// NOTE: the gateway sits behind Cloudflare and rejects non-browser User-Agents,
// so every call sends a browser UA header.

const BASE = process.env.DAHONO_BASE_URL || "https://gateway.dahono.com/v1";
const KEY = process.env.DAHONO_API_KEY || "";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export const MODELS = {
  parse: "dahono/kimi-k2.6",
  rank: "dahono/minimax-m3",          // fast (~3-16s) + solid reasoning -> primary
  rankFallback: "dahono/deepseek-v4-flash", // secondary if primary errors
} as const;

interface ChatOpts {
  model: string;
  system?: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
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
        "User-Agent": UA,
      },
      body: JSON.stringify({
        model: opts.model,
        messages,
        temperature: opts.temperature ?? 0.3,
        max_tokens: opts.maxTokens ?? 2000,
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
  mood: string[];          // personality / occasion descriptors
  season?: string;
  intensity?: "subtle" | "moderate" | "strong" | "any";
  summary: string;         // one-line restatement of what they want
}

const PARSE_SYS = `You are the intent parser for "Findperfume", a perfume recommendation engine.
The user writes (in any language) about their personality, mood, occasion, or what kind of scent they want.
Convert it to STRICT JSON for searching a fragrance database. Translate scent/vibe words to ENGLISH.
Return ONLY this JSON, no prose:
{
  "gender": "male" | "female" | "unisex" | "any",
  "keywords": ["english fragrance/vibe words for full-text search, 4-10 items"],
  "accords": ["accord families like Fresh, Woody, Sweet, Citrus, Floral, Spicy, Smoky, Powdery, Gourmand"],
  "notes": ["specific notes like Vanilla, Bergamot, Oud, Rose, Sandalwood"],
  "mood": ["personality/occasion descriptors, e.g. confident, romantic, office, night-out"],
  "season": "spring|summer|fall|winter|any",
  "intensity": "subtle|moderate|strong|any",
  "summary": "one concise English sentence restating their need"
}
If gender unclear, use "any". Be generous with keywords so search finds candidates.`;

export async function parseQuery(userText: string): Promise<ParsedPrefs> {
  try {
    const out = await chat({
      model: MODELS.parse,
      system: PARSE_SYS,
      user: userText,
      temperature: 0.2,
      maxTokens: 600,
      timeoutMs: 30000,
    });
    const j = extractJSON<ParsedPrefs>(out);
    if (j && Array.isArray(j.keywords)) return normalizePrefs(j, userText);
  } catch (e) {
    console.error("parseQuery failed", e);
  }
  // fallback: rule-based local parse (handles ID + EN vibe words -> english search terms)
  return normalizePrefs(localParse(userText), userText);
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
    mood,
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

const RANK_SYS = `You are the senior fragrance advisor for "Findperfume".
Given a user's need and a list of candidate perfumes (with notes, accords, ratings),
pick and RANK the best matches. Score each 0-100 for how well it fits the user's
personality/need (consider accords, notes, mood fit, ratings, intensity, season).
Write the "reason" in clear, natural ENGLISH. Explain concretely WHY it suits them
(reference their personality/need plus the perfume's notes/character). 1-2 sentences.
Do NOT translate perfume names, brands, notes, or accords; keep all data exactly as given.
Return ONLY strict JSON:
{"results":[{"id":<candidate id>,"score":<0-100 int>,"reason":"<english>","match_tags":["..",".."]}]}
Rank from highest score to lowest. Return the top 8. Only use ids from the candidates.`;

export async function rankCandidates(
  prefs: ParsedPrefs,
  candidates: Array<Record<string, unknown>>
): Promise<RankedItem[]> {
  const userBlock =
    `USER NEED: ${prefs.summary}\n` +
    `gender=${prefs.gender}, mood=${prefs.mood.join(", ")}, ` +
    `accords=${prefs.accords.join(", ")}, notes=${prefs.notes.join(", ")}, ` +
    `season=${prefs.season}, intensity=${prefs.intensity}\n\n` +
    `CANDIDATES (JSON):\n${JSON.stringify(candidates)}`;

  const tryModel = async (model: string, timeoutMs: number) => {
    const out = await chat({
      model,
      system: RANK_SYS,
      user: userBlock,
      temperature: 0.4,
      maxTokens: 3500,
      timeoutMs,
    });
    const j = extractJSON<{ results: RankedItem[] }>(out);
    return j?.results && Array.isArray(j.results) ? j.results : null;
  };

  try {
    const r = await tryModel(MODELS.rank, 60000);
    if (r && r.length) return sanitize(r);
  } catch (e) {
    console.error("rank primary failed", e);
  }
  try {
    const r = await tryModel(MODELS.rankFallback, 55000);
    if (r && r.length) return sanitize(r);
  } catch (e) {
    console.error("rank fallback failed", e);
  }
  return [];
}

function sanitize(items: RankedItem[]): RankedItem[] {
  return items
    .filter((x) => typeof x.id === "number")
    .map((x) => ({
      id: x.id,
      score: Math.max(0, Math.min(100, Math.round(Number(x.score) || 0))),
      reason: String(x.reason || "").slice(0, 400),
      match_tags: Array.isArray(x.match_tags)
        ? x.match_tags.filter((t) => typeof t === "string").slice(0, 4)
        : [],
    }))
    .sort((a, b) => b.score - a.score);
}
