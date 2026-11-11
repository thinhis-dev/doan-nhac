import { describe, expect, it } from "vitest";
import { type FocusEnv, LOST_FOCUS_DELAY_MS, watchFocus } from "./focus-watch";

function fakeEnv() {
  const handlers = new Map<string, () => void>();
  const timers: { fn: () => void; id: number }[] = [];
  let id = 0;
  const target = {
    addEventListener: (t: string, fn: unknown) => handlers.set(t, fn as () => void),
    removeEventListener: (t: string) => handlers.delete(t),
  };
  const state = { visible: true, focus: true };
  const env: FocusEnv = {
    doc: {
      ...target,
      get visibilityState() {
        return (state.visible ? "visible" : "hidden") as DocumentVisibilityState;
      },
      hasFocus: () => state.focus,
    },
    win: target,
    setTimeout: (fn) => {
      timers.push({ fn, id: ++id });
      return id;
    },
    clearTimeout: (h) => {
      const i = timers.findIndex((t) => t.id === h);
      if (i >= 0) timers.splice(i, 1);
    },
  };
  const fire = (t: string) => handlers.get(t)?.();
  const runTimers = () => {
    while (timers.length) timers.shift()?.fn();
  };
  return { env, state, fire, runTimers, handlers, timers };
}

describe("watchFocus", () => {
  it("reports a lost focus after the delay and a regained focus at once", () => {
    const f = fakeEnv();
    const reports: boolean[] = [];
    watchFocus((v) => reports.push(v), f.env);
    f.state.visible = false;
    f.fire("visibilitychange");
    expect(reports).toEqual([]);
    expect(LOST_FOCUS_DELAY_MS).toBe(300);
    f.runTimers();
    expect(reports).toEqual([false]);
    f.state.visible = true;
    f.fire("visibilitychange");
    expect(reports).toEqual([false, true]);
  });

  it("ignores a short blur that ends before the delay", () => {
    const f = fakeEnv();
    const reports: boolean[] = [];
    watchFocus((v) => reports.push(v), f.env);
    f.state.focus = false;
    f.fire("blur");
    f.state.focus = true;
    f.fire("focus");
    f.runTimers();
    expect(reports).toEqual([]);
  });

  it("stops listening and restores focus on stop", () => {
    const f = fakeEnv();
    const reports: boolean[] = [];
    const stop = watchFocus((v) => reports.push(v), f.env);
    f.state.focus = false;
    f.fire("blur");
    f.runTimers();
    stop();
    expect(reports).toEqual([false, true]);
    expect(f.handlers.size).toBe(0);
  });
});
