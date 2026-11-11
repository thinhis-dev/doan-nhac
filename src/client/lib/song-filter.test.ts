import { describe, expect, it } from "vitest";
import type { Song } from "../../shared/song";
import { filterSongs, poolIsPlayable, sourceOptions, toPool } from "./song-filter";

const song = (id: number, over: Partial<Song>): Song => ({
  trackId: id,
  title: `Bài ${id}`,
  artist: "Đen",
  releaseYear: 2020,
  decade: "2020s",
  itunesGenre: "Pop",
  tags: [],
  lists: [],
  previewUrl: `https://audio-ssl.itunes.apple.com/${id}.m4a`,
  enabled: true,
  ...over,
});

const songs: Song[] = [
  song(1, { tags: ["Rap"], artist: "Đen & MIN", lists: ["Tiệc"] }),
  song(2, { tags: ["V-pop"], artist: "Mỹ Tâm", decade: "2000s" }),
  song(3, { tags: ["Rap", "Indie"], artist: "Da LAB", decade: "2010s", lists: ["tiệc"] }),
  song(4, { tags: ["Rap"], artist: "Đen", enabled: false }),
];

describe("song filter", () => {
  it("all: every enabled song", () => {
    expect(filterSongs(songs, { mode: "all", values: [] }).map((s) => s.trackId)).toEqual([1, 2, 3]);
  });

  it("tag: any selected tag, case and diacritics insensitive", () => {
    expect(filterSongs(songs, { mode: "tag", values: ["rap"] }).map((s) => s.trackId)).toEqual([1, 3]);
  });

  it("artist: matches a featured credit", () => {
    expect(filterSongs(songs, { mode: "artist", values: ["Đen"] }).map((s) => s.trackId)).toEqual([1]);
    expect(filterSongs(songs, { mode: "artist", values: ["MIN"] }).map((s) => s.trackId)).toEqual([1]);
  });

  it("decade: selected decades", () => {
    expect(filterSongs(songs, { mode: "decade", values: ["2000s", "2010s"] }).map((s) => s.trackId)).toEqual([2, 3]);
  });

  it("list: custom list names", () => {
    expect(filterSongs(songs, { mode: "list", values: ["Tiệc"] }).map((s) => s.trackId)).toEqual([1, 3]);
  });

  it("a mode with no selected values matches nothing", () => {
    expect(filterSongs(songs, { mode: "tag", values: [] })).toEqual([]);
  });

  it("never includes a song that is turned off", () => {
    for (const mode of ["all", "tag", "artist", "decade", "list"] as const) {
      const values = mode === "all" ? [] : sourceOptions(songs, mode);
      expect(filterSongs(songs, { mode, values }).some((s) => s.trackId === 4)).toBe(false);
    }
  });

  it("builds options from enabled songs without duplicates", () => {
    expect(sourceOptions(songs, "tag")).toEqual(["Indie", "Rap", "V-pop"]);
    expect(sourceOptions(songs, "artist")).toEqual(["Da LAB", "Đen", "MIN", "Mỹ Tâm"]);
    expect(sourceOptions(songs, "list")).toEqual(["Tiệc"]);
  });

  it("caps the pool at 500 random songs and sends only pool fields", () => {
    const many = Array.from({ length: 700 }, (_, i) => song(i + 1, {}));
    const pool = toPool(many);
    expect(pool).toHaveLength(500);
    expect(new Set(pool.map((p) => p.trackId)).size).toBe(500);
    expect(Object.keys(pool[0] ?? {}).sort()).toEqual(["artist", "previewUrl", "title", "trackId"]);
    expect(toPool(songs.slice(0, 2))).toHaveLength(2);
  });

  it("needs 4 distinct titles to play", () => {
    expect(poolIsPlayable(songs.slice(0, 3))).toBe(false);
    expect(poolIsPlayable(songs)).toBe(true);
  });
});
