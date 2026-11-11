import { beforeEach, describe, expect, it } from "vitest";
import { type AudioLike, AudioPlayer, PREPARE_TIMEOUT_MS } from "./audio-player";

class FakeAudio implements AudioLike {
  src = "";
  currentTime = 0;
  preload = "";
  paused = true;
  playMode: "ok" | "blocked" | "fail" = "ok";
  playCalls: { src: string; at: number }[] = [];
  private handlers = new Map<string, Set<() => void>>();
  play() {
    this.playCalls.push({ src: this.src, at: this.currentTime });
    if (this.playMode === "blocked") return Promise.reject(Object.assign(new Error("x"), { name: "NotAllowedError" }));
    if (this.playMode === "fail") return Promise.reject(Object.assign(new Error("x"), { name: "NotSupportedError" }));
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
  load() {}
  addEventListener(t: string, fn: () => void) {
    if (!this.handlers.has(t)) this.handlers.set(t, new Set());
    this.handlers.get(t)?.add(fn);
  }
  removeEventListener(t: string, fn: () => void) {
    this.handlers.get(t)?.delete(fn);
  }
  fire(t: string) {
    for (const fn of [...(this.handlers.get(t) ?? [])]) fn();
  }
}

class FakeTimers {
  t = 0;
  private list: { at: number; fn: () => void; id: number }[] = [];
  private id = 0;
  now = () => this.t;
  setTimeout = (fn: () => void, ms: number) => {
    this.list.push({ at: this.t + ms, fn, id: ++this.id });
    return this.id;
  };
  clearTimeout = (h: unknown) => {
    this.list = this.list.filter((x) => x.id !== h);
  };
  advance(ms: number) {
    const end = this.t + ms;
    for (;;) {
      this.list.sort((a, b) => a.at - b.at);
      const next = this.list[0];
      if (!next || next.at > end) break;
      this.list.shift();
      this.t = next.at;
      next.fn();
    }
    this.t = end;
  }
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("AudioPlayer", () => {
  let el: FakeAudio;
  let timers: FakeTimers;
  let player: AudioPlayer;

  beforeEach(() => {
    el = new FakeAudio();
    timers = new FakeTimers();
    player = new AudioPlayer(el, { chimeUrl: "chime.wav", ...timers });
  });

  it("unlocks by playing the chime on the shared element", async () => {
    expect(player.state).toBe("locked");
    expect(await player.unlock()).toBe(true);
    expect(el.playCalls[0]?.src).toBe("chime.wav");
    expect(player.state).toBe("idle");
  });

  it("stays locked when the unlock play is refused", async () => {
    el.playMode = "blocked";
    expect(await player.unlock()).toBe(false);
    expect(player.state).toBe("locked");
  });

  it("prepares, then plays at the synchronized time from the offset", async () => {
    await player.unlock();
    const ready = player.prepare("clip.m4a", 12);
    el.fire("canplay");
    expect(await ready).toBe(true);
    expect(player.state).toBe("ready");
    player.playAt(3000);
    timers.advance(2999);
    expect(el.playCalls).toHaveLength(1);
    timers.advance(1);
    await flush();
    expect(el.playCalls[1]).toEqual({ src: "clip.m4a", at: 12 });
    expect(player.state).toBe("playing");
  });

  it("resolves prepare after 2.5 s when canplay never comes", async () => {
    await player.unlock();
    const ready = player.prepare("clip.m4a", 0);
    timers.advance(PREPARE_TIMEOUT_MS);
    expect(await ready).toBe(true);
  });

  it("skips ahead when a device starts late", async () => {
    await player.unlock();
    const ready = player.prepare("clip.m4a", 5);
    el.fire("canplay");
    await ready;
    timers.t = 4500;
    player.playAt(3000);
    await flush();
    expect(el.playCalls[1]?.at).toBe(6.5);
  });

  it("shows the tap fallback on NotAllowedError and retries at the right position", async () => {
    await player.unlock();
    const ready = player.prepare("clip.m4a", 10);
    el.fire("canplay");
    await ready;
    el.playMode = "blocked";
    player.playAt(0);
    await flush();
    expect(player.state).toBe("blocked");
    el.playMode = "ok";
    timers.t = 2000;
    await player.retry();
    expect(el.playCalls.at(-1)).toEqual({ src: "clip.m4a", at: 12 });
    expect(player.state).toBe("playing");
  });

  it("reports a load error and does not try to play", async () => {
    await player.unlock();
    const ready = player.prepare("broken.m4a", 0);
    el.fire("error");
    expect(await ready).toBe(false);
    expect(player.state).toBe("error");
    player.playAt(0);
    await flush();
    expect(el.playCalls).toHaveLength(1);
  });

  it("stop pauses and cancels a pending start", async () => {
    await player.unlock();
    const ready = player.prepare("clip.m4a", 0);
    el.fire("canplay");
    await ready;
    player.playAt(1000);
    player.stop();
    timers.advance(2000);
    await flush();
    expect(el.playCalls).toHaveLength(1);
    expect(el.paused).toBe(true);
    expect(player.state).toBe("idle");
  });
});
