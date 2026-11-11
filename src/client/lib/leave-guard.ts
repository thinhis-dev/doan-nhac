const MARK = "doan-nhac-room";

/**
 * Inside a room: the browser back action asks to leave instead of leaving.
 * One history entry is pushed on entry. A back action calls `onBack` and
 * pushes the entry again, so the page stays. During a game, a tab close or
 * reload shows the browser leave warning.
 */
export function guardRoom(onBack: () => void): { setGameRunning(running: boolean): void; release(): void } {
  let running = false;
  if (history.state?.[MARK] !== true) history.pushState({ [MARK]: true }, "");

  const onPop = () => {
    history.pushState({ [MARK]: true }, "");
    onBack();
  };
  const onBeforeUnload = (e: BeforeUnloadEvent) => {
    if (!running) return;
    e.preventDefault();
    e.returnValue = "";
  };
  window.addEventListener("popstate", onPop);
  window.addEventListener("beforeunload", onBeforeUnload);

  return {
    setGameRunning(value) {
      running = value;
    },
    release() {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("beforeunload", onBeforeUnload);
      // Drop the pushed entry so that the next back action leaves the page as usual.
      if (history.state?.[MARK] === true) history.back();
    },
  };
}
