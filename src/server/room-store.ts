import { AVATAR_COUNT, MAX_PLAYERS, MAX_ROOMS, NAME_MAX } from "../shared/game-rules";
import {
  DEFAULT_PARAMS,
  type ErrorCode,
  type GameParams,
  type Player,
  type RoomMode,
  type RoomPhase,
  type RoomState,
} from "../shared/protocol";
import type { Rng } from "./question-builder";

export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 4;

export type Room = {
  code: string;
  mode: RoomMode;
  hostId: string;
  /** In join order. The first player becomes host when the host leaves. */
  players: Player[];
  phase: RoomPhase;
  params: GameParams;
};

export type StoreResult<T> = { ok: true; value: T } | { ok: false; error: ErrorCode };

export function capacityOf(mode: RoomMode): number {
  return mode === "solo" ? 1 : MAX_PLAYERS;
}

export function cleanName(name: string): string {
  return [...name.trim()].slice(0, NAME_MAX).join("").trim();
}

export function toRoomState(room: Room): RoomState {
  return {
    code: room.code,
    mode: room.mode,
    phase: room.phase,
    hostId: room.hostId,
    players: room.players.map((p) => ({ ...p })),
    params: { ...room.params },
  };
}

export class RoomStore {
  private readonly rooms = new Map<string, Room>();
  private readonly roomByPlayer = new Map<string, string>();

  constructor(
    private readonly rng: Rng = Math.random,
    private readonly maxRooms = MAX_ROOMS,
  ) {}

  get size(): number {
    return this.rooms.size;
  }

  get(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  roomOf(playerId: string): Room | undefined {
    const code = this.roomByPlayer.get(playerId);
    return code ? this.rooms.get(code) : undefined;
  }

  create(mode: RoomMode, playerId: string, rawName: string): StoreResult<Room> {
    const name = cleanName(rawName);
    if (!name) return { ok: false, error: "NAME_REQUIRED" };
    if (this.rooms.size >= this.maxRooms) return { ok: false, error: "SERVER_FULL" };
    const room: Room = {
      code: this.newCode(),
      mode,
      hostId: playerId,
      players: [],
      phase: "lobby",
      params: { ...DEFAULT_PARAMS },
    };
    this.rooms.set(room.code, room);
    this.addPlayer(room, playerId, name);
    return { ok: true, value: room };
  }

  join(rawCode: string, playerId: string, rawName: string): StoreResult<Room> {
    const name = cleanName(rawName);
    if (!name) return { ok: false, error: "NAME_REQUIRED" };
    const room = this.get(rawCode.trim());
    // A solo room has a code but never accepts a join.
    if (!room || room.mode === "solo") return { ok: false, error: "ROOM_NOT_FOUND" };
    if (room.phase !== "lobby") return { ok: false, error: "GAME_RUNNING" };
    if (room.players.length >= capacityOf(room.mode)) return { ok: false, error: "ROOM_FULL" };
    this.addPlayer(room, playerId, name);
    return { ok: true, value: room };
  }

  /** Removes a player. Returns the room and whether it was deleted. */
  leave(playerId: string): { room: Room; deleted: boolean } | undefined {
    const room = this.roomOf(playerId);
    if (!room) return undefined;
    this.roomByPlayer.delete(playerId);
    room.players = room.players.filter((p) => p.id !== playerId);
    if (room.players.length === 0) {
      this.rooms.delete(room.code);
      return { room, deleted: true };
    }
    if (room.hostId === playerId) room.hostId = (room.players[0] as Player).id;
    return { room, deleted: false };
  }

  private addPlayer(room: Room, playerId: string, name: string): Player {
    const player: Player = {
      id: playerId,
      name,
      avatarId: this.pickAvatar(room),
      score: 0,
      audioReady: false,
      focused: true,
      answered: false,
      connected: true,
    };
    room.players.push(player);
    this.roomByPlayer.set(playerId, room.code);
    return player;
  }

  private pickAvatar(room: Room): number {
    const used = new Set(room.players.map((p) => p.avatarId));
    const free = Array.from({ length: AVATAR_COUNT }, (_, i) => i).filter((i) => !used.has(i));
    const choices = free.length > 0 ? free : Array.from({ length: AVATAR_COUNT }, (_, i) => i);
    return choices[Math.floor(this.rng() * choices.length)] as number;
  }

  private newCode(): string {
    for (;;) {
      let code = "";
      for (let i = 0; i < CODE_LENGTH; i++) {
        code += CODE_ALPHABET[Math.floor(this.rng() * CODE_ALPHABET.length)];
      }
      if (!this.rooms.has(code)) return code;
    }
  }
}
