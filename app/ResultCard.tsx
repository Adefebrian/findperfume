"use client";

import Image from "next/image";
import { Icon } from "./Icon";
import { PerfumeImage } from "./PerfumeImage";

export interface NoteIcon {
  n: string;
  i: string;
}
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
  notes: { top: NoteIcon[]; heart: NoteIcon[]; base: NoteIcon[] };
  rating_scent: number | null;
  scent_count: number | null;
  rating_longevity: number | null;
  rating_sillage: number | null;
  image: string | null;
  url: string | null;
}

function ScoreRing({ score, big }: { score: number; big?: boolean }) {
  const sz = big ? 64 : 46;
  const r = big ? 27 : 19;
  const c = 2 * Math.PI * r;
  const off = c - (score / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: sz, height: sz }}>
      <svg className="-rotate-90" width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`}>
        <circle cx={sz / 2} cy={sz / 2} r={r} fill="none" stroke="#EAD9C6" strokeWidth="5" />
        <circle
          cx={sz / 2}
          cy={sz / 2}
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
      <span
        className={`absolute inset-0 grid place-items-center font-bold text-coffee-dark ${
          big ? "text-lg" : "text-xs"
        }`}
      >
        {score}
      </span>
    </div>
  );
}

function Chips({ tags, max = 3 }: { tags: string[]; max?: number }) {
  if (!tags.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.slice(0, max).map((t, i) => (
        <span
          key={i}
          className="rounded-full border border-line bg-cream px-2.5 py-0.5 text-[11px] font-medium text-coffee-mid"
        >
          {t}
        </span>
      ))}
    </div>
  );
}

function NoteChip({ note }: { note: NoteIcon }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-cream-2 py-1 pl-1 pr-2.5 text-[11px] font-medium text-coffee-dark/80">
      {note.i ? (
        <Image
          src={note.i}
          alt={note.n}
          width={18}
          height={18}
          unoptimized
          className="h-[18px] w-[18px] rounded-full object-contain"
        />
      ) : (
        <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-coffee-soft/30 text-coffee-mid">
          <Icon name="drop" size={11} />
        </span>
      )}
      {note.n}
    </span>
  );
}

function Ratings({ item, className = "" }: { item: ResultItem; className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-coffee-mid ${className}`}>
      {item.rating_scent != null && (
        <span className="inline-flex items-center gap-1">
          <Icon name="star" size={13} />
          {item.rating_scent.toFixed(1)}
          {item.scent_count ? ` (${item.scent_count})` : ""}
        </span>
      )}
      {item.rating_longevity != null && (
        <span className="inline-flex items-center gap-1">
          <Icon name="timer" size={13} />
          {item.rating_longevity.toFixed(1)}
        </span>
      )}
      {item.rating_sillage != null && (
        <span className="inline-flex items-center gap-1">
          <Icon name="wind" size={13} />
          {item.rating_sillage.toFixed(1)}
        </span>
      )}
    </div>
  );
}

export type Variant = "hero" | "wide" | "tall" | "normal";

function RankBadge({ rank, top }: { rank: number; top: boolean }) {
  return (
    <span
      className={`absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold shadow-sm ${
        top ? "bg-coffee-dark text-cream" : "bg-card/90 text-coffee-mid backdrop-blur"
      }`}
    >
      {top && <Icon name="trophy" size={13} />}#{rank}
    </span>
  );
}

const CARD =
  "rise group relative flex overflow-hidden rounded-3xl border border-line bg-card shadow-[0_2px_20px_rgba(75,46,43,0.05)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(75,46,43,0.16)]";

export default function ResultCard({
  item,
  index,
  variant = "normal",
}: {
  item: ResultItem;
  index: number;
  variant?: Variant;
}) {
  const delay = { animationDelay: `${index * 60}ms` };

  // HERO — 2x2, vertical, image-dominant.
  if (variant === "hero") {
    const hasNotes =
      item.notes.top.length + item.notes.heart.length + item.notes.base.length > 0;
    return (
      <article className={`${CARD} flex-col md:col-span-2 md:row-span-2`} style={delay}>
        <RankBadge rank={item.rank} top />
        <div className="relative min-h-0 flex-1 overflow-hidden bg-cream-2">
          <PerfumeImage
            id={item.id}
            name={item.name}
            brand={item.brand}
            accords={item.accords}
            glyph={52}
            sizes="(max-width:768px) 100vw, 480px"
          />
        </div>
        <div className="flex flex-col gap-3 p-5">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium uppercase tracking-[0.12em] text-coffee-soft">
                {item.brand}
              </p>
              <h3 className="mt-0.5 truncate text-2xl font-semibold leading-tight text-coffee-dark">
                {item.name}
              </h3>
              <p className="mt-0.5 text-xs text-coffee-soft">
                {[item.gender, item.year].filter(Boolean).join(" · ")}
              </p>
            </div>
            <ScoreRing score={item.score} big />
          </div>
          <Chips tags={item.match_tags} max={4} />
          <p className="text-sm leading-relaxed text-coffee-dark/80">{item.reason}</p>
          {hasNotes && (
            <div className="flex flex-wrap gap-1.5 border-t border-line pt-3">
              {[...item.notes.top, ...item.notes.heart, ...item.notes.base]
                .slice(0, 8)
                .map((n, i) => (
                  <NoteChip key={i} note={n} />
                ))}
            </div>
          )}
          <Ratings item={item} className="mt-auto pt-1" />
        </div>
      </article>
    );
  }

  // WIDE / default — 2x1, horizontal, image-left.
  return (
    <article className={`${CARD} flex-row md:col-span-2`} style={delay}>
      <RankBadge rank={item.rank} top={false} />
      <div className="relative w-2/5 shrink-0 overflow-hidden bg-cream-2 sm:w-44">
        <PerfumeImage
          id={item.id}
          name={item.name}
          brand={item.brand}
          accords={item.accords}
          pad="p-3"
          glyph={34}
          sizes="200px"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium uppercase tracking-[0.12em] text-coffee-soft">
              {item.brand}
            </p>
            <h3 className="truncate text-base font-semibold leading-tight text-coffee-dark">
              {item.name}
            </h3>
          </div>
          <ScoreRing score={item.score} />
        </div>
        <Chips tags={item.match_tags} max={3} />
        <p className="line-clamp-2 text-[13px] leading-relaxed text-coffee-dark/80">
          {item.reason}
        </p>
        <Ratings item={item} className="mt-auto" />
      </div>
    </article>
  );
}
