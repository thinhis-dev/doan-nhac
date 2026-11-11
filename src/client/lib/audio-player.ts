import chimeUrl from "../assets/chime.wav";
import { serverNow } from "./time-sync";

/**
 * The audio module. One HTMLAudioElement for the whole session, because iOS
 * binds the autoplay unlock to the element. It is never replaced.
 */

export type AudioState = "locked" | "idle" | "loading" | "ready" | "playing" | "blocked" | "error";

/** The part of HTMLAudioElement that the player uses. Tests pass a fake. */
export type AudioLike = {
  src: string;
  currentTime: number;
  preload: string;
  play(): Promise<void>;
  pause(): void;
  load(): void;
  addEventListener(type: string, fn: () => void): void;
  removeEventListener(type: string, fn: () => void): void;
};

export type PlayerDeps = {
  chimeUrl: string;
  /** Server clock in epoch ms. */
  now: () => number;
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (h: unknown) => void;
};

export const PREPARE_TIMEOUT_MS = 2500;

function isNotAllowed(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { name?: string }).name === "NotAllowedError";
}

export class AudioPlayer {
  state: AudioState = "locked";
  private listeners = new Set<(s: AudioState) => void>();
  private offsetSec = 0;
  private startsAt = 0;
  private startTimer: unknown;
  private token = 0;

  constructor(
    private readonly el: AudioLike,
    private readonly deps: PlayerDeps,
  ) {
    el.preload = "auto";
    el.addEventListener("error", () => {
      // An error of the chime or of a cleared source is not a question error.
      if (this.state === "loading" || this.state === "ready" || this.state === "playing") this.set("error");
    });
  }

  get unlocked(): boolean {
    return this.state !== "locked";
  }

  subscribe(fn: (s: AudioState) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private set(state: AudioState) {
    this.state = state;
    for (const fn of this.listeners) fn(state);
  }

  /** Call inside a tap handler. Plays the chime on the shared element. */
  async unlock(): Promise<boolean> {
    this.cancelStart();
    this.el.src = this.deps.chimeUrl;
    this.el.currentTime = 0;
    try {
      await this.el.play();
      this.set("idle");
      return true;
    } catch {
      return false;
    }
  }

  /** Sets the source and waits for `canplay`, at most 2.5 s. Resolves false on error. */
  prepare(url: string, offsetSec: number): Promise<boolean> {
    this.cancelStart();
    const token = ++this.token;
    this.offsetSec = offsetSec;
    this.el.pause();
    this.set("loading");
    this.el.src = url;
    this.el.load();
    return new Promise((resolve) => {
      const done = (ok: boolean) => {
        this.el.removeEventListener("canplay", onReady);
        this.el.removeEventListener("error", onError);
        this.deps.clearTimeout(timer);
        if (token === this.token && ok && this.state === "loading") this.set("ready");
        resolve(ok);
      };
      const onReady = () => done(true);
      const onError = () => done(false);
      // iOS can ignore preload. Then the clip loads only after play().
      const timer = this.deps.setTimeout(() => done(true), PREPARE_TIMEOUT_MS);
      this.el.addEventListener("canplay", onReady);
      this.el.addEventListener("error", onError);
    });
  }

  /** Waits until the synchronized server time, then plays from the clip offset. */
  playAt(startsAt: number): void {
    this.cancelStart();
    this.startsAt = startsAt;
    const wait = startsAt - this.deps.now();
    if (wait <= 0) {
      void this.start();
      return;
    }
    this.startTimer = this.deps.setTimeout(() => void this.start(), wait);
  }

  /** The "Chạm để nghe" fallback. Call inside a tap handler. */
  retry(): Promise<void> {
    return this.start();
  }

  stop(): void {
    this.cancelStart();
    this.token++;
    this.el.pause();
    if (this.state !== "locked") this.set("idle");
  }

  private cancelStart() {
    if (this.startTimer !== undefined) this.deps.clearTimeout(this.startTimer);
    this.startTimer = undefined;
  }

  /** The position that every device should hear now. A late device skips ahead. */
  private position(): number {
    const late = Math.max(0, (this.deps.now() - this.startsAt) / 1000);
    return this.offsetSec + late;
  }

  private async start(): Promise<void> {
    if (this.state === "error") return;
    const token = this.token;
    try {
      this.el.currentTime = this.position();
    } catch {
      // Some browsers refuse a seek before metadata. Play from the start then.
    }
    try {
      await this.el.play();
      if (token === this.token && (this.state as AudioState) !== "error") this.set("playing");
    } catch (err) {
      if (token !== this.token) return;
      this.set(isNotAllowed(err) ? "blocked" : "error");
    }
  }
}

let shared: AudioPlayer | undefined;

/** The session player. Created on first use with the one shared element. */
export function getAudioPlayer(deps: PlayerDeps): AudioPlayer {
  if (!shared) {
    const el = new Audio();
    el.setAttribute("playsinline", "");
    shared = new AudioPlayer(el, deps);
  }
  return shared;
}

/** The session player wired to the server clock and the bundled chime. */
export function sessionPlayer(): AudioPlayer {
  return getAudioPlayer({
    chimeUrl,
    now: serverNow,
    setTimeout: (fn, ms) => window.setTimeout(fn, ms),
    clearTimeout: (h) => window.clearTimeout(h as number),
  });
}
