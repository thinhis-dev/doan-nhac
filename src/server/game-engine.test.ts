import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_PARAMS,
  type GameOverPayload,
  type GameParams,
  type PoolSong,
  type QuestionPayload,
  type RevealPayload,
} from "../shared/protocol";
import { type EngineClock, GameEngine } from "./game-engine";
import { RoomStore, type Room } from "./room-store";

class FakeClock implements EngineClock {
  t = 1_000_000;
  private timers: { at: number; fn: () => void; id: number }[] = [];
  private nextId = 1;
  now = () => this.t;
  setTimer = (fn: () => void, ms: number) => {
    const id = this.nextId++;
    this.timers.push({ at: this.t + ms, fn, id });
    return id;
  };
  clearTimer = (h: unknown) => {
    this.timers = this.timers.filter((t) => t.id !== h);
  };
  advance(ms: number) {
    const target = this.t + ms;
    for (;;) {
      this.timers.sort((a, b) => a.at - b.at);
      const next = this.timers[0];
      if (!next || next.at > target) break;
      this.timers.shift();
      this.t = next.at;
      next.fn();
    }
    this.t = target;
  }
}

const pool: PoolSong[] = ["A", "B", "C", "D", "E", "F"].map((t, i) => ({
  trackId: i + 1,
  title: `Bài ${t}`,
  artist: `Ca sĩ ${t}`,
  previewUrl: `https://audio-ssl.itunes.apple.com/${i}.m4a`,
}));

type Log = { phases: string[]; questions: QuestionPayload[]; reveals: RevealPayload[]; over?: GameOverPayload };

function setup(players = 2, params: Partial<GameParams> = {}) {
  const store = new RoomStore();
  const res = store.create("party", "p0", "Host");
  if (!res.ok) throw new Error();
  const room: Room = res.value;
  for (let i = 1; i < players; i++) store.join(room.code, `p${i}`, `P${i}`);
  const clock = new FakeClock();
  const log: Log = { phases: [], questions: [], reveals: [] };
  const engine = new GameEngine(
    room,
    {
      question: (q) => log.questions.push(q),
      reveal: (r) => log.reveals.push(r),
      over: (o) => (log.over = o),
      state: () => {
        if (log.phases.at(-1) !== room.phase) log.phases.push(room.phase);
      },
    },
    clock,
    Math.random,
    { countdownMs: 3000, revealMs: 4000 },
  );
  const p: GameParams = { ...DEFAULT_PARAMS, questionCount: 5, questionSeconds: 10, ...params };
  return { store, room, clock, log, engine, params: p };
}

function correct(log: Log, i: number) {
  return log.reveals[i]?.correctIndex;
}

describe("GameEngine", () => {
  let ctx: ReturnType<typeof setup>;
  beforeEach(() => {
    ctx = setup();
  });

  it("runs countdown, playing, reveal for each question, then over", () => {
    const { engine, clock, log, params, room } = ctx;
    engine.start(params, pool.slice(0, 2), pool);
    expect(room.phase).toBe("countdown");
    const q0 = log.questions[0] as QuestionPayload;
    expect(q0.startsAt).toBe(clock.t + 3000);
    expect(q0.endsAt).toBe(q0.startsAt + 10_000);
    expect(q0).not.toHaveProperty("correctIndex");
    clock.advance(3000);
    expect(room.phase).toBe("playing");
    clock.advance(10_000);
    expect(room.phase).toBe("reveal");
    clock.advance(4000);
    expect(room.phase).toBe("countdown");
    clock.advance(17_000);
    expect(room.phase).toBe("over");
    expect(log.phases).toEqual(["countdown", "playing", "reveal", "countdown", "playing", "reveal", "over"]);
    expect(log.questions.map((q) => q.total)).toEqual([2, 2]);
  });

  it("reveals early when every player answered and scores by server time", () => {
    const { engine, clock, log, params, room } = ctx;
    engine.start(params, pool.slice(0, 1), pool);
    clock.advance(3000);
    clock.advance(5000); // half time
    const q = log.questions[0] as QuestionPayload;
    const target = pool[0] as PoolSong;
    const rightIdx = q.choices.indexOf(q.kind === "title" ? target.title : target.artist);
    engine.answer("p0", 0, rightIdx);
    expect(room.phase).toBe("playing");
    engine.answer("p1", 0, (rightIdx + 1) % 4);
    expect(room.phase).toBe("reveal");
    expect(correct(log, 0)).toBe(rightIdx);
    expect(log.reveals[0]?.results).toEqual([
      { playerId: "p0", choiceIndex: rightIdx, delta: 750, score: 750 },
      { playerId: "p1", choiceIndex: (rightIdx + 1) % 4, delta: 0, score: 0 },
    ]);
  });

  it("applies the wrong-answer penalty when on", () => {
    const { engine, clock, log, room } = ctx;
    engine.start({ ...ctx.params, wrongPenalty: true }, pool.slice(0, 1), pool);
    clock.advance(3000);
    const q = log.questions[0] as QuestionPayload;
    const target = pool[0] as PoolSong;
    const rightIdx = q.choices.indexOf(q.kind === "title" ? target.title : target.artist);
    engine.answer("p0", 0, (rightIdx + 1) % 4);
    clock.advance(10_000);
    expect(room.players[0]?.score).toBe(-250);
    expect(log.reveals[0]?.results[1]).toEqual({ playerId: "p1", choiceIndex: null, delta: 0, score: 0 });
  });

  it("keeps the first answer and ignores answers outside playing or for another index", () => {
    const { engine, clock, params } = ctx;
    engine.start(params, pool.slice(0, 2), pool);
    expect(engine.answer("p0", 0, 0)).toBe(false); // countdown
    clock.advance(3000);
    expect(engine.answer("p0", 1, 0)).toBe(false); // wrong index
    expect(engine.answer("p0", 0, 9)).toBe(false); // bad choice
    expect(engine.answer("p0", 0, 0)).toBe(true);
    expect(engine.answer("p0", 0, 1)).toBe(false); // second answer
  });

  it("locks a player who loses focus during playing when the rule is on", () => {
    const { engine, clock, room, log } = ctx;
    engine.start({ ...ctx.params, requireFocus: true }, pool.slice(0, 1), pool);
    clock.advance(3000);
    engine.setFocus("p1", false);
    expect(room.players[1]?.focused).toBe(false);
    expect(engine.answer("p1", 0, 0)).toBe(false);
    engine.answer("p0", 0, 0);
    // p0 answered and p1 is locked: early reveal.
    expect(room.phase).toBe("reveal");
    expect(log.reveals[0]?.results[1]?.delta).toBe(0);
  });

  it("locks a player who is already away when playing starts", () => {
    const { engine, clock } = ctx;
    engine.start({ ...ctx.params, requireFocus: true }, pool.slice(0, 1), pool);
    engine.setFocus("p1", false);
    clock.advance(3000);
    expect(engine.answer("p1", 0, 0)).toBe(false);
  });

  it("does not lock on focus loss when the rule is off", () => {
    const { engine, clock } = ctx;
    engine.start(ctx.params, pool.slice(0, 1), pool);
    clock.advance(3000);
    engine.setFocus("p1", false);
    expect(engine.answer("p1", 0, 0)).toBe(true);
  });

  it("reveals when the only player who did not answer leaves", () => {
    const { engine, clock, store, room } = ctx;
    engine.start(ctx.params, pool.slice(0, 1), pool);
    clock.advance(3000);
    engine.answer("p0", 0, 0);
    store.leave("p1");
    engine.playerLeft("p1");
    expect(room.phase).toBe("reveal");
  });

  it("ranks players by score at the end", () => {
    const { engine, clock, log } = ctx;
    engine.start(ctx.params, pool.slice(0, 1), pool);
    clock.advance(3000);
    const q = log.questions[0] as QuestionPayload;
    const target = pool[0] as PoolSong;
    const rightIdx = q.choices.indexOf(q.kind === "title" ? target.title : target.artist);
    engine.answer("p1", 0, rightIdx);
    clock.advance(20_000);
    expect(log.over?.ranking.map((p) => p.id)).toEqual(["p1", "p0"]);
  });
});
