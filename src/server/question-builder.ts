import { PREVIEW_SECONDS } from "../shared/game-rules";
import type { GameParams, PoolSong, QuestionKind } from "../shared/protocol";
import { displayText, normalizeText, primaryArtistKey } from "../shared/song";

export type Rng = () => number;

export type BuiltQuestion = {
  kind: QuestionKind;
  song: PoolSong;
  choices: string[];
  correctIndex: number;
  clipOffsetSec: number;
};

const CHOICE_COUNT = 4;

function randomInt(rng: Rng, maxInclusive: number): number {
  return Math.floor(rng() * (maxInclusive + 1));
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(rng, i);
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

function distinctCount(values: string[]): number {
  return new Set(values.map(normalizeText)).size;
}

/** A pool can build questions only with 4 or more distinct titles. */
export function poolHasEnoughTitles(pool: PoolSong[]): boolean {
  return distinctCount(pool.map((s) => s.title)) >= CHOICE_COUNT;
}

/** Artist questions need 4 different main artists, so that a featured credit is not a choice. */
export function poolAllowsArtistKind(pool: PoolSong[]): boolean {
  return new Set(pool.map((s) => primaryArtistKey(s.artist))).size >= CHOICE_COUNT;
}

/** Picks the song order for a game: min(questionCount, pool size) songs with no repeat. */
export function pickSongs(pool: PoolSong[], questionCount: number, rng: Rng): PoolSong[] {
  return shuffle(pool, rng).slice(0, Math.min(questionCount, pool.length));
}

function pickChoices(correct: string, candidates: string[], rng: Rng, keyOf: (text: string) => string): string[] {
  const seen = new Set([keyOf(correct)]);
  const wrong: string[] = [];
  for (const c of shuffle(candidates, rng)) {
    const key = keyOf(c);
    if (seen.has(key)) continue;
    seen.add(key);
    wrong.push(c);
    if (wrong.length === CHOICE_COUNT - 1) break;
  }
  return wrong;
}

export function buildQuestion(song: PoolSong, pool: PoolSong[], params: GameParams, rng: Rng): BuiltQuestion {
  const artistAllowed = poolAllowsArtistKind(pool);
  const kind: QuestionKind = artistAllowed && rng() < 0.5 ? "artist" : "title";
  const field = kind === "title" ? "title" : "artist";
  const correct = displayText(song[field]);
  const others = pool.filter((s) => s.trackId !== song.trackId).map((s) => displayText(s[field]));
  const wrong = pickChoices(correct, others, rng, kind === "title" ? normalizeText : primaryArtistKey);
  const choices = shuffle([correct, ...wrong], rng);
  return {
    kind,
    song,
    choices,
    correctIndex: choices.indexOf(correct),
    clipOffsetSec: randomInt(rng, Math.max(0, PREVIEW_SECONDS - params.questionSeconds)),
  };
}
