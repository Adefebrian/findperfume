"""Re-import enriched findperfume.db -> Turso via libsql batch API (v2: notes_json)."""
import sqlite3, libsql_client, asyncio

URL = "https://findperfume-adefebrian.aws-ap-northeast-1.turso.io"
with open("/tmp/turso_db_token.txt") as f:
    TOKEN = f.read().strip()

COLS = ["id","slug","name","brand","year","gender","concentration","description",
        "accords","accords_txt","notes_json","top_notes","heart_notes","base_notes",
        "notes_txt","perfumers","rating_scent","scent_count","rating_longevity",
        "rating_sillage","rating_bottle","rating_value","review_count","rank",
        "production_status","image","url","popularity"]
COLLIST = ",".join(COLS)
PH = ",".join("?" * len(COLS))
INS = f"INSERT INTO perfumes({COLLIST}) VALUES({PH})"

SCHEMA = """CREATE TABLE IF NOT EXISTS perfumes (
  id INTEGER PRIMARY KEY, slug TEXT, name TEXT, brand TEXT, year INTEGER, gender TEXT,
  concentration TEXT, description TEXT, accords TEXT, accords_txt TEXT, notes_json TEXT,
  top_notes TEXT, heart_notes TEXT, base_notes TEXT, notes_txt TEXT, perfumers TEXT,
  rating_scent REAL, scent_count INTEGER, rating_longevity REAL, rating_sillage REAL,
  rating_bottle REAL, rating_value REAL, review_count INTEGER, rank INTEGER,
  production_status TEXT, image TEXT, url TEXT, popularity REAL
)"""

async def main():
    src = sqlite3.connect("findperfume.db")
    rows = src.execute(f"SELECT {COLLIST} FROM perfumes").fetchall()
    src.close()
    print(f"local rows: {len(rows)}", flush=True)

    async with libsql_client.create_client(url=URL, auth_token=TOKEN) as client:
        await client.execute("DROP TABLE IF EXISTS perfumes_fts")
        await client.execute("DROP TABLE IF EXISTS perfumes")
        await client.execute(SCHEMA)

        BATCH = 400
        total = len(rows)
        done = 0
        for i in range(0, total, BATCH):
            chunk = rows[i:i+BATCH]
            stmts = [libsql_client.Statement(INS, list(r)) for r in chunk]
            for attempt in range(5):
                try:
                    await client.batch(stmts)
                    break
                except Exception:
                    if attempt == 4:
                        raise
                    await asyncio.sleep(2 * (attempt + 1))
            done += len(chunk)
            if (i // BATCH) % 15 == 0:
                print(f"  {done}/{total} ({done*100//total}%)", flush=True)

        print("data done, FTS + indexes...", flush=True)
        await client.execute("""CREATE VIRTUAL TABLE perfumes_fts USING fts5(
            name, brand, accords_txt, notes_txt, description,
            content='perfumes', content_rowid='id')""")
        await client.execute("INSERT INTO perfumes_fts(perfumes_fts) VALUES('rebuild')")
        for idx in ["idx_gender ON perfumes(gender)","idx_year ON perfumes(year)",
                    "idx_pop ON perfumes(popularity DESC)","idx_scent ON perfumes(rating_scent DESC)",
                    "idx_brand ON perfumes(brand)"]:
            await client.execute("CREATE INDEX " + idx)
        rc = await client.execute("SELECT COUNT(*) FROM perfumes")
        print("TURSO row count:", rc.rows[0][0], flush=True)

asyncio.run(main())
