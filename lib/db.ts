import { createClient, type Client } from "@libsql/client";

// Works in two modes:
//  - Local dev: TURSO_DATABASE_URL = "file:findperfume.db" (or unset -> local file)
//  - Production: TURSO_DATABASE_URL = "libsql://...turso.io" + TURSO_AUTH_TOKEN
let _client: Client | null = null;

export function db(): Client {
  if (_client) return _client;
  const url = process.env.TURSO_DATABASE_URL || "file:findperfume.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;
  _client = createClient(authToken ? { url, authToken } : { url });
  return _client;
}

export interface PerfumeRow {
  id: number;
  slug: string;
  name: string;
  brand: string;
  year: number | null;
  gender: string | null;
  concentration: string | null;
  description: string | null;
  accords: string; // JSON array
  accords_txt: string;
  notes_json: string; // JSON {top:[{n,i}],heart,base}
  top_notes: string;
  heart_notes: string;
  base_notes: string;
  notes_txt: string;
  perfumers: string;
  rating_scent: number | null;
  scent_count: number | null;
  rating_longevity: number | null;
  rating_sillage: number | null;
  rating_bottle: number | null;
  rating_value: number | null;
  review_count: number | null;
  rank: number | null;
  production_status: string | null;
  image: string | null;
  url: string | null;
  popularity: number | null;
}
