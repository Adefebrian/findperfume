import { db } from "@/lib/db";
import { readFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

// Real bottle photos live on disk (scraper output), BUT both the DB `image`
// column AND the saved files were shuffled at scrape time -- a file named for
// perfume A actually contains perfume B's bottle. The `image_remap` table
// (built offline) maps each perfume id -> the local file that VERIFIABLY shows
// it (identified via the true slug embedded in each image URL). We only serve a
// photo when it is verified; otherwise 404 -> the UI shows a gradient. So a
// card shows the correct bottle or none, never a wrong one.
const BOTTLES_DIR =
  process.env.BOTTLES_DIR ||
  "/Users/brianeedsleep/Documents/untitled folder/parfumo-fragrance-scraper/output/images/bottles";

// In production the images live on Vercel Blob at a deterministic path.
// Filenames are already URL-safe (only [A-Za-z0-9._-]), so no encoding needed.
const BLOB_BASE = (process.env.BLOB_BASE_URL || "").replace(/\/$/, "");

const CT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(request: Request) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id || Number.isNaN(id)) return new Response(null, { status: 404 });
  try {
    const r = await db().execute({ sql: "SELECT file FROM image_remap WHERE id = ?", args: [id] });
    const file = (r.rows[0]?.file as string) || "";
    if (!file) return new Response(null, { status: 404 });

    // Prod: redirect to the Blob CDN (serverless has no local image files).
    if (BLOB_BASE) {
      return Response.redirect(`${BLOB_BASE}/bottles/${file}`, 308);
    }

    // Local dev: stream the file straight off disk.
    const ext = path.extname(file).toLowerCase();
    const buf = await readFile(path.join(BOTTLES_DIR, file));
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": CT[ext] || "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
