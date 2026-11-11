import type { Song } from "./song";

export type GameParams = {
  questionCount: 5 | 10 | 15 | 20;
  questionSeconds: 5 | 10 | 15 | 20;
  wrongPenalty: boolean;
  requireFocus: boolean;
};

export const DEFAULT_PARAMS: GameParams = {
  questionCount: 10,
  questionSeconds: 10,
  wrongPenalty: false,
  requireFocus: false,
};

export type PoolSong = Pick<Song, "trackId" | "title" | "artist" | "previewUrl">;

export type Player = {
  id: string;
  name: string;
  avatarId: number;
  score: number;
  audioReady: boolean;
  focused: boolean;
  answered: boolean;
};

export type RoomMode = "solo" | "party";
export type RoomPhase = "lobby" | "countdown" | "playing" | "reveal" | "over";
export type QuestionKind = "title" | "artist";

export const ERROR_CODES = [
  "ROOM_NOT_FOUND",
  "ROOM_FULL",
  "GAME_RUNNING",
  "NAME_REQUIRED",
  "NOT_HOST",
  "POOL_TOO_SMALL",
  "BAD_PAYLOAD",
  "AUDIO_NOT_READY",
  "SERVER_FULL",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export type Ack<T = object> = ({ ok: true } & T) | { ok: false; error: ErrorCode };

// Server -> client payloads

export type RoomState = {
  code: string;
  mode: RoomMode;
  phase: RoomPhase;
  hostId: string;
  players: Player[];
  /** Parameters chosen by the host, shown read-only to other players. */
  params: GameParams;
};

export type QuestionPayload = {
  index: number;
  total: number;
  kind: QuestionKind;
  choices: string[];
  previewUrl: string;
  clipOffsetSec: number;
  /** Server epoch ms. Start of the playing phase. */
  startsAt: number;
  /** Server epoch ms. End of the playing phase. */
  endsAt: number;
};

export type RevealResult = {
  playerId: string;
  choiceIndex: number | null;
  delta: number;
  score: number;
};

export type RevealPayload = {
  index: number;
  correctIndex: number;
  title: string;
  artist: string;
  results: RevealResult[];
};

export type GameOverPayload = { ranking: Player[] };

// Client -> server payloads

export type CreateRoomPayload = { name: string; mode: RoomMode };
export type JoinRoomPayload = { code: string; name: string };
export type StartGamePayload = { params: GameParams; pool: PoolSong[] };
export type AnswerPayload = { questionIndex: number; choiceIndex: number };

export interface ClientToServerEvents {
  "room:create": (payload: CreateRoomPayload, ack: (res: Ack<{ code: string; playerId: string }>) => void) => void;
  "room:join": (payload: JoinRoomPayload, ack: (res: Ack<{ playerId: string }>) => void) => void;
  "room:leave": (payload: Record<string, never>, ack: (res: Ack) => void) => void;
  "room:params": (payload: { params: GameParams }, ack: (res: Ack) => void) => void;
  "player:audio": (payload: { ready: boolean }, ack: (res: Ack) => void) => void;
  "player:focus": (payload: { focused: boolean }, ack: (res: Ack) => void) => void;
  "game:start": (payload: StartGamePayload, ack: (res: Ack) => void) => void;
  "game:answer": (payload: AnswerPayload, ack: (res: Ack) => void) => void;
  "game:again": (payload: Record<string, never>, ack: (res: Ack) => void) => void;
  "time:ping": (payload: { clientTime: number }, ack: (res: { serverTime: number }) => void) => void;
}

export interface ServerToClientEvents {
  "room:state": (state: RoomState) => void;
  "game:question": (question: QuestionPayload) => void;
  "game:reveal": (reveal: RevealPayload) => void;
  "game:over": (over: GameOverPayload) => void;
}
