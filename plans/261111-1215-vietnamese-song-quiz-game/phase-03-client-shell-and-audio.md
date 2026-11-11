---
title: "Phase 3: Client shell and audio"
status: done
priority: P1
effort: 5h
dependencies: [1]
---

# Phase 3: Client shell and audio

## Overview

Build the visual foundation, the Vietnamese strings, the avatars, and the audio player that works inside browser autoplay rules.

## Requirements

- [x] A playful, original game style with reusable components.
- [x] A mobile-first layout that also looks correct on a desktop screen.
- [x] All interface text comes from one Vietnamese strings module.
- [x] 12 built-in SVG avatars.
- [x] One audio module that handles unlock, preload, synchronized start and every failure case.

## Files

Create, under `/home/bim-dev/projects/doan-nhac/src/client`:

- `styles/theme.css`: Tailwind theme tokens, fonts, motion
- `lib/strings-vi.ts`: all interface text
- `lib/socket.ts`: one typed Socket.IO client
- `lib/time-sync.ts`: server clock offset
- `lib/audio-player.ts`: the audio module
- `components/game-button.tsx`, `components/screen-frame.tsx`, `components/bottom-sheet.tsx`, `components/toggle.tsx`, `components/chip.tsx`, `components/toast.tsx`
- `components/segment-buttons.tsx`, `components/text-input.tsx`, `components/confirm-dialog.tsx`, `components/spinner.tsx`
- `components/avatar.tsx`: 12 inline SVG avatars selected by `avatarId`
- `components/audio-gate.tsx`: the "turn on sound" step
- `screens/home-screen.tsx`: three large entries: "Chơi đơn", "Chơi nhóm", "Kho nhạc"
- `assets/chime.wav`: a short original test tone made by a script

## Visual direction

Implement [the design system](./design-system.md). It defines the color tokens, typography, shape, motion, icons, component specifications and component states.

Summary: a dark arcade style with chunky blocks and hard bottom edges. Purple is the base color, amber marks the one main action per screen, and Baloo 2 is the display font.

The style does not reuse the songtrivia.io colors, logo or layout.

## Layout rules

- Design at 360 px width first. The game column has a maximum width of 520 px and sits in the center on large screens.
- Use `100dvh`, not `100vh`. Add `env(safe-area-inset-*)` padding.
- Touch targets are 48 px or larger, with 12 px gaps.
- Answer choices: one column below 480 px, a 2 by 2 grid from 480 px.
- No hover-only interaction. Set `touch-action: manipulation` on buttons to remove the double-tap zoom delay.
- Inputs use a 16 px font or larger, so that iOS does not zoom on focus.

## Audio module

Browser facts that drive the design:

- Browsers block audio that starts with no user gesture. `play()` then rejects with `NotAllowedError`.
- On iOS, the unlock belongs to the audio element. A new element is locked again.
- iOS ignores `audio.volume`. The game has no volume slider.
- iOS can ignore `preload`. The audio then loads only after `play()`.
- A hidden tab slows JavaScript timers. Audio that already plays continues.

Design:

1. Create exactly one `HTMLAudioElement` for the whole session. Never replace it.
2. `unlock()` runs inside a tap handler. It plays `chime.wav` on the shared element. The player hears the chime and confirms the volume.
3. After `unlock()` succeeds, the client emits `player:audio { ready: true }`.
4. `prepare(url, offsetSec)` sets `src`, calls `load()`, and waits for `canplay` for at most 2.5 s.
5. `playAt(startsAt)` waits until the synchronized server time, sets `currentTime` to the offset, and calls `play()`.
6. If `play()` rejects with `NotAllowedError`, show a full-width "Chạm để nghe" button. A tap calls `play()` again at the correct position.
7. On an `error` event, show "Không tải được nhạc" for that question. The question continues.
8. `stop()` pauses the element. Call it at the start of each countdown and on leaving the game.

`time-sync.ts` sends `time:ping` three times and keeps the offset from the fastest round trip.

`audio-gate.tsx` shows one large "Bật âm thanh" button, plays the chime, then asks "Nghe thấy tiếng chưa?" with a replay button. It also tells the player to turn off silent mode and raise the volume.

## Implementation Steps

1. Add fonts and the color, spacing and motion tokens from the design system to `theme.css`.
1. Build the base components from the "Components" table of the design system, with all five states.
2. Write `strings-vi.ts`. Group keys by screen. Include all error codes from the protocol.
3. Draw 12 avatars as simple original SVG characters with a music theme. Each has a distinct shape and color.
4. Generate `chime.wav` with a small Node script: two sine notes, 0.4 s, with fade in and fade out.
5. Write `socket.ts` and `time-sync.ts`.
6. Write `audio-player.ts` and `audio-gate.tsx`. Unit test the state logic with a fake audio element.
7. Build `home-screen.tsx`. While the socket connects, show "Đang đánh thức máy chủ...".
8. Make sure that the home screen and the audio gate work at 360 px, 768 px and 1440 px widths.

Commit after each numbered step that leaves the tests green. Push to `origin main` at the end of the phase.

## Todo

- [x] Theme, fonts and base components
- [x] Vietnamese strings module
- [x] 12 SVG avatars
- [x] Socket client and time sync
- [x] Audio player with tests
- [x] Audio gate and home screen

## Success Criteria

- The home screen shows three entries and no English text.
- In desktop Chrome with autoplay blocked, the gate unlocks audio and a later `playAt` produces sound with no extra tap.
- A forced `NotAllowedError` shows the "Chạm để nghe" fallback, and a tap starts the clip at the correct position.
- All 12 avatars render at 40 px and 96 px.
- No component file contains a raw hex color. Each base component shows its five states.
- Keyboard focus is visible on each control.
- `npm test` and `npm run typecheck` pass.
