"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "../Icon";
import { PerfumeImage } from "../PerfumeImage";

interface NoteIcon { n: string; i: string }
interface Perfume {
  id: number;
  name: string;
  brand: string;
  year: number | null;
  gender: string | null;
  accords: string[];
  notes: { top: NoteIcon[]; heart: NoteIcon[]; base: NoteIcon[] };
  rating_scent: number | null;
  scent_count: number | null;
  image: string | null;
  url: string | null;
}

const GENDERS = ["any", "male", "female", "unisex"];
const TYPES = [
  { k: "", label: "All types" },
  { k: "dupe", label: "Dupe" },
  { k: "designer", label: "Designer" },
  { k: "niche", label: "Niche" },
];
const SORTS = [
  { k: "popular", label: "Popular" },
  { k: "rating", label: "Top rated" },
  { k: "year", label: "Newest" },
];

export default function Library() {
  const [brands, setBrands] = useState<{ brand: string; count: number }[]>([]);
  const [accords, setAccords] = useState<string[]>([]);
  const [items, setItems] = useState<Perfume[]>([]);
  const [brand, setBrand] = useState("");
  const [accord, setAccord] = useState("");
  const [gender, setGender] = useState("any");
  const [type, setType] = useState("");
  const [sort, setSort] = useState("popular");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/library?mode=facets")
      .then((r) => r.json())
      .then((d) => {
        setBrands(d.brands || []);
        setAccords(d.accords || []);
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (brand) p.set("brand", brand);
    if (accord) p.set("accord", accord);
    if (gender !== "any") p.set("gender", gender);
    if (type) p.set("type", type);
    p.set("sort", sort);
    p.set("page", String(page));
    try {
      const r = await fetch("/api/library?" + p.toString());
      const d = await r.json();
      setItems(d.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [brand, accord, gender, type, sort, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [brand, accord, gender, type, sort]);

  const selectClass =
    "appearance-none rounded-xl border border-line bg-card px-4 py-2.5 pr-9 text-sm text-coffee-dark focus:border-coffee-soft focus:outline-none cursor-pointer";

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-5 pb-24">
      <nav className="flex items-center justify-between pt-6">
        <Link href="/" className="inline-flex items-center gap-2 font-semibold text-coffee-dark">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-coffee-dark text-cream">
            <Icon name="perfume" size={18} />
          </span>
          <span>Find<span className="text-coffee-mid">perfume</span></span>
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-4 py-2 text-sm font-medium text-coffee-mid transition hover:border-coffee-soft hover:bg-cream-2"
        >
          <Icon name="search" size={16} />
          Find by personality
        </Link>
      </nav>

      <header className="pt-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-coffee-dark sm:text-3xl">
          <Icon name="library" size={26} />
          Perfume Library
        </h1>
        <p className="mt-1 text-sm text-coffee-dark/70">
          Browse 1 Million+ perfumes from around the world by brand, type, and scent classification.
        </p>
      </header>

      {/* Minimal filter bar: 4 controls + gender segmented */}
      <section className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative">
          <select value={brand} onChange={(e) => setBrand(e.target.value)} className={selectClass}>
            <option value="">All brands</option>
            {brands.map((b) => (
              <option key={b.brand} value={b.brand}>
                {b.brand} ({b.count})
              </option>
            ))}
          </select>
          <Icon name="filter" size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-coffee-soft" />
        </div>

        <div className="relative">
          <select value={accord} onChange={(e) => setAccord(e.target.value)} className={selectClass}>
            <option value="">All accords</option>
            {accords.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <Icon name="drop" size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-coffee-soft" />
        </div>

        <div className="relative">
          <select value={sort} onChange={(e) => setSort(e.target.value)} className={selectClass}>
            {SORTS.map((s) => (
              <option key={s.k} value={s.k}>{s.label}</option>
            ))}
          </select>
          <Icon name="sparkles" size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-coffee-soft" />
        </div>

        {/* type segmented control */}
        <div className="inline-flex rounded-xl border border-line bg-card p-1">
          {TYPES.map((t) => (
            <button
              key={t.k}
              onClick={() => setType(t.k)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                type === t.k ? "bg-coffee-dark text-cream" : "text-coffee-mid hover:bg-cream-2"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* gender segmented control */}
        <div className="inline-flex rounded-xl border border-line bg-card p-1">
          {GENDERS.map((g) => (
            <button
              key={g}
              onClick={() => setGender(g)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${
                gender === g ? "bg-coffee-dark text-cream" : "text-coffee-mid hover:bg-cream-2"
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {(brand || accord || gender !== "any" || type) && (
          <button
            onClick={() => { setBrand(""); setAccord(""); setGender("any"); setType(""); }}
            className="inline-flex items-center gap-1 rounded-xl px-3 py-2.5 text-xs text-coffee-soft hover:text-coffee-mid"
          >
            <Icon name="close" size={13} /> Clear
          </button>
        )}
      </section>

      {/* Bento grid */}
      {loading ? (
        <div className="mt-8 gap-3 [column-fill:_balance] columns-2 sm:gap-4 lg:columns-3 xl:columns-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className={`skeleton mb-3 break-inside-avoid rounded-3xl sm:mb-4 ${
                i % 6 === 0 ? "h-80" : i % 3 === 1 ? "h-56" : "h-64"
              }`}
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="mt-12 text-center text-coffee-mid">No perfumes match these filters.</p>
      ) : (
        <div className="mt-8 gap-3 [column-fill:_balance] columns-2 sm:gap-4 lg:columns-3 xl:columns-4">
          {items.map((p, i) => (
            <LibCard key={p.id} p={p} feature={i % 6 === 0} />
          ))}
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((x) => Math.max(1, x - 1))}
            disabled={page === 1}
            className="inline-flex items-center gap-1 rounded-full border border-line bg-card px-4 py-2 text-sm text-coffee-mid disabled:opacity-40"
          >
            <Icon name="back" size={15} /> Prev
          </button>
          <span className="text-sm text-coffee-dark/70">Page {page}</span>
          <button
            onClick={() => setPage((x) => x + 1)}
            disabled={items.length < 24}
            className="inline-flex items-center gap-1 rounded-full border border-line bg-card px-4 py-2 text-sm text-coffee-mid disabled:opacity-40"
          >
            Next <Icon name="back" size={15} className="rotate-180" />
          </button>
        </div>
      )}
    </main>
  );
}

// Masonry bento: feature cards (taller 4:5 image, accords + notes) are
// interleaved among compact square cards. CSS columns pack them gap-free.
function LibCard({ p, feature }: { p: Perfume; feature: boolean }) {
  const notes = [...p.notes.top, ...p.notes.heart, ...p.notes.base];
  return (
    <article className="rise group mb-3 break-inside-avoid overflow-hidden rounded-3xl border border-line bg-card shadow-[0_2px_16px_rgba(75,46,43,0.04)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_44px_rgba(75,46,43,0.16)] sm:mb-4">
      <div className={`relative overflow-hidden bg-cream-2 ${feature ? "aspect-[4/5]" : "aspect-square"}`}>
        <PerfumeImage
          id={p.id}
          name={p.name}
          brand={p.brand}
          accords={p.accords}
          pad={feature ? "p-6" : "p-3"}
          glyph={feature ? 46 : 30}
          sizes="(max-width:640px) 50vw, (max-width:1280px) 33vw, 25vw"
        />
        {p.rating_scent != null && (
          <span className="absolute right-2.5 top-2.5 z-10 inline-flex items-center gap-0.5 rounded-full bg-coffee-dark/90 px-2 py-0.5 text-[11px] font-semibold text-cream backdrop-blur">
            <Icon name="star" size={11} />
            {p.rating_scent.toFixed(1)}
          </span>
        )}
      </div>
      <div className={feature ? "p-4" : "p-3"}>
        <p className="truncate text-[10px] uppercase tracking-[0.1em] text-coffee-soft">{p.brand}</p>
        <h3 className={`mt-0.5 truncate font-semibold leading-tight text-coffee-dark ${feature ? "text-lg" : "text-[13px]"}`}>
          {p.name}
        </h3>
        {feature && (
          <p className="mt-0.5 text-[11px] text-coffee-soft">
            {[p.gender, p.year].filter(Boolean).join(" · ")}
          </p>
        )}
        {p.accords.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {p.accords.slice(0, feature ? 4 : 2).map((a, i) => (
              <span
                key={i}
                className="rounded-full bg-cream-2 px-2 py-0.5 text-[10px] font-medium text-coffee-mid"
              >
                {a}
              </span>
            ))}
          </div>
        )}
        {feature && notes.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-line pt-2.5">
            {notes.slice(0, 6).map((n, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full bg-cream-2 py-0.5 pl-0.5 pr-2 text-[10px] text-coffee-dark/80"
              >
                {n.i ? (
                  <Image
                    src={n.i}
                    alt={n.n}
                    width={16}
                    height={16}
                    unoptimized
                    className="h-4 w-4 rounded-full object-contain"
                  />
                ) : null}
                {n.n}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
