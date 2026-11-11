import { Home, WifiOff } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { DEFAULT_PARAMS, type GameParams } from "../shared/protocol";
import { AudioGate } from "./components/audio-gate";
import { ConfirmDialog } from "./components/confirm-dialog";
import { GameButton } from "./components/game-button";
import { ScreenFrame } from "./components/screen-frame";
import { ToastProvider } from "./components/toast";
import { type AudioState, sessionPlayer } from "./lib/audio-player";
import { browserFocusEnv, watchFocus } from "./lib/focus-watch";
import { audioReportNeeded, gameActive, gameReducer, initialGameState, isHost } from "./lib/game-store";
import { guardRoom } from "./lib/leave-guard";
import { useLibrary } from "./lib/library-store";
import { DEFAULT_SOURCE, filterSongs, poolIsPlayable, type SourceSelection, toPool } from "./lib/song-filter";
import { getSocket, request } from "./lib/socket";
import { errorText, vi } from "./lib/strings-vi";
import { syncClock } from "./lib/time-sync";
import { HomeScreen } from "./screens/home-screen";
import { LibraryScreen } from "./screens/library-screen";
import { LobbyScreen } from "./screens/lobby-screen";
import { PartyEntryScreen } from "./screens/party-entry-screen";
import { QuestionScreen } from "./screens/question-screen";
import { ResultScreen } from "./screens/result-screen";
import { SoloSetupScreen } from "./screens/solo-setup-screen";

function Game() {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const [connected, setConnected] = useState(() => getSocket().connected);
  const [params, setParams] = useState<GameParams>(DEFAULT_PARAMS);
  const [source, setSource] = useState<SourceSelection>(DEFAULT_SOURCE);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [audio, setAudio] = useState<AudioState>("locked");
  const [lockedIndex, setLockedIndex] = useState<number | null>(null);
  const lib = useLibrary();
  const player = sessionPlayer();
  const host = isHost(state);
  const active = gameActive(state);

  const matching = useMemo(() => filterSongs(lib.songs, source), [lib.songs, source]);
  const poolPlayable = poolIsPlayable(matching);

  // Socket events feed the store.
  useEffect(() => {
    const socket = getSocket();
    const onConnect = () => {
      setConnected(true);
      void syncClock((clientTime) => request("time:ping", { clientTime }));
    };
    const onDisconnect = () => {
      setConnected(false);
      dispatch({ type: "disconnected" });
    };
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room:state", (room) => dispatch({ type: "room-state", room }));
    socket.on("game:question", (question) => dispatch({ type: "question", question }));
    socket.on("game:reveal", (reveal) => dispatch({ type: "reveal", reveal }));
    socket.on("game:over", (over) => dispatch({ type: "over", over }));
    if (socket.connected) onConnect();
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room:state");
      socket.off("game:question");
      socket.off("game:reveal");
      socket.off("game:over");
    };
  }, []);

  useEffect(() => player.subscribe(setAudio), [player]);

  // Audio: prepare during the countdown, then start at the synchronized time.
  const question = state.question;
  useEffect(() => {
    if (!question) return;
    let cancelled = false;
    player.stop();
    void player.prepare(question.previewUrl, question.clipOffsetSec).then(() => {
      if (!cancelled) player.playAt(question.startsAt);
    });
    return () => {
      cancelled = true;
    };
  }, [question, player]);

  // Stop the clip when the game ends or the player leaves the room.
  const inGameScreen = state.screen === "question";
  useEffect(() => {
    if (!inGameScreen) player.stop();
  }, [inGameScreen, player]);

  // Focus rule: report focus changes while a game runs.
  useEffect(() => {
    if (!active) return;
    return watchFocus((focused) => void request("player:focus", { focused }), browserFocusEnv());
  }, [active]);

  // The focus rule locks this player for the current question.
  const me = state.room?.players.find((p) => p.id === state.playerId);
  useEffect(() => {
    if (state.room?.params.requireFocus && state.room.phase === "playing" && me && !me.focused && state.myAnswer === null && question) {
      setLockedIndex(question.index);
    }
  }, [state.room, me, state.myAnswer, question]);

  // Back action and tab close inside a room.
  const inRoom = state.room !== null && state.screen !== "lost";
  const guard = useRef<ReturnType<typeof guardRoom> | null>(null);
  useEffect(() => {
    if (!inRoom) return;
    guard.current = guardRoom(() => setLeaveOpen(true));
    return () => {
      guard.current?.release();
      guard.current = null;
    };
  }, [inRoom]);
  useEffect(() => guard.current?.setGameRunning(active), [active]);

  // The host shares the chosen parameters with the room.
  useEffect(() => {
    if (host && state.room?.mode === "party" && state.room.phase === "lobby") void request("room:params", { params });
  }, [host, params, state.room?.mode, state.room?.phase]);

  const leave = useCallback(() => {
    setLeaveOpen(false);
    player.stop();
    void request("room:leave", {});
    dispatch({ type: "left" });
  }, [player]);

  const createParty = async (name: string) => {
    const res = await request("room:create", { name, mode: "party" });
    if (!res.ok) return res.error;
    dispatch({ type: "joined", playerId: res.playerId, mode: "party" });
    return null;
  };

  const joinParty = async (code: string, name: string) => {
    const res = await request("room:join", { code, name });
    if (!res.ok) return res.error;
    dispatch({ type: "joined", playerId: res.playerId, mode: "party" });
    return null;
  };

  const audioDone = useCallback(() => {
    dispatch({ type: "audio-confirmed" });
    if (!state.room) dispatch({ type: "navigate", screen: "solo-setup", mode: "solo" });
  }, [state.room]);

  const reportAudio = audioReportNeeded(state);
  useEffect(() => {
    if (reportAudio) void request("player:audio", { ready: true });
  }, [reportAudio]);

  const start = async (soloName?: string) => {
    setStarting(true);
    setStartError(null);
    if (soloName !== undefined && !state.room) {
      const created = await request("room:create", { name: soloName, mode: "solo" });
      if (!created.ok) {
        setStarting(false);
        setStartError(errorText(created.error));
        return;
      }
      dispatch({ type: "joined", playerId: created.playerId, mode: "solo" });
    }
    const res = await request("game:start", { params, pool: toPool(matching) });
    setStarting(false);
    if (!res.ok) setStartError(errorText(res.error));
  };

  const again = async () => {
    setStarting(true);
    const res = await request("game:again", {});
    if (res.ok && state.room?.mode === "solo") {
      const started = await request("game:start", { params, pool: toPool(matching) });
      if (!started.ok) setStartError(errorText(started.error));
    }
    setStarting(false);
  };

  const answer = (choiceIndex: number) => {
    if (!question || lockedIndex === question.index) return;
    dispatch({ type: "answer", choiceIndex });
    void request("game:answer", { questionIndex: question.index, choiceIndex });
  };

  const goHome = () => dispatch({ type: "navigate", screen: "home" });

  let screen: ReactNode = null;
  switch (state.screen) {
    case "home":
      screen = (
        <HomeScreen
          connected={connected}
          onSolo={() => dispatch({ type: "navigate", screen: "gate", mode: "solo" })}
          onParty={() => dispatch({ type: "navigate", screen: "party-entry", mode: "party" })}
          onLibrary={() => dispatch({ type: "navigate", screen: "library" })}
        />
      );
      break;
    case "gate":
      screen = <AudioGate onDone={audioDone} onBack={state.room ? () => setLeaveOpen(true) : goHome} />;
      break;
    case "party-entry":
      screen = <PartyEntryScreen onBack={goHome} onCreate={createParty} onJoin={joinParty} />;
      break;
    case "solo-setup":
      screen = (
        <SoloSetupScreen
          songs={lib.songs}
          params={params}
          onParams={setParams}
          source={source}
          onSource={setSource}
          poolPlayable={poolPlayable}
          starting={starting}
          startError={startError}
          onStart={(name) => void start(name)}
          onBack={state.room ? leave : goHome}
        />
      );
      break;
    case "lobby":
      if (state.room)
        screen = (
          <LobbyScreen
            room={state.room}
            meId={state.playerId}
            isHost={host}
            songs={lib.songs}
            params={params}
            onParams={setParams}
            source={source}
            onSource={setSource}
            poolPlayable={poolPlayable}
            starting={starting}
            startError={startError}
            onStart={() => void start()}
            onBack={() => setLeaveOpen(true)}
          />
        );
      break;
    case "question":
      if (state.room && question)
        screen = (
          <QuestionScreen
            room={state.room}
            meId={state.playerId}
            question={question}
            reveal={state.reveal}
            myAnswer={state.myAnswer}
            locked={lockedIndex === question.index}
            audio={audio}
            onAnswer={answer}
            onTapListen={() => void player.retry()}
            onBack={() => setLeaveOpen(true)}
          />
        );
      break;
    case "result":
      if (state.room)
        screen = (
          <ResultScreen
            room={state.room}
            over={state.over}
            meId={state.playerId}
            isHost={host}
            correctCount={state.correctCount}
            total={question?.total ?? 0}
            busy={starting}
            onAgain={() => void again()}
            onHome={leave}
          />
        );
      break;
    case "library":
      screen = <LibraryScreen onBack={goHome} />;
      break;
    case "lost":
      screen = (
        <ScreenFrame
          title={vi.connection.lost}
          footer={
            <GameButton variant="cta" full icon={Home} onClick={() => dispatch({ type: "left" })}>
              {vi.common.home}
            </GameButton>
          }
        >
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <WifiOff size={64} strokeWidth={2.25} className="text-danger" aria-hidden />
            <p className="text-body text-text-muted">{vi.connection.lostHint}</p>
          </div>
        </ScreenFrame>
      );
      break;
  }

  return (
    <>
      <div key={state.screen}>{screen}</div>
      <ConfirmDialog
        open={leaveOpen}
        title={vi.leave.title}
        body={vi.leave.body}
        confirmLabel={vi.leave.confirm}
        cancelLabel={vi.leave.stay}
        onConfirm={leave}
        onCancel={() => setLeaveOpen(false)}
      />
    </>
  );
}

export function App() {
  return (
    <ToastProvider>
      <Game />
    </ToastProvider>
  );
}
