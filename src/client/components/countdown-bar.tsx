import { useEffect, useRef, useState } from "react";
import { vi } from "../lib/strings-vi";
import { serverNow } from "../lib/time-sync";

type Props = { startsAt: number; endsAt: number; running: boolean };

const URGENT_MS = 3000;

/**
 * The time bar. It reads the server clock on each frame, never a local
 * counter. It uses transform: scaleX only.
 */
export function CountdownBar({ startsAt, endsAt, running }: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  const total = endsAt - startsAt;
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(total / 1000));

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const now = serverNow();
      const remaining = Math.min(total, Math.max(0, endsAt - Math.max(now, startsAt)));
      if (barRef.current) barRef.current.style.transform = `scaleX(${running ? remaining / total : now < startsAt ? 1 : 0})`;
      setSecondsLeft(Math.ceil(remaining / 1000));
      if (running && remaining > 0) frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [startsAt, endsAt, total, running]);

  const urgent = running && secondsLeft * 1000 <= URGENT_MS;
  return (
    <div className="flex items-center gap-3">
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <div
          ref={barRef}
          className={`h-full w-full origin-left rounded-full ${urgent ? "bg-accent" : "bg-cta"}`}
          style={{ transform: "scaleX(1)" }}
        />
      </div>
      <span
        className={`tabular w-10 text-right font-display font-extrabold ${urgent ? "text-h1 text-accent" : "text-h2 text-text"}`}
        role="timer"
        aria-label={vi.question.secondsLeft(secondsLeft)}
      >
        {secondsLeft}
      </span>
    </div>
  );
}
