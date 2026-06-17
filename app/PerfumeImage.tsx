"use client";

import { useState } from "react";
import Image from "next/image";
import { Icon } from "./Icon";
import { accordGradient } from "@/lib/accordColors";

// Loads the real bottle photo straight from /api/image (served off disk).
// If that 404s (perfume has no saved photo), falls back to a scent-colored
// gradient keyed to the accords -- never a broken or wrong bottle.
export function PerfumeImage({
  id,
  name,
  brand,
  accords = [],
  sizes,
  pad = "p-5",
  glyph = 34,
}: {
  id: number;
  name: string;
  brand: string;
  accords?: string[];
  sizes?: string;
  pad?: string;
  glyph?: number;
}) {
  const [failed, setFailed] = useState(false);

  if (!failed) {
    return (
      <Image
        src={`/api/image?id=${id}`}
        alt={`${name} by ${brand}`}
        fill
        unoptimized
        sizes={sizes}
        onError={() => setFailed(true)}
        className={`object-contain ${pad} mix-blend-multiply transition duration-700 group-hover:scale-105`}
      />
    );
  }

  const [c1, c2] = accordGradient(accords);
  const initial = (brand || name || "?").trim().charAt(0).toUpperCase();
  return (
    <div
      className="absolute inset-0 overflow-hidden transition duration-700 group-hover:scale-105"
      style={{ background: `linear-gradient(140deg, ${c1} 0%, ${c2} 100%)` }}
    >
      <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/25 blur-2xl" />
      <div className="absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-black/10 blur-2xl" />
      <div className="absolute inset-0 grid place-items-center">
        <Icon name="drop" size={glyph} className="text-white/75 drop-shadow-sm" />
      </div>
      <span className="absolute bottom-2.5 right-3 text-[13px] font-bold uppercase tracking-widest text-white/70">
        {initial}
      </span>
    </div>
  );
}
