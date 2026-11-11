---
title: "Vietnamese song quiz game (solo and party)"
description: "A browser quiz for Vietnamese music. Players hear an iTunes preview and pick the title or the artist."
status: in-progress
priority: P1
effort: 29h
tags: [feature, frontend, backend, experimental]
blockedBy: []
blocks: []
created: 2026-11-11
---

# Vietnamese song quiz game (solo and party)

## Overview

The game plays a short clip of a Vietnamese song. Each player picks the song title or the artist from four answer choices. Fast correct answers score more points.

The game has three menu entries: Solo, Party, and Library. All interface text is Vietnamese. The working title is "Đoán Nhạc". The visual identity is original and does not copy songtrivia.io.

Research: [research report](../reports/research-261111-1710-vietnamese-song-quiz-clone.md).

Project directory: `/home/bim-dev/projects/doan-nhac` (new git repository).

## Accepted scope

| Area | Decision |
|---|---|
| Solo | One player. Same rules and same server code path as Party. |
| Party | 2 to 5 players. Join with a room code and a name. No login. Duplicate names are legal. |
| Avatar | The server assigns one of 12 built-in SVG avatars. It prefers an avatar that no other player in the room uses. |
| Session | No database. All room state is in server memory. A page refresh removes the player from the room. |
| Game parameters | Solo player or Party host sets them: question count, seconds per question, wrong-answer penalty, tab-focus rule, song source. |
| Song source | All songs, or filter by tag (genre), artist, decade, or a custom list. |
| Library screen | Add songs, edit song data, import and export the CSV song library. |
| Audio | 30-second iTunes previews, streamed from the Apple CDN. The game never stores audio files. |
| Language | Vietnamese only. All strings are in one module. |
| Layout | Mobile first. Touch targets are 48 px or larger. |
| Style | Playful game look. Not an office form. See [design system](./design-system.md). |

## Non-goals

- No accounts, no persistent scores, no leaderboard history.
- No reconnect to a running game after a refresh.
- No public matchmaking. Players share the room code out of band.
- No audio hosting and no YouTube playback.
- No second language.

## Architecture

```
Browser (React + Vite + Tailwind, TypeScript)
  - song library: bundled songs.csv + edits in localStorage
  - one shared <audio> element, unlocked by a tap
        |  Socket.IO (WebSocket)
        v
One Node process (Fastify + Socket.IO, TypeScript)
  - rooms in a Map, timers, scoring, question generation
  - serves the built client as static files
        |  HTTPS, one request per game
        v
iTunes lookup API (fresh preview URLs)      Apple CDN -> browser (audio)
```

| Choice | Reason |
|---|---|
| One Node service | One build, one deploy, one URL. Rooms in memory need exactly one instance. |
| Socket.IO | Rooms, acknowledgements and transport fallback are built in. |
| Fastify | The user selected it over Express. It has first-class TypeScript types. HTTP speed is not a factor at 5 players. |
| Server-authoritative game | The server owns timers, answers and scores. The client only renders. |
| Solo uses a one-player room | One game engine. No duplicate client-side engine. |
| Host sends the song pool at game start | The library lives in the host browser, so the server needs no storage. |
| Render web service | Git push deploys. WebSocket works. An idle free plan sleeps. That is acceptable for friends. |

Single package layout: `src/shared` (protocol and pure rules), `src/server`, `src/client`, `scripts`, `data`.

## Git workflow

| Item | Value |
|---|---|
| Repository | `/home/bim-dev/projects/doan-nhac`, branch `main` |
| Remote | `origin` = `https://github.com/thinhis-dev/doan-nhac.git` |
| Commit unit | One commit per finished unit of work. Never one commit for a full phase. |
| Message format | Conventional commits, for example `feat(server): add room store`. No AI references. |
| Push | `git push origin main` at the end of each phase, after tests pass. |

Rules:

- A unit of work is one item of a phase "Todo" list, or a smaller step that works by itself.
- Each commit leaves `npm run typecheck` and `npm test` green. Phase 1 is the exception until its tooling exists.
- Tests go in the same commit as the code that they cover.
- Stage files by name. Do not use `git add -A`.
- Never commit `node_modules`, `dist`, dotenv files or secrets.
- The plan directory is part of the repository. Commit plan status changes as `docs(plan): ...`.
- If a push fails, report the error. Do not force push.

## Game rules (defaults)

| Rule | Value |
|---|---|
| Questions per game | 5, 10, 15 or 20. Default 10. A smaller pool gives one question per song. |
| Question kinds | Mixed: "Bài hát nào đây?" and "Ai hát bài này?" |
| Seconds per question | 5, 10, 15 or 20. Default 10 |
| Clip start | Random offset from 0 to (30 minus question seconds) |
| Correct answer | 500 points plus up to 500 for speed |
| Wrong answer | Penalty off: 0 points. Penalty on: minus 250 points. |
| Tab-focus rule | When on, a player who leaves the tab loses the current question |
| Question flow | 3 s countdown, play, 4 s reveal. After all players answer, the question ends early. |

## Phases

| # | Phase | Effort | Depends on | Status |
|---|-------|--------|-----------|--------|
| 1 | [Project scaffold and contracts](./phase-01-project-scaffold-and-contracts.md) | 3h | none | Done |
| 2 | [Song library and game server](./phase-02-song-library-and-game-server.md) | 6h | 1 | Done |
| 3 | [Client shell and audio](./phase-03-client-shell-and-audio.md) | 5h | 1 | Done |
| 4 | [Game screens: solo and party](./phase-04-game-screens-solo-and-party.md) | 7h | 2, 3 | Done |
| 5 | [Library editor](./phase-05-library-settings-editor.md) | 5h | 3 | Done |
| 6 | [Deploy and device test](./phase-06-deploy-and-device-test.md) | 3h | 4, 5 | Done (deploy and real-device rows pending user) |

Phases 2 and 3 touch different directories and can run at the same time. Phase 5 can run at the same time as phase 4.

## Success Criteria

- [ ] A player completes a 10-question Solo game on a phone and on a desktop browser.
- [ ] Five players in one room hear the same clip, with start times less than 0.5 s apart on a normal connection.
- [ ] A sixth player gets a clear Vietnamese "room is full" message.
- [ ] Each of the five game parameters changes the game as the rules table states.
- [ ] Audio plays on iOS Safari, Android Chrome, desktop Chrome, Firefox and Safari after one tap.
- [ ] A player adds a song from iTunes search, edits its tags, and plays a game that uses it.
- [ ] Export then import of the CSV keeps all rows and all Vietnamese diacritics.
- [ ] No English text is visible in the interface.
- [ ] The pre-delivery checklist in the design system passes.
- [ ] `npm test` and `npm run build` pass. The deployed URL serves the game.

## Risks

| Risk | Mitigation |
|---|---|
| The browser blocks audio without a user tap | An audio gate in the lobby. A "tap to listen" fallback during play. See phase 3. |
| Preview URLs go stale | The server gets fresh URLs for the chosen tracks at game start. It falls back to the stored URL. |
| iTunes rate limit, about 20 calls per minute | One lookup call per game. The seed script waits 3.5 s between calls. |
| iTunes terms allow previews for promotion only | Private link for friends. No ads, no public listing. The report explains the risk. |
| The free Render plan sleeps | The client shows a "waking the server" message while it connects. |
| A host sends a hostile song pool | The server limits pool size and string length, and allows only Apple preview hosts. |
| The focus rule cannot see a second device | The interface text states this limit. The rule is a deterrent only. |

## Validation Log

### Session 1 (2026-11-11)

| Question | Decision |
|---|---|
| Where do song library edits persist? | localStorage in each browser. A Party game uses the library of the host. Export the CSV to share. |
| How many questions per game? | The host selects 5, 10, 15 or 20. Default 10. This changed the plan. |
| Which question kinds? | Always mixed: title and artist. |
| Start with a player who did not turn on sound? | No. The start button stays off until all players turn on sound. |

Propagated to: `plan.md`, phase 1 (`GameParams`), phase 2 (song pick), phase 4 (parameters panel).

### Session 2 (2026-11-11)

| Change | Source |
|---|---|
| The HTTP server is Fastify, not Express. | User request |
| The plan, the research report and the journal moved into `doan-nhac/plans/`. | User request |
| Git workflow added: remote `origin`, one commit per unit of work, push per phase. | User request |
| `design-system.md` added. It replaces the visual direction of phase 3. | User request to apply the `ui-ux-pro-max` skill |
| Answer buttons use one neutral style with letter badges. Reveal colors are success and danger only. | Design system |
| The browser back action inside a room shows a leave dialog. | Design system, navigation rules |

Propagated to: phases 1, 3, 4, 5 and 6.

### Whole-Plan Consistency Sweep

- Searched all plan files for the fixed count of 10 questions and for "four parameters". Updated each rule that used them.
- The device test matrix keeps 10-question games as its test case. That is a test input, not a rule.
- No unresolved contradiction remains.

## Open questions

None.

<!-- slug: vietnamese-song-quiz-game -->
