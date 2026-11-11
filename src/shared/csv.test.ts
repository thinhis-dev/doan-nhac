import { describe, expect, it } from "vitest";
import { mergeSongs, parseSongsCsv, serializeSongsCsv } from "./csv";
import type { Song } from "./song";

const song = (over: Partial<Song> = {}): Song => ({
  trackId: 1,
  title: "Nơi này có anh",
  artist: "Sơn Tùng M-TP",
  releaseYear: 2017,
  decade: "2010s",
  itunesGenre: "Pop",
  tags: ["vpop"],
  lists: [],
  previewUrl: "https://audio-ssl.itunes.apple.com/a.m4a",
  enabled: true,
  ...over,
});

describe("songs csv", () => {
  it("round trips rows with diacritics, quoted commas and lists", () => {
    const songs = [
      song(),
      song({
        trackId: 2,
        title: 'Đừng làm trái tim anh đau, "remix"',
        artist: "Ễ, Ữ và Ặ",
        releaseYear: null,
        decade: "",
        tags: ["ballad", "indie"],
        lists: ["Tiệc tùng", "Xe hơi"],
        enabled: false,
      }),
    ];
    const text = serializeSongsCsv(songs);
    expect(text.startsWith("﻿")).toBe(true);
    const parsed = parseSongsCsv(text);
    expect(parsed).toEqual({ ok: true, songs });
  });

  it("writes the header in the contract order", () => {
    const firstLine = serializeSongsCsv([]).slice(1).split("\n")[0];
    expect(firstLine).toBe("trackId,title,artist,releaseYear,decade,itunesGenre,tags,lists,previewUrl,enabled");
  });

  it("rejects a file with a missing required column", () => {
    const res = parseSongsCsv("trackId,title\n1,a\n");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.row).toBe(1);
  });

  it("rejects a non-numeric trackId and reports the line number", () => {
    const text = "trackId,title,artist,previewUrl\n1,a,b,u\nabc,a,b,u\n";
    const res = parseSongsCsv(text);
    expect(res).toEqual({ ok: false, error: { row: 3, message: "trackId is not a number" } });
  });

  it("defaults missing optional columns", () => {
    const res = parseSongsCsv("trackId,title,artist,previewUrl\n7,a,b,u\n");
    expect(res.ok && res.songs[0]).toEqual({
      trackId: 7,
      title: "a",
      artist: "b",
      releaseYear: null,
      decade: "",
      itunesGenre: "",
      tags: [],
      lists: [],
      previewUrl: "u",
      enabled: true,
    });
  });
});

describe("mergeSongs", () => {
  it("fetch mode keeps manual columns and updates only fetched columns", () => {
    const edited = song({ title: "Sửa tay", tags: ["mine"], lists: ["L"], decade: "1990s", enabled: false });
    const fetched = song({ previewUrl: "https://audio-ssl.itunes.apple.com/new.m4a", itunesGenre: "V-Pop", releaseYear: 2018 });
    const added = song({ trackId: 9 });
    const out = mergeSongs([edited], [fetched, added], "fetch");
    expect(out).toEqual([
      { ...edited, previewUrl: fetched.previewUrl, itunesGenre: "V-Pop", releaseYear: 2018 },
      added,
    ]);
  });

  it("replace mode lets incoming rows win", () => {
    const incoming = song({ title: "Mới" });
    expect(mergeSongs([song()], [incoming], "replace")).toEqual([incoming]);
  });
});
