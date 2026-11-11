export const MAX_PLAYERS = 5;
export const QUESTION_COUNTS = [5, 10, 15, 20] as const;
export const QUESTION_SECONDS = [5, 10, 15, 20] as const;
export const COUNTDOWN_MS = 3000;
export const REVEAL_MS = 4000;
export const NAME_MAX = 16;
export const POOL_MAX = 500;
export const POOL_MIN = 4;
export const TEXT_MAX = 200;
export const PREVIEW_SECONDS = 30;
export const AVATAR_COUNT = 12;
export const MAX_ROOMS = 200;
export const ALLOWED_PREVIEW_HOST = "audio-ssl.itunes.apple.com";

export const CORRECT_BASE = 500;
export const SPEED_BONUS_MAX = 500;
export const WRONG_PENALTY = 250;

/** Correct: 500 + round(500 * remaining / total). Wrong: -250 with the penalty on, else 0. */
export function scoreAnswer(
  correct: boolean,
  elapsedMs: number,
  totalMs: number,
  wrongPenalty: boolean,
): number {
  if (!correct) return wrongPenalty ? -WRONG_PENALTY : 0;
  if (totalMs <= 0) return CORRECT_BASE;
  const remaining = Math.min(Math.max(totalMs - elapsedMs, 0), totalMs);
  return CORRECT_BASE + Math.round((SPEED_BONUS_MAX * remaining) / totalMs);
}
