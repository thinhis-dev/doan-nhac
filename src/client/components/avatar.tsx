import type { ReactNode } from "react";
import { AVATAR_COUNT } from "../../shared/game-rules";
import { vi } from "../lib/strings-vi";

// Each avatar: a music-themed body shape in its own color token, plus a shared face.
const FILL = (i: number) => `var(--color-av-${i})`;
const INK = "var(--color-ink)";

type Body = { body: (fill: string) => ReactNode; faceY: number };

const BODIES: Body[] = [
  // 0 Vinyl record
  {
    faceY: 30,
    body: (f) => (
      <>
        <circle cx="32" cy="32" r="28" fill={f} />
        <circle cx="32" cy="32" r="21" fill="none" stroke={INK} strokeOpacity="0.25" strokeWidth="2" />
      </>
    ),
  },
  // 1 Music note
  {
    faceY: 44,
    body: (f) => (
      <>
        <rect x="38" y="6" width="6" height="40" rx="3" fill={f} />
        <path d="M41 6 L58 12 L58 20 L41 14 Z" fill={f} />
        <ellipse cx="30" cy="46" rx="18" ry="14" fill={f} />
      </>
    ),
  },
  // 2 Headphones
  {
    faceY: 34,
    body: (f) => (
      <>
        <path d="M10 34 a22 22 0 0 1 44 0" fill="none" stroke={f} strokeWidth="6" strokeLinecap="round" />
        <circle cx="32" cy="36" r="18" fill={f} />
        <rect x="4" y="30" width="10" height="18" rx="5" fill={f} />
        <rect x="50" y="30" width="10" height="18" rx="5" fill={f} />
      </>
    ),
  },
  // 3 Microphone
  {
    faceY: 24,
    body: (f) => (
      <>
        <rect x="18" y="4" width="28" height="36" rx="14" fill={f} />
        <rect x="28" y="40" width="8" height="16" rx="2" fill={f} />
        <rect x="20" y="54" width="24" height="6" rx="3" fill={f} />
      </>
    ),
  },
  // 4 Cassette
  {
    faceY: 26,
    body: (f) => (
      <>
        <rect x="4" y="12" width="56" height="40" rx="8" fill={f} />
        <rect x="14" y="38" width="36" height="10" rx="3" fill={INK} fillOpacity="0.2" />
      </>
    ),
  },
  // 5 Drum
  {
    faceY: 38,
    body: (f) => (
      <>
        <path d="M8 22 L8 48 Q32 60 56 48 L56 22 Z" fill={f} />
        <ellipse cx="32" cy="22" rx="24" ry="9" fill={f} />
        <ellipse cx="32" cy="22" rx="24" ry="9" fill={INK} fillOpacity="0.15" />
        <path d="M16 6 L26 18 M48 6 L38 18" stroke={f} strokeWidth="4" strokeLinecap="round" />
      </>
    ),
  },
  // 6 Guitar pick
  {
    faceY: 26,
    body: (f) => <path d="M32 60 C18 48 6 34 6 20 C6 10 18 4 32 4 C46 4 58 10 58 20 C58 34 46 48 32 60 Z" fill={f} />,
  },
  // 7 Speaker
  {
    faceY: 20,
    body: (f) => (
      <>
        <rect x="10" y="4" width="44" height="56" rx="10" fill={f} />
        <circle cx="32" cy="42" r="11" fill={INK} fillOpacity="0.2" />
      </>
    ),
  },
  // 8 Maraca
  {
    faceY: 26,
    body: (f) => (
      <>
        <ellipse cx="32" cy="26" rx="22" ry="22" fill={f} />
        <rect x="28" y="44" width="8" height="18" rx="4" fill={f} />
      </>
    ),
  },
  // 9 Star burst
  {
    faceY: 33,
    body: (f) => (
      <path
        d="M32 2 L39 21 L60 22 L43 35 L50 56 L32 44 L14 56 L21 35 L4 22 L25 21 Z"
        fill={f}
        strokeLinejoin="round"
        stroke={f}
        strokeWidth="4"
      />
    ),
  },
  // 10 Sound wave cloud
  {
    faceY: 36,
    body: (f) => (
      <>
        <circle cx="20" cy="36" r="14" fill={f} />
        <circle cx="44" cy="36" r="14" fill={f} />
        <circle cx="32" cy="24" r="16" fill={f} />
        <rect x="10" y="34" width="44" height="16" rx="8" fill={f} />
      </>
    ),
  },
  // 11 Hexagon synth key
  {
    faceY: 32,
    body: (f) => (
      <>
        <path d="M32 3 L57 17 L57 47 L32 61 L7 47 L7 17 Z" fill={f} />
        <rect x="18" y="46" width="28" height="4" rx="2" fill={INK} fillOpacity="0.25" />
      </>
    ),
  },
];

function Face({ y, i }: { y: number; i: number }) {
  // Small variations so that faces differ: some wink, some sing.
  const mouth =
    i % 3 === 0 ? (
      <path d={`M26 ${y + 6} Q32 ${y + 11} 38 ${y + 6}`} fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
    ) : i % 3 === 1 ? (
      <ellipse cx="32" cy={y + 8} rx="3.5" ry="4" fill={INK} />
    ) : (
      <path d={`M27 ${y + 7} L37 ${y + 7}`} stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
    );
  return (
    <>
      <circle cx="25" cy={y} r="3" fill={INK} />
      {i % 4 === 2 ? (
        <path d={`M36 ${y} L42 ${y}`} stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      ) : (
        <circle cx="39" cy={y} r="3" fill={INK} />
      )}
      {mouth}
    </>
  );
}

export function Avatar({ id, size = 40, className = "" }: { id: number; size?: number; className?: string }) {
  const i = ((id % AVATAR_COUNT) + AVATAR_COUNT) % AVATAR_COUNT;
  const b = BODIES[i] as Body;
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label={vi.avatar(i)}
      className={`shrink-0 ${className}`}
    >
      {b.body(FILL(i))}
      <Face y={b.faceY} i={i} />
    </svg>
  );
}
