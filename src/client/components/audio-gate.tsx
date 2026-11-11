import { Check, RotateCcw, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { sessionPlayer } from "../lib/audio-player";
import { vi } from "../lib/strings-vi";
import { GameButton } from "./game-button";
import { ScreenFrame } from "./screen-frame";

type Props = { onDone: () => void; onBack: () => void };

/** The "turn on sound" step. It unlocks the shared audio element inside a tap. */
export function AudioGate({ onDone, onBack }: Props) {
  const player = sessionPlayer();
  const [step, setStep] = useState<"intro" | "check">("intro");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  // The unlock lasts for the session. A second gate is not needed.
  useEffect(() => {
    if (player.unlocked) onDone();
  }, [player, onDone]);

  const enable = async () => {
    setBusy(true);
    const ok = await player.unlock();
    setBusy(false);
    setFailed(!ok);
    if (ok) setStep("check");
  };

  const replay = () => {
    void player.unlock();
  };

  return (
    <ScreenFrame
      title={vi.audioGate.title}
      onBack={onBack}
      footer={
        step === "intro" ? (
          <GameButton variant="cta" full icon={Volume2} loading={busy} onClick={enable}>
            {vi.audioGate.enable}
          </GameButton>
        ) : (
          <div className="flex flex-col gap-3">
            <GameButton variant="cta" full icon={Check} onClick={onDone}>
              {vi.audioGate.yes}
            </GameButton>
            <GameButton variant="ghost" full icon={RotateCcw} onClick={replay}>
              {vi.audioGate.replay}
            </GameButton>
          </div>
        )
      }
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <div className="flex size-32 items-center justify-center rounded-full bg-surface shadow-card">
          <Volume2 size={64} strokeWidth={2.25} className="text-cta" aria-hidden />
        </div>
        {step === "intro" ? (
          <p className="max-w-sm text-body text-text-muted">{vi.audioGate.body}</p>
        ) : (
          <p className="font-display text-h2 font-bold" aria-live="polite">
            {vi.audioGate.heard}
          </p>
        )}
        {failed ? (
          <p role="alert" className="text-body font-semibold text-danger">
            {vi.audioGate.failed}
          </p>
        ) : null}
      </div>
    </ScreenFrame>
  );
}
