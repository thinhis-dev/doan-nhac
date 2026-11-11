import { Copy, Crown, Play, Volume2, VolumeX } from "lucide-react";
import { MAX_PLAYERS } from "../../shared/game-rules";
import type { GameParams, RoomState } from "../../shared/protocol";
import type { Song } from "../../shared/song";
import { Avatar } from "../components/avatar";
import { GameButton, IconButton } from "../components/game-button";
import { GameParamsPanel, GameParamsSummary } from "../components/game-params-panel";
import { ScreenFrame } from "../components/screen-frame";
import { useToast } from "../components/toast";
import type { SourceSelection } from "../lib/song-filter";
import { vi } from "../lib/strings-vi";

type Props = {
  room: RoomState;
  meId: string | null;
  isHost: boolean;
  songs: Song[];
  params: GameParams;
  onParams: (p: GameParams) => void;
  source: SourceSelection;
  onSource: (s: SourceSelection) => void;
  poolPlayable: boolean;
  starting: boolean;
  startError: string | null;
  onStart: () => void;
  onBack: () => void;
};

export function LobbyScreen(props: Props) {
  const { room, meId, isHost, poolPlayable, starting, startError } = props;
  const toast = useToast();
  const notReady = room.players.filter((p) => !p.audioReady);

  let lockReason: string | null = null;
  if (room.players.length < 2) lockReason = vi.lobby.needPlayers;
  else if (notReady.length > 0) lockReason = vi.lobby.waitNames(notReady.map((p) => p.name).join(", "));
  else if (!poolPlayable) lockReason = vi.lobby.poolTooSmall;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      toast(vi.lobby.copied);
    } catch {
      toast(room.code);
    }
  };

  return (
    <ScreenFrame
      title={vi.lobby.title}
      onBack={props.onBack}
      footer={
        isHost ? (
          <div className="flex flex-col gap-2">
            <GameButton variant="cta" full icon={Play} disabled={lockReason !== null} loading={starting} onClick={props.onStart}>
              {vi.lobby.start}
            </GameButton>
            {lockReason || startError ? (
              <p className="text-center text-small font-semibold text-text-muted" role="status">
                {startError ?? lockReason}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="py-3 text-center text-body text-text-muted" role="status">
            {vi.lobby.waitHost}
          </p>
        )
      }
    >
      <section className="flex items-center gap-3 rounded-button bg-surface p-4 shadow-card">
        <div className="flex-1">
          <p className="text-small text-text-muted">{vi.lobby.code}</p>
          <p className="font-display text-display font-extrabold tracking-[0.2em] text-cta">{room.code}</p>
        </div>
        <IconButton icon={Copy} label={vi.lobby.copy} onClick={copy} className="border-2 border-outline" />
      </section>

      <section aria-label={vi.lobby.players(room.players.length, MAX_PLAYERS)}>
        <h2 className="mb-2 text-body font-medium">{vi.lobby.players(room.players.length, MAX_PLAYERS)}</h2>
        <ul className="flex flex-col gap-2" aria-live="polite">
          {room.players.map((p) => (
            <li key={p.id} className="flex animate-pop items-center gap-3 rounded-button bg-surface px-4 py-2 shadow-card">
              <Avatar id={p.avatarId} size={48} />
              <span className="min-w-0 flex-1 truncate text-body font-medium">
                {p.name}
                {p.id === meId ? ` (${vi.lobby.you})` : ""}
              </span>
              {p.id === room.hostId ? (
                <Crown size={24} strokeWidth={2.25} className="text-cta" aria-label={vi.lobby.host} />
              ) : null}
              {p.audioReady ? (
                <Volume2 size={24} strokeWidth={2.25} className="text-success" aria-label={vi.lobby.ready} />
              ) : (
                <VolumeX size={24} strokeWidth={2.25} className="text-danger" aria-label={vi.lobby.notReady} />
              )}
            </li>
          ))}
        </ul>
      </section>

      {isHost ? (
        <GameParamsPanel
          params={props.params}
          onParams={props.onParams}
          songs={props.songs}
          source={props.source}
          onSource={props.onSource}
        />
      ) : (
        <GameParamsSummary params={room.params} />
      )}
    </ScreenFrame>
  );
}
