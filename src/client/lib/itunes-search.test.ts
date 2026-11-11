import { describe, expect, it } from "vitest";
import { searchItunes, toSongs } from "./itunes-search";

const row = {
  kind: "song",
  trackId: 5,
  trackName: "Nơi này có anh",
  artistName: "Sơn Tùng M-TP",
  releaseDate: "2017-02-14T08:00:00Z",
  primaryGenreName: "Pop",
  previewUrl: "https://audio-ssl.itunes.apple.com/a.m4a",
};

const respond = (status: number, body: unknown = {}) =>
  (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe("itunes search", () => {
  it("maps results to new songs with a decade, no tags and enabled", () => {
    expect(toSongs([row, { ...row, trackId: 6, previewUrl: "https://x.example/a" }])).toEqual([
      {
        trackId: 5,
        title: "Nơi này có anh",
        artist: "Sơn Tùng M-TP",
        releaseYear: 2017,
        decade: "2010s",
        itunesGenre: "Pop",
        tags: [],
        lists: [],
        previewUrl: row.previewUrl,
        enabled: true,
      },
    ]);
  });

  it("reports a rate limit on 403 and 429", async () => {
    expect(await searchItunes("a", respond(429))).toEqual({ ok: false, error: "rate-limited" });
    expect(await searchItunes("a", respond(403))).toEqual({ ok: false, error: "rate-limited" });
  });

  it("cancels the previous search", async () => {
    const slow = ((_: unknown, init: RequestInit) =>
      new Promise((_r, reject) =>
        init.signal?.addEventListener("abort", () => reject(Object.assign(new Error(), { name: "AbortError" }))),
      )) as unknown as typeof fetch;
    const first = searchItunes("a", slow);
    const second = searchItunes("ab", respond(200, { results: [row] }));
    expect(await first).toEqual({ ok: false, error: "aborted" });
    expect((await second).ok).toBe(true);
  });
});
