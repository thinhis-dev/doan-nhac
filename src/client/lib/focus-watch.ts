export const LOST_FOCUS_DELAY_MS = 300;

type Target = Pick<EventTarget, "addEventListener" | "removeEventListener">;

export type FocusEnv = {
  doc: Target & { visibilityState: DocumentVisibilityState; hasFocus(): boolean };
  win: Target;
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (h: unknown) => void;
};

/**
 * Reports focus changes while a game runs. A lost-focus report waits 300 ms,
 * so that a short system dialog does not count. Returns a stop function.
 */
export function watchFocus(report: (focused: boolean) => void, env: FocusEnv): () => void {
  const isFocused = () => env.doc.visibilityState === "visible" && env.doc.hasFocus();
  let reported = true;
  let pending: unknown;

  const check = () => {
    const now = isFocused();
    if (now) {
      if (pending !== undefined) env.clearTimeout(pending);
      pending = undefined;
      if (!reported) {
        reported = true;
        report(true);
      }
      return;
    }
    if (!reported || pending !== undefined) return;
    pending = env.setTimeout(() => {
      pending = undefined;
      if (!isFocused() && reported) {
        reported = false;
        report(false);
      }
    }, LOST_FOCUS_DELAY_MS);
  };

  env.doc.addEventListener("visibilitychange", check);
  env.win.addEventListener("blur", check);
  env.win.addEventListener("focus", check);
  // A game can start while the tab is already in the background.
  check();

  return () => {
    env.doc.removeEventListener("visibilitychange", check);
    env.win.removeEventListener("blur", check);
    env.win.removeEventListener("focus", check);
    if (pending !== undefined) env.clearTimeout(pending);
    if (!reported) report(true);
  };
}

export function browserFocusEnv(): FocusEnv {
  return {
    doc: document,
    win: window,
    setTimeout: (fn, ms) => window.setTimeout(fn, ms),
    clearTimeout: (h) => window.clearTimeout(h as number),
  };
}
