"use client";

import { useState } from "react";
import ResultCard, { type ResultItem } from "./ResultCard";

const SUGGESTIONS = [
  "Aku cowok percaya diri, suka suasana malam yang elegan dan misterius",
  "Parfum segar buat cewek aktif, cocok dipakai kerja tiap hari",
  "Wangi manis hangat seperti vanilla & kopi untuk musim hujan",
  "Sesuatu yang woody dan maskulin tapi tetap kalem untuk meeting",
  "Parfum romantis floral untuk kencan pertama",
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ResultItem[] | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [error, setError] = useState("");

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
        body: JSON.stringify({ query: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Gagal mencari");
      setResults(data.results || []);
      setSummary(data?.prefs?.summary || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-24">
      {/* Header */}
      <header className="pt-10 text-center sm:pt-16">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-coffee-dark text-cream text-xl">
          ☕
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-coffee-dark sm:text-5xl">
          Find<span className="text-coffee-mid">perfume</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-coffee-dark/70 sm:text-base">
          Ceritakan kepribadian atau kebutuhanmu — AI kami menemukan parfum terbaik
          dari <b>199.000+</b> koleksi, lengkap dengan skor & alasannya.
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
            placeholder="cth: Aku orangnya hangat & santai, suka wangi manis seperti vanilla untuk dipakai sehari-hari…"
            className="w-full resize-none rounded-2xl bg-transparent px-4 py-3 text-coffee-dark placeholder:text-coffee-soft/70 focus:outline-none"
          />
          <div className="flex items-center justify-between gap-3 px-2 pb-1">
            <span className="text-xs text-coffee-soft">⌘/Ctrl + Enter</span>
            <button
              onClick={() => search(query)}
              disabled={loading || query.trim().length < 2}
              className="inline-flex items-center gap-2 rounded-xl bg-coffee-dark px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-coffee-mid disabled:opacity-40"
            >
              {loading ? (
                <>
                  <span className="spin inline-block h-4 w-4 rounded-full border-2 border-cream border-t-transparent" />
                  Meracik…
                </>
              ) : (
                <>Temukan parfumku ✨</>
              )}
            </button>
          </div>
        </div>

        {/* suggestions */}
        {!results && !loading && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setQuery(s);
                  search(s);
                }}
                className="rounded-full border border-line bg-card px-3.5 py-1.5 text-xs text-coffee-mid transition hover:border-coffee-soft hover:bg-cream-2"
              >
                {s.length > 46 ? s.slice(0, 46) + "…" : s}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* States */}
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
              Hasil untuk: <span className="font-medium text-coffee-dark">“{summary}”</span>
            </p>
          )}
          {results.length === 0 ? (
            <p className="text-center text-coffee-mid">
              Tidak ada hasil. Coba deskripsi yang berbeda.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((item, i) => (
                <ResultCard key={item.id} item={item} index={i} />
              ))}
            </div>
          )}
        </section>
      )}

      {!results && !loading && (
        <p className="mt-16 text-center text-xs text-coffee-soft">
          Ditenagai AI · kimi-k2.6 · qwen3.7-max · minimax-m3
        </p>
      )}
    </main>
  );
}

function LoadingBento() {
  return (
    <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className={`rounded-3xl border border-line bg-card p-5 ${i === 0 ? "lg:col-span-2" : ""}`}
        >
          <div className="skeleton mb-4 h-40 w-full rounded-2xl" />
          <div className="skeleton mb-2 h-4 w-1/3 rounded" />
          <div className="skeleton mb-2 h-5 w-2/3 rounded" />
          <div className="skeleton h-12 w-full rounded" />
        </div>
      ))}
    </div>
  );
}
