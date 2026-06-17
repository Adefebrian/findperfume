import React from "react";

// Material Design Icons as inline SVG (no emoji, no external dep).
// Paths sourced from the MDI set (Apache 2.0).
const PATHS: Record<string, string> = {
  coffee:
    "M2 21h18v-2H2M20 8h-2V5h2m0-2H4v10a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4v-3h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z",
  search:
    "M9.5 3A6.5 6.5 0 0 1 16 9.5c0 1.61-.59 3.09-1.56 4.23l.27.27h.79l5 5l-1.5 1.5l-5-5v-.79l-.27-.27A6.52 6.52 0 0 1 9.5 16A6.5 6.5 0 0 1 3 9.5A6.5 6.5 0 0 1 9.5 3m0 2C7 5 5 7 5 9.5S7 14 9.5 14S14 12 14 9.5S12 5 9.5 5Z",
  sparkles:
    "M12 1l1.95 5.36L19.5 8.5l-5.5 2.14L12 16l-2-5.36L4.5 8.5l5.55-2.14L12 1m6.5 11l.97 2.68L22 15.5l-2.53 1.07L18.5 19l-.97-2.43L15 15.5l2.53-.82L18.5 12M6 14l.75 2.06L9 17l-2.25.94L6 20l-.75-2.06L3 17l2.25-.94L6 14Z",
  star: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2L9.19 8.63L2 9.24l5.46 4.73L5.82 21z",
  timer:
    "M12 20a7 7 0 0 1-7-7a7 7 0 0 1 7-7a7 7 0 0 1 7 7a7 7 0 0 1-7 7m0-16a9 9 0 0 0-9 9a9 9 0 0 0 9 9a9 9 0 0 0 9-9a9 9 0 0 0-9-9m-1 5v5l4.25 2.52l.75-1.23l-3.5-2.08V9z",
  wind: "M4 10a1 1 0 0 1 0-2h11a2 2 0 1 0-2-2a1 1 0 0 1-2 0a4 4 0 1 1 4 4zm0 4a1 1 0 0 0 0 2h7a2 2 0 1 1-2 2a1 1 0 0 0-2 0a4 4 0 1 0 4-4z",
  open: "M14 3v2h3.59l-9.83 9.83l1.41 1.41L19 6.41V10h2V3m-2 16H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2z",
  library:
    "M6 4v16H4V4h2m4 0h2v16h-2V4m8.5.5l2 .54l-3.9 14.5l-2-.54L18.5 4.5M14 4h2v16h-2V4Z",
  back: "M20 11H7.83l5.59-5.59L12 4l-8 8l8 8l1.41-1.41L7.83 13H20z",
  filter: "M14 12v7.88c.04.3-.06.62-.29.83a.996.996 0 0 1-1.41 0l-2.01-2.01a.989.989 0 0 1-.29-.83V12h-.03L4.21 4.62a1 1 0 0 1 .17-1.4c.19-.14.4-.22.62-.22h14c.22 0 .43.08.62.22a1 1 0 0 1 .17 1.4L14.03 12H14Z",
  close: "M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z",
  drop: "M12 3.25S6 10 6 14a6 6 0 0 0 12 0c0-4-6-10.75-6-10.75M12 20a4 4 0 0 1-4-4c0-2 2-5.5 4-8c2 2.5 4 6 4 8a4 4 0 0 1-4 4Z",
  trophy:
    "M18 2a1 1 0 0 1 1 1v2h2v2a4 4 0 0 1-4 4h-.34A5 5 0 0 1 13 13.9V17h2a2 2 0 0 1 2 2v2H7v-2a2 2 0 0 1 2-2h2v-3.1A5 5 0 0 1 7.34 11H7a4 4 0 0 1-4-4V5h2V3a1 1 0 0 1 1-1zM5 7a2 2 0 0 0 2 2V7zm14 0h-2v2a2 2 0 0 0 2-2z",
  // perfume bottle (MDI bottle-tonic) — app logo
  perfume:
    "M11 2a1 1 0 0 0-1 1v2.27C8.21 5.61 7 7.17 7 9v10a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3V9c0-1.83-1.21-3.39-3-3.73V3a1 1 0 0 0-1-1h-2m0 2h2v1h-2V4Z",
};

export function Icon({
  name,
  size = 20,
  className = "",
}: {
  name: keyof typeof PATHS | string;
  size?: number;
  className?: string;
}) {
  const d = PATHS[name] || "";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
