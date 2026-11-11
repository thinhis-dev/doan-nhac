---
title: "Phase 1: Project scaffold and contracts"
status: todo
priority: P1
effort: 3h
dependencies: []
---

# Phase 1: Project scaffold and contracts

## Overview

Create the repository, the build pipeline, and the shared TypeScript contracts. Phases 2 and 3 build on these contracts in parallel.

## Requirements

- [ ] One npm package in `/home/bim-dev/projects/doan-nhac` with client, server and shared code.
- [ ] `npm run dev` starts the client and the server together.
- [ ] `npm run build` produces one deployable output. `npm start` serves it.
- [ ] The shared module defines all socket events, the game parameters and the song row.

## Files

Create, all under `/home/bim-dev/projects/doan-nhac`:

- `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `.gitignore`, `.nvmrc`
- `index.html`
- `src/shared/protocol.ts`: socket event names and payload types
- `src/shared/game-rules.ts`: constants and pure scoring function
- `src/shared/song.ts`: `Song` type, CSV column list, text normalization helper
- `src/server/index.ts`: Fastify app, Socket.IO attach, `/healthz`, static files
- `src/client/main.tsx`, `src/client/app.tsx`: placeholder screen

## Stack

| Part | Choice |
|---|---|
| Runtime | Node 24.22.1 or later in the 24.x line (October 2026 security release), pinned in `.nvmrc` and `engines`. TypeScript strict mode. |
| Server | Fastify 5 with `@fastify/static`, Socket.IO 4, `zod` for payload validation |
| Client | React 19, Vite, Tailwind CSS 4, `socket.io-client`, `lucide-react`, `@fontsource` fonts |
| CSV | `papaparse` |
| Test | Vitest |
| Server build | `tsup` bundles `src/server/index.ts` to `dist/server/index.js` |
| Client build | Vite writes to `dist/client` |

Use the current stable version of each package. Read the current documentation for Tailwind 4 and Fastify 5 setup.

Attach Socket.IO directly to the Fastify HTTP server: `new Server(fastify.server)`. Do not add a Fastify Socket.IO plugin.

## Contracts

`src/shared/song.ts`:

```ts
export type Song = {
  trackId: number;
  title: string;
  artist: string;
  releaseYear: number | null;
  decade: string;        // "1990s" | "2000s" | "2010s" | "2020s", editable
  itunesGenre: string;
  tags: string[];        // CSV: joined with ";"
  lists: string[];       // custom list names, CSV: joined with ";"
  previewUrl: string;
  enabled: boolean;
};
export const CSV_COLUMNS = ["trackId","title","artist","releaseYear","decade",
  "itunesGenre","tags","lists","previewUrl","enabled"] as const;
```

`src/shared/protocol.ts`:

```ts
export type GameParams = {
  questionCount: 5 | 10 | 15 | 20;
  questionSeconds: 5 | 10 | 15 | 20;
  wrongPenalty: boolean;
  requireFocus: boolean;
};
export type PoolSong = Pick<Song, "trackId" | "title" | "artist" | "previewUrl">;
export type Player = { id: string; name: string; avatarId: number; score: number;
  audioReady: boolean; focused: boolean; answered: boolean };
export type RoomPhase = "lobby" | "countdown" | "playing" | "reveal" | "over";

// client -> server (each has an acknowledgement callback)
// "room:create"  { name, mode: "solo" | "party" }      -> { code, playerId }
// "room:join"    { code, name }                        -> { playerId }
// "player:audio" { ready: boolean }
// "player:focus" { focused: boolean }
// "game:start"   { params: GameParams, pool: PoolSong[] }   host only
// "game:answer"  { questionIndex, choiceIndex }
// "game:again"   {}                                    host only, back to lobby
// "time:ping"    { clientTime }                        -> { serverTime }

// server -> client
// "room:state"    { code, mode, phase, hostId, players: Player[] }
// "game:question" { index, total, kind: "title" | "artist", choices: string[4],
//                   previewUrl, clipOffsetSec, startsAt, endsAt }   server epoch ms
// "game:reveal"   { index, correctIndex, title, artist,
//                   results: { playerId, choiceIndex | null, delta, score }[] }
// "game:over"     { ranking: Player[] }
```

Error codes returned in acknowledgements: `ROOM_NOT_FOUND`, `ROOM_FULL`, `GAME_RUNNING`, `NAME_REQUIRED`, `NOT_HOST`, `POOL_TOO_SMALL`, `BAD_PAYLOAD`, `AUDIO_NOT_READY`.

`src/shared/game-rules.ts`:

```ts
export const MAX_PLAYERS = 5;
export const QUESTION_COUNTS = [5, 10, 15, 20] as const;
export const COUNTDOWN_MS = 3000;
export const REVEAL_MS = 4000;
export const NAME_MAX = 16;
export const POOL_MAX = 500;
export const POOL_MIN = 4;
export function scoreAnswer(correct: boolean, elapsedMs: number, totalMs: number,
  wrongPenalty: boolean): number;
// correct: 500 + round(500 * remaining / total). wrong: wrongPenalty ? -250 : 0.
```

## Implementation Steps

1. Run `git init -b main` in the project directory. Add `.gitignore` for `node_modules`, `dist` and dotenv files.
1. Run `git remote add origin https://github.com/thinhis-dev/doan-nhac.git`.
1. Commit the existing `plans` directory first: `docs(plan): add research report and implementation plan`.
1. From this point, commit each finished unit of work. See "Git workflow" in `plan.md`.
2. Create `package.json` with `"type": "module"` and `"engines": { "node": ">=24" }`.
3. Add scripts: `dev`, `build`, `start`, `test`, `typecheck`, `fetch-songs`.
4. Set the development ports: Vite on 5173, server on 3001. Proxy `/socket.io` and `/healthz` from Vite to the server.
5. Write the three shared modules from the contracts above.
6. Write `scoreAnswer` and its unit test.
7. Write the minimal server: `/healthz` returns `ok`, Socket.IO accepts a connection, static files come from `dist/client`.
8. Write a placeholder client that connects and shows the connection state in Vietnamese.
9. Push the phase: `git push -u origin main`.
9. Before you start the development server, make sure that ports 5173 and 3001 are free. Stop the server at the end of the phase.

## Todo

- [ ] Repository and tooling
- [ ] Shared contracts
- [ ] `scoreAnswer` with tests
- [ ] Minimal server and client connect to each other

## Success Criteria

- `npm run typecheck`, `npm test` and `npm run build` exit with code 0.
- After `npm start`, `curl localhost:3001/healthz` returns `ok` and the browser shows the connected state.
- No development process stays alive after the phase.
- `git log` shows one commit per unit of work, and `origin/main` matches the local branch.
