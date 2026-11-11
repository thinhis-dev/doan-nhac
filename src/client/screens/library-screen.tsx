import { ScreenFrame } from "../components/screen-frame";
import { useLibrary } from "../lib/library-store";
import { vi } from "../lib/strings-vi";

export function LibraryScreen({ onBack }: { onBack: () => void }) {
  const lib = useLibrary();
  return (
    <ScreenFrame title={vi.library.title} onBack={onBack}>
      <p className="text-body text-text-muted">{vi.library.count(lib.songs.length, lib.songs.length)}</p>
    </ScreenFrame>
  );
}
