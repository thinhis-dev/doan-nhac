import { describe, expect, it } from "vitest";
import type { PoolSong } from "../shared/protocol";
import { type FetchFn, isApplePreviewUrl, refreshPreviews } from "./preview-refresh";

const songs: PoolSong[] = [1, 2].map((id) => ({
  trackId: id,
  title: `T${id}`,
  artist: `A${id}`,
  previewUrl: `https://audio-ssl.itunes.apple.com/old${id}.m4a`,
}));

describe("refreshPreviews", () => {
  it("uses fresh Apple URLs from one lookup call", async () => {
    const calls: string[] = [];
    const fetchFn: FetchFn = async (url) => {
      calls.push(url);
      return {
        ok: true,
        json: async () => ({
          results: [
            { trackId: 1, previewUrl: "https://audio-ssl.itunes.apple.com/new1.m4a" },
            { trackId: 2, previewUrl: "https://evil.example/new2.m4a" },
          ],
        }),
      };
    };
    const out = await refreshPreviews(songs, fetchFn);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("id=1,2");
    expect(out.map((s) => s.previewUrl)).toEqual([
      "https://audio-ssl.itunes.apple.com/new1.m4a",
      "https://audio-ssl.itunes.apple.com/old2.m4a",
    ]);
  });

  it("falls back to pool URLs on an error", async () => {
    const fetchFn: FetchFn = async () => {
      throw new Error("down");
    };
    expect(await refreshPreviews(songs, fetchFn)).toEqual(songs);
  });

  it("falls back to pool URLs on a timeout", async () => {
    const fetchFn: FetchFn = (_url, { signal }) =>
      new Promise((_, reject) => signal.addEventListener("abort", () => reject(signal.reason)));
    expect(await refreshPreviews(songs, fetchFn, 20)).toEqual(songs);
  });
});

describe("isApplePreviewUrl", () => {
  it("accepts only https on the Apple preview host", () => {
    expect(isApplePreviewUrl("https://audio-ssl.itunes.apple.com/x.m4a")).toBe(true);
    expect(isApplePreviewUrl("http://audio-ssl.itunes.apple.com/x.m4a")).toBe(false);
    expect(isApplePreviewUrl("https://audio-ssl.itunes.apple.com.evil.io/x")).toBe(false);
    expect(isApplePreviewUrl("not a url")).toBe(false);
  });
});
