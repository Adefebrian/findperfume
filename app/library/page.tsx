"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "../Icon";

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
const SORTS = [
  { k: "popular", label: "Popular" },
  { k: "rating", label: "Top rated" },
  { k: "year", label: "Newest" },
];

export default function Library() {
  const [brands, setBrands] = useState<{ brand: string; count: number }[]>([]);
  const [accords, setAccords] = useState<string[]>([]);
  const [items, setItems] = useState<Perfume[]>([]);
  const [brand, setBrand] = useState<string | null>(null);
  const [accord, setAccord] = useState<string | null>(null);
  const [gender, setGender] = useState("any");
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
  }, [brand, accord, gender, sort, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [brand, accord, gender, sort]);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-5 pb-24">
      <nav className="flex items-center justify-between pt-6">
        <Link href="/" className="inline-flex items-center gap-2 font-semibold text-coffee-dark">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-coffee-dark text-cream">
            <Icon name="coffee" size={18} />
          </span>
          Find<span className="text-coffee-mid">perfume</span>
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
          Browse 199,000+ perfumes by brand and scent classification.
        </p>
      </header>

      {/* Filters */}
      <section className="mt-6 space-y-4">
        {/* gender + sort */}
        <div className="flex flex-wrap items-center gap-2">
          {GENDERS.map((g) => (
            <button
              key={g}
              onClick={() => setGender(g)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition ${
                gender === g
                  ? "bg-coffee-dark text-cream"
                  : "border border-line bg-card text-coffee-mid hover:bg-cream-2"
              }`}
            >
              {g}
            </button>
          ))}
          <span className="mx-1 h-5 w-px bg-line" />
          {SORTS.map((s) => (
            <button
              key={s.k}
              onClick={() => setSort(s.k)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                sort === s.k
                  ? "bg-coffee-mid text-cream"
                  : "border border-line bg-card text-coffee-mid hover:bg-cream-2"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* accords */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-coffee-soft">
            <Icon name="drop" size={13} /> Accord
          </span>
          <button
            onClick={() => setAccord(null)}
            className={`rounded-full px-3 py-1 text-xs transition ${
              !accord ? "bg-coffee-mid text-cream" : "border border-line bg-card text-coffee-mid hover:bg-cream-2"
            }`}
          >
            All
          </button>
          {accords.map((a) => (
            <button
              key={a}
              onClick={() => setAccord(a === accord ? null : a)}
              className={`rounded-full px-3 py-1 text-xs transition ${
                accord === a ? "bg-coffee-mid text-cream" : "border border-line bg-card text-coffee-mid hover:bg-cream-2"
              }`}
            >
              {a}
            </button>
          ))}
        </div>

        {/* brands */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-coffee-soft">
            <Icon name="filter" size={13} /> Brand
          </span>
          <button
            onClick={() => setBrand(null)}
            className={`rounded-full px-3 py-1 text-xs transition ${
              !brand ? "bg-coffee-mid text-cream" : "border border-line bg-card text-coffee-mid hover:bg-cream-2"
            }`}
          >
            All
          </button>
          {brands.slice(0, 30).map((b) => (
            <button
              key={b.brand}
              onClick={() => setBrand(b.brand === brand ? null : b.brand)}
              className={`rounded-full px-3 py-1 text-xs transition ${
                brand === b.brand ? "bg-coffee-mid text-cream" : "border border-line bg-card text-coffee-mid hover:bg-cream-2"
              }`}
            >
              {b.brand} <span className="text-coffee-soft">{b.count}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Grid (bento) */}
      {loading ? (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-line bg-card p-4">
              <div className="skeleton mb-3 h-32 w-full rounded-xl" />
              <div className="skeleton mb-1.5 h-3 w-1/2 rounded" />
              <div className="skeleton h-4 w-3/4 rounded" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="mt-12 text-center text-coffee-mid">No perfumes match these filters.</p>
      ) : (
        <div className="mt-8 grid auto-rows-[1fr] grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((p, i) => (
            <LibCard key={p.id} p={p} feature={i === 0} />
          ))}
        </div>
      )}

      {/* Pagination */}
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

function LibCard({ p, feature }: { p: Perfume; feature?: boolean }) {
  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-2xl border border-line bg-card transition hover:shadow-[0_8px_28px_rgba(75,46,43,0.12)] ${
        feature ? "col-span-2 row-span-2" : ""
      }`}
    >
      <div className={`relative grid place-items-center bg-cream-2 ${feature ? "h-56 sm:h-full sm:min-h-[18rem]" : "h-36"}`}>
        {p.image ? (
          <Image
            src={p.image}
            alt={`${p.name} by ${p.brand}`}
            fill
            unoptimized
            sizes="(max-width:768px) 50vw, 25vw"
            className="object-contain p-3 mix-blend-multiply transition duration-500 group-hover:scale-105"
          />
        ) : (
          <Icon name="drop" size={32} className="text-coffee-soft" />
        )}
        {p.rating_scent != null && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-0.5 rounded-full bg-coffee-dark/90 px-2 py-0.5 text-[11px] font-semibold text-cream">
            <Icon name="star" size={11} />
            {p.rating_scent.toFixed(1)}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <p className="truncate text-[11px] uppercase tracking-wider text-coffee-soft">{p.brand}</p>
        <h3 className={`mt-0.5 font-semibold leading-tight text-coffee-dark ${feature ? "text-lg" : "text-sm"}`}>
          {p.name}
        </h3>
        <p className="mt-0.5 text-[11px] text-coffee-soft">
          {[p.gender, p.year].filter(Boolean).join(" \u00b7 ")}
        </p>
        {p.accords.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {p.accords.slice(0, feature ? 5 : 3).map((a, i) => (
              <span key={i} className="rounded-full bg-cream-2 px-2 py-0.5 text-[10px] font-medium text-coffee-mid">
                {a}
              </span>
            ))}
          </div>
        )}
        {feature && p.notes.top.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[...p.notes.top, ...p.notes.heart, ...p.notes.base].slice(0, 8).map((n, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-full bg-cream-2 py-0.5 pl-0.5 pr-2 text-[10px] text-coffee-dark/80">
                {n.i ? (
                  <Image src={n.i} alt={n.n} width={16} height={16} unoptimized className="h-4 w-4 rounded-full object-contain" />
                ) : null}
                {n.n}
              </span>
            ))}
          </div>
        )}
        {p.url && (
          <a
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto inline-flex items-center gap-1 pt-3 text-[11px] font-medium text-coffee-mid hover:underline"
          >
            detail <Icon name="open" size={12} />
          </a>
        )}
      </div>
    </article>
  );
}
