---
title: "Phase 2: Song library and game server"
status: done
priority: P1
effort: 6h
dependencies: [1]
---

# Phase 2: Song library and game server

## Overview

Build the default song library of about 1000 songs. Build the server that runs rooms, questions, timers and scores.

## Requirements

- [x] A repeatable script fetches songs by artist from the iTunes Search API into `data/songs.csv`.
- [x] A second run of the script adds new songs and keeps all manual edits.
- [x] The server runs the full game loop for 1 to 5 players.
- [x] The server owns all timing and scoring.
- [x] Unit tests cover the rules. One integration test covers a full game.

## Files

Create, under `/home/bim-dev/projects/doan-nhac`:

- `data/artists.csv`: columns `artist,tags`. About 50 well-known Vietnamese artists across V-pop, rap, indie, ballad and bolero.
- `data/songs.csv`: generated, committed. Copied to `public/songs.csv` at build.
- `scripts/fetch-songs.ts`
- `src/shared/csv.ts`: `parseSongsCsv`, `serializeSongsCsv`, `mergeSongs`
- `src/server/room-store.ts`: room map, room codes, join and leave
- `src/server/game-engine.ts`: phase state machine and timers
- `src/server/question-builder.ts`: song pick and answer choices
- `src/server/preview-refresh.ts`: iTunes lookup for fresh preview URLs
- `src/server/socket-handlers.ts`: event wiring and `zod` validation
- Tests next to each module: `*.test.ts`

Modify: `src/server/index.ts` to register the handlers.

## Song library script

1. Read `data/artists.csv`.
2. For each artist, call `https://itunes.apple.com/search` with `country=vn`, `media=music`, `entity=song`, `limit=50`.
3. Wait 3.5 seconds between calls. The limit is about 20 calls per minute.
4. If the normalized `artistName` of a row does not contain the normalized artist name, drop the row.
5. Drop titles that contain `Live`, `Remix`, `Karaoke`, `Beat`, `Instrumental`, `Acoustic Version` or `Sped Up`.
6. Remove duplicates per artist by normalized title. Normalization removes text in brackets, case and diacritics.
7. Keep at most 25 songs per artist.
8. Set `decade` from `releaseDate`. Set `tags` from the artist row. Set `enabled` to `true`.
9. Merge into the existing `data/songs.csv` by `trackId`. For an existing row, update only `previewUrl`, `itunesGenre` and `releaseYear`.
10. Write the CSV as UTF-8 with a byte order mark, so that Excel shows Vietnamese text correctly.

Known data limits from the research: `releaseDate` is wrong for re-released old songs, and 72% of rows have the genre `Pop`. The `decade` and `tags` columns exist so that a person can correct them.

## Server rules

Rooms:

- A room code has 4 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`. A solo room has a code and never shows it.
- Capacity is 5 for `party` and 1 for `solo`. Join is legal only in the `lobby` phase.
- A name is required. Trim it and cut it to 16 characters. Duplicate names are legal.
- The server assigns `avatarId` 0 to 11 at random. It prefers an id that the room does not use.
- On socket disconnect, remove the player. If the host leaves, the player who joined earliest becomes host.
- Delete an empty room and clear its timers. Limit the server to 200 rooms.
- Disable Socket.IO connection state recovery. A refresh always creates a new player.

Game start (`game:start`):

- Only the host can start. In a party room, all players must have `audioReady` set.
- Validate the payload: 4 to 500 pool songs, title and artist at most 200 characters.
- If the host of a `previewUrl` is not `audio-ssl.itunes.apple.com`, reject the payload.
- Set `maxHttpBufferSize` to 1 MB.
- Pick `min(questionCount, pool size)` songs at random with no repeat.
- Call `https://itunes.apple.com/lookup?country=vn&id=<ids joined by comma>` once for the picked songs. Use the returned `previewUrl`. On failure or timeout of 4 seconds, use the URL from the pool.

Questions:

- Kind is `title` or `artist` at random. If the pool has fewer than 4 distinct artists, use only `title`.
- Three wrong choices come from other pool songs. All four normalized choices are distinct.
- `clipOffsetSec` is a random integer from 0 to `30 - questionSeconds`.
- Phase order: `countdown` for 3 s, `playing` for `questionSeconds`, `reveal` for 4 s, then the next question or `over`.
- If every connected player answered, go to `reveal` immediately.
- The `game:question` payload never contains the correct answer.

Answers:

- One answer per player per question. The first answer is final.
- Score uses the server receive time and `scoreAnswer` from phase 1.
- Ignore an answer for a wrong question index or outside the `playing` phase.

Focus rule:

- The server stores `focused` per player from `player:focus`.
- If `requireFocus` is on and a player loses focus during `playing`, lock that player for the question. The player scores 0 and cannot answer.
- Send `room:state` so that other players see the lost-focus mark.

## Implementation Steps

1. Write `src/shared/csv.ts` and its tests: round trip, diacritics, quoted commas, merge keeps manual columns.
2. Write `data/artists.csv` and `scripts/fetch-songs.ts`. Run the script once. Inspect the CSV by eye.
3. Make sure that one lookup call with 20 comma-joined ids returns 20 results. If it does not, call lookup once per song with a 3 s total budget.
4. Write `question-builder.ts` with an injected random function. Test distinct choices and the artist-kind guard.
5. Write `room-store.ts`. Test capacity, name rules, avatar assignment and host migration.
6. Write `game-engine.ts` with an injected clock and timer functions. Test phase order, early reveal, penalty and focus lock.
7. Write `socket-handlers.ts` with a `zod` schema per event. Reject bad payloads with `BAD_PAYLOAD`.
8. Write one integration test: two `socket.io-client` sockets play a 4-question game against an in-process server with short timers.

Commit after each numbered step that leaves the tests green. Push to `origin main` at the end of the phase.

## Todo

- [x] CSV module with tests
- [x] Artist list and fetch script, `data/songs.csv` generated
- [x] Batch lookup test done
- [x] Question builder with tests
- [x] Room store with tests
- [x] Game engine with tests
- [x] Socket handlers and integration test

## Success Criteria

- `data/songs.csv` has 800 or more rows. A second script run changes no manual column.
- `npm test` passes, with tests for each rule in the "Server rules" section.
- The integration test finishes a full game and the final scores match the expected values.
- A sixth join returns `ROOM_FULL`. A join during a game returns `GAME_RUNNING`.
- A pool with a non-Apple `previewUrl` returns `BAD_PAYLOAD`.
