import Papa from "papaparse";
import { CSV_COLUMNS, type Song } from "./song";

const BOM = "﻿";
const LIST_SEPARATOR = ";";
const REQUIRED_COLUMNS = ["trackId", "title", "artist", "previewUrl"] as const;

export type CsvError = { row: number | null; message: string };
export type CsvParseResult = { ok: true; songs: Song[] } | { ok: false; error: CsvError };

function splitList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(LIST_SEPARATOR)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseEnabled(value: string | undefined): boolean {
  if (value === undefined) return true;
  const v = value.trim().toLowerCase();
  return !(v === "false" || v === "0" || v === "no");
}

/**
 * Parses a songs CSV. Rejects the whole file when a required column is
 * missing or a trackId is not a number. `row` in the error is the 1-based
 * line number in the file, counting the header as line 1.
 */
export function parseSongsCsv(text: string): CsvParseResult {
  const source = text.startsWith(BOM) ? text.slice(1) : text;
  const parsed = Papa.parse<Record<string, string>>(source, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });

  const fields = parsed.meta.fields ?? [];
  const missing = REQUIRED_COLUMNS.filter((c) => !fields.includes(c));
  if (missing.length > 0) {
    return { ok: false, error: { row: 1, message: `missing column: ${missing.join(", ")}` } };
  }
  const fatal = parsed.errors.find((e) => e.type === "Quotes");
  if (fatal) {
    return { ok: false, error: { row: (fatal.row ?? 0) + 2, message: fatal.message } };
  }

  const songs: Song[] = [];
  for (const [i, raw] of parsed.data.entries()) {
    const row = i + 2;
    const trackId = Number(raw.trackId?.trim());
    if (!raw.trackId?.trim() || !Number.isInteger(trackId) || trackId <= 0) {
      return { ok: false, error: { row, message: "trackId is not a number" } };
    }
    const yearText = raw.releaseYear?.trim() ?? "";
    const year = yearText === "" ? null : Number(yearText);
    songs.push({
      trackId,
      title: raw.title?.trim() ?? "",
      artist: raw.artist?.trim() ?? "",
      releaseYear: year !== null && Number.isInteger(year) ? year : null,
      decade: raw.decade?.trim() ?? "",
      itunesGenre: raw.itunesGenre?.trim() ?? "",
      tags: splitList(raw.tags),
      lists: splitList(raw.lists),
      previewUrl: raw.previewUrl?.trim() ?? "",
      enabled: parseEnabled(raw.enabled),
    });
  }
  return { ok: true, songs };
}

/** Serializes songs as CSV with a UTF-8 byte order mark, so Excel shows diacritics. */
export function serializeSongsCsv(songs: Song[]): string {
  const rows = songs.map((s) => [
    String(s.trackId),
    s.title,
    s.artist,
    s.releaseYear === null ? "" : String(s.releaseYear),
    s.decade,
    s.itunesGenre,
    s.tags.join(LIST_SEPARATOR),
    s.lists.join(LIST_SEPARATOR),
    s.previewUrl,
    s.enabled ? "true" : "false",
  ]);
  const body = Papa.unparse({ fields: [...CSV_COLUMNS], data: rows }, { newline: "\n" });
  return `${BOM}${body}\n`;
}

/**
 * Merges incoming songs into existing songs by trackId. Order: existing rows
 * first, then new rows.
 * - "fetch": for an existing row, update only previewUrl, itunesGenre and
 *   releaseYear. Manual columns stay.
 * - "replace": an incoming row replaces the existing row with the same id.
 */
export function mergeSongs(existing: Song[], incoming: Song[], mode: "fetch" | "replace"): Song[] {
  const byId = new Map(incoming.map((s) => [s.trackId, s]));
  const merged = existing.map((old) => {
    const next = byId.get(old.trackId);
    if (!next) return old;
    byId.delete(old.trackId);
    if (mode === "replace") return next;
    return { ...old, previewUrl: next.previewUrl, itunesGenre: next.itunesGenre, releaseYear: next.releaseYear };
  });
  return [...merged, ...byId.values()];
}
