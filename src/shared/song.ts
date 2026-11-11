export type Song = {
  trackId: number;
  title: string;
  artist: string;
  releaseYear: number | null;
  decade: string; // "1990s" | "2000s" | "2010s" | "2020s", editable
  itunesGenre: string;
  tags: string[]; // CSV: joined with ";"
  lists: string[]; // custom list names, CSV: joined with ";"
  previewUrl: string;
  enabled: boolean;
};

export const CSV_COLUMNS = [
  "trackId",
  "title",
  "artist",
  "releaseYear",
  "decade",
  "itunesGenre",
  "tags",
  "lists",
  "previewUrl",
  "enabled",
] as const;

export const DECADES = ["1990s", "2000s", "2010s", "2020s"] as const;

/** Maps a release year to a decade label. Years before 1990 fall into "1990s". */
export function decadeFromYear(year: number | null): string {
  if (year === null || !Number.isFinite(year)) return "";
  const decade = Math.floor(year / 10) * 10;
  if (decade < 1990) return "1990s";
  if (decade > 2020) return "2020s";
  return `${decade}s`;
}

/**
 * Text for an answer choice: removes bracketed extras such as "(feat. ...)"
 * or "[From ...]". Keeps the original when nothing else is left.
 */
export function displayText(text: string): string {
  const stripped = text
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length > 0 ? stripped : text.trim();
}

/**
 * Normalizes text for comparison: removes text in brackets, diacritics
 * (including "đ"), case, punctuation and extra spaces.
 */
export function normalizeText(text: string): string {
  return text
    .replace(/\([^)]*\)|\[[^\]]*\]|\{[^}]*\}/g, " ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Splits an artist credit such as "A, B & C" or "A feat. B" into names. */
export function artistNames(artist: string): string[] {
  return displayText(artist)
    .split(/,|&|\bfeat\.?|\bft\.?|\bx\b/i)
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
}

/** The first credited artist, normalized. Two credits of one main artist share it. */
export function primaryArtistKey(artist: string): string {
  return normalizeText(artistNames(artist)[0] ?? artist);
}
