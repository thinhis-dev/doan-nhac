import { Crown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Player } from "../../shared/protocol";
import { vi } from "../lib/strings-vi";
import { Avatar } from "./avatar";

const COUNT_UP_MS = 600;

/** Counts a number up from its last value in 600 ms. Without motion, it jumps. */
export function useCountUp(value: number): number {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const begin = from.current;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || begin === value) {
      setShown(value);
      from.current = value;
      return;
    }
    let frame = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / COUNT_UP_MS);
      setShown(Math.round(begin + (value - begin) * (1 - (1 - k) ** 3)));
      if (k < 1) frame = requestAnimationFrame(tick);
      else from.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      from.current = value;
    };
  }, [value]);
  return shown;
}

export function CountUp({ value, className = "" }: { value: number; className?: string }) {
  return <span className={`tabular ${className}`}>{useCountUp(value)}</span>;
}

/** The final party ranking. The winner has a larger card that enters with pop. */
export function Scoreboard({ ranking, meId }: { ranking: Player[]; meId: string | null }) {
  const [winner, ...rest] = ranking;
  return (
    <div className="flex flex-col gap-3">
      {winner ? (
        <div className="flex animate-pop items-center gap-4 rounded-button bg-cta p-4 text-ink shadow-button-cta">
          <Avatar id={winner.avatarId} size={72} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-small font-semibold">
              <Crown size={20} strokeWidth={2.25} aria-hidden />
              {vi.result.winner}
            </div>
            <div className="truncate font-display text-h2 font-bold">
              {winner.name}
              {winner.id === meId ? ` (${vi.lobby.you})` : ""}
            </div>
          </div>
          <CountUp value={winner.score} className="font-display text-h1 font-extrabold" />
        </div>
      ) : null}
      <ol className="flex flex-col gap-2">
        {rest.map((p, i) => (
          <li key={p.id} className="flex items-center gap-3 rounded-button bg-surface px-4 py-2 shadow-card">
            <span className="tabular w-6 font-display text-h2 font-bold text-text-muted" aria-label={vi.result.rank(i + 2)}>
              {i + 2}
            </span>
            <Avatar id={p.avatarId} size={40} />
            <span className="min-w-0 flex-1 truncate text-body font-medium">
              {p.name}
              {p.id === meId ? ` (${vi.lobby.you})` : ""}
            </span>
            <CountUp value={p.score} className="font-display text-h2 font-bold" />
          </li>
        ))}
      </ol>
    </div>
  );
}
