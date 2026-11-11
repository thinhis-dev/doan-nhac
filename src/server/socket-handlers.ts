import { z } from "zod";
import { NAME_MAX, POOL_MAX, POOL_MIN, TEXT_MAX } from "../shared/game-rules";
import type { Ack, ErrorCode, GameParams, PoolSong } from "../shared/protocol";
import type { GameIo } from "./app";
import { type EngineClock, type EngineTiming, GameEngine, realClock } from "./game-engine";
import { isApplePreviewUrl, refreshPreviews } from "./preview-refresh";
import { pickSongs, poolHasEnoughTitles, type Rng } from "./question-builder";
import { type Room, RoomStore, toRoomState } from "./room-store";

const seconds = z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(20)]);
const paramsSchema = z.object({
  questionCount: seconds,
  questionSeconds: seconds,
  wrongPenalty: z.boolean(),
  requireFocus: z.boolean(),
});
const poolSongSchema = z.object({
  trackId: z.number().int().positive(),
  title: z.string().min(1).max(TEXT_MAX),
  artist: z.string().min(1).max(TEXT_MAX),
  previewUrl: z.string().max(1000).refine(isApplePreviewUrl),
});

const schemas = {
  create: z.object({ name: z.string().max(NAME_MAX * 8), mode: z.enum(["solo", "party"]) }),
  join: z.object({ code: z.string().max(16), name: z.string().max(NAME_MAX * 8) }),
  params: z.object({ params: paramsSchema }),
  audio: z.object({ ready: z.boolean() }),
  focus: z.object({ focused: z.boolean() }),
  start: z.object({ params: paramsSchema, pool: z.array(poolSongSchema).max(POOL_MAX) }),
  answer: z.object({ questionIndex: z.number().int().min(0), choiceIndex: z.number().int().min(0).max(3) }),
  ping: z.object({ clientTime: z.number() }),
};

export type HandlerDeps = {
  store?: RoomStore;
  clock?: EngineClock;
  rng?: Rng;
  timing?: EngineTiming;
  refresh?: (songs: PoolSong[]) => Promise<PoolSong[]>;
};

type AnyAck = (res: Ack<Record<string, unknown>>) => void;

function safeAck(ack: unknown): AnyAck {
  return typeof ack === "function" ? (ack as AnyAck) : () => {};
}

function fail(ack: AnyAck, error: ErrorCode) {
  ack({ ok: false, error });
}

export function registerSocketHandlers(io: GameIo, deps: HandlerDeps = {}) {
  const store = deps.store ?? new RoomStore(deps.rng);
  const clock = deps.clock ?? realClock;
  const rng = deps.rng ?? Math.random;
  const refresh = deps.refresh ?? ((songs: PoolSong[]) => refreshPreviews(songs));
  const engines = new Map<string, GameEngine>();
  const starting = new Set<string>();

  const broadcast = (room: Room) => io.to(room.code).emit("room:state", toRoomState(room));

  const engineFor = (room: Room): GameEngine => {
    let engine = engines.get(room.code);
    if (!engine) {
      engine = new GameEngine(
        room,
        {
          question: (q) => io.to(room.code).emit("game:question", q),
          reveal: (r) => io.to(room.code).emit("game:reveal", r),
          over: (o) => io.to(room.code).emit("game:over", o),
          state: () => broadcast(room),
        },
        clock,
        rng,
        deps.timing,
      );
      engines.set(room.code, engine);
    }
    return engine;
  };

  io.on("connection", (socket) => {
    const playerId = socket.id;

    const leaveCurrent = () => {
      const res = store.leave(playerId);
      if (!res) return;
      void socket.leave(res.room.code);
      const engine = engines.get(res.room.code);
      if (res.deleted) {
        engine?.stop();
        engines.delete(res.room.code);
        starting.delete(res.room.code);
        return;
      }
      engine?.playerLeft(playerId);
      broadcast(res.room);
    };

    const hostRoom = (ack: AnyAck): Room | undefined => {
      const room = store.roomOf(playerId);
      if (!room) return fail(ack, "ROOM_NOT_FOUND"), undefined;
      if (room.hostId !== playerId) return fail(ack, "NOT_HOST"), undefined;
      return room;
    };

    socket.on("room:create", (payload, rawAck) => {
      const ack = safeAck(rawAck);
      const parsed = schemas.create.safeParse(payload);
      if (!parsed.success) return fail(ack, "BAD_PAYLOAD");
      leaveCurrent();
      const res = store.create(parsed.data.mode, playerId, parsed.data.name);
      if (!res.ok) return fail(ack, res.error);
      void socket.join(res.value.code);
      ack({ ok: true, code: res.value.code, playerId });
      broadcast(res.value);
    });

    socket.on("room:join", (payload, rawAck) => {
      const ack = safeAck(rawAck);
      const parsed = schemas.join.safeParse(payload);
      if (!parsed.success) return fail(ack, "BAD_PAYLOAD");
      const code = parsed.data.code.trim().toUpperCase();
      if (store.roomOf(playerId)?.code === code) return fail(ack, "BAD_PAYLOAD");
      if (starting.has(code)) return fail(ack, "GAME_RUNNING");
      const target = store.get(code);
      leaveCurrent();
      if (!target) return fail(ack, "ROOM_NOT_FOUND");
      const res = store.join(code, playerId, parsed.data.name);
      if (!res.ok) return fail(ack, res.error);
      void socket.join(res.value.code);
      ack({ ok: true, playerId });
      broadcast(res.value);
    });

    socket.on("room:leave", (_payload, rawAck) => {
      leaveCurrent();
      safeAck(rawAck)({ ok: true });
    });

    socket.on("room:params", (payload, rawAck) => {
      const ack = safeAck(rawAck);
      const parsed = schemas.params.safeParse(payload);
      if (!parsed.success) return fail(ack, "BAD_PAYLOAD");
      const room = hostRoom(ack);
      if (!room) return;
      if (room.phase !== "lobby" && room.phase !== "over") return fail(ack, "GAME_RUNNING");
      room.params = parsed.data.params as GameParams;
      ack({ ok: true });
      broadcast(room);
    });

    socket.on("player:audio", (payload, rawAck) => {
      const ack = safeAck(rawAck);
      const parsed = schemas.audio.safeParse(payload);
      if (!parsed.success) return fail(ack, "BAD_PAYLOAD");
      const room = store.roomOf(playerId);
      const player = room?.players.find((p) => p.id === playerId);
      if (!room || !player) return fail(ack, "ROOM_NOT_FOUND");
      player.audioReady = parsed.data.ready;
      ack({ ok: true });
      broadcast(room);
    });

    socket.on("player:focus", (payload, rawAck) => {
      const ack = safeAck(rawAck);
      const parsed = schemas.focus.safeParse(payload);
      if (!parsed.success) return fail(ack, "BAD_PAYLOAD");
      const room = store.roomOf(playerId);
      if (!room) return fail(ack, "ROOM_NOT_FOUND");
      engineFor(room).setFocus(playerId, parsed.data.focused);
      ack({ ok: true });
    });

    socket.on("game:start", async (payload, rawAck) => {
      const ack = safeAck(rawAck);
      const parsed = schemas.start.safeParse(payload);
      if (!parsed.success) return fail(ack, "BAD_PAYLOAD");
      const room = hostRoom(ack);
      if (!room) return;
      if (room.phase !== "lobby" || starting.has(room.code)) return fail(ack, "GAME_RUNNING");
      if (room.mode === "party" && room.players.some((p) => !p.audioReady)) return fail(ack, "AUDIO_NOT_READY");
      const pool = parsed.data.pool;
      if (pool.length < POOL_MIN || !poolHasEnoughTitles(pool)) return fail(ack, "POOL_TOO_SMALL");
      const params = parsed.data.params as GameParams;

      starting.add(room.code);
      const picked = await refresh(pickSongs(pool, params.questionCount, rng));
      starting.delete(room.code);
      // The room can empty or change host during the lookup.
      if (store.get(room.code) !== room || room.hostId !== playerId) return fail(ack, "ROOM_NOT_FOUND");
      ack({ ok: true });
      engineFor(room).start(params, picked, pool);
    });

    socket.on("game:answer", (payload, rawAck) => {
      const ack = safeAck(rawAck);
      const parsed = schemas.answer.safeParse(payload);
      if (!parsed.success) return fail(ack, "BAD_PAYLOAD");
      const room = store.roomOf(playerId);
      if (!room) return fail(ack, "ROOM_NOT_FOUND");
      const accepted = engineFor(room).answer(playerId, parsed.data.questionIndex, parsed.data.choiceIndex);
      ack(accepted ? { ok: true } : { ok: false, error: "BAD_PAYLOAD" });
    });

    socket.on("game:again", (_payload, rawAck) => {
      const ack = safeAck(rawAck);
      const room = hostRoom(ack);
      if (!room) return;
      if (room.phase !== "over" && room.phase !== "lobby") return fail(ack, "GAME_RUNNING");
      room.phase = "lobby";
      for (const p of room.players) {
        p.score = 0;
        p.answered = false;
      }
      ack({ ok: true });
      broadcast(room);
    });

    socket.on("time:ping", (payload, rawAck) => {
      if (typeof rawAck !== "function") return;
      if (!schemas.ping.safeParse(payload).success) return;
      rawAck({ serverTime: clock.now() });
    });

    socket.on("disconnect", leaveCurrent);
  });

  return { store, engines };
}
