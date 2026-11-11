---
title: "Phase 6: Deploy and device test"
status: todo
priority: P1
effort: 3h
dependencies: [4, 5]
---

# Phase 6: Deploy and device test

## Overview

Deploy the game to one public URL. Test audio and layout on real devices. Write the README.

## Requirements

- [ ] One Render web service runs the game from the git repository.
- [ ] The audio test matrix passes on real devices.
- [ ] The pre-delivery checklist of the design system passes.
- [ ] The README explains how to run, deploy, and update the song library.

## Files

Create, under `/home/bim-dev/projects/doan-nhac`:

- `render.yaml`
- `README.md`

## Deployment

| Item | Value |
|---|---|
| Service type | Render web service, Node runtime, one instance |
| Build command | `npm ci && npm run build` |
| Start command | `npm start` |
| Health path | `/healthz` |
| Port | `process.env.PORT` |
| Environment variables | None. The game has no secrets. |

Rooms are in memory, so the service must stay at exactly one instance. A deploy or a restart ends all running games.

The free plan stops an idle service. The first visit then waits about one minute. The client already shows "Đang đánh thức máy chủ..." during this wait.

The code is already on `https://github.com/thinhis-dev/doan-nhac.git`, because each phase pushes to it. Render deploys from that repository.

The Render service is an account-level resource that publishes the game. Ask the user before you create the service.

## Audio and device test matrix

Run each row with a two-player Party game. Use the deployed URL, because iOS needs HTTPS for a realistic test.

| Device and browser | Cases |
|---|---|
| iPhone, Safari | Gate unlock. 10 questions with no extra tap. Silent switch on and off. Low Power Mode. Screen lock during a question. |
| iPhone, Chrome | Gate unlock. 10 questions. |
| Android, Chrome | Gate unlock. 10 questions. Switch to another app during a question. |
| Desktop Chrome | Autoplay blocked in site permissions. Tab switch with the focus rule on. |
| Desktop Firefox | Autoplay blocked. 10 questions. |
| Desktop Safari | Default autoplay policy "Stop Media with Sound". 10 questions. |

For each row, record: sound after the gate, start delay between two devices, fallback button behavior, and layout problems.

Other tests:

- Throttle one browser to "Slow 4G". The clip starts late on that device, and the game does not block the other player.
- Make a preview URL invalid in the working library. The question shows "Không tải được nhạc" and the game continues.
- Rotate a phone to the horizontal orientation during a question. All four answers stay reachable.
- Read each screen for English text and for cut-off Vietnamese diacritics in the heading font.

Fix each failure in the module that owns it, then run that row again.

## README content

- What the game is, in three sentences.
- Requirements and commands: `npm install`, `npm run dev`, `npm test`, `npm run build`, `npm start`.
- Development ports 5173 and 3001.
- How to update the default library: edit `data/artists.csv`, run `npm run fetch-songs`, review, commit.
- How to share library edits: export the CSV in the game, replace `data/songs.csv`, deploy.
- Deployment steps for Render.
- The usage limit: private use with friends, no ads, no public listing, no stored audio.

## Implementation Steps

1. Write `render.yaml` and make sure that `npm run build && npm start` works locally with `PORT=3001`.
2. Write `README.md`.
3. Commit `render.yaml` and `README.md` as two commits. Push to `origin main`.
3. Ask the user to connect the GitHub repository in Render. Deploy after the user agrees.
4. Make sure that `https://<service>/healthz` returns `ok` and a WebSocket connection opens.
5. Run the pre-delivery checklist in [the design system](./design-system.md) on a phone and on a desktop.
5. Run the audio and device test matrix. Record the results in the plan directory as `device-test-results.md`.
6. Fix failures and run the failed rows again.
7. Stop all local development processes.

## Todo

- [ ] `render.yaml` and local production run
- [ ] README
- [ ] Deploy after user approval
- [ ] Design checklist done
- [ ] Device test matrix recorded
- [ ] Failures fixed and tested again

## Success Criteria

- The deployed URL serves the game and a Party game works between a phone and a desktop.
- Each row of the matrix has a recorded result. Each failure has a fix or a documented limit.
- A new developer runs the game locally with only the README.
- All success criteria in `plan.md` are met.
