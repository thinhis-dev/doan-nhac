/**
 * Builds data/songs.csv from data/artists.csv with the iTunes Search API.
 * A second run adds new songs and keeps all manual edits.
 *
 * Usage: npm run fetch-songs
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import Papa from "papaparse";
import { mergeSongs, parseSongsCsv, serializeSongsCsv } from "../src/shared/csv";
import { ALLOWED_PREVIEW_HOST } from "../src/shared/game-rules";
import { artistNames, decadeFromYear, displayText, normalizeText, type Song } from "../src/shared/song";

const ARTISTS_PATH = resolve("data/artists.csv");
const WANTED_PATH = resolve("data/songs-wanted.csv");
const SONGS_PATH = resolve("data/songs.csv");
const CALL_GAP_MS = 3500;
const RATE_LIMIT_WAIT_MS = 60_000;
const MAX_PER_ARTIST = 25;
const EXCLUDED_TITLE =
  /\b(live|remix|karaoke|beat|instrumental|acoustic version|sped up|medley|mashup|lien khuc|lk|lofi|version)\b/;
// Answer buttons show at most two lines at 360 px width.
const MAX_DISPLAY_LENGTH = 50;
// Show compilations credit dozens of artists. They make unreadable artist choices.
const MAX_ARTISTS = 3;

function artistCount(artistName: string): number {
  return artistName.split(/,|&/).filter((part) => part.trim().length > 0).length;
}

export type ItunesTrack = {
  wrapperType?: string;
  kind?: string;
  trackId?: number;
  trackName?: string;
  artistName?: string;
  releaseDate?: string;
  primaryGenreName?: string;
  previewUrl?: string;
};

export type ArtistRow = { artist: string; tags: string[] };
export type WantedRow = { title: string; artist: string; tags: string[] };

function containsWords(haystack: string, needle: string): boolean {
  return needle.length > 0 && ` ${haystack} `.includes(` ${needle} `);
}

function isApplePreview(url: string | undefined): url is string {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname === ALLOWED_PREVIEW_HOST;
  } catch {
    return false;
  }
}

/** Applies the version, length and preview rules. Returns a song row or null. */
function toSong(t: ItunesTrack, tags: string[]): Song | null {
  if (t.kind !== "song" || !t.trackId || !t.trackName || !t.artistName) return null;
  if (artistCount(t.artistName) > MAX_ARTISTS) return null;
  if (normalizeText(t.trackName) === "" || EXCLUDED_TITLE.test(` ${normalizeText(t.trackName.replace(/[()[\]]/g, " "))} `)) return null;
  if (displayText(t.trackName).length > MAX_DISPLAY_LENGTH || displayText(t.artistName).length > MAX_DISPLAY_LENGTH) return null;
  if (!isApplePreview(t.previewUrl)) return null;
  const year = t.releaseDate ? new Date(t.releaseDate).getUTCFullYear() : null;
  const releaseYear = year !== null && Number.isFinite(year) ? year : null;
  return {
    trackId: t.trackId,
    title: t.trackName.trim(),
    artist: t.artistName.trim(),
    releaseYear,
    decade: decadeFromYear(releaseYear),
    itunesGenre: t.primaryGenreName ?? "",
    tags: [...tags],
    lists: [],
    previewUrl: t.previewUrl,
    enabled: true,
  };
}

/**
 * Picks the search result for one wanted song: the same title, by one of the
 * named singers if possible, else by any singer (old songs have many covers).
 */
export function selectWantedSong(results: ItunesTrack[], row: WantedRow): Song | null {
  const title = normalizeText(row.title);
  const singers = artistNames(row.artist).map(normalizeText).filter(Boolean);
  const candidates = results
    .filter((t) => t.trackName && normalizeText(t.trackName) === title)
    .map((t) => ({ t, song: toSong(t, row.tags) }))
    .filter((c): c is { t: ItunesTrack; song: Song } => c.song !== null);
  const bySinger = candidates.find((c) => singers.some((n) => containsWords(normalizeText(c.t.artistName ?? ""), n)));
  return (bySinger ?? candidates[0])?.song ?? null;
}

/** Applies the filter, duplicate and limit rules to the search results of one artist. */
export function selectArtistSongs(results: ItunesTrack[], row: ArtistRow): Song[] {
  const wanted = normalizeText(row.artist);
  const seenTitles = new Set<string>();
  const songs: Song[] = [];
  for (const t of results) {
    if (songs.length >= MAX_PER_ARTIST) break;
    if (!t.artistName || !containsWords(normalizeText(t.artistName), wanted)) continue;
    const song = toSong(t, row.tags);
    if (!song) continue;
    const plainTitle = normalizeText(song.title);
    if (seenTitles.has(plainTitle)) continue;
    seenTitles.add(plainTitle);
    songs.push(song);
  }
  return songs;
}

export function parseArtistsCsv(text: string): ArtistRow[] {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: "greedy",
  });
  return parsed.data
    .map((r) => ({
      artist: (r.artist ?? "").trim(),
      tags: (r.tags ?? "").split(";").map((t) => t.trim()).filter(Boolean),
    }))
    .filter((r) => r.artist.length > 0);
}

export function parseWantedCsv(text: string): WantedRow[] {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ""), {
    header: true,
    skipEmptyLines: "greedy",
  });
  return parsed.data
    .map((r) => ({
      title: (r.title ?? "").trim(),
      artist: (r.artist ?? "").trim(),
      tags: (r.tags ?? "").split(";").map((t) => t.trim()).filter(Boolean),
    }))
    .filter((r) => r.title.length > 0);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function search(term: string, limit: number): Promise<ItunesTrack[]> {
  const url = new URL("https://itunes.apple.com/search");
  url.search = new URLSearchParams({
    term,
    country: "vn",
    media: "music",
    entity: "song",
    limit: String(limit),
  }).toString();
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (res.status === 403 || res.status === 429) {
      console.warn(`  rate limited (${res.status}), waiting 60 s`);
      await sleep(RATE_LIMIT_WAIT_MS);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { results?: ItunesTrack[] };
    return body.results ?? [];
  }
  throw new Error("rate limited twice");
}

async function main() {
  const artists = parseArtistsCsv(readFileSync(ARTISTS_PATH, "utf8"));
  let existing: Song[] = [];
  if (existsSync(SONGS_PATH)) {
    const parsed = parseSongsCsv(readFileSync(SONGS_PATH, "utf8"));
    if (!parsed.ok) throw new Error(`data/songs.csv line ${parsed.error.row}: ${parsed.error.message}`);
    existing = parsed.songs;
  }

  const fetched = new Map<number, Song>();
  for (const [i, row] of artists.entries()) {
    if (i > 0) await sleep(CALL_GAP_MS);
    try {
      const songs = selectArtistSongs(await search(row.artist, 50), row);
      let added = 0;
      for (const s of songs) {
        if (!fetched.has(s.trackId)) {
          fetched.set(s.trackId, s);
          added++;
        }
      }
      console.log(`[${i + 1}/${artists.length}] ${row.artist}: ${added}`);
    } catch (err) {
      console.error(`[${i + 1}/${artists.length}] ${row.artist}: failed, ${(err as Error).message}`);
    }
  }

  const wanted = existsSync(WANTED_PATH) ? parseWantedCsv(readFileSync(WANTED_PATH, "utf8")) : [];
  const missing: string[] = [];
  for (const [i, row] of wanted.entries()) {
    await sleep(CALL_GAP_MS);
    try {
      const song = selectWantedSong(await search(`${row.title} ${artistNames(row.artist)[0] ?? ""}`, 25), row)
        ?? selectWantedSong(await sleep(CALL_GAP_MS).then(() => search(row.title, 25)), row);
      if (song && !fetched.has(song.trackId)) fetched.set(song.trackId, song);
      if (!song) missing.push(`${row.title} — ${row.artist}`);
      console.log(`[song ${i + 1}/${wanted.length}] ${row.title}: ${song ? song.artist : "not found"}`);
    } catch (err) {
      console.error(`[song ${i + 1}/${wanted.length}] ${row.title}: failed, ${(err as Error).message}`);
    }
  }
  if (missing.length) console.log(`not found on iTunes VN:\n  ${missing.join("\n  ")}`);

  const merged = mergeSongs(existing, [...fetched.values()], "fetch");
  writeFileSync(SONGS_PATH, serializeSongsCsv(merged), "utf8");
  console.log(`songs.csv: ${merged.length} rows (${merged.length - existing.length} new)`);
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
