import { COUNTDOWN_MS, REVEAL_MS, scoreAnswer } from "../shared/game-rules";
import type {
  GameOverPayload,
  GameParams,
  Player,
  PoolSong,
  QuestionPayload,
  RevealPayload,
} from "../shared/protocol";
import { type BuiltQuestion, buildQuestion, type Rng } from "./question-builder";
import type { Room } from "./room-store";

export type TimerHandle = unknown;

export type EngineClock = {
  now(): number;
  setTimer(fn: () => void, ms: number): TimerHandle;
  clearTimer(handle: TimerHandle): void;
};

export const realClock: EngineClock = {
  now: () => Date.now(),
  setTimer: (fn, ms) => setTimeout(fn, ms),
  clearTimer: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

export type EngineEvents = {
  question(q: QuestionPayload): void;
  reveal(r: RevealPayload): void;
  over(o: GameOverPayload): void;
  state(): void;
};

export type EngineTiming = { countdownMs: number; revealMs: number };

type AnswerRecord = { choiceIndex: number | null; delta: number };

/**
 * Runs one game in one room. The server owns all timing and scoring.
 * Phase order per question: countdown, playing, reveal. Then "over".
 */
export class GameEngine {
  private questions: BuiltQuestion[] = [];
  private index = -1;
  private startsAt = 0;
  private endsAt = 0;
  private timer: TimerHandle | undefined;
  private answers = new Map<string, AnswerRecord>();
  private locked = new Set<string>();
  private params: GameParams;

  constructor(
    private readonly room: Room,
    private readonly events: EngineEvents,
    private readonly clock: EngineClock = realClock,
    private readonly rng: Rng = Math.random,
    private readonly timing: EngineTiming = { countdownMs: COUNTDOWN_MS, revealMs: REVEAL_MS },
  ) {
    this.params = room.params;
  }

  get questionIndex(): number {
    return this.index;
  }

  /** `songs` is the picked song order. `pool` supplies the wrong answer choices. */
  start(params: GameParams, songs: PoolSong[], pool: PoolSong[]): void {
    this.stop();
    this.params = params;
    this.room.params = params;
    this.questions = songs.map((s) => buildQuestion(s, pool, params, this.rng));
    this.index = -1;
    for (const p of this.room.players) p.score = 0;
    this.nextQuestion();
  }

  stop(): void {
    if (this.timer !== undefined) this.clock.clearTimer(this.timer);
    this.timer = undefined;
  }

  /** Returns false for an ignored answer. The first answer is final. */
  answer(playerId: string, questionIndex: number, choiceIndex: number): boolean {
    if (this.room.phase !== "playing" || questionIndex !== this.index) return false;
    const player = this.findPlayer(playerId);
    if (!player || this.answers.has(playerId) || this.locked.has(playerId)) return false;
    const q = this.questions[this.index] as BuiltQuestion;
    if (!Number.isInteger(choiceIndex) || choiceIndex < 0 || choiceIndex >= q.choices.length) return false;
    const elapsed = this.clock.now() - this.startsAt;
    const totalMs = this.endsAt - this.startsAt;
    const delta = scoreAnswer(choiceIndex === q.correctIndex, elapsed, totalMs, this.params.wrongPenalty);
    this.answers.set(playerId, { choiceIndex, delta });
    player.answered = true;
    this.events.state();
    this.revealIfAllDone();
    return true;
  }

  setFocus(playerId: string, focused: boolean): void {
    const player = this.findPlayer(playerId);
    if (!player || player.focused === focused) return;
    player.focused = focused;
    if (!focused && this.room.phase === "playing") this.lockIfRequired(player);
    this.events.state();
    this.revealIfAllDone();
  }

  /** Call after a player left the room. A remaining player set may now be done. */
  playerLeft(playerId: string): void {
    this.answers.delete(playerId);
    this.locked.delete(playerId);
    if (this.room.phase === "playing") this.revealIfAllDone();
  }

  private findPlayer(id: string): Player | undefined {
    return this.room.players.find((p) => p.id === id);
  }

  private lockIfRequired(player: Player): void {
    if (this.params.requireFocus && !this.answers.has(player.id)) this.locked.add(player.id);
  }

  private schedule(fn: () => void, at: number): void {
    this.stop();
    this.timer = this.clock.setTimer(fn, Math.max(0, at - this.clock.now()));
  }

  private nextQuestion(): void {
    this.index++;
    if (this.index >= this.questions.length) {
      this.finish();
      return;
    }
    const q = this.questions[this.index] as BuiltQuestion;
    this.answers = new Map();
    this.locked = new Set();
    for (const p of this.room.players) p.answered = false;
    this.startsAt = this.clock.now() + this.timing.countdownMs;
    this.endsAt = this.startsAt + this.params.questionSeconds * 1000;
    this.room.phase = "countdown";
    this.events.state();
    this.events.question({
      index: this.index,
      total: this.questions.length,
      kind: q.kind,
      choices: [...q.choices],
      previewUrl: q.song.previewUrl,
      clipOffsetSec: q.clipOffsetSec,
      startsAt: this.startsAt,
      endsAt: this.endsAt,
    });
    this.schedule(() => this.beginPlaying(), this.startsAt);
  }

  private beginPlaying(): void {
    this.room.phase = "playing";
    for (const p of this.room.players) if (!p.focused) this.lockIfRequired(p);
    this.events.state();
    this.schedule(() => this.reveal(), this.endsAt);
    this.revealIfAllDone();
  }

  private revealIfAllDone(): void {
    if (this.room.phase !== "playing") return;
    const done = this.room.players.every((p) => this.answers.has(p.id) || this.locked.has(p.id));
    if (done) this.reveal();
  }

  private reveal(): void {
    if (this.room.phase !== "playing") return;
    const q = this.questions[this.index] as BuiltQuestion;
    this.room.phase = "reveal";
    const results = this.room.players.map((p) => {
      const a = this.answers.get(p.id);
      const delta = a?.delta ?? 0;
      p.score += delta;
      return { playerId: p.id, choiceIndex: a?.choiceIndex ?? null, delta, score: p.score };
    });
    this.events.state();
    this.events.reveal({
      index: this.index,
      correctIndex: q.correctIndex,
      title: q.song.title,
      artist: q.song.artist,
      results,
    });
    this.schedule(() => this.nextQuestion(), this.clock.now() + this.timing.revealMs);
  }

  private finish(): void {
    this.stop();
    this.room.phase = "over";
    for (const p of this.room.players) p.answered = false;
    const ranking = [...this.room.players].sort((a, b) => b.score - a.score).map((p) => ({ ...p }));
    this.events.state();
    this.events.over({ ranking });
  }
}
