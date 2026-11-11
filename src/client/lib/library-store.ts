import { parseSongsCsv } from "../../shared/csv";
import type { Song } from "../../shared/song";

export const STORAGE_KEY = "library.v1";
export const DEFAULT_CSV_URL = "/songs.csv";

export type LibraryStatus = "idle" | "loading" | "ready" | "error";
export type LibrarySnapshot = { status: LibraryStatus; songs: Song[]; storageOk: boolean };

/** The part of Storage that the store uses. */
export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type Fetcher = (url: string) => Promise<{ ok: boolean; text(): Promise<string> }>;

/**
 * The working library of this browser. The first visit copies the default
 * CSV into localStorage. Edits change only this browser.
 */
export class LibraryStore {
  private snapshot: LibrarySnapshot = { status: "idle", songs: [], storageOk: true };
  private listeners = new Set<() => void>();

  constructor(
    private readonly storage: StorageLike | null,
    private readonly fetcher: Fetcher,
  ) {}

  getSnapshot = (): LibrarySnapshot => this.snapshot;

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  protected update(next: Partial<LibrarySnapshot>) {
    this.snapshot = { ...this.snapshot, ...next };
    for (const fn of this.listeners) fn();
  }

  /** Loads once: localStorage first, else the default CSV. */
  async load(): Promise<void> {
    if (this.snapshot.status === "loading" || this.snapshot.status === "ready") return;
    const cached = this.readStorage();
    if (cached) {
      this.update({ status: "ready", songs: cached });
      return;
    }
    this.update({ status: "loading" });
    const songs = await this.fetchDefault();
    if (!songs) {
      this.update({ status: "error" });
      return;
    }
    this.update({ status: "ready", songs });
    this.persist(songs);
  }

  protected async fetchDefault(): Promise<Song[] | null> {
    try {
      const res = await this.fetcher(DEFAULT_CSV_URL);
      if (!res.ok) return null;
      const parsed = parseSongsCsv(await res.text());
      return parsed.ok ? parsed.songs : null;
    } catch {
      return null;
    }
  }

  private readStorage(): Song[] | null {
    try {
      const raw = this.storage?.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as { songs?: Song[] };
      return Array.isArray(data.songs) ? data.songs : null;
    } catch {
      return null;
    }
  }

  /** Writes to localStorage. On failure the library stays in memory and storageOk turns false. */
  protected persist(songs: Song[]): boolean {
    try {
      if (!this.storage) throw new Error("no storage");
      this.storage.setItem(STORAGE_KEY, JSON.stringify({ songs }));
      if (!this.snapshot.storageOk) this.update({ storageOk: true });
      return true;
    } catch {
      this.update({ storageOk: false });
      return false;
    }
  }
}

function browserStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export const library = new LibraryStore(typeof window === "undefined" ? null : browserStorage(), (url) => fetch(url));
