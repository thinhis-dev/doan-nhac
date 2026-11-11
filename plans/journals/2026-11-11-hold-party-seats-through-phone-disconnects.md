---
title: Hold party seats through phone disconnects
date: 2026-11-11
summary: A frozen phone tab dropped the player at game start; added a 60 s rejoin grace with a resume token and lobby away/offline badges.
---

# Hold party seats through phone disconnects

## What happened
In a 3-player party, the last player showed in the lobby but was gone after the host started. Render resources were not the cause: the log had no restart or error, and a local 3-player test kept all players through the start. The cause was the disconnect handler in `src/server/socket-handlers.ts`, which removed a player at once, while the player id was `socket.id`. A phone that freezes a background tab keeps looking alive for about 45 s (Socket.IO heartbeat), then drops, often right after the start.

## Changes
- The server issues its own player id and a secret resume token on create and join. New event `room:resume` takes the seat back, also after a reload (token in `sessionStorage`, `src/client/lib/session-token.ts`).
- On disconnect the seat is held for `RECONNECT_GRACE_MS` (60 s) with `connected: false`, then removed. A resume from a new socket takes over and closes the stale one.
- The engine (`src/server/game-engine.ts`) skips offline players for an early reveal, but waits for the timer when nobody is online. `current()` lets the server send a rejoining player the current question, reveal or result.
- The client shows a "Đang kết nối lại..." banner instead of the lost screen, and keeps the answer and the clip when the same question is sent again. It shows the lost screen only when the seat is gone.
- Focus is watched in party rooms too, so the lobby shows away and offline badges, and the player strip shows an offline mark.

## Decision
A reload now resumes the seat instead of returning to Home. This reverses the earlier scope line "A refresh returns to Home". On a resume the server resets `audioReady` and `focused`, and the client reports them again.

## Verification
132 tests pass, plus typecheck and build. No real-device test yet.

## Next steps
- Test on a phone: lock the screen in the lobby and mid-game, then return.
- A deploy still drops every room, because rooms live in memory.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
