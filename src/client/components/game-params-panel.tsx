import { QUESTION_COUNTS, QUESTION_SECONDS } from "../../shared/game-rules";
import type { GameParams } from "../../shared/protocol";
import type { Song } from "../../shared/song";
import type { SourceSelection } from "../lib/song-filter";
import { vi } from "../lib/strings-vi";
import { SegmentButtons } from "./segment-buttons";
import { SongSourcePicker } from "./song-source-picker";
import { Toggle } from "./toggle";

type Props = {
  params: GameParams;
  onParams: (p: GameParams) => void;
  songs: Song[];
  source: SourceSelection;
  onSource: (s: SourceSelection) => void;
};

/** The five game parameters set by the Solo player or the Party host. */
export function GameParamsPanel({ params, onParams, songs, source, onSource }: Props) {
  return (
    <section className="flex flex-col gap-5 rounded-button bg-surface p-4 shadow-card" aria-label={vi.params.title}>
      <SegmentButtons
        label={vi.params.questionCount}
        options={QUESTION_COUNTS.map((n) => ({ value: n, label: vi.params.questions(n) }))}
        value={params.questionCount}
        onChange={(questionCount) => onParams({ ...params, questionCount })}
      />
      <SegmentButtons
        label={vi.params.questionSeconds}
        options={QUESTION_SECONDS.map((n) => ({ value: n, label: vi.params.seconds(n) }))}
        value={params.questionSeconds}
        onChange={(questionSeconds) => onParams({ ...params, questionSeconds })}
      />
      <Toggle
        label={vi.params.wrongPenalty}
        hint={vi.params.wrongPenaltyHint}
        checked={params.wrongPenalty}
        onChange={(wrongPenalty) => onParams({ ...params, wrongPenalty })}
      />
      <Toggle
        label={vi.params.requireFocus}
        hint={vi.params.requireFocusHint}
        checked={params.requireFocus}
        onChange={(requireFocus) => onParams({ ...params, requireFocus })}
      />
      <SongSourcePicker songs={songs} value={source} onChange={onSource} />
    </section>
  );
}

/** The chosen parameters as read-only text for party guests. */
export function GameParamsSummary({ params }: { params: GameParams }) {
  return (
    <section className="flex flex-col gap-1 rounded-button bg-surface p-4 shadow-card">
      <h2 className="text-small font-semibold text-text-muted">{vi.lobby.chosenParams}</h2>
      <p className="text-body">{vi.params.summary(params.questionCount, params.questionSeconds)}</p>
      <p className="text-body">
        {vi.params.wrongPenalty}: {params.wrongPenalty ? vi.common.on : vi.common.off}
      </p>
      <p className="text-body">
        {vi.params.requireFocus}: {params.requireFocus ? vi.common.on : vi.common.off}
      </p>
      {params.requireFocus ? <p className="text-small text-text-muted">{vi.params.requireFocusHint}</p> : null}
    </section>
  );
}
