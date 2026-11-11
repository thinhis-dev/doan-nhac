import { useMemo, useState } from "react";
import { normalizeText, type Song } from "../../shared/song";
import { filterSongs, SOURCE_MODES, type SourceMode, type SourceSelection, sourceOptions } from "../lib/song-filter";
import { vi } from "../lib/strings-vi";
import { Chip } from "./chip";
import { SegmentButtons } from "./segment-buttons";
import { TextInput } from "./text-input";

const MODE_LABEL: Record<SourceMode, string> = {
  all: vi.source.all,
  tag: vi.source.tag,
  artist: vi.source.artist,
  decade: vi.source.decade,
  list: vi.source.list,
};

const ARTIST_CHIP_LIMIT = 40;

type Props = { songs: Song[]; value: SourceSelection; onChange: (v: SourceSelection) => void };

/** Picks the song source from the library of this browser, with a live match counter. */
export function SongSourcePicker({ songs, value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const options = useMemo(() => sourceOptions(songs, value.mode), [songs, value.mode]);
  const count = useMemo(() => filterSongs(songs, value).length, [songs, value]);

  const shown = useMemo(() => {
    if (value.mode !== "artist") return options;
    const q = normalizeText(query);
    const matches = q ? options.filter((o) => normalizeText(o).includes(q)) : options;
    // Keep selected artists visible, then the first matches.
    const selected = options.filter((o) => value.values.includes(o));
    return [...new Set([...selected, ...matches.slice(0, ARTIST_CHIP_LIMIT)])];
  }, [options, query, value.mode, value.values]);

  const toggle = (v: string) => {
    const values = value.values.includes(v) ? value.values.filter((x) => x !== v) : [...value.values, v];
    onChange({ ...value, values });
  };

  return (
    <div className="flex flex-col gap-3">
      <SegmentButtons
        label={vi.params.source}
        options={SOURCE_MODES.map((m) => ({ value: m, label: MODE_LABEL[m] }))}
        value={value.mode}
        onChange={(mode) => {
          setQuery("");
          onChange({ mode, values: [] });
        }}
      />
      {value.mode === "artist" ? (
        <TextInput label={vi.source.searchArtist} hideLabel placeholder={vi.source.searchArtist} value={query} onChange={(e) => setQuery(e.target.value)} />
      ) : null}
      {value.mode !== "all" ? (
        options.length === 0 ? (
          <p className="text-small text-text-muted">{vi.source.noOptions}</p>
        ) : (
          <div className="flex max-h-56 flex-wrap gap-x-2 overflow-y-auto">
            {shown.map((o) => (
              <Chip key={o} selected={value.values.includes(o)} onClick={() => toggle(o)}>
                {o}
              </Chip>
            ))}
          </div>
        )
      ) : null}
      <p className="tabular text-small font-semibold text-text-muted" aria-live="polite">
        {value.mode !== "all" && value.values.length === 0 ? vi.source.pickHint : vi.source.matching(count)}
      </p>
    </div>
  );
}
