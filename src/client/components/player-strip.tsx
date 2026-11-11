import { Check, EyeOff, WifiOff } from "lucide-react";
import type { Player } from "../../shared/protocol";
import { vi } from "../lib/strings-vi";
import { Avatar } from "./avatar";

/** Party players during a question: avatar, score, answered mark, lost-focus mark and offline mark. */
export function PlayerStrip({ players, meId }: { players: Player[]; meId: string | null }) {
  return (
    <ul className="flex gap-2">
      {players.map((p) => (
        <li
          key={p.id}
          className={`flex min-w-0 flex-1 flex-col items-center rounded-chip border-2 bg-surface px-1 py-1.5 ${p.id === meId ? "border-outline" : "border-transparent"} ${p.connected ? "" : "opacity-60"}`}
        >
          <div className="relative">
            <Avatar id={p.avatarId} size={32} />
            {p.answered ? (
              <span className="absolute -right-1.5 -bottom-1 rounded-full bg-success p-0.5 text-ink" title={vi.question.answered}>
                <Check size={12} strokeWidth={3} aria-label={vi.question.answered} />
              </span>
            ) : null}
            {!p.connected ? (
              <span className="absolute -top-1 -left-1.5 rounded-full bg-danger p-0.5 text-ink" title={vi.question.offline}>
                <WifiOff size={12} strokeWidth={3} aria-label={vi.question.offline} />
              </span>
            ) : !p.focused ? (
              <span className="absolute -top-1 -left-1.5 rounded-full bg-danger p-0.5 text-ink" title={vi.question.lostFocus}>
                <EyeOff size={12} strokeWidth={3} aria-label={vi.question.lostFocus} />
              </span>
            ) : null}
          </div>
          <span className="w-full truncate text-center text-small">{p.name}</span>
          <span className="tabular text-small font-semibold text-text-muted">{p.score}</span>
        </li>
      ))}
    </ul>
  );
}
