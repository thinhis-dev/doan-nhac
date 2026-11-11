import { Download, EllipsisVertical, Plus, RotateCcw, Upload, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { normalizeText, type Song } from "../../shared/song";
import { BottomSheet } from "../components/bottom-sheet";
import { Chip } from "../components/chip";
import { ConfirmDialog } from "../components/confirm-dialog";
import { GameButton, IconButton } from "../components/game-button";
import { ScreenFrame } from "../components/screen-frame";
import { SongAddSheet } from "../components/song-add-sheet";
import { SongCard } from "../components/song-card";
import { SongEditSheet } from "../components/song-edit-sheet";
import { Spinner } from "../components/spinner";
import { TextInput } from "../components/text-input";
import { useToast } from "../components/toast";
import { library, useLibrary } from "../lib/library-store";
import { previewPlayer, usePreview } from "../lib/preview-player";
import { sourceOptions } from "../lib/song-filter";
import { vi } from "../lib/strings-vi";

const PAGE_SIZE = 50;

type Filter = { kind: "all" } | { kind: "off" } | { kind: "tag" | "decade" | "list"; value: string };

function matchesFilter(s: Song, f: Filter): boolean {
  switch (f.kind) {
    case "all":
      return true;
    case "off":
      return !s.enabled;
    case "tag":
      return s.tags.includes(f.value);
    case "decade":
      return s.decade === f.value;
    case "list":
      return s.lists.includes(f.value);
  }
}

function sameFilter(a: Filter, b: Filter) {
  return a.kind === b.kind && ("value" in a ? a.value : "") === ("value" in b ? b.value : "");
}

export function LibraryScreen({ onBack }: { onBack: () => void }) {
  const lib = useLibrary();
  const toast = useToast();
  const playingId = usePreview();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>({ kind: "all" });
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [editing, setEditing] = useState<Song | null>(null);
  const [adding, setAdding] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pendingImport, setPendingImport] = useState<Song[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const songs = lib.songs;
  const tags = useMemo(() => sourceOptions(songs.map((s) => ({ ...s, enabled: true })), "tag"), [songs]);
  const decades = useMemo(() => sourceOptions(songs.map((s) => ({ ...s, enabled: true })), "decade"), [songs]);
  const lists = useMemo(() => sourceOptions(songs.map((s) => ({ ...s, enabled: true })), "list"), [songs]);

  const filtered = useMemo(() => {
    const q = normalizeText(query);
    return songs.filter(
      (s) => matchesFilter(s, filter) && (!q || normalizeText(`${s.title} ${s.artist}`).includes(q)),
    );
  }, [songs, query, filter]);

  const warnIfNotSaved = (ok: boolean) => {
    if (!ok) toast(vi.library.storageFailed, "error");
  };

  const chips: { label: string; f: Filter }[] = [
    { label: vi.library.filterAll, f: { kind: "all" } },
    { label: vi.library.filterOff, f: { kind: "off" } },
    ...tags.map((v) => ({ label: v, f: { kind: "tag", value: v } as Filter })),
    ...decades.map((v) => ({ label: v, f: { kind: "decade", value: v } as Filter })),
    ...lists.map((v) => ({ label: v, f: { kind: "list", value: v } as Filter })),
  ];

  const clearFilter = () => {
    setQuery("");
    setFilter({ kind: "all" });
    setLimit(PAGE_SIZE);
  };

  const exportCsv = () => {
    const blob = new Blob([library.exportCsv()], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "songs.csv";
    a.click();
    URL.revokeObjectURL(url);
    setMenuOpen(false);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setMenuOpen(false);
    try {
      const parsed = library.parseImport(await file.text());
      if (!parsed.ok) {
        toast(parsed.error.row ? vi.importCsv.badRow(parsed.error.row) : vi.importCsv.badFile, "error");
        return;
      }
      setPendingImport(parsed.songs);
    } catch {
      toast(vi.importCsv.badFile, "error");
    }
  };

  const doImport = (mode: "merge" | "replace") => {
    if (!pendingImport) return;
    warnIfNotSaved(library.importSongs(pendingImport, mode));
    toast(vi.importCsv.done(pendingImport.length));
    setPendingImport(null);
  };

  return (
    <ScreenFrame
      title={vi.library.title}
      onBack={onBack}
      right={<IconButton icon={EllipsisVertical} label={vi.library.menu} onClick={() => setMenuOpen(true)} />}
    >
      <div className="sticky top-0 z-sticky -mx-4 flex flex-col gap-2 bg-bg px-4 pt-1 pb-2 md:-mx-6 md:px-6">
        <div className="flex items-end gap-2">
          <TextInput
            label={vi.library.search}
            hideLabel
            type="search"
            placeholder={vi.library.search}
            value={query}
            className="flex-1"
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE_SIZE);
            }}
          />
          <GameButton variant="cta" icon={Plus} className="min-h-[52px]! px-3" onClick={() => setAdding(true)}>
            {vi.library.add}
          </GameButton>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          {chips.map((c) => (
            <Chip
              key={`${c.f.kind}-${c.label}`}
              selected={sameFilter(filter, c.f)}
              onClick={() => {
                setFilter(c.f);
                setLimit(PAGE_SIZE);
              }}
            >
              <span className="whitespace-nowrap">{c.label}</span>
            </Chip>
          ))}
        </div>
        <p className="tabular text-small text-text-muted" aria-live="polite">
          {vi.library.count(filtered.length, songs.length)}
        </p>
      </div>

      {lib.status === "loading" ? (
        <div className="flex justify-center py-8">
          <Spinner label={vi.common.loading} />
        </div>
      ) : lib.status === "error" ? (
        <p role="alert" className="text-body text-danger">
          {vi.library.loadFailed}
        </p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-body text-text-muted">{vi.library.empty}</p>
          <GameButton variant="ghost" icon={X} onClick={clearFilter}>
            {vi.library.clearFilter}
          </GameButton>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {filtered.slice(0, limit).map((s) => (
              <SongCard
                key={s.trackId}
                song={s}
                playing={playingId === s.trackId}
                onPlay={() => previewPlayer.toggle(s.trackId, s.previewUrl)}
                onOpen={() => setEditing(s)}
                onToggle={(enabled) => warnIfNotSaved(library.updateSong({ ...s, enabled }))}
              />
            ))}
          </ul>
          {filtered.length > limit ? (
            <GameButton variant="ghost" full onClick={() => setLimit(limit + PAGE_SIZE)}>
              {vi.library.more}
            </GameButton>
          ) : null}
        </>
      )}

      <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => {
        void onFile(e.target.files?.[0]);
        e.target.value = "";
      }} />

      <BottomSheet open={menuOpen} title={vi.library.menu} onClose={() => setMenuOpen(false)}>
        <div className="flex flex-col gap-3 pt-2">
          <GameButton variant="primary" full icon={Upload} onClick={() => fileRef.current?.click()}>
            {vi.library.import}
          </GameButton>
          <GameButton variant="primary" full icon={Download} onClick={exportCsv}>
            {vi.library.export}
          </GameButton>
          <p className="text-small text-text-muted">{vi.library.storageNote}</p>
          <GameButton variant="danger" full icon={RotateCcw} onClick={() => {
            setMenuOpen(false);
            setConfirmReset(true);
          }}>
            {vi.library.reset}
          </GameButton>
        </div>
      </BottomSheet>

      <SongEditSheet
        song={editing}
        tagSuggestions={tags}
        listSuggestions={lists}
        onClose={() => setEditing(null)}
        onSave={(s) => {
          warnIfNotSaved(library.updateSong(s));
          toast(vi.edit.saved);
          setEditing(null);
        }}
        onDelete={(id) => {
          warnIfNotSaved(library.remove(id));
          toast(vi.edit.deleted);
          setEditing(null);
        }}
      />

      <SongAddSheet
        open={adding}
        has={(id) => library.has(id)}
        playingId={playingId}
        onPlay={(s) => previewPlayer.toggle(s.trackId, s.previewUrl)}
        onAdd={(s) => {
          warnIfNotSaved(library.add(s));
          toast(vi.add.added(s.title));
        }}
        onClose={() => {
          previewPlayer.stop();
          setAdding(false);
        }}
      />

      <ConfirmDialog
        open={confirmReset}
        title={vi.library.resetTitle}
        body={vi.library.resetBody}
        confirmLabel={vi.library.reset}
        onCancel={() => setConfirmReset(false)}
        onConfirm={async () => {
          setConfirmReset(false);
          const ok = await library.reset();
          toast(ok ? vi.library.resetDone : vi.library.loadFailed, ok ? "info" : "error");
        }}
      />

      <BottomSheet
        open={pendingImport !== null}
        title={vi.importCsv.title}
        layer="dialog"
        onClose={() => setPendingImport(null)}
        footer={
          <>
            <GameButton variant="primary" full onClick={() => doImport("merge")}>
              {vi.importCsv.merge}
            </GameButton>
            <GameButton variant="danger" full onClick={() => doImport("replace")}>
              {vi.importCsv.replace}
            </GameButton>
          </>
        }
      >
        <p className="text-body text-text-muted">{vi.importCsv.body(pendingImport?.length ?? 0)}</p>
      </BottomSheet>
    </ScreenFrame>
  );
}
