import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { io as connect, type Socket } from "socket.io-client";
import {
  type ClientToServerEvents,
  DEFAULT_PARAMS,
  type GameOverPayload,
  type PoolSong,
  type QuestionPayload,
  type RevealPayload,
  type RoomState,
  type ServerToClientEvents,
} from "../shared/protocol";
import { createApp } from "./app";

type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const pool: PoolSong[] = Array.from({ length: 8 }, (_, i) => ({
  trackId: i + 1,
  title: `Bài hát số ${i + 1}`,
  artist: `Ca sĩ ${String.fromCharCode(65 + i)}`,
  previewUrl: `https://audio-ssl.itunes.apple.com/p${i + 1}.m4a`,
}));

let url = "";
let close: () => Promise<void>;
const sockets: ClientSocket[] = [];

beforeAll(async () => {
  const { app } = await createApp({
    clientDir: "/nonexistent",
    handlers: { timing: { countdownMs: 30, revealMs: 30 }, refresh: async (s) => s, graceMs: 150 },
  });
  await app.listen({ port: 0, host: "127.0.0.1" });
  url = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
  close = () => app.close();
});

afterAll(async () => {
  for (const s of sockets) s.close();
  await close();
});

async function client(): Promise<ClientSocket> {
  const s: ClientSocket = connect(url, { transports: ["websocket"], forceNew: true });
  sockets.push(s);
  await new Promise<void>((r) => s.once("connect", () => r()));
  return s;
}

// biome-ignore lint: test helper for typed emit with ack
function call<T>(s: ClientSocket, event: keyof ClientToServerEvents, payload: unknown): Promise<T> {
  return new Promise((resolve) => (s.emit as (...a: unknown[]) => void)(event, payload, resolve));
}

function nextState(s: ClientSocket, pred: (st: RoomState) => boolean): Promise<RoomState> {
  return new Promise((resolve) => {
    const h = (st: RoomState) => {
      if (pred(st)) {
        s.off("room:state", h);
        resolve(st);
      }
    };
    s.on("room:state", h);
  });
}

describe("socket handlers", () => {
  it("plays a full 4-question game with two players", async () => {
    const host = await client();
    const guest = await client();
    const created = await call<{ ok: true; code: string; playerId: string }>(host, "room:create", { name: "Chủ phòng", mode: "party" });
    expect(created.ok).toBe(true);
    const joined = await call<{ ok: true; playerId: string; token: string }>(guest, "room:join", { code: created.code.toLowerCase(), name: "Khách" });
    expect(joined).toEqual({ ok: true, playerId: expect.any(String), token: expect.any(String) });
    const hostId = created.playerId;
    const guestId = joined.playerId;

    // The start stays locked until every player has sound.
    await call(host, "player:audio", { ready: true });
    // A pool of 4 songs with 5 questions requested gives one question per song.
    const params = { ...DEFAULT_PARAMS, questionCount: 5 as const, questionSeconds: 5 as const };
    const gamePool = pool.slice(0, 4);
    expect(await call(host, "game:start", { params, pool: gamePool })).toEqual({ ok: false, error: "AUDIO_NOT_READY" });
    await call(guest, "player:audio", { ready: true });
    expect(await call(guest, "game:start", { params, pool: gamePool })).toEqual({ ok: false, error: "NOT_HOST" });

    const reveals: RevealPayload[] = [];
    const questions: QuestionPayload[] = [];
    const over = new Promise<GameOverPayload>((r) => host.once("game:over", r));
    host.on("game:reveal", (r) => reveals.push(r));

    const answerAll = (q: QuestionPayload) => {
      questions.push(q);
      const song = pool.find((p) => p.previewUrl === q.previewUrl) as PoolSong;
      const right = q.choices.indexOf(q.kind === "title" ? song.title : song.artist);
      const wait = Math.max(0, q.startsAt - Date.now()) + 5;
      setTimeout(() => {
        void call(host, "game:answer", { questionIndex: q.index, choiceIndex: right });
        void call(guest, "game:answer", { questionIndex: q.index, choiceIndex: (right + 1) % 4 });
      }, wait);
    };
    host.on("game:question", answerAll);

    // A join during the game fails.
    const late = await client();
    expect(await call(host, "game:start", { params, pool: gamePool })).toEqual({ ok: true });
    expect(await call(late, "room:join", { code: created.code, name: "Muộn" })).toEqual({ ok: false, error: "GAME_RUNNING" });

    const result = await over;
    expect(questions).toHaveLength(4);
    expect(new Set(questions.map((q) => q.previewUrl)).size).toBe(4);
    expect(questions.every((q) => !("correctIndex" in q))).toBe(true);
    expect(reveals).toHaveLength(4);

    const hostDeltas = reveals.map((r) => r.results.find((x) => x.playerId === hostId)?.delta ?? NaN);
    expect(hostDeltas.every((d) => d > 500 && d <= 1000)).toBe(true);
    const expectedHost = hostDeltas.reduce((a, b) => a + b, 0);
    expect(result.ranking.map((p) => [p.id, p.score])).toEqual([
      [hostId, expectedHost],
      [guestId, 0],
    ]);

    // Back to the lobby with scores reset.
    const lobby = nextState(guest, (s) => s.phase === "lobby");
    expect(await call(host, "game:again", {})).toEqual({ ok: true });
    expect((await lobby).players.every((p) => p.score === 0)).toBe(true);
  });

  it("returns ROOM_FULL for a sixth player", async () => {
    const host = await client();
    const { code } = await call<{ code: string }>(host, "room:create", { name: "H", mode: "party" });
    for (let i = 0; i < 4; i++) expect((await call<{ ok: boolean }>(await client(), "room:join", { code, name: `P${i}` })).ok).toBe(true);
    expect(await call(await client(), "room:join", { code, name: "Sáu" })).toEqual({ ok: false, error: "ROOM_FULL" });
  });

  it("rejects a pool with a non-Apple preview URL and a bad payload", async () => {
    const solo = await client();
    await call(solo, "room:create", { name: "Solo", mode: "solo" });
    const evil = pool.map((p, i) => (i === 0 ? { ...p, previewUrl: "https://evil.example/a.m4a" } : p));
    expect(await call(solo, "game:start", { params: DEFAULT_PARAMS, pool: evil })).toEqual({ ok: false, error: "BAD_PAYLOAD" });
    expect(await call(solo, "game:start", { params: { questionCount: 7 }, pool })).toEqual({ ok: false, error: "BAD_PAYLOAD" });
    expect(await call(solo, "game:start", { params: DEFAULT_PARAMS, pool: pool.slice(0, 3) })).toEqual({ ok: false, error: "POOL_TOO_SMALL" });
  });

  it("starts a solo game without a sound confirmation", async () => {
    const solo = await client();
    await call(solo, "room:create", { name: "Solo", mode: "solo" });
    const q = new Promise<QuestionPayload>((r) => solo.once("game:question", r));
    expect(await call(solo, "game:start", { params: { ...DEFAULT_PARAMS, questionCount: 5 }, pool })).toEqual({ ok: true });
    expect((await q).total).toBe(5);
  });

  it("holds the seat of a disconnected host, then moves the host when the grace period ends", async () => {
    const host = await client();
    const guest = await client();
    const { code } = await call<{ code: string }>(host, "room:create", { name: "H", mode: "party" });
    const { playerId: guestId } = await call<{ playerId: string }>(guest, "room:join", { code, name: "G" });
    const offline = nextState(guest, (s) => s.players.some((p) => !p.connected));
    const moved = nextState(guest, (s) => s.players.length === 1);
    host.close();
    expect((await offline).players).toHaveLength(2);
    expect((await moved).hostId).toBe(guestId);
  });

  it("lets a player rejoin a running game with the token and catch up", async () => {
    const host = await client();
    const guest = await client();
    const created = await call<{ code: string; playerId: string }>(host, "room:create", { name: "H", mode: "party" });
    const joined = await call<{ playerId: string; token: string }>(guest, "room:join", { code: created.code, name: "G" });
    await call(host, "player:audio", { ready: true });
    await call(guest, "player:audio", { ready: true });
    const firstQuestion = new Promise<QuestionPayload>((r) => host.once("game:question", r));
    const params = { ...DEFAULT_PARAMS, questionCount: 5 as const, questionSeconds: 5 as const };
    expect(await call(host, "game:start", { params, pool: pool.slice(0, 4) })).toEqual({ ok: true });
    const q = await firstQuestion;

    const offline = nextState(host, (s) => s.players.some((p) => !p.connected));
    guest.close();
    await offline;

    const back = await client();
    const caughtUp = new Promise<QuestionPayload>((r) => back.once("game:question", r));
    const online = nextState(host, (s) => s.players.length === 2 && s.players.every((p) => p.connected));
    expect(await call(back, "room:resume", { token: joined.token })).toEqual({
      ok: true,
      playerId: joined.playerId,
      code: created.code,
      mode: "party",
    });
    expect((await caughtUp).index).toBe(q.index);
    const state = await online;
    // The page reports sound again after a rejoin.
    expect(state.players.find((p) => p.id === joined.playerId)?.audioReady).toBe(false);

    // The grace timer is cancelled: the player stays well past the grace period.
    await new Promise((r) => setTimeout(r, 300));
    expect(await call(back, "game:answer", { questionIndex: 99, choiceIndex: 0 })).toEqual({ ok: false, error: "BAD_PAYLOAD" });
    expect(await call(back, "player:focus", { focused: true })).toEqual({ ok: true });
  });

  it("moves the seat to the newest socket and rejects an unknown token", async () => {
    const host = await client();
    const created = await call<{ code: string; playerId: string; token: string }>(host, "room:create", { name: "H", mode: "party" });
    const second = await client();
    const kicked = new Promise<string>((r) => host.once("disconnect", r));
    expect(await call(second, "room:resume", { token: created.token })).toMatchObject({ ok: true, playerId: created.playerId });
    expect(await kicked).toBe("io server disconnect");
    // The kicked socket does not start the grace timer: the seat stays.
    await new Promise((r) => setTimeout(r, 300));
    expect(await call(second, "player:focus", { focused: true })).toEqual({ ok: true });
    expect(await call(second, "room:resume", { token: "nope" })).toEqual({ ok: false, error: "ROOM_NOT_FOUND" });
  });

  it("drops the token on leave", async () => {
    const host = await client();
    const created = await call<{ token: string }>(host, "room:create", { name: "H", mode: "party" });
    await call(host, "room:leave", {});
    expect(await call(await client(), "room:resume", { token: created.token })).toEqual({ ok: false, error: "ROOM_NOT_FOUND" });
  });

  it("answers time pings with the server time", async () => {
    const s = await client();
    const before = Date.now();
    const res = await call<{ serverTime: number }>(s, "time:ping", { clientTime: before });
    expect(res.serverTime).toBeGreaterThanOrEqual(before);
  });
});
