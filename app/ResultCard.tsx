"use client";

import Image from "next/image";
import { Icon } from "./Icon";

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
  const sz = big ? 64 : 52;
  const r = big ? 27 : 22;
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
          big ? "text-lg" : "text-sm"
        }`}
      >
        {score}
      </span>
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

function NoteRow({ label, notes }: { label: string; notes: NoteIcon[] }) {
  if (!notes.length) return null;
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-coffee-soft">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {notes.slice(0, 6).map((n, i) => (
          <NoteChip key={i} note={n} />
        ))}
      </div>
    </div>
  );
}

export default function ResultCard({ item, index }: { item: ResultItem; index: number }) {
  const top = item.rank === 1;
  return (
    <article
      className={`rise group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-card shadow-[0_2px_20px_rgba(75,46,43,0.05)] transition hover:shadow-[0_10px_36px_rgba(75,46,43,0.14)] ${
        top ? "md:col-span-2 md:row-span-2" : ""
      }`}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <span
        className={`absolute left-4 top-4 z-10 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
          top ? "bg-coffee-dark text-cream" : "bg-cream-2 text-coffee-mid"
        }`}
      >
        {top && <Icon name="trophy" size={13} />}#{item.rank}
      </span>

      <div className={top ? "flex flex-col md:flex-row md:gap-6 md:p-6 p-5" : "flex flex-col p-5"}>
        {/* image */}
        <div
          className={`relative mx-auto grid place-items-center overflow-hidden rounded-2xl bg-cream-2 ${
            top ? "h-56 w-full md:h-72 md:w-72 md:shrink-0" : "mb-4 h-44 w-full"
          }`}
        >
          {item.image ? (
            <Image
              src={item.image}
              alt={`${item.name} by ${item.brand}`}
              fill
              unoptimized
              sizes="(max-width:768px) 100vw, 320px"
              // blend kills the flat white bottle backdrop into the cream tile
              className="object-contain p-4 mix-blend-multiply transition duration-500 group-hover:scale-105"
            />
          ) : (
            <Icon name="drop" size={40} className="text-coffee-soft" />
          )}
        </div>

        {/* body */}
        <div className="flex flex-1 flex-col">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs uppercase tracking-wider text-coffee-soft">
                {item.brand}
              </p>
              <h3
                className={`mt-0.5 font-semibold leading-tight text-coffee-dark ${
                  top ? "text-2xl" : "text-lg"
                }`}
              >
                {item.name}
              </h3>
              <p className="mt-0.5 text-xs text-coffee-soft">
                {[item.gender, item.year].filter(Boolean).join(" \u00b7 ")}
              </p>
            </div>
            <ScoreRing score={item.score} big={top} />
          </div>

          {item.match_tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.match_tags.map((t, i) => (
                <span
                  key={i}
                  className="rounded-full border border-line bg-cream px-2.5 py-1 text-[11px] font-medium text-coffee-mid"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          <p
            className={`mt-3 leading-relaxed text-coffee-dark/80 ${
              top ? "text-base" : "text-sm"
            }`}
          >
            {item.reason}
          </p>

          {/* note icons */}
          {(item.notes.top.length || item.notes.heart.length || item.notes.base.length) > 0 && (
            <div className="mt-4 space-y-2.5 border-t border-line pt-3">
              <NoteRow label="Top" notes={item.notes.top} />
              <NoteRow label="Heart" notes={item.notes.heart} />
              <NoteRow label="Base" notes={item.notes.base} />
            </div>
          )}

          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-4 text-xs text-coffee-mid">
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
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex items-center gap-1 font-medium text-coffee-mid underline-offset-2 hover:underline"
              >
                detail
                <Icon name="open" size={13} />
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
