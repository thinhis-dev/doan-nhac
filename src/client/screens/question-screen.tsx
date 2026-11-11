import { Check, Music, Volume2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { QuestionPayload, RevealPayload, RoomState } from "../../shared/protocol";
import { CountdownBar } from "../components/countdown-bar";
import { GameButton } from "../components/game-button";
import { PlayerStrip } from "../components/player-strip";
import { ScreenFrame } from "../components/screen-frame";
import { CountUp } from "../components/scoreboard";
import type { AudioState } from "../lib/audio-player";
import { vi } from "../lib/strings-vi";
import { serverNow } from "../lib/time-sync";

const LETTERS = ["A", "B", "C", "D"] as const;

type Props = {
  room: RoomState;
  meId: string | null;
  question: QuestionPayload;
  reveal: RevealPayload | null;
  myAnswer: number | null;
  locked: boolean;
  audio: AudioState;
  onAnswer: (i: number) => void;
  onTapListen: () => void;
  onBack: () => void;
};

type ButtonLook = "default" | "chosen" | "correct" | "wrong" | "faded";

function lookOf(i: number, myAnswer: number | null, reveal: RevealPayload | null): ButtonLook {
  if (!reveal) return myAnswer === i ? "chosen" : "default";
  if (i === reveal.correctIndex) return "correct";
  if (i === myAnswer) return "wrong";
  return "faded";
}

const LOOK_CLASS: Record<ButtonLook, string> = {
  default: "bg-surface border-outline text-text",
  chosen: "bg-primary border-primary text-white animate-pop",
  correct: "bg-success border-success text-ink",
  wrong: "bg-surface border-danger text-text animate-shake",
  faded: "bg-surface border-outline text-text opacity-50",
};

function AnswerButton(props: {
  index: number;
  text: string;
  look: ButtonLook;
  disabled: boolean;
  onClick: () => void;
}) {
  const { index, text, look } = props;
  const Icon = look === "correct" ? Check : look === "wrong" ? X : null;
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      aria-label={vi.question.choice(LETTERS[index] as string, text)}
      aria-pressed={look === "chosen" || undefined}
      className={`focus-ring flex min-h-16 w-full items-center gap-3 rounded-button border-2 px-3 py-2 text-left shadow-card transition-transform duration-100 enabled:active:translate-y-1 enabled:active:shadow-none ${LOOK_CLASS[look]} ${props.disabled && look === "default" ? "cursor-default" : ""}`}
    >
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-chip font-display text-button font-bold ${look === "correct" ? "bg-ink text-success" : look === "chosen" ? "bg-white text-primary" : "bg-surface-2 text-text"}`}
        aria-hidden
      >
        {LETTERS[index]}
      </span>
      <span className="min-w-0 flex-1 font-display text-[1.125rem] leading-tight font-bold break-words">
        {text}
      </span>
      {Icon ? <Icon size={24} strokeWidth={2.25} aria-hidden className="shrink-0" /> : null}
    </button>
  );
}

function CountdownNumber({ startsAt }: { startsAt: number }) {
  const [left, setLeft] = useState(() => Math.max(1, Math.ceil((startsAt - serverNow()) / 1000)));
  useEffect(() => {
    const id = window.setInterval(() => setLeft(Math.max(0, Math.ceil((startsAt - serverNow()) / 1000))), 100);
    return () => window.clearInterval(id);
  }, [startsAt]);
  return (
    <span key={left} className="tabular inline-block animate-tick font-display text-display font-extrabold text-cta" aria-live="off">
      {left > 0 ? left : ""}
    </span>
  );
}

export function QuestionScreen(props: Props) {
  const { room, question, reveal, myAnswer, locked, audio } = props;
  const phase = room.phase;
  const canAnswer = phase === "playing" && myAnswer === null && !reveal && !locked;
  const mine = reveal?.results.find((r) => r.playerId === props.meId);

  // Keys 1 to 4 pick an answer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (canAnswer && n >= 1 && n <= 4 && !e.altKey && !e.ctrlKey && !e.metaKey) props.onAnswer(n - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const prompt = question.kind === "title" ? vi.question.title : vi.question.artist;
  let revealText = "";
  if (reveal) {
    revealText = mine?.choiceIndex === null || !mine ? vi.question.timeout : mine.choiceIndex === reveal.correctIndex ? vi.question.correct : vi.question.wrong;
  }

  return (
    <ScreenFrame
      title={vi.question.progress(question.index + 1, question.total)}
      onBack={props.onBack}
      right={
        <span className="tabular rounded-chip bg-surface px-3 py-1 font-display text-button font-bold" aria-label={vi.result.score}>
          {room.players.find((p) => p.id === props.meId)?.score ?? 0}
        </span>
      }
    >
      <div className="flex flex-1 flex-col gap-3 [@media(orientation:landscape)_and_(max-height:540px)]:grid [@media(orientation:landscape)_and_(max-height:540px)]:grid-cols-2 [@media(orientation:landscape)_and_(max-height:540px)]:items-start">
        <div className="flex flex-col gap-3">
          <CountdownBar startsAt={question.startsAt} endsAt={question.endsAt} running={phase === "playing" && !reveal} />
          <div className="flex min-h-24 flex-col items-center justify-center gap-1 text-center">
            {phase === "countdown" ? (
              <>
                <p className="text-body text-text-muted">{vi.question.getReady}</p>
                <CountdownNumber startsAt={question.startsAt} />
              </>
            ) : reveal ? (
              <div className="flex flex-col items-center gap-0.5" aria-live="polite">
                <p className={`font-display text-h2 font-bold ${mine && mine.delta > 0 ? "text-success" : "text-text"}`}>
                  {revealText}
                  {mine && mine.delta !== 0 ? (
                    <>
                      {" "}
                      {mine.delta > 0 ? "+" : ""}
                      <CountUp value={mine.delta} />
                    </>
                  ) : null}
                </p>
                <p className="text-body font-semibold">
                  <Music size={20} strokeWidth={2.25} className="mr-1 inline align-[-3px] text-cta" aria-hidden />
                  {reveal.title}
                </p>
                <p className="text-small text-text-muted">{reveal.artist}</p>
              </div>
            ) : (
              <h2 className="font-display text-h1 font-bold">{prompt}</h2>
            )}
          </div>
          {audio === "blocked" && phase === "playing" ? (
            <GameButton variant="cta" full icon={Volume2} onClick={props.onTapListen}>
              {vi.question.tapToListen}
            </GameButton>
          ) : null}
          {audio === "error" ? (
            <p role="alert" className="text-center text-small font-semibold text-danger">
              {vi.question.loadFailed}
            </p>
          ) : null}
          {locked && !reveal ? (
            <p role="alert" className="rounded-chip border-2 border-danger px-3 py-2 text-center text-small font-semibold text-danger">
              {vi.question.lockedFocus}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2">
            {question.choices.map((c, i) => (
              <AnswerButton
                key={`${question.index}-${i}`}
                index={i}
                text={c}
                look={lookOf(i, myAnswer, reveal)}
                disabled={!canAnswer}
                onClick={() => props.onAnswer(i)}
              />
            ))}
          </div>
          {room.mode === "party" ? <PlayerStrip players={room.players} meId={props.meId} /> : null}
        </div>
      </div>
    </ScreenFrame>
  );
}
