import { existsSync } from "node:fs";
import { resolve } from "node:path";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyInstance } from "fastify";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "../shared/protocol";

export type GameIo = Server<ClientToServerEvents, ServerToClientEvents>;

export type AppOptions = {
  /** Directory of the built client. Skipped when it does not exist. */
  clientDir?: string;
  logger?: boolean;
};

export async function createApp(options: AppOptions = {}): Promise<{ app: FastifyInstance; io: GameIo }> {
  const app = Fastify({ logger: options.logger ?? false });

  app.get("/healthz", async (_req, reply) => reply.type("text/plain").send("ok"));

  const clientDir = options.clientDir ?? resolve(process.cwd(), "dist/client");
  if (existsSync(clientDir)) {
    await app.register(fastifyStatic, { root: clientDir });
  }

  const io: GameIo = new Server(app.server, {
    maxHttpBufferSize: 1_000_000,
    // A refresh always creates a new player.
    connectionStateRecovery: undefined,
    serveClient: false,
  });

  app.addHook("onClose", async () => {
    await io.close();
  });

  return { app, io };
}
