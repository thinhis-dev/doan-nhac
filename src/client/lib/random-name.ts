/**
 * Random player names for a quick start: a noun (animal, fruit or plant), an
 * adjective and a number from 1 to 100, for example "Mèo Lười 42".
 *
 * Nouns have at most 5 characters and adjectives at most 6, so every name
 * fits NAME_MAX (16): 5 + 1 + 6 + 1 + 3.
 */

export const NAME_NOUNS = [
  // Animals
  "Mèo", "Chó", "Gấu", "Hổ", "Cáo", "Thỏ", "Voi", "Khỉ", "Cú", "Vịt", "Gà", "Sóc", "Nai", "Rùa", "Ếch",
  "Cò", "Heo", "Bò", "Dê", "Ngựa", "Chuột", "Cua", "Tôm", "Sứa", "Hươu",
  // Fruits
  "Xoài", "Dứa", "Ổi", "Mít", "Na", "Chuối", "Cam", "Bưởi", "Chanh", "Đào", "Lê", "Táo", "Nho", "Vải",
  "Nhãn", "Dừa", "Mận", "Me",
  // Trees and plants
  "Tre", "Thông", "Sen", "Cúc", "Bàng", "Si", "Đa", "Liễu", "Trúc", "Lan", "Mai", "Bèo",
] as const;

export const NAME_ADJECTIVES = [
  "Lười", "Vui Vẻ", "Ngố", "Bá Đạo", "Ngầu", "Ham Ăn", "Lắc Lư", "Mập Ú", "Tí Hon", "Láu Cá", "Hớn Hở",
  "Tự Tin", "Xinh", "Hiền", "Lì Lợm", "Nhanh", "Ú Nu", "Ngáo", "Mê Ngủ", "Hát Dở", "Lầy",
] as const;

export const NAME_NUMBER_MAX = 100;

function pick<T>(items: readonly T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)]!;
}

/** `rng` returns a number in [0, 1), like Math.random. */
export function randomName(rng: () => number = Math.random): string {
  const noun = pick(NAME_NOUNS, rng);
  const adjective = pick(NAME_ADJECTIVES, rng);
  const number = 1 + Math.floor(rng() * NAME_NUMBER_MAX);
  return `${noun} ${adjective} ${number}`;
}
