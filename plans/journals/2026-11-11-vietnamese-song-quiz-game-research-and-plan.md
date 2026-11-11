---
title: "Vietnamese song quiz game: research and plan"
date: 2026-11-11
summary: iTunes previews selected as the audio source. Six-phase plan written for a solo and party quiz game.
---

# Vietnamese song quiz game: research and plan

## What happened

- Researched a simpler clone of songtrivia.io for Vietnamese music.
- Tested audio sources with real API calls. iTunes Search (`country=vn`) returned 50 of 50 previews for each of 6 Vietnamese artists.
- Deezer had gaps: one V-pop playlist had previews for 56 of 171 tracks. Spotify removed previews for new apps.
- A browser screenshot from the user showed that songtrivia.io also plays iTunes preview files.
- iTunes genre data is weak for Vietnamese music: 290 of 400 rows are `Pop`. Release dates are wrong for re-released old songs.

## Decision

- Audio source: iTunes 30-second previews, streamed from the Apple CDN. No YouTube.
- Stack: one Node service (Fastify, Socket.IO) that serves a React, Vite and Tailwind client. Deploy on Render.
- Solo uses a one-player room, so there is one game engine.
- The song library is a CSV. Edits persist in localStorage of each browser. The host library drives a Party game.
- The host selects 5, 10, 15 or 20 questions. Question kinds are always mixed.
- The host cannot start until all players confirm sound.

## Next steps

- Run `/ak-cook /home/bim-dev/projects/doan-nhac/plans/261111-1215-vietnamese-song-quiz-game/plan.md`.
- Project directory `/home/bim-dev/projects/doan-nhac` exists and is empty.
- Batch iTunes lookup is not tested yet. Phase 2 has a step for it.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
