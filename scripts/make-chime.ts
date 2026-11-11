/**
 * Writes src/client/assets/chime.wav: an original two-note test tone,
 * 0.4 s, 16-bit mono, with fade in and fade out.
 *
 * Usage: npx tsx scripts/make-chime.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const OUT = resolve("src/client/assets/chime.wav");
const RATE = 22_050;
const DURATION = 0.4;
const NOTES = [784, 1047]; // G5 then C6
const FADE = 0.03;

export function renderChime(): Buffer {
  const samples = Math.round(RATE * DURATION);
  const data = Buffer.alloc(samples * 2);
  const half = samples / NOTES.length;
  for (let i = 0; i < samples; i++) {
    const t = i / RATE;
    const freq = NOTES[Math.min(NOTES.length - 1, Math.floor(i / half))] as number;
    const fadeIn = Math.min(1, t / FADE);
    const fadeOut = Math.min(1, (DURATION - t) / (FADE * 4));
    const v = Math.sin(2 * Math.PI * freq * t) * 0.5 * fadeIn * fadeOut;
    data.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, renderChime());
console.log(`wrote ${OUT}`);
