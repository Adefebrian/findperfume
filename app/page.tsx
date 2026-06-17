"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ResultCard, { type ResultItem, type Variant } from "./ResultCard";
import { Icon } from "./Icon";

const TYPES = [
  { k: "", label: "All" },
  { k: "dupe", label: "Dupe" },
  { k: "designer", label: "Designer" },
  { k: "niche", label: "Niche" },
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ResultItem[] | null>(null);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");

  // Auto-run a search when the page is opened with ?q=... (shareable links).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) {
      setQuery(q);
      search(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function search(q: string) {
    const text = q.trim();
    if (text.length < 2 || loading) return;
    setLoading(true);
    setError("");
    setResults(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text, type: type || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Search failed");
      setResults(data.results || []);
      setSummary(data?.prefs?.summary || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-24">
      {/* Nav */}
      <nav className="flex items-center justify-between pt-6">
        <span className="inline-flex items-center gap-2 font-semibold text-coffee-dark">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-coffee-dark text-cream">
            <Icon name="perfume" size={18} />
          </span>
          <span>Find<span className="text-coffee-mid">perfume</span></span>
        </span>
        <Link
          href="/library"
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-4 py-2 text-sm font-medium text-coffee-mid transition hover:border-coffee-soft hover:bg-cream-2"
        >
          <Icon name="library" size={16} />
          Library
        </Link>
      </nav>

      {/* Header */}
      <header className="pt-8 text-center sm:pt-12">
        <h1 className="text-3xl font-bold tracking-tight text-coffee-dark sm:text-5xl">
          Find your signature scent
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-coffee-dark/70 sm:text-base">
          Describe your personality or your need. Our expert-AI perfumer finds the
          best from <b>1 Million+ perfumes from around the world</b>, ranked with a
          score and a reason.
        </p>
      </header>

      {/* Search box */}
      <section className="mx-auto mt-8 max-w-2xl">
        <div className="rounded-3xl border border-line bg-card p-2 shadow-[0_4px_30px_rgba(75,46,43,0.07)]">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) search(query);
            }}
            rows={3}
            placeholder="e.g. I am warm and easygoing, I like sweet vanilla scents for everyday wear"
            className="w-full resize-none rounded-2xl bg-transparent px-4 py-3 text-coffee-dark placeholder:text-coffee-soft/70 focus:outline-none"
          />
          <div className="flex items-center justify-between gap-3 px-2 pb-1">
            <span className="text-xs text-coffee-soft">Cmd/Ctrl + Enter</span>
            <button
              onClick={() => search(query)}
              disabled={loading || query.trim().length < 2}
              className="inline-flex items-center gap-2 rounded-xl bg-coffee-dark px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-coffee-mid disabled:opacity-40"
            >
              {loading ? (
                <>
                  <span className="spin inline-block h-4 w-4 rounded-full border-2 border-cream border-t-transparent" />
                  Curating
                </>
              ) : (
                <>
                  <Icon name="sparkles" size={16} />
                  Find my perfume
                </>
              )}
            </button>
          </div>
        </div>

        {/* Perfume type filter */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs font-medium text-coffee-soft">Type</span>
          {TYPES.map((t) => (
            <button
              key={t.k}
              onClick={() => setType(t.k)}
              className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition ${
                type === t.k
                  ? "border-coffee-dark bg-coffee-dark text-cream"
                  : "border-line bg-card text-coffee-mid hover:border-coffee-soft hover:bg-cream-2"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

      </section>

      {error && (
        <p className="mx-auto mt-8 max-w-md rounded-2xl border border-line bg-card px-4 py-3 text-center text-sm text-coffee-mid">
          {error}
        </p>
      )}

      {loading && <LoadingBento />}

      {results && !loading && (
        <section className="mt-10">
          {summary && (
            <p className="mb-5 text-center text-sm text-coffee-dark/70">
              Results for: <span className="font-medium text-coffee-dark">{summary}</span>
            </p>
          )}
          {results.length === 0 ? (
            <p className="text-center text-coffee-mid">No results. Try a different description.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4 md:auto-rows-[208px]">
              {results.slice(0, 5).map((item, i) => (
                <ResultCard key={item.id} item={item} index={i} variant={resultVariant(i)} />
              ))}
            </div>
          )}
        </section>
      )}

      <footer className="mt-16 flex flex-col items-center gap-2 text-xs text-coffee-soft">
        <p className="font-medium text-coffee-mid">Made by Brian</p>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <a
            href="https://instagram.com/brianeedsleep"
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-coffee-mid"
          >
            IG @brianeedsleep
          </a>
          <a
            href="https://github.com/adefebrian"
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-coffee-mid"
          >
            github.com/adefebrian
          </a>
          <a
            href="https://adefebrian.com"
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-coffee-mid"
          >
            adefebrian.com
          </a>
        </div>
      </footer>
    </main>
  );
}

// 5-card bento on a 4-col grid: #1 is a 2x2 hero, #2-#5 are 2x1 wides.
// Tiles perfectly (4 + 2+2+2+2 = 12 = 4 cols x 3 rows), no gaps.
function resultVariant(i: number): Variant {
  return i === 0 ? "hero" : "wide";
}

function LoadingBento() {
  return (
    <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-4 md:auto-rows-[208px]">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`overflow-hidden rounded-3xl border border-line bg-card ${
            i === 0 ? "md:col-span-2 md:row-span-2 flex flex-col" : "md:col-span-2 flex flex-row"
          }`}
        >
          <div className={`skeleton ${i === 0 ? "min-h-0 flex-1" : "w-2/5 sm:w-44"}`} />
          <div className="flex flex-1 flex-col gap-2 p-4">
            <div className="skeleton h-3 w-1/3 rounded" />
            <div className="skeleton h-5 w-2/3 rounded" />
            <div className="skeleton h-10 w-full rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
