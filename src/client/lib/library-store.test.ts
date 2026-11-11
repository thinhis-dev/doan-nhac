import { describe, expect, it } from "vitest";
import { serializeSongsCsv } from "../../shared/csv";
import type { Song } from "../../shared/song";
import { LibraryStore, STORAGE_KEY, type StorageLike } from "./library-store";

const song = (id: number, over: Partial<Song> = {}): Song => ({
  trackId: id,
  title: `Bài số ${id} — Đường về`,
  artist: "Ễ Ữ Ặ",
  releaseYear: 2010,
  decade: "2010s",
  itunesGenre: "Pop",
  tags: ["V-pop"],
  lists: [],
  previewUrl: `https://audio-ssl.itunes.apple.com/${id}.m4a`,
  enabled: true,
  ...over,
});

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  fail = false;
  getItem = (k: string) => this.data.get(k) ?? null;
  setItem = (k: string, v: string) => {
    if (this.fail) throw new Error("QuotaExceededError");
    this.data.set(k, v);
  };
  removeItem = (k: string) => void this.data.delete(k);
}

const defaults = [song(1), song(2), song(3)];

async function makeStore(storage = new MemoryStorage()) {
  let fetches = 0;
  const store = new LibraryStore(storage, async () => {
    fetches++;
    return { ok: true, text: async () => serializeSongsCsv(defaults) };
  });
  await store.load();
  return { store, storage, fetches: () => fetches };
}

describe("LibraryStore", () => {
  it("copies the default CSV into storage on the first visit", async () => {
    const { store, storage } = await makeStore();
    expect(store.getSnapshot().songs).toEqual(defaults);
    expect(storage.data.has(STORAGE_KEY)).toBe(true);
  });

  it("reads storage on a later visit without fetching", async () => {
    const first = await makeStore();
    first.store.remove(1);
    const second = await makeStore(first.storage);
    expect(second.fetches()).toBe(0);
    expect(second.store.getSnapshot().songs.map((s) => s.trackId)).toEqual([2, 3]);
  });

  it("adds, updates and deletes songs", async () => {
    const { store } = await makeStore();
    store.add(song(9));
    store.add(song(9));
    expect(store.getSnapshot().songs.map((s) => s.trackId)).toEqual([9, 1, 2, 3]);
    store.updateSong(song(2, { title: "Mới", enabled: false }));
    expect(store.getSnapshot().songs.find((s) => s.trackId === 2)).toMatchObject({ title: "Mới", enabled: false });
    store.remove(9);
    expect(store.has(9)).toBe(false);
  });

  it("merge import: imported rows win and new rows are added", async () => {
    const { store } = await makeStore();
    store.importSongs([song(2, { title: "Từ tệp" }), song(7)], "merge");
    expect(store.getSnapshot().songs.map((s) => [s.trackId, s.title])).toEqual([
      [1, song(1).title],
      [2, "Từ tệp"],
      [3, song(3).title],
      [7, song(7).title],
    ]);
  });

  it("export then replace import gives an identical library", async () => {
    const { store } = await makeStore();
    store.updateSong(song(1, { lists: ["Tiệc tùng"], tags: ["Ballad", "Bolero"] }));
    const before = store.getSnapshot().songs;
    const parsed = store.parseImport(store.exportCsv());
    if (!parsed.ok) throw new Error("parse failed");
    store.importSongs([], "replace");
    store.importSongs(parsed.songs, "replace");
    expect(store.getSnapshot().songs).toEqual(before);
  });

  it("a malformed CSV is reported and changes nothing", async () => {
    const { store } = await makeStore();
    const res = store.parseImport("trackId,title,artist,previewUrl\nabc,x,y,z\n");
    expect(res).toEqual({ ok: false, error: { row: 2, message: "trackId is not a number" } });
    expect(store.getSnapshot().songs).toEqual(defaults);
  });

  it("reset drops local edits", async () => {
    const { store } = await makeStore();
    store.remove(1);
    expect(await store.reset()).toBe(true);
    expect(store.getSnapshot().songs).toEqual(defaults);
  });

  it("keeps edits in memory when storage fails", async () => {
    const storage = new MemoryStorage();
    const { store } = await makeStore(storage);
    storage.fail = true;
    expect(store.remove(1)).toBe(false);
    expect(store.getSnapshot().storageOk).toBe(false);
    expect(store.has(1)).toBe(false);
  });
});
