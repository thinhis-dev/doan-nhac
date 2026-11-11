import { Home, RotateCcw } from "lucide-react";
import type { GameOverPayload, RoomState } from "../../shared/protocol";
import { GameButton } from "../components/game-button";
import { ScreenFrame } from "../components/screen-frame";
import { CountUp, Scoreboard } from "../components/scoreboard";
import { vi } from "../lib/strings-vi";

type Props = {
  room: RoomState;
  over: GameOverPayload | null;
  meId: string | null;
  isHost: boolean;
  correctCount: number;
  total: number;
  busy: boolean;
  onAgain: () => void;
  onHome: () => void;
};

export function ResultScreen({ room, over, meId, isHost, correctCount, total, busy, onAgain, onHome }: Props) {
  const ranking = over?.ranking ?? [...room.players].sort((a, b) => b.score - a.score);
  const me = ranking.find((p) => p.id === meId);
  const solo = room.mode === "solo";

  return (
    <ScreenFrame
      title={vi.result.title}
      onBack={onHome}
      footer={
        <div className="flex flex-col gap-3">
          {solo || isHost ? (
            <GameButton variant="cta" full icon={RotateCcw} loading={busy} onClick={onAgain}>
              {solo ? vi.result.playAgain : vi.result.continue}
            </GameButton>
          ) : (
            <p className="py-2 text-center text-body text-text-muted" role="status">
              {vi.result.waitHost}
            </p>
          )}
          <GameButton variant="ghost" full icon={Home} onClick={onHome}>
            {vi.common.home}
          </GameButton>
        </div>
      }
    >
      {solo ? (
        <section className="flex flex-1 animate-pop flex-col items-center justify-center gap-2 rounded-button bg-surface p-6 text-center shadow-card">
          <p className="text-body text-text-muted">{vi.result.score}</p>
          <CountUp value={me?.score ?? 0} className="font-display text-display font-extrabold text-cta" />
          <p className="font-display text-h2 font-bold">{vi.result.correctCount(correctCount, total)}</p>
        </section>
      ) : (
        <Scoreboard ranking={ranking} meId={meId} />
      )}
    </ScreenFrame>
  );
}
