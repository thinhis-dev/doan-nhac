import { describe, expect, it } from "vitest";
import { scoreAnswer } from "./game-rules";

describe("scoreAnswer", () => {
  it("gives 1000 for an instant correct answer", () => {
    expect(scoreAnswer(true, 0, 10_000, false)).toBe(1000);
  });

  it("gives 750 for a correct answer at half time", () => {
    expect(scoreAnswer(true, 5_000, 10_000, false)).toBe(750);
  });

  it("gives 500 for a correct answer at or after the end", () => {
    expect(scoreAnswer(true, 10_000, 10_000, false)).toBe(500);
    expect(scoreAnswer(true, 12_000, 10_000, false)).toBe(500);
  });

  it("clamps a negative elapsed time to the full bonus", () => {
    expect(scoreAnswer(true, -50, 10_000, false)).toBe(1000);
  });

  it("rounds the speed bonus", () => {
    expect(scoreAnswer(true, 3_333, 10_000, true)).toBe(500 + Math.round(500 * 0.6667));
  });

  it("gives 0 for a wrong answer with the penalty off", () => {
    expect(scoreAnswer(false, 1_000, 10_000, false)).toBe(0);
  });

  it("gives -250 for a wrong answer with the penalty on", () => {
    expect(scoreAnswer(false, 1_000, 10_000, true)).toBe(-250);
  });
});
