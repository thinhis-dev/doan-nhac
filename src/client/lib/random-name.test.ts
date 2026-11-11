import { describe, expect, it } from "vitest";
import { cleanName } from "../../server/room-store";
import { NAME_MAX } from "../../shared/game-rules";
import { NAME_ADJECTIVES, NAME_NOUNS, NAME_NUMBER_MAX, randomName } from "./random-name";

/** Returns the given values in order, then repeats them. */
function sequence(...values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length]!;
}

const NAME_PATTERN = /^(\S+(?: \S+)*) (\d+)$/u;

describe("randomName", () => {
  it("joins a noun, an adjective and a number in that order", () => {
    expect(randomName(sequence(0, 0, 0))).toBe(`${NAME_NOUNS[0]} ${NAME_ADJECTIVES[0]} 1`);
  });

  it("picks the last noun, the last adjective and 100 at the top of the range", () => {
    const almostOne = 1 - Number.EPSILON;
    expect(randomName(sequence(almostOne, almostOne, almostOne))).toBe(
      `${NAME_NOUNS.at(-1)} ${NAME_ADJECTIVES.at(-1)} ${NAME_NUMBER_MAX}`,
    );
  });

  it("maps the rng value to the matching list position", () => {
    const nounIndex = 7;
    const adjectiveIndex = 3;
    const rng = sequence(
      (nounIndex + 0.5) / NAME_NOUNS.length,
      (adjectiveIndex + 0.5) / NAME_ADJECTIVES.length,
      0.415,
    );
    expect(randomName(rng)).toBe(`${NAME_NOUNS[nounIndex]} ${NAME_ADJECTIVES[adjectiveIndex]} 42`);
  });

  it("produces every number from 1 to 100 and nothing outside it", () => {
    const seen = new Set<number>();
    for (let step = 0; step < 1000; step++) {
      const name = randomName(sequence(0, 0, step / 1000));
      const n = Number(NAME_PATTERN.exec(name)?.[2]);
      expect(Number.isInteger(n)).toBe(true);
      seen.add(n);
    }
    expect(Math.min(...seen)).toBe(1);
    expect(Math.max(...seen)).toBe(NAME_NUMBER_MAX);
    expect(seen.size).toBe(NAME_NUMBER_MAX);
  });

  it("uses Math.random by default and always returns a well-formed name", () => {
    for (let i = 0; i < 500; i++) {
      const name = randomName();
      const match = NAME_PATTERN.exec(name);
      expect(match, name).not.toBeNull();
      const n = Number(match![2]);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(NAME_NUMBER_MAX);
    }
  });

  it("varies between calls", () => {
    const names = new Set(Array.from({ length: 50 }, () => randomName()));
    expect(names.size).toBeGreaterThan(1);
  });
});

describe("random name word lists", () => {
  const lists = { nouns: NAME_NOUNS, adjectives: NAME_ADJECTIVES };

  for (const [label, words] of Object.entries(lists)) {
    it(`has unique, trimmed, NFC ${label} with no digits`, () => {
      expect(words.length).toBeGreaterThan(10);
      expect(new Set(words).size).toBe(words.length);
      for (const word of words) {
        expect(word).toBe(word.trim());
        expect(word).toBe(word.normalize("NFC"));
        expect(word).not.toMatch(/\d|\s{2}/);
        expect(word.length).toBeGreaterThan(0);
      }
    });
  }

  it("keeps every possible name within NAME_MAX and unchanged by the server", () => {
    for (const noun of NAME_NOUNS) {
      for (const adjective of NAME_ADJECTIVES) {
        const longest = `${noun} ${adjective} ${NAME_NUMBER_MAX}`;
        expect([...longest].length, longest).toBeLessThanOrEqual(NAME_MAX);
        expect(cleanName(longest)).toBe(longest);
      }
    }
  });
});
