/**
 * The game mark: an amber question mark whose dot is a music note, with sound
 * waves, on a purple block with a hard bottom edge. Same drawing as
 * assets/logo.svg, with color tokens instead of hex values.
 */
export function Logo({ size = 96, className = "" }: { size?: number; className?: string }) {
  const amber = "var(--color-cta)";
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden className={`shrink-0 ${className}`}>
      <rect x="4" y="8" width="56" height="54" rx="15" fill="var(--color-primary-edge)" />
      <rect x="4" y="2" width="56" height="54" rx="15" fill="var(--color-primary)" />
      <g fill="none" stroke="var(--color-outline)" strokeWidth="3.5" strokeLinecap="round">
        <path d="M47 19 a14 14 0 0 1 0 22" />
        <path d="M17 19 a14 14 0 0 0 0 22" />
      </g>
      <path
        d="M24 20.5 a8 8 0 1 1 11.5 7.2 c-2.4 1.2 -3.5 2.8 -3.5 5.3 v0.8"
        fill="none"
        stroke={amber}
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <ellipse cx="30.5" cy="46" rx="5" ry="4" transform="rotate(-20 30.5 46)" fill={amber} />
      <path d="M35 45 V37.5 l5 2" fill="none" stroke={amber} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
