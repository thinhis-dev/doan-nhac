import { DoorOpen, Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { NAME_MAX } from "../../shared/game-rules";
import { GameButton } from "../components/game-button";
import { ScreenFrame } from "../components/screen-frame";
import { TextInput } from "../components/text-input";
import { readLastName, saveLastName } from "../lib/last-name";
import { errorText, vi } from "../lib/strings-vi";

type Props = {
  onBack: () => void;
  onCreate: (name: string) => Promise<string | null>;
  onJoin: (code: string, name: string) => Promise<string | null>;
};

const CODE_LENGTH = 4;

/** Create a room or join one with a code. Errors sit below their field. */
export function PartyEntryScreen({ onBack, onCreate, onJoin }: Props) {
  const [name, setName] = useState(readLastName);
  const [code, setCode] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"create" | "join" | null>(null);

  const validName = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(vi.party.nameRequired);
      return null;
    }
    setNameError(null);
    saveLastName(trimmed);
    return trimmed;
  };

  const create = async () => {
    const n = validName();
    if (!n) return;
    setBusy("create");
    const err = await onCreate(n);
    setBusy(null);
    if (err) setNameError(errorText(err));
  };

  const join = async (e: FormEvent) => {
    e.preventDefault();
    const n = validName();
    if (!n) return;
    if (code.length !== CODE_LENGTH) {
      setCodeError(vi.party.codeInvalid);
      return;
    }
    setCodeError(null);
    setBusy("join");
    const err = await onJoin(code, n);
    setBusy(null);
    if (err) setCodeError(errorText(err));
  };

  return (
    <ScreenFrame title={vi.party.title} onBack={onBack}>
      <TextInput
        label={vi.party.nameLabel}
        help={vi.party.nameHelp}
        error={nameError}
        value={name}
        maxLength={NAME_MAX}
        autoComplete="nickname"
        enterKeyHint="done"
        onChange={(e) => setName(e.target.value)}
      />
      <section className="flex flex-col gap-3 rounded-button bg-surface p-4 shadow-card">
        <p className="text-small text-text-muted">{vi.party.createHint}</p>
        <GameButton variant="cta" full icon={Plus} loading={busy === "create"} disabled={busy !== null} onClick={create}>
          {vi.party.create}
        </GameButton>
      </section>
      <div className="flex items-center gap-3 text-small text-text-muted" aria-hidden>
        <span className="h-0.5 flex-1 bg-surface-2" />
        {vi.party.or}
        <span className="h-0.5 flex-1 bg-surface-2" />
      </div>
      <form onSubmit={join} className="flex flex-col gap-3 rounded-button bg-surface p-4 shadow-card">
        <TextInput
          label={vi.party.codeLabel}
          help={vi.party.codeHelp}
          error={codeError}
          value={code}
          maxLength={CODE_LENGTH}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className="[&_input]:font-display [&_input]:text-h2 [&_input]:tracking-[0.3em] [&_input]:uppercase"
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
        />
        <GameButton type="submit" variant="primary" full icon={DoorOpen} loading={busy === "join"} disabled={busy !== null}>
          {vi.party.join}
        </GameButton>
      </form>
    </ScreenFrame>
  );
}
