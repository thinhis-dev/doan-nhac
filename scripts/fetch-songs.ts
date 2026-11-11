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
import { decadeFromYear, displayText, normalizeText, type Song } from "../src/shared/song";

const ARTISTS_PATH = resolve("data/artists.csv");
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

/** Applies the filter, duplicate and limit rules to the search results of one artist. */
export function selectArtistSongs(results: ItunesTrack[], row: ArtistRow): Song[] {
  const wanted = normalizeText(row.artist);
  const seenTitles = new Set<string>();
  const songs: Song[] = [];
  for (const t of results) {
    if (songs.length >= MAX_PER_ARTIST) break;
    if (t.kind !== "song" || !t.trackId || !t.trackName || !t.artistName) continue;
    if (!containsWords(normalizeText(t.artistName), wanted)) continue;
    if (artistCount(t.artistName) > MAX_ARTISTS) continue;
    const plainTitle = normalizeText(t.trackName);
    if (plainTitle === "" || EXCLUDED_TITLE.test(` ${normalizeText(t.trackName.replace(/[()[\]]/g, " "))} `)) continue;
    if (displayText(t.trackName).length > MAX_DISPLAY_LENGTH || displayText(t.artistName).length > MAX_DISPLAY_LENGTH) continue;
    if (seenTitles.has(plainTitle)) continue;
    if (!isApplePreview(t.previewUrl)) continue;
    seenTitles.add(plainTitle);
    const year = t.releaseDate ? new Date(t.releaseDate).getUTCFullYear() : null;
    const releaseYear = year !== null && Number.isFinite(year) ? year : null;
    songs.push({
      trackId: t.trackId,
      title: t.trackName.trim(),
      artist: t.artistName.trim(),
      releaseYear,
      decade: decadeFromYear(releaseYear),
      itunesGenre: t.primaryGenreName ?? "",
      tags: [...row.tags],
      lists: [],
      previewUrl: t.previewUrl,
      enabled: true,
    });
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function searchArtist(artist: string): Promise<ItunesTrack[]> {
  const url = new URL("https://itunes.apple.com/search");
  url.search = new URLSearchParams({
    term: artist,
    country: "vn",
    media: "music",
    entity: "song",
    limit: "50",
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
      const songs = selectArtistSongs(await searchArtist(row.artist), row);
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
