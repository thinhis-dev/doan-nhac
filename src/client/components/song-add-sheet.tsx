import { Check, Pause, Play, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import type { Song } from "../../shared/song";
import { searchItunes } from "../lib/itunes-search";
import { vi } from "../lib/strings-vi";
import { BottomSheet } from "./bottom-sheet";
import { GameButton, IconButton } from "./game-button";
import { Spinner } from "./spinner";
import { TextInput } from "./text-input";

type Props = {
  open: boolean;
  has: (trackId: number) => boolean;
  playingId: number | null;
  onPlay: (s: Song) => void;
  onAdd: (s: Song) => void;
  onClose: () => void;
};

const DEBOUNCE_MS = 500;
const MIN_CHARS = 2;

/** Adds songs from iTunes search with no manual ids or URLs. */
export function SongAddSheet({ open, has, playingId, onPlay, onAdd, onClose }: Props) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Song[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = term.trim();
    if (q.length < MIN_CHARS) {
      setResults(null);
      setError(null);
      return;
    }
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const res = await searchItunes(q);
      if (res.ok) {
        setResults(res.songs);
        setError(null);
      } else if (res.error !== "aborted") {
        setError(res.error === "rate-limited" ? vi.add.rateLimited : vi.add.failed);
      }
      if (!res.ok && res.error === "aborted") return;
      setLoading(false);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [term]);

  return (
    <BottomSheet open={open} title={vi.add.title} onClose={onClose}>
      <div className="flex flex-col gap-3 pt-2">
        <TextInput label={vi.add.search} help={vi.add.searchHelp} type="search" value={term} autoFocus onChange={(e) => setTerm(e.target.value)} />
        {loading ? (
          <div className="flex justify-center py-4">
            <Spinner label={vi.common.loading} />
          </div>
        ) : null}
        {error ? (
          <p role="alert" className="text-small font-semibold text-danger">
            {error}
          </p>
        ) : null}
        {results && !loading && results.length === 0 ? <p className="text-body text-text-muted">{vi.add.noResults}</p> : null}
        <ul className="flex flex-col gap-2">
          {results?.map((s) => {
            const exists = has(s.trackId);
            return (
              <li key={s.trackId} className="flex items-center gap-2 rounded-button bg-surface-2 p-2">
                <IconButton
                  icon={playingId === s.trackId ? Pause : Play}
                  label={playingId === s.trackId ? vi.library.stop : vi.library.play(s.title)}
                  onClick={() => onPlay(s)}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-semibold">{s.title}</p>
                  <p className="truncate text-small text-text-muted">
                    {s.artist}
                    {s.releaseYear ? ` · ${s.releaseYear}` : ""}
                  </p>
                </div>
                {exists ? (
                  <span className="inline-flex min-h-12 items-center gap-1 px-2 text-small font-semibold text-success">
                    <Check size={20} strokeWidth={2.25} aria-hidden />
                    {vi.add.exists}
                  </span>
                ) : (
                  <GameButton variant="primary" icon={Plus} className="min-h-12! px-3" onClick={() => onAdd(s)}>
                    {vi.add.add}
                  </GameButton>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </BottomSheet>
  );
}
