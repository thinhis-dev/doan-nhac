import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS, type QuestionPayload, type RoomPhase, type RoomState } from "../../shared/protocol";
import {
  audioReportNeeded,
  type GameAction,
  type GameState,
  gameActive,
  gameReducer,
  initialGameState,
  isHost,
} from "./game-store";

const room = (phase: RoomPhase, mode: "solo" | "party" = "party"): RoomState => ({
  code: "ABCD",
  mode,
  phase,
  hostId: "me",
  players: [{ id: "me", name: "Tôi", avatarId: 1, score: 0, audioReady: true, focused: true, answered: false }],
  params: DEFAULT_PARAMS,
});

const question = (index: number): QuestionPayload => ({
  index,
  total: 2,
  kind: "title",
  choices: ["A", "B", "C", "D"],
  previewUrl: "https://audio-ssl.itunes.apple.com/x.m4a",
  clipOffsetSec: 3,
  startsAt: 1000,
  endsAt: 11000,
});

const run = (actions: GameAction[], start: GameState = initialGameState) => actions.reduce(gameReducer, start);

describe("gameReducer", () => {
  it("party: entry, gate, lobby, game, result, lobby again", () => {
    let s = run([
      { type: "navigate", screen: "party-entry", mode: "party" },
      { type: "joined", playerId: "me", mode: "party" },
      { type: "room-state", room: room("lobby") },
    ]);
    expect(s.screen).toBe("gate");
    s = run([{ type: "audio-confirmed" }], s);
    expect(s.screen).toBe("lobby");
    expect(isHost(s)).toBe(true);

    s = run([{ type: "room-state", room: room("countdown") }], s);
    expect(s.screen).toBe("lobby"); // no question yet
    s = run([{ type: "question", question: question(0) }, { type: "room-state", room: room("playing") }], s);
    expect(s.screen).toBe("question");
    expect(gameActive(s)).toBe(true);

    s = run([{ type: "answer", choiceIndex: 2 }, { type: "answer", choiceIndex: 3 }], s);
    expect(s.myAnswer).toBe(2);

    s = run(
      [
        { type: "room-state", room: room("reveal") },
        {
          type: "reveal",
          reveal: { index: 0, correctIndex: 2, title: "A", artist: "B", results: [{ playerId: "me", choiceIndex: 2, delta: 900, score: 900 }] },
        },
      ],
      s,
    );
    expect(s.correctCount).toBe(1);

    s = run(
      [
        { type: "question", question: question(1) },
        { type: "room-state", room: room("playing") },
        {
          type: "reveal",
          reveal: { index: 1, correctIndex: 0, title: "A", artist: "B", results: [{ playerId: "me", choiceIndex: null, delta: 0, score: 900 }] },
        },
        { type: "room-state", room: room("over") },
        { type: "over", over: { ranking: room("over").players } },
      ],
      s,
    );
    expect(s.myAnswer).toBeNull();
    expect(s.correctCount).toBe(1);
    expect(s.screen).toBe("result");

    s = run([{ type: "room-state", room: room("lobby") }], s);
    expect(s.screen).toBe("lobby");
    expect(s.over).toBeNull();
    expect(s.correctCount).toBe(0);
  });

  it("ignores an answer outside the playing phase", () => {
    const s = run([
      { type: "joined", playerId: "me", mode: "solo" },
      { type: "room-state", room: room("lobby", "solo") },
      { type: "question", question: question(0) },
      { type: "room-state", room: room("countdown", "solo") },
      { type: "answer", choiceIndex: 1 },
    ]);
    expect(s.myAnswer).toBeNull();
  });

  it("solo: the lobby phase shows the setup screen", () => {
    const s = run([
      { type: "navigate", screen: "gate", mode: "solo" },
      { type: "audio-confirmed" },
      { type: "navigate", screen: "solo-setup" },
      { type: "joined", playerId: "me", mode: "solo" },
      { type: "room-state", room: room("lobby", "solo") },
    ]);
    expect(s.screen).toBe("solo-setup");
  });

  it("shows the lost screen on a disconnect inside a room and resets on leave", () => {
    let s = run([
      { type: "joined", playerId: "me", mode: "party" },
      { type: "audio-confirmed" },
      { type: "room-state", room: room("lobby") },
      { type: "disconnected" },
    ]);
    expect(s.screen).toBe("lost");
    s = run([{ type: "room-state", room: room("playing") }], s);
    expect(s.screen).toBe("lost");
    s = run([{ type: "left" }], s);
    expect(s).toMatchObject({ screen: "home", room: null, playerId: null });
  });

  it("does not show lost outside a room", () => {
    expect(run([{ type: "disconnected" }]).screen).toBe("home");
  });
});

describe("audioReportNeeded", () => {
  const notReady = (mode: "solo" | "party" = "party"): RoomState => {
    const r = room("lobby", mode);
    return { ...r, players: r.players.map((p) => ({ ...p, audioReady: false })) };
  };

  it("a player who leaves and joins again skips the gate but still reports readiness", () => {
    let s = run([
      { type: "joined", playerId: "me", mode: "party" },
      { type: "room-state", room: notReady() },
      { type: "audio-confirmed" },
    ]);
    expect(audioReportNeeded(s)).toBe(true);
    s = run([{ type: "room-state", room: room("lobby") }], s);
    expect(audioReportNeeded(s)).toBe(false);

    s = run([{ type: "left" }, { type: "joined", playerId: "me", mode: "party" }, { type: "room-state", room: notReady() }], s);
    expect(s.screen).toBe("lobby");
    expect(audioReportNeeded(s)).toBe(true);
  });

  it("does not report before the gate or in solo", () => {
    const beforeGate = run([{ type: "joined", playerId: "me", mode: "party" }, { type: "room-state", room: notReady() }]);
    expect(audioReportNeeded(beforeGate)).toBe(false);
    const solo = run([
      { type: "audio-confirmed" },
      { type: "joined", playerId: "me", mode: "solo" },
      { type: "room-state", room: notReady("solo") },
    ]);
    expect(audioReportNeeded(solo)).toBe(false);
  });
});
