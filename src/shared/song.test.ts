import { describe, expect, it } from "vitest";
import { artistNames, decadeFromYear, displayText, normalizeText, primaryArtistKey } from "./song";

describe("song text helpers", () => {
  it("normalizes case, diacritics, đ and bracketed text", () => {
    expect(normalizeText("Đừng Làm Trái Tim Anh Đau (Remix)")).toBe("dung lam trai tim anh dau");
  });

  it("strips bracketed extras for display", () => {
    expect(displayText("Hẹn Gặp Em (feat. Juky San) [Lofi]")).toBe("Hẹn Gặp Em");
    expect(displayText("(S)")).toBe("(S)");
  });

  it("splits artist credits and keys by the main artist", () => {
    expect(artistNames("Bích Phương, Juky San & LAMOON")).toEqual(["Bích Phương", "Juky San", "LAMOON"]);
    expect(artistNames("Đen feat. MIN")).toEqual(["Đen", "MIN"]);
    expect(primaryArtistKey("Đen & MIN")).toBe(primaryArtistKey("Đen"));
    expect(primaryArtistKey("Jack - J97")).toBe("jack j97");
  });

  it("maps years to decades", () => {
    expect(decadeFromYear(1985)).toBe("1990s");
    expect(decadeFromYear(2007)).toBe("2000s");
    expect(decadeFromYear(2031)).toBe("2020s");
    expect(decadeFromYear(null)).toBe("");
  });
});
