import { ALLOWED_PREVIEW_HOST } from "../shared/game-rules";
import type { PoolSong } from "../shared/protocol";

export type FetchFn = (url: string, init: { signal: AbortSignal }) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

const LOOKUP_URL = "https://itunes.apple.com/lookup";
export const LOOKUP_TIMEOUT_MS = 4000;

export function isApplePreviewUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname === ALLOWED_PREVIEW_HOST;
  } catch {
    return false;
  }
}

/**
 * Gets fresh preview URLs for the picked songs with one iTunes lookup call.
 * On failure or timeout, each song keeps the URL from the pool.
 */
export async function refreshPreviews(
  songs: PoolSong[],
  fetchFn: FetchFn = fetch as unknown as FetchFn,
  timeoutMs = LOOKUP_TIMEOUT_MS,
): Promise<PoolSong[]> {
  if (songs.length === 0) return songs;
  const ids = songs.map((s) => s.trackId).join(",");
  const url = `${LOOKUP_URL}?country=vn&entity=song&id=${ids}`;
  try {
    const res = await fetchFn(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return songs;
    const body = (await res.json()) as { results?: { trackId?: number; previewUrl?: string }[] };
    const fresh = new Map<number, string>();
    for (const r of body.results ?? []) {
      if (r.trackId && r.previewUrl && isApplePreviewUrl(r.previewUrl)) fresh.set(r.trackId, r.previewUrl);
    }
    return songs.map((s) => ({ ...s, previewUrl: fresh.get(s.trackId) ?? s.previewUrl }));
  } catch {
    return songs;
  }
}
