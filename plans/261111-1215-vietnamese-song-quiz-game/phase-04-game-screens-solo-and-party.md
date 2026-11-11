---
title: "Phase 4: Game screens, solo and party"
status: todo
priority: P1
effort: 7h
dependencies: [2, 3]
---

# Phase 4: Game screens, solo and party

## Overview

Connect the client to the game server. Build each screen of the Solo and Party flows.

## Requirements

- [ ] Solo flow: name is optional, set parameters, play, see the result, play again.
- [ ] Party flow: create or join with a code and a required name, lobby, play, ranking, play again.
- [ ] The Solo player and the Party host set the five game parameters.
- [ ] The song source filter uses the library in the host browser.
- [ ] The tab-focus rule works and its limit is visible to players.

## Files

Create, under `/home/bim-dev/projects/doan-nhac/src/client`:

- `lib/game-store.ts`: one reducer that holds room state, current question and reveal, fed by socket events
- `lib/library-store.ts`: load the default CSV, read and write localStorage (phase 5 extends it)
- `lib/song-filter.ts`: pure function from library and source selection to `PoolSong[]`
- `lib/focus-watch.ts`: reports focus changes to the server
- `lib/leave-guard.ts`: back action and tab close handling inside a room
- `screens/party-entry-screen.tsx`: "Tạo phòng" and "Vào phòng"
- `screens/lobby-screen.tsx`
- `components/game-params-panel.tsx`
- `components/song-source-picker.tsx`
- `screens/question-screen.tsx`
- `screens/result-screen.tsx`
- `components/player-strip.tsx`, `components/countdown-bar.tsx`, `components/scoreboard.tsx`

Modify: `src/client/app.tsx` to select the screen from the store state.

## Screen flow

```
Home
 |- Chơi đơn  -> Audio gate -> Params -> Questions -> Result -> (Chơi lại | Về trang chủ)
 |- Chơi nhóm -> Party entry -> Audio gate -> Lobby -> Questions -> Result -> Lobby
 '- Kho nhạc  -> Library editor (phase 5)
```

Navigation is state in the store. There is no URL router. A refresh returns to Home, as the scope states.

## Screens

Each screen follows the "Screen rules" table of the design system: one main action, a back button, and Vietnamese error text.

Party entry:

- Name field, required, 16 characters maximum. The last name stays in localStorage as a convenience.
- "Tạo phòng" creates a room. "Vào phòng" takes a 4-character code with automatic upper case.
- Show the Vietnamese message for `ROOM_NOT_FOUND`, `ROOM_FULL` and `GAME_RUNNING`.

Lobby:

- Large room code with a copy button.
- Up to 5 player cards: avatar, name, host crown, sound-ready mark.
- The host sees the parameters panel and the start button. Other players see the chosen parameters as read-only text.
- If a player has no sound confirmation, the start button stays off and names that player.
- If the selected pool has fewer than 4 songs, the start button stays off and shows the reason.

Parameters panel:

| Parameter | Control | Default |
|---|---|---|
| Số câu hỏi | Four segment buttons: 5, 10, 15, 20 câu | 10 |
| Thời gian mỗi câu | Four segment buttons: 5, 10, 15, 20 giây | 10 |
| Trừ điểm khi sai | Toggle | Off |
| Bắt buộc ở lại tab | Toggle, with a one-line note about the second-device limit | Off |
| Nguồn bài hát | Source picker | Tất cả |

Source picker:

- Five modes as segment buttons: "Tất cả", "Thể loại", "Ca sĩ", "Thời kì", "Danh sách riêng".
- Each mode except "Tất cả" shows multi-select chips built from the library. The artist mode has a search field.
- A live counter shows how many enabled songs match.
- `song-filter.ts` uses only rows with `enabled` set. It sends at most 500 songs, chosen at random above that count.

Question:

- Header: question number, countdown bar from `startsAt` and `endsAt` in server time.
- Prompt: "Bài hát nào đây?" or "Ai hát bài này?".
- Four answer buttons with letter badges A to D. Keys 1 to 4 also pick an answer.
- Button states follow the "Answer button states" table of [the design system](./design-system.md).
- Countdown phase: a 3, 2, 1 animation. The client calls `prepare()` during this time.
- Reveal phase: the song title and artist appear, and each score change counts up.
- Party: a player strip shows avatar, score, an answered mark, and a lost-focus mark.
- If the focus rule locks the player, show "Bạn đã rời tab, câu này không tính điểm".

Result:

- Solo: final score, count of correct answers, "Chơi lại" and "Về trang chủ".
- Party: ranking with avatars. The winner has a larger card. The host has a "Chơi tiếp" button that returns all players to the lobby.

## Focus watch

- Listen to `visibilitychange`, and to window `blur` and `focus`.
- Emit `player:focus` on each change. Wait 300 ms before a lost-focus report, so that a short system dialog does not count.
- Run the watch only while a game is active.

## Implementation Steps

1. Write `game-store.ts`. Unit test the reducer with recorded event sequences.
2. Write the minimal `library-store.ts`: fetch `/songs.csv` once, parse it, cache it in localStorage under `library.v1`.
3. Write `song-filter.ts` with tests for each of the five modes.
4. Build the party entry screen and the lobby with the audio gate from phase 3.
5. Build the parameters panel and the source picker.
6. Build the question screen. Drive the countdown bar from server time, never from a local counter.
7. Build the result screen and the play-again path.
8. Write `focus-watch.ts` and wire the locked state.
8. Write `leave-guard.ts` from the "Navigation" section of the design system.
9. Handle a disconnect during a game: show "Mất kết nối" and a button to return to Home.
10. Play one full Solo game and one full Party game with three browser windows.

Commit after each numbered step that leaves the tests green. Push to `origin main` at the end of the phase.

## Todo

- [ ] Game store with reducer tests
- [ ] Library load and song filter with tests
- [ ] Party entry and lobby
- [ ] Parameters panel and source picker
- [ ] Question screen with reveal
- [ ] Result screen and play again
- [ ] Focus watch
- [ ] Disconnect handling

## Success Criteria

- A Solo game and a three-window Party game both reach the result screen with correct scores.
- Each parameter visibly changes the game: question count, clip length, penalty, focus lock, and song source.
- A selection of one artist produces only title questions.
- A sixth browser window receives the "Phòng đã đủ 5 người" message.
- After the host closes the tab, another player becomes host and the room continues.
- The browser back action inside a room shows the "Rời phòng?" dialog.
- At 360 px width, no screen needs horizontal scroll and all four answers fit with no vertical scroll.
