"""Dump findperfume.db into a Turso-importable .sql file.
Schema + data for `perfumes`, then recreate the FTS5 index and indexes on Turso.
"""
import sqlite3

src = sqlite3.connect("findperfume.db")
src.row_factory = sqlite3.Row
out = open("turso_import.sql", "w", encoding="utf-8")

def esc(v):
    if v is None:
        return "NULL"
    if isinstance(v, (int, float)):
        return repr(v)
    return "'" + str(v).replace("'", "''") + "'"

out.write("PRAGMA foreign_keys=OFF;\n")
out.write("""CREATE TABLE IF NOT EXISTS perfumes (
  id INTEGER PRIMARY KEY, slug TEXT, name TEXT, brand TEXT, year INTEGER, gender TEXT,
  concentration TEXT, description TEXT, accords TEXT, accords_txt TEXT,
  top_notes TEXT, heart_notes TEXT, base_notes TEXT, notes_txt TEXT, perfumers TEXT,
  rating_scent REAL, scent_count INTEGER, rating_longevity REAL, rating_sillage REAL,
  rating_bottle REAL, rating_value REAL, review_count INTEGER, rank INTEGER,
  production_status TEXT, image TEXT, url TEXT, popularity REAL
);\n""")

cols = ["id","slug","name","brand","year","gender","concentration","description",
        "accords","accords_txt","top_notes","heart_notes","base_notes","notes_txt",
        "perfumers","rating_scent","scent_count","rating_longevity","rating_sillage",
        "rating_bottle","rating_value","review_count","rank","production_status",
        "image","url","popularity"]
collist = ",".join(cols)

n = 0
buf = []
for r in src.execute(f"SELECT {collist} FROM perfumes"):
    vals = ",".join(esc(r[c]) for c in cols)
    buf.append(f"INSERT INTO perfumes({collist}) VALUES({vals});")
    n += 1
    if len(buf) >= 1000:
        out.write("\n".join(buf) + "\n")
        buf = []
if buf:
    out.write("\n".join(buf) + "\n")

# FTS5 + indexes (rebuilt on Turso)
out.write("""CREATE VIRTUAL TABLE IF NOT EXISTS perfumes_fts USING fts5(
  name, brand, accords_txt, notes_txt, description,
  content='perfumes', content_rowid='id'
);
INSERT INTO perfumes_fts(perfumes_fts) VALUES('rebuild');
CREATE INDEX IF NOT EXISTS idx_gender ON perfumes(gender);
CREATE INDEX IF NOT EXISTS idx_year ON perfumes(year);
CREATE INDEX IF NOT EXISTS idx_pop ON perfumes(popularity DESC);
CREATE INDEX IF NOT EXISTS idx_scent ON perfumes(rating_scent DESC);
""")
out.close()
print(f"wrote {n} rows -> turso_import.sql")
