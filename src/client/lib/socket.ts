import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "../../shared/protocol";

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: GameSocket | undefined;

/** The one Socket.IO client of the page. A refresh always makes a new player. */
export function getSocket(): GameSocket {
  if (!socket) {
    socket = io({
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }
  return socket;
}

type EventArgs<E extends keyof ClientToServerEvents> = Parameters<ClientToServerEvents[E]>;
type AckResult<E extends keyof ClientToServerEvents> = Parameters<EventArgs<E>[1]>[0];

const ACK_TIMEOUT_MS = 10_000;

/** Emits an event and resolves with the acknowledgement. A timeout resolves as BAD_PAYLOAD. */
export function request<E extends keyof ClientToServerEvents>(
  event: E,
  payload: EventArgs<E>[0],
  s: GameSocket = getSocket(),
): Promise<AckResult<E>> {
  return new Promise((resolve) => {
    const emit = s.timeout(ACK_TIMEOUT_MS).emit as unknown as (
      ev: E,
      p: unknown,
      cb: (err: Error | null, res: AckResult<E>) => void,
    ) => void;
    emit.call(s.timeout(ACK_TIMEOUT_MS), event, payload, (err, res) => {
      resolve(err ? ({ ok: false, error: "BAD_PAYLOAD" } as AckResult<E>) : res);
    });
  });
}
