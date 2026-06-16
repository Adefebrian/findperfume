"use client";

import Image from "next/image";

export interface ResultItem {
  id: number;
  rank: number;
  score: number;
  reason: string;
  match_tags: string[];
  name: string;
  brand: string;
  year: number | null;
  gender: string | null;
  accords: string[];
  notes: { top: string; heart: string; base: string };
  rating_scent: number | null;
  scent_count: number | null;
  rating_longevity: number | null;
  rating_sillage: number | null;
  image: string | null;
  url: string | null;
}

function ScoreRing({ score }: { score: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const off = c - (score / 100) * c;
  return (
    <div className="relative h-14 w-14 shrink-0">
      <svg className="h-14 w-14 -rotate-90" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r={r} fill="none" stroke="#EAD9C6" strokeWidth="5" />
        <circle
          cx="26"
          cy="26"
          r={r}
          fill="none"
          stroke="#8C5A3C"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(.22,.61,.36,1)" }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-sm font-bold text-coffee-dark">
        {score}
      </span>
    </div>
  );
}

// Bento sizing: #1 spans 2 cols on desktop, rest normal.
export default function ResultCard({ item, index }: { item: ResultItem; index: number }) {
  const top = item.rank === 1;
  return (
    <article
      className={`rise group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-card p-5 shadow-[0_2px_20px_rgba(75,46,43,0.05)] transition hover:shadow-[0_8px_30px_rgba(75,46,43,0.12)] ${
        top ? "md:col-span-2 md:flex-row md:gap-6" : ""
      }`}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      {/* rank badge */}
      <span
        className={`absolute left-4 top-4 z-10 grid h-7 min-w-7 place-items-center rounded-full px-2 text-xs font-bold ${
          top ? "bg-coffee-dark text-cream" : "bg-cream-2 text-coffee-mid"
        }`}
      >
        #{item.rank}
      </span>

      {/* image */}
      <div
        className={`relative mx-auto mb-4 grid place-items-center overflow-hidden rounded-2xl bg-cream-2 ${
          top ? "md:mb-0 h-48 w-full md:h-56 md:w-56 md:shrink-0" : "h-40 w-full"
        }`}
      >
        {item.image ? (
          // parfumo CDN; unoptimized so we don't need a Next image loader/host
          <Image
            src={item.image}
            alt={`${item.name} by ${item.brand}`}
            fill
            unoptimized
            sizes="(max-width:768px) 100vw, 320px"
            className="object-contain p-3 transition duration-500 group-hover:scale-105"
          />
        ) : (
          <span className="text-coffee-soft text-sm">no image</span>
        )}
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs uppercase tracking-wider text-coffee-soft">
              {item.brand}
            </p>
            <h3 className="mt-0.5 text-lg font-semibold leading-tight text-coffee-dark">
              {item.name}
            </h3>
            <p className="mt-0.5 text-xs text-coffee-soft">
              {[item.gender, item.year].filter(Boolean).join(" · ")}
            </p>
          </div>
          <ScoreRing score={item.score} />
        </div>

        {/* tags */}
        {item.match_tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {item.match_tags.map((t, i) => (
              <span
                key={i}
                className="rounded-full bg-cream-2 px-2.5 py-1 text-[11px] font-medium text-coffee-mid"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* reason */}
        <p className="mt-3 text-sm leading-relaxed text-coffee-dark/80">{item.reason}</p>

        {/* notes + ratings */}
        <div className="mt-auto pt-4">
          {(item.notes.top || item.notes.heart || item.notes.base) && (
            <div className="space-y-1 border-t border-line pt-3 text-xs text-coffee-dark/70">
              {item.notes.top && (
                <p><span className="text-coffee-soft">Top:</span> {item.notes.top}</p>
              )}
              {item.notes.heart && (
                <p><span className="text-coffee-soft">Heart:</span> {item.notes.heart}</p>
              )}
              {item.notes.base && (
                <p><span className="text-coffee-soft">Base:</span> {item.notes.base}</p>
              )}
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-coffee-mid">
            {item.rating_scent != null && (
              <span>⭐ {item.rating_scent.toFixed(1)}{item.scent_count ? ` (${item.scent_count})` : ""}</span>
            )}
            {item.rating_longevity != null && (
              <span>⏳ {item.rating_longevity.toFixed(1)}</span>
            )}
            {item.rating_sillage != null && (
              <span>💨 {item.rating_sillage.toFixed(1)}</span>
            )}
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto font-medium text-coffee-mid underline-offset-2 hover:underline"
              >
                detail ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
