import { Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { DECADES, type Song } from "../../shared/song";
import { vi } from "../lib/strings-vi";
import { BottomSheet } from "./bottom-sheet";
import { ConfirmDialog } from "./confirm-dialog";
import { GameButton } from "./game-button";
import { SegmentButtons } from "./segment-buttons";
import { TagInput } from "./tag-input";
import { TextInput } from "./text-input";

type Props = {
  song: Song | null;
  tagSuggestions: string[];
  listSuggestions: string[];
  onSave: (s: Song) => void;
  onDelete: (trackId: number) => void;
  onClose: () => void;
};

const DECADE_LABEL: Record<string, string> = { "1990s": "1990", "2000s": "2000", "2010s": "2010", "2020s": "2020" };

export function SongEditSheet({ song, tagSuggestions, listSuggestions, onSave, onDelete, onClose }: Props) {
  const [draft, setDraft] = useState<Song | null>(song);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => setDraft(song), [song]);

  const invalid = !!draft && (!draft.title.trim() || !draft.artist.trim());

  return (
    <>
      <BottomSheet
        open={!!song && !confirmDelete}
        title={vi.edit.title}
        onClose={onClose}
        footer={
          draft ? (
            <>
              <GameButton
                variant="cta"
                full
                icon={Save}
                disabled={invalid}
                onClick={() => onSave({ ...draft, title: draft.title.trim(), artist: draft.artist.trim() })}
              >
                {vi.common.save}
              </GameButton>
              <GameButton variant="danger" full icon={Trash2} onClick={() => setConfirmDelete(true)}>
                {vi.edit.delete}
              </GameButton>
            </>
          ) : null
        }
      >
        {draft ? (
          <div className="flex flex-col gap-4 pt-2">
            <TextInput
              label={vi.edit.songTitle}
              value={draft.title}
              error={draft.title.trim() ? null : vi.edit.required}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
            <TextInput
              label={vi.edit.artist}
              value={draft.artist}
              error={draft.artist.trim() ? null : vi.edit.required}
              onChange={(e) => setDraft({ ...draft, artist: e.target.value })}
            />
            <SegmentButtons
              label={vi.edit.decade}
              options={DECADES.map((d) => ({ value: d as string, label: DECADE_LABEL[d] ?? d }))}
              value={draft.decade}
              onChange={(decade) => setDraft({ ...draft, decade })}
            />
            <TagInput label={vi.edit.tags} values={draft.tags} suggestions={tagSuggestions} onChange={(tags) => setDraft({ ...draft, tags })} />
            <TagInput label={vi.edit.lists} values={draft.lists} suggestions={listSuggestions} onChange={(lists) => setDraft({ ...draft, lists })} />
            <p className="text-small text-text-muted">
              {vi.edit.info(draft.trackId, draft.releaseYear === null ? "—" : String(draft.releaseYear), draft.itunesGenre || "—")}
            </p>
          </div>
        ) : null}
      </BottomSheet>
      <ConfirmDialog
        open={confirmDelete}
        title={vi.edit.deleteTitle}
        body={vi.edit.deleteBody}
        confirmLabel={vi.edit.delete}
        onConfirm={() => {
          setConfirmDelete(false);
          if (draft) onDelete(draft.trackId);
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
