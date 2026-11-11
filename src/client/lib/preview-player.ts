import { useEffect, useSyncExternalStore } from "react";

/**
 * A second audio element, used only on the library screen. One preview
 * plays at a time. Leaving the screen stops it. The game player is separate.
 */
class PreviewPlayer {
  private el: HTMLAudioElement | null = null;
  private playingId: number | null = null;
  private listeners = new Set<() => void>();

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getPlaying = () => this.playingId;

  private set(id: number | null) {
    this.playingId = id;
    for (const fn of this.listeners) fn();
  }

  toggle(trackId: number, url: string) {
    if (this.playingId === trackId) {
      this.stop();
      return;
    }
    if (!this.el) {
      this.el = new Audio();
      this.el.addEventListener("ended", () => this.set(null));
      this.el.addEventListener("error", () => this.set(null));
    }
    this.el.src = url;
    this.set(trackId);
    this.el.play().catch(() => this.set(null));
  }

  stop() {
    this.el?.pause();
    this.set(null);
  }
}

export const previewPlayer = new PreviewPlayer();

/** The id of the playing preview. Stops the preview when the screen unmounts. */
export function usePreview(): number | null {
  useEffect(() => () => previewPlayer.stop(), []);
  return useSyncExternalStore(previewPlayer.subscribe, previewPlayer.getPlaying);
}
