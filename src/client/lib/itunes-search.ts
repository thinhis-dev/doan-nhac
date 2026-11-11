import { ALLOWED_PREVIEW_HOST } from "../../shared/game-rules";
import { decadeFromYear, type Song } from "../../shared/song";

export type SearchResult = { ok: true; songs: Song[] } | { ok: false; error: "rate-limited" | "failed" | "aborted" };

type ItunesTrack = {
  kind?: string;
  trackId?: number;
  trackName?: string;
  artistName?: string;
  releaseDate?: string;
  primaryGenreName?: string;
  previewUrl?: string;
};

function isApplePreview(url: string | undefined): url is string {
  try {
    return !!url && new URL(url).hostname === ALLOWED_PREVIEW_HOST;
  } catch {
    return false;
  }
}

/** Maps search rows to new library songs: decade from the year, empty tags, enabled. */
export function toSongs(results: ItunesTrack[]): Song[] {
  const out: Song[] = [];
  for (const t of results) {
    if (t.kind !== "song" || !t.trackId || !t.trackName || !t.artistName || !isApplePreview(t.previewUrl)) continue;
    const year = t.releaseDate ? new Date(t.releaseDate).getUTCFullYear() : null;
    const releaseYear = year !== null && Number.isFinite(year) ? year : null;
    out.push({
      trackId: t.trackId,
      title: t.trackName,
      artist: t.artistName,
      releaseYear,
      decade: decadeFromYear(releaseYear),
      itunesGenre: t.primaryGenreName ?? "",
      tags: [],
      lists: [],
      previewUrl: t.previewUrl,
      enabled: true,
    });
  }
  return out;
}

let current: AbortController | null = null;

/** Searches iTunes from the browser. A new search cancels the previous one. */
export async function searchItunes(term: string, fetchFn: typeof fetch = fetch): Promise<SearchResult> {
  current?.abort();
  const controller = new AbortController();
  current = controller;
  const url = new URL("https://itunes.apple.com/search");
  url.search = new URLSearchParams({ term, country: "vn", media: "music", entity: "song", limit: "25" }).toString();
  try {
    const res = await fetchFn(url, { signal: controller.signal });
    if (res.status === 403 || res.status === 429) return { ok: false, error: "rate-limited" };
    if (!res.ok) return { ok: false, error: "failed" };
    const body = (await res.json()) as { results?: ItunesTrack[] };
    return { ok: true, songs: toSongs(body.results ?? []) };
  } catch (err) {
    if ((err as { name?: string }).name === "AbortError") return { ok: false, error: "aborted" };
    return { ok: false, error: "failed" };
  }
}
