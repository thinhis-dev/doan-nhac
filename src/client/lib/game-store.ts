import type {
  GameOverPayload,
  QuestionPayload,
  RevealPayload,
  RoomMode,
  RoomState,
} from "../../shared/protocol";

/** Screens outside a room. Inside a room the room phase picks the screen. */
export type OuterScreen = "home" | "gate" | "solo-setup" | "party-entry" | "library";
export type Screen = OuterScreen | "lobby" | "question" | "result" | "lost";

export type GameState = {
  screen: Screen;
  /** The mode the player chose on Home. */
  mode: RoomMode | null;
  playerId: string | null;
  room: RoomState | null;
  /** The player confirmed sound in the gate. */
  audioConfirmed: boolean;
  question: QuestionPayload | null;
  reveal: RevealPayload | null;
  over: GameOverPayload | null;
  myAnswer: number | null;
  correctCount: number;
};

export type GameAction =
  | { type: "navigate"; screen: OuterScreen; mode?: RoomMode }
  | { type: "joined"; playerId: string; mode: RoomMode }
  | { type: "audio-confirmed" }
  | { type: "room-state"; room: RoomState }
  | { type: "question"; question: QuestionPayload }
  | { type: "reveal"; reveal: RevealPayload }
  | { type: "over"; over: GameOverPayload }
  | { type: "answer"; choiceIndex: number }
  | { type: "left" }
  | { type: "disconnected" };

export const initialGameState: GameState = {
  screen: "home",
  mode: null,
  playerId: null,
  room: null,
  audioConfirmed: false,
  question: null,
  reveal: null,
  over: null,
  myAnswer: null,
  correctCount: 0,
};

function screenForRoom(state: GameState, room: RoomState): Screen {
  if (room.mode === "party" && !state.audioConfirmed) return "gate";
  switch (room.phase) {
    case "lobby":
      return room.mode === "solo" ? "solo-setup" : "lobby";
    case "countdown":
    case "playing":
    case "reveal":
      return "question";
    case "over":
      return "result";
  }
}

const roomReset = {
  playerId: null,
  room: null,
  question: null,
  reveal: null,
  over: null,
  myAnswer: null,
  correctCount: 0,
} satisfies Partial<GameState>;

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "navigate":
      return { ...state, ...roomReset, screen: action.screen, mode: action.mode ?? state.mode };

    case "joined":
      return { ...state, ...roomReset, playerId: action.playerId, mode: action.mode };

    case "audio-confirmed": {
      const next = { ...state, audioConfirmed: true };
      return state.room ? { ...next, screen: screenForRoom(next, state.room) } : next;
    }

    case "room-state": {
      if (!state.playerId || state.screen === "lost") return state;
      const room = action.room;
      let next: GameState = { ...state, room };
      // A new game starts from the lobby: clear the result of the last game.
      if (room.phase === "lobby" && state.room?.phase !== "lobby") {
        next = { ...next, question: null, reveal: null, over: null, myAnswer: null, correctCount: 0 };
      }
      // A question screen needs a question. The engine sends room state first.
      const screen = screenForRoom(next, room);
      if (screen === "question" && !next.question) return { ...next, screen: state.screen };
      return { ...next, screen };
    }

    case "question": {
      const fresh = action.question.index === 0;
      return {
        ...state,
        question: action.question,
        reveal: null,
        myAnswer: null,
        over: null,
        correctCount: fresh ? 0 : state.correctCount,
        screen: state.audioConfirmed || state.mode === "solo" ? "question" : state.screen,
      };
    }

    case "reveal": {
      if (action.reveal.index !== state.question?.index) return state;
      const mine = action.reveal.results.find((r) => r.playerId === state.playerId);
      const correct = mine?.choiceIndex !== null && mine?.choiceIndex === action.reveal.correctIndex;
      return { ...state, reveal: action.reveal, correctCount: state.correctCount + (correct ? 1 : 0) };
    }

    case "over":
      return { ...state, over: action.over, screen: "result" };

    case "answer":
      if (state.myAnswer !== null || state.reveal || state.room?.phase !== "playing") return state;
      return { ...state, myAnswer: action.choiceIndex };

    case "left":
      return { ...state, ...roomReset, screen: "home", mode: null };

    case "disconnected":
      return state.room ? { ...state, screen: "lost" } : state;
  }
}

export function isHost(state: GameState): boolean {
  return !!state.room && state.room.hostId === state.playerId;
}

/** A game runs from the first countdown to the last reveal. */
export function gameActive(state: GameState): boolean {
  const phase = state.room?.phase;
  return phase === "countdown" || phase === "playing" || phase === "reveal";
}
