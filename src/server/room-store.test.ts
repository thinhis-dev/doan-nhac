import { describe, expect, it } from "vitest";
import { CODE_ALPHABET, RoomStore, cleanName } from "./room-store";

function partyWith(count: number) {
  const store = new RoomStore();
  const created = store.create("party", "p0", "Host");
  if (!created.ok) throw new Error("create failed");
  for (let i = 1; i < count; i++) store.join(created.value.code, `p${i}`, `P${i}`);
  return { store, room: created.value };
}

describe("RoomStore", () => {
  it("creates a room with a 4-character code from the alphabet", () => {
    const store = new RoomStore();
    const res = store.create("party", "a", "An");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.code).toMatch(new RegExp(`^[${CODE_ALPHABET}]{4}$`));
    expect(res.value.hostId).toBe("a");
    expect(res.value.phase).toBe("lobby");
  });

  it("joins case-insensitively and allows duplicate names", () => {
    const { store, room } = partyWith(1);
    const res = store.join(room.code.toLowerCase(), "b", "Host");
    expect(res.ok).toBe(true);
    expect(room.players.map((p) => p.name)).toEqual(["Host", "Host"]);
  });

  it("caps a party room at 5 players", () => {
    const { store, room } = partyWith(5);
    expect(store.join(room.code, "p5", "Sixth")).toEqual({ ok: false, error: "ROOM_FULL" });
  });

  it("never lets anyone join a solo room", () => {
    const store = new RoomStore();
    const res = store.create("solo", "s", "Solo");
    if (!res.ok) throw new Error();
    expect(store.join(res.value.code, "x", "X")).toEqual({ ok: false, error: "ROOM_NOT_FOUND" });
  });

  it("rejects an unknown code and a join during a game", () => {
    const { store, room } = partyWith(2);
    expect(store.join("ZZZZ", "x", "X").ok).toBe(false);
    room.phase = "playing";
    expect(store.join(room.code, "x", "X")).toEqual({ ok: false, error: "GAME_RUNNING" });
  });

  it("requires a name, trims it and cuts it to 16 characters", () => {
    const store = new RoomStore();
    expect(store.create("party", "a", "   ")).toEqual({ ok: false, error: "NAME_REQUIRED" });
    expect(cleanName("  Nguyễn Văn Anh Tuấn Dũng  ")).toBe("Nguyễn Văn Anh T");
    expect(cleanName("  Nguyễn Văn Anh Tuấn Dũng  ")).toHaveLength(16);
  });

  it("prefers an avatar that the room does not use", () => {
    const { room } = partyWith(5);
    expect(new Set(room.players.map((p) => p.avatarId)).size).toBe(5);
    expect(room.players.every((p) => p.avatarId >= 0 && p.avatarId <= 11)).toBe(true);
  });

  it("moves the host to the earliest joined player", () => {
    const { store, room } = partyWith(3);
    store.leave("p0");
    expect(room.hostId).toBe("p1");
    store.leave("p2");
    expect(room.hostId).toBe("p1");
  });

  it("deletes an empty room", () => {
    const { store, room } = partyWith(1);
    expect(store.leave("p0")).toEqual({ room, deleted: true });
    expect(store.get(room.code)).toBeUndefined();
    expect(store.size).toBe(0);
  });

  it("limits the number of rooms", () => {
    const store = new RoomStore(Math.random, 2);
    store.create("party", "a", "A");
    store.create("solo", "b", "B");
    expect(store.create("party", "c", "C")).toEqual({ ok: false, error: "SERVER_FULL" });
  });
});
