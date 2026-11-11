# Device test results

Date: 2026-11-11. Build: `main` after phase 6.

The user deploys the Render service. Real-device rows wait for the deployed HTTPS URL, so they are recorded as pending.

## Automated checks (local production build, `npm start` on port 3001)

| Check | Tool | Result |
|---|---|---|
| `npm run typecheck`, `npm test` (104 tests), `npm run build` | npm | Pass. Exit code 0. |
| `GET /healthz` | curl | Pass. Returns `ok`. |
| `GET /songs.csv` | curl | Pass. 1427 songs. |
| Solo game, 5 questions, 360 by 640 px, autoplay needs a gesture | Playwright with Chromium 1228 | Pass. Gate unlocked audio, all 5 questions played with no extra tap, result showed score and "Đúng 2/5 câu", "Chơi lại" started a new game. |
| Party game, 3 players in 3 isolated browsers, 5 questions | agent-browser | Pass. All 3 players saw each question, the result showed the same ranking on all 3 screens, "Chơi tiếp" returned all players to the lobby. |
| Browser back action inside a room | agent-browser | Pass. "Rời phòng?" dialog showed. "Rời phòng" returned to Home. |
| Library: add a song from iTunes search, add a new custom list, use it as the song source | agent-browser | Pass. The added row showed "Đã có". The source picker showed the new list with "1 bài phù hợp". |
| Question screen at 360 by 640 px | agent-browser | Pass. No vertical or horizontal scroll. |
| Home screen and audio gate at 360, 768 and 1440 px | Playwright | Pass. No horizontal scroll. |
| Sixth player, join during a game, non-Apple preview URL, host migration | Vitest integration test | Pass. `ROOM_FULL`, `GAME_RUNNING`, `BAD_PAYLOAD`, new host. |
| Raw hex colors in component files | grep | Pass. None. |

## Real-device matrix (pending)

Run each row with a two-player Party game on the deployed URL. Record: sound after the gate, start delay between two devices, fallback button behavior, layout problems.

| Device and browser | Cases | Sound after gate | Start delay | Fallback button | Layout | Status |
|---|---|---|---|---|---|---|
| iPhone, Safari | Gate unlock. 10 questions with no extra tap. Silent switch on and off. Low Power Mode. Screen lock during a question. | | | | | Pending |
| iPhone, Chrome | Gate unlock. 10 questions. | | | | | Pending |
| Android, Chrome | Gate unlock. 10 questions. Switch to another app during a question. | | | | | Pending |
| Desktop Chrome | Autoplay blocked in site permissions. Tab switch with the focus rule on. | | | | | Pending |
| Desktop Firefox | Autoplay blocked. 10 questions. | | | | | Pending |
| Desktop Safari | Default autoplay policy "Stop Media with Sound". 10 questions. | | | | | Pending |

## Other tests (pending, deployed URL)

| Test | Status |
|---|---|
| Throttle one browser to "Slow 4G". The clip starts late on that device and the game does not block the other player. | Pending |
| Make a preview URL invalid in the working library. The question shows "Không tải được nhạc" and the game continues. | Pending |
| Rotate a phone to the horizontal orientation during a question. All four answers stay reachable. | Pending |
| Read each screen for English text and for cut-off Vietnamese diacritics in the heading font. | Pending |
