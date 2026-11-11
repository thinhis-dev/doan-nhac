import { Pause, Play } from "lucide-react";
import type { Song } from "../../shared/song";
import { vi } from "../lib/strings-vi";
import { Chip } from "./chip";

type Props = {
  song: Song;
  playing: boolean;
  onPlay: () => void;
  onOpen: () => void;
  onToggle: (enabled: boolean) => void;
};

/** One library song: play button, title, artist, tag chips and an on/off switch. */
export function SongCard({ song, playing, onPlay, onOpen, onToggle }: Props) {
  const PlayIcon = playing ? Pause : Play;
  return (
    <li className={`flex items-center gap-2 rounded-button bg-surface p-2 shadow-card ${song.enabled ? "" : "opacity-60"}`}>
      <button
        type="button"
        onClick={onPlay}
        aria-label={playing ? vi.library.stop : vi.library.play(song.title)}
        className="focus-ring flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-white enabled:active:scale-95"
      >
        <PlayIcon size={20} strokeWidth={2.25} aria-hidden />
      </button>
      <button type="button" onClick={onOpen} className="focus-ring flex min-h-12 min-w-0 flex-1 flex-col items-start rounded-chip px-1 text-left">
        <span className="w-full truncate text-body font-semibold">{song.title}</span>
        <span className="w-full truncate text-small text-text-muted">{song.artist}</span>
        {song.tags.length || song.lists.length || song.decade ? (
          <span className="mt-1 flex flex-wrap gap-1">
            {song.decade ? <Chip small>{song.decade}</Chip> : null}
            {[...song.tags, ...song.lists].slice(0, 4).map((t) => (
              <Chip key={t} small>
                {t}
              </Chip>
            ))}
          </span>
        ) : null}
      </button>
      <button
        type="button"
        role="switch"
        aria-checked={song.enabled}
        aria-label={`${vi.library.enabled}: ${song.title}`}
        onClick={() => onToggle(!song.enabled)}
        className="focus-ring relative flex h-12 w-[52px] shrink-0 items-center"
      >
        <span className={`h-8 w-[52px] rounded-full border-2 ${song.enabled ? "border-primary bg-primary" : "border-outline bg-surface-2"}`} />
        <span
          className={`absolute top-1/2 left-1 size-6 -translate-y-1/2 rounded-full bg-text transition-transform duration-200 ease-pop ${song.enabled ? "translate-x-5" : ""}`}
        />
      </button>
    </li>
  );
}
