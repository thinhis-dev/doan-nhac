import { describe, expect, it } from "vitest";
import { type ItunesTrack, parseArtistsCsv, selectArtistSongs } from "./fetch-songs";

const track = (over: Partial<ItunesTrack>): ItunesTrack => ({
  kind: "song",
  trackId: 1,
  trackName: "Lạc trôi",
  artistName: "Sơn Tùng M-TP",
  releaseDate: "2017-01-01T08:00:00Z",
  primaryGenreName: "Pop",
  previewUrl: "https://audio-ssl.itunes.apple.com/x.m4a",
  ...over,
});

const row = { artist: "Sơn Tùng M-TP", tags: ["V-pop"] };

describe("selectArtistSongs", () => {
  it("maps a track to a song row", () => {
    expect(selectArtistSongs([track({})], row)).toEqual([
      {
        trackId: 1,
        title: "Lạc trôi",
        artist: "Sơn Tùng M-TP",
        releaseYear: 2017,
        decade: "2010s",
        itunesGenre: "Pop",
        tags: ["V-pop"],
        lists: [],
        previewUrl: "https://audio-ssl.itunes.apple.com/x.m4a",
        enabled: true,
      },
    ]);
  });

  it("drops rows of other artists and keeps featured rows", () => {
    const out = selectArtistSongs(
      [track({ trackId: 1, artistName: "Người khác" }), track({ trackId: 2, artistName: "Sơn Tùng M-TP & Snoop Dogg", trackName: "Hãy trao cho anh" })],
      row,
    );
    expect(out.map((s) => s.trackId)).toEqual([2]);
  });

  it("drops excluded versions", () => {
    const names = [
      "Lạc trôi (Live)",
      "Lạc trôi Remix",
      "Karaoke",
      "Beat",
      "Instrumental",
      "Acoustic Version",
      "Sped Up",
      "MEDLEY THẤT TÌNH",
      "Mashup: Diễm Xưa",
      "Liên Khúc: Một Năm Đã Qua",
      "LK Vùng Lá Me Bay",
      "Tình Nồng (Lofi)",
      "Khi Em Lớn [English Version]",
    ];
    const out = selectArtistSongs(names.map((n, i) => track({ trackId: i + 1, trackName: n })), row);
    expect(out).toEqual([]);
  });

  it("drops show compilations with more than 3 artists and too-long titles", () => {
    const out = selectArtistSongs(
      [
        track({ trackId: 1, artistName: "A, B, Sơn Tùng M-TP & C" }),
        track({ trackId: 2, trackName: "Một tiêu đề rất rất dài vượt quá năm mươi ký tự cho phép ở đây" }),
        track({ trackId: 3, trackName: "Ngắn (feat. Một tên nghệ sĩ rất dài để kiểm tra phần ngoặc)" }),
      ],
      row,
    );
    expect(out.map((s) => s.trackId)).toEqual([3]);
  });

  it("removes duplicates by normalized title", () => {
    const out = selectArtistSongs(
      [track({ trackId: 1, trackName: "Lạc Trôi" }), track({ trackId: 2, trackName: "lac troi (Triple D)" })],
      row,
    );
    expect(out.map((s) => s.trackId)).toEqual([1]);
  });

  it("keeps at most 25 songs and drops non-Apple previews", () => {
    const many = Array.from({ length: 40 }, (_, i) => track({ trackId: i + 1, trackName: `Bài ${i}` }));
    many.unshift(track({ trackId: 99, trackName: "Khác", previewUrl: "https://evil.example/x.m4a" }));
    const out = selectArtistSongs(many, row);
    expect(out).toHaveLength(25);
    expect(out.some((s) => s.trackId === 99)).toBe(false);
  });
});

describe("parseArtistsCsv", () => {
  it("reads artists and tags", () => {
    expect(parseArtistsCsv("﻿artist,tags\nĐen,Rap\nMỹ Tâm,V-pop;Ballad\n")).toEqual([
      { artist: "Đen", tags: ["Rap"] },
      { artist: "Mỹ Tâm", tags: ["V-pop", "Ballad"] },
    ]);
  });
});
