import { Play } from "lucide-react";
import { useState } from "react";
import { NAME_MAX } from "../../shared/game-rules";
import type { GameParams } from "../../shared/protocol";
import type { Song } from "../../shared/song";
import { GameButton } from "../components/game-button";
import { GameParamsPanel } from "../components/game-params-panel";
import { RandomNameButton } from "../components/random-name-button";
import { ScreenFrame } from "../components/screen-frame";
import { TextInput } from "../components/text-input";
import { readLastName, saveLastName } from "../lib/last-name";
import type { SourceSelection } from "../lib/song-filter";
import { vi } from "../lib/strings-vi";

type Props = {
  songs: Song[];
  params: GameParams;
  onParams: (p: GameParams) => void;
  source: SourceSelection;
  onSource: (s: SourceSelection) => void;
  poolPlayable: boolean;
  starting: boolean;
  startError: string | null;
  onStart: (name: string) => void;
  onBack: () => void;
};

/** Solo: an optional name and the game parameters. */
export function SoloSetupScreen(props: Props) {
  const [name, setName] = useState(readLastName);
  const start = () => {
    const trimmed = name.trim();
    if (trimmed) saveLastName(trimmed);
    props.onStart(trimmed || vi.solo.defaultName);
  };
  return (
    <ScreenFrame
      title={vi.solo.title}
      onBack={props.onBack}
      footer={
        <div className="flex flex-col gap-2">
          <GameButton variant="cta" full icon={Play} disabled={!props.poolPlayable} loading={props.starting} onClick={start}>
            {vi.solo.start}
          </GameButton>
          {!props.poolPlayable || props.startError ? (
            <p className="text-center text-small font-semibold text-text-muted" role="status">
              {props.startError ?? vi.lobby.poolTooSmall}
            </p>
          ) : null}
        </div>
      }
    >
      <TextInput label={vi.solo.nameLabel} value={name} maxLength={NAME_MAX} autoComplete="nickname" onChange={(e) => setName(e.target.value)} />
      <RandomNameButton disabled={props.starting} onPick={setName} />
      <GameParamsPanel
        params={props.params}
        onParams={props.onParams}
        songs={props.songs}
        source={props.source}
        onSource={props.onSource}
      />
    </ScreenFrame>
  );
}
