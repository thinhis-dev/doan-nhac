import { POOL_MAX } from "../../shared/game-rules";
import type { PoolSong } from "../../shared/protocol";
import { artistNames, normalizeText, type Song } from "../../shared/song";

export type SourceMode = "all" | "tag" | "artist" | "decade" | "list";
export type SourceSelection = { mode: SourceMode; values: string[] };

export const SOURCE_MODES: SourceMode[] = ["all", "tag", "artist", "decade", "list"];
export const DEFAULT_SOURCE: SourceSelection = { mode: "all", values: [] };

function valuesOf(song: Song, mode: SourceMode): string[] {
  switch (mode) {
    case "tag":
      return song.tags;
    case "artist":
      return artistNames(song.artist);
    case "decade":
      return song.decade ? [song.decade] : [];
    case "list":
      return song.lists;
    case "all":
      return [];
  }
}

/** The chip choices of one mode, built from the enabled songs of the library. */
export function sourceOptions(songs: Song[], mode: SourceMode): string[] {
  if (mode === "all") return [];
  const byKey = new Map<string, string>();
  for (const s of songs) {
    if (!s.enabled) continue;
    for (const v of valuesOf(s, mode)) {
      const key = normalizeText(v);
      if (key && !byKey.has(key)) byKey.set(key, v);
    }
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, "vi"));
}

/** Enabled songs that match the selection. A mode other than "all" with no values matches nothing. */
export function filterSongs(songs: Song[], sel: SourceSelection): Song[] {
  const enabled = songs.filter((s) => s.enabled);
  if (sel.mode === "all") return enabled;
  const wanted = new Set(sel.values.map(normalizeText));
  if (wanted.size === 0) return [];
  return enabled.filter((s) => valuesOf(s, sel.mode).some((v) => wanted.has(normalizeText(v))));
}

/** The pool sent at game start: at most 500 songs, chosen at random above that count. */
export function toPool(songs: Song[], rng: () => number = Math.random): PoolSong[] {
  let picked = songs;
  if (songs.length > POOL_MAX) {
    const copy = [...songs];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j] as Song, copy[i] as Song];
    }
    picked = copy.slice(0, POOL_MAX);
  }
  return picked.map(({ trackId, title, artist, previewUrl }) => ({ trackId, title, artist, previewUrl }));
}

/** Pools need 4 distinct titles to build answer choices. */
export function poolIsPlayable(songs: Song[]): boolean {
  return new Set(songs.map((s) => normalizeText(s.title))).size >= 4;
}
