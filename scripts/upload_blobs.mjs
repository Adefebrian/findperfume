// Resumable parallel uploader: pushes the remapped bottle images to Vercel Blob
// under a stable pathname (addRandomSuffix:false) so URLs are deterministic:
//   https://<base>/bottles/<file>
// Progress is appended to /tmp/blob_done.txt so re-runs skip finished files.
import { put } from "@vercel/blob";
import { readFile, appendFile } from "fs/promises";
import { readFileSync, existsSync } from "fs";
import path from "path";

const BOT =
  process.env.BOTTLES_DIR ||
  "/Users/brianeedsleep/Documents/untitled folder/parfumo-fragrance-scraper/output/images/bottles";
const LIST = "/tmp/blob_files.txt";
const DONE = "/tmp/blob_done.txt";
const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const CONC = 24;

const CT = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif" };

if (!TOKEN) { console.error("missing BLOB_READ_WRITE_TOKEN"); process.exit(1); }

const all = readFileSync(LIST, "utf8").split("\n").map((s) => s.trim()).filter(Boolean);
const done = new Set(existsSync(DONE) ? readFileSync(DONE, "utf8").split("\n").map((s) => s.trim()).filter(Boolean) : []);
const todo = all.filter((f) => !done.has(f));
console.log(`total=${all.length} done=${done.size} todo=${todo.length}`);

let ok = 0, fail = 0, i = 0;
const t0 = Date.now();

async function uploadOne(file) {
  const ext = path.extname(file).toLowerCase();
  const body = await readFile(path.join(BOT, file));
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await put(`bottles/${file}`, body, {
        access: "public",
        token: TOKEN,
        addRandomSuffix: false,
        contentType: CT[ext] || "image/jpeg",
        cacheControlMaxAge: 31536000,
      });
      await appendFile(DONE, file + "\n");
      return true;
    } catch (e) {
      const msg = String(e).slice(0, 120);
      if (attempt === 4) { console.error("FAIL", file, msg); return false; }
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1) ** 2));
    }
  }
  return false;
}

async function worker() {
  while (i < todo.length) {
    const file = todo[i++];
    const r = await uploadOne(file);
    if (r) ok++; else fail++;
    const n = ok + fail;
    if (n % 500 === 0) {
      const rate = n / ((Date.now() - t0) / 1000);
      const eta = ((todo.length - n) / rate / 60).toFixed(1);
      console.log(`progress ${n}/${todo.length} ok=${ok} fail=${fail} ${rate.toFixed(1)}/s eta=${eta}min`);
    }
  }
}

await Promise.all(Array.from({ length: CONC }, worker));
console.log(`DONE ok=${ok} fail=${fail} in ${((Date.now() - t0) / 1000 / 60).toFixed(1)}min`);
