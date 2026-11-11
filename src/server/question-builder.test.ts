import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS, type PoolSong } from "../shared/protocol";
import { displayText, normalizeText } from "../shared/song";
import { buildQuestion, pickSongs, poolHasEnoughTitles, shuffle } from "./question-builder";

// mulberry32: a small seeded generator with well-spread first values.
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const song = (id: number, title: string, artist: string): PoolSong => ({
  trackId: id,
  title,
  artist,
  previewUrl: `https://audio-ssl.itunes.apple.com/${id}.m4a`,
});

const pool = [
  song(1, "Lạc trôi", "Sơn Tùng M-TP"),
  song(2, "Lac Troi (Remix)", "Sơn Tùng M-TP"),
  song(3, "Bài này chill phết", "Đen"),
  song(4, "Ước gì", "Mỹ Tâm"),
  song(5, "Cầu vồng", "Ngọt"),
  song(6, "Hẹn yêu", "Đen"),
];

describe("question builder", () => {
  it("picks min(count, pool) songs with no repeat", () => {
    const picked = pickSongs(pool, 10, seeded(1));
    expect(picked).toHaveLength(6);
    expect(new Set(picked.map((s) => s.trackId)).size).toBe(6);
    expect(pickSongs(pool, 5, seeded(2))).toHaveLength(5);
  });

  it("builds four distinct choices that include the correct one", () => {
    for (let seed = 1; seed < 200; seed++) {
      const rng = seeded(seed);
      const target = pool[seed % pool.length] as PoolSong;
      const q = buildQuestion(target, pool, DEFAULT_PARAMS, rng);
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices.map(normalizeText)).size).toBe(4);
      expect(q.choices[q.correctIndex]).toBe(displayText(q.kind === "title" ? target.title : target.artist));
    }
  });

  it("uses only title questions with fewer than 4 distinct artists", () => {
    const fewArtists = [song(1, "A", "X"), song(2, "B", "X"), song(3, "C", "Y"), song(4, "D", "Z"), song(5, "E", "Z")];
    for (let seed = 1; seed < 100; seed++) {
      expect(buildQuestion(fewArtists[0] as PoolSong, fewArtists, DEFAULT_PARAMS, seeded(seed)).kind).toBe("title");
    }
  });

  it("uses both kinds with 4 or more distinct artists", () => {
    const kinds = new Set<string>();
    for (let seed = 1; seed < 50; seed++) kinds.add(buildQuestion(pool[0] as PoolSong, pool, DEFAULT_PARAMS, seeded(seed)).kind);
    expect(kinds).toEqual(new Set(["title", "artist"]));
  });

  it("keeps the clip offset between 0 and 30 - questionSeconds", () => {
    const params = { ...DEFAULT_PARAMS, questionSeconds: 20 as const };
    const offsets = new Set<number>();
    for (let seed = 1; seed < 300; seed++) offsets.add(buildQuestion(pool[0] as PoolSong, pool, params, seeded(seed)).clipOffsetSec);
    expect(Math.min(...offsets)).toBe(0);
    expect(Math.max(...offsets)).toBe(10);
    expect([...offsets].every(Number.isInteger)).toBe(true);
  });

  it("shows choices without bracketed extras", () => {
    const withFeat = [song(1, "Hẹn yêu (feat. Ai đó)", "Đen"), ...pool.slice(2)];
    for (let seed = 1; seed < 30; seed++) {
      const q = buildQuestion(withFeat[0] as PoolSong, withFeat, DEFAULT_PARAMS, seeded(seed));
      if (q.kind === "title") expect(q.choices[q.correctIndex]).toBe("Hẹn yêu");
      expect(q.choices.every((c) => !c.includes("("))).toBe(true);
    }
  });

  it("requires 4 distinct titles", () => {
    expect(poolHasEnoughTitles(pool.slice(0, 4))).toBe(false);
    expect(poolHasEnoughTitles(pool.slice(0, 5))).toBe(true);
  });

  it("shuffle keeps all items", () => {
    expect(shuffle([1, 2, 3, 4], seeded(3)).sort()).toEqual([1, 2, 3, 4]);
  });
});
