# Design system: Đoán Nhạc

This file is the single source for look, motion and interaction rules. Phases 3, 4 and 5 implement it. Phase 6 audits it.

Source: the `ui-ux-pro-max` skill (design-system generator, plus the style, color, google-fonts and ux domains), run on 2026-11-11.

## What the skill recommended

| Topic | Skill result | Decision |
|---|---|---|
| Style | `Vibrant & Block-based`: bold blocks, large type, high contrast, 200 to 300 ms motion | Accepted |
| Style detail | Neubrutalism: hard offset shadows, flat fills, no blur | Accepted for buttons and cards, with rounded corners |
| Palette | "Gaming": neon purple with rose action, on a near-black violet background | Accepted as the base |
| Palette (first result) | "Quiz blue with gold" on a light background | Rejected. It is close to the songtrivia.io look. |
| Fonts | Righteous with Poppins | Rejected. The skill font data shows no Vietnamese subset for either font. |
| Fonts (replacement) | Baloo 2 with Be Vietnam Pro | Accepted. The skill font data lists a Vietnamese subset for both. |
| Page pattern | App Store landing page | Rejected. The product is a game with no landing page. |
| Effects | Continuous animated background patterns | Rejected. The skill UX rules mark decorative infinite animation as a distraction. |

## Color tokens

Define these as CSS variables in `theme.css` and map them into the Tailwind theme. Components use token names only, never raw hex values.

| Token | Hex | Use | Contrast |
|---|---|---|---|
| `bg` | `#0F0F23` | Page background | |
| `surface` | `#1E1C35` | Cards, sheets, answer buttons | |
| `surface-2` | `#27273B` | Inputs, inactive segments | |
| `text` | `#F8FAFC` | Main text | 18.0 on `bg`, 15.8 on `surface` |
| `text-muted` | `#94A3B8` | Helper text | 7.4 on `bg`, 6.4 on `surface` |
| `ink` | `#0F0F23` | Text on bright fills | |
| `primary` | `#7C3AED` | Secondary buttons, selected states | White text: 5.7 |
| `primary-edge` | `#5B21B6` | Bottom edge of primary buttons | |
| `outline` | `#A78BFA` | Borders of controls, focus ring | 6.9 on `bg` |
| `cta` | `#FBBF24` | The one main action per screen | `ink` text: 11.3 |
| `cta-edge` | `#B45309` | Bottom edge of the main action | |
| `accent` | `#FB7185` | Timer urgency, highlights | `ink` text: 7.0 |
| `success` | `#34D399` | Correct answer | `ink` text: 9.8 |
| `danger` | `#F87171` | Wrong answer, destructive actions | 6.8 on `bg` |

All listed text pairs pass WCAG AA (4.5 to 1). Do not put white text on `accent`, `cta` or `success`.

The game has one dark theme. There is no light theme.

## Typography

| Role | Font | Weight | Size | Line height |
|---|---|---|---|---|
| Display (game title, big numbers) | Baloo 2 | 800 | 44 px | 1.25 |
| Heading | Baloo 2 | 700 | 32 px, 24 px | 1.25 |
| Button label | Baloo 2 | 700 | 20 px | 1.25 |
| Body | Be Vietnam Pro | 400, 500 | 16 px | 1.5 |
| Small label | Be Vietnam Pro | 600 | 14 px | 1.4 |

Rules:

- Load both fonts from `@fontsource` packages with only the `latin` and `vietnamese` subsets. Use `font-display: swap`.
- Display line height stays at 1.25 or more. Stacked Vietnamese diacritics such as "Ễ" need this room.
- The timer and all scores use `font-variant-numeric: tabular-nums`, so that digits do not shift.
- Body text is never smaller than 14 px. Inputs use 16 px, so that iOS does not zoom on focus.
- Long song titles wrap to two lines. They are never cut to one line with an ellipsis on an answer button.

## Shape, spacing and elevation

| Token | Value |
|---|---|
| Spacing scale | 4, 8, 12, 16, 24, 32, 48 px |
| Corner radius | 12 px (chips, inputs), 20 px (buttons, cards), 28 px (sheets) |
| Border | 2 px `outline` on controls |
| Elevation style | Hard bottom edge, no blur. Buttons: 6 px edge. Cards: 4 px edge in `#000` at 35% opacity. |
| Layers (z-index) | 0 content, 10 sticky bars, 20 sheets, 30 dialogs, 40 toasts |
| Modal scrim | Black at 60% opacity |
| Game column | Maximum width 520 px, centered. Side padding 16 px, 24 px from 768 px. |

## Motion

| Token | Value | Use |
|---|---|---|
| `press` | 100 ms ease-out | Button moves down 4 px and the edge shrinks |
| `pop` | 200 ms, spring curve `cubic-bezier(0.34, 1.56, 0.64, 1)` | Selected answer, joined player card |
| `enter` | 250 ms ease-out | Screen and sheet entry |
| `exit` | 160 ms ease-in | Screen and sheet exit |
| `shake` | 300 ms | Wrong answer |
| `count-up` | 600 ms | Score change on reveal |

Rules:

- Animate only `transform` and `opacity`. The countdown bar uses `transform: scaleX`.
- At most two elements animate at the same time on a screen.
- No infinite decorative animation. The loading spinner and the countdown are the only continuous motion.
- With `prefers-reduced-motion`, keep opacity changes and remove movement, shake and spring.
- An animation never blocks a tap.

## Icons

- Use `lucide-react` for all icons. One stroke width: 2.25 px. Sizes: 20, 24 and 32 px.
- No emoji as icons anywhere in the interface.
- An icon-only button has an `aria-label` in Vietnamese and a 48 px touch area.
- Avatars are the 12 original SVG characters from phase 3. They are not Lucide icons.

## Components

| Component | Specification |
|---|---|
| Main button | `cta` fill, `ink` label, 6 px `cta-edge` bottom edge, minimum height 56 px, full width on a phone |
| Secondary button | `primary` fill, white label, `primary-edge` bottom edge, minimum height 52 px |
| Ghost button | No fill, `outline` border, `text` label, minimum height 48 px |
| Danger button | `danger` border and label. It never sits next to the main button. |
| Answer button | `surface` fill, 2 px `outline` border, letter badge A to D on the left, label up to two lines, minimum height 64 px |
| Segment buttons | One row of 2 to 5 choices. Active: `primary` fill. Inactive: `surface-2`. Minimum height 48 px. |
| Toggle | 52 by 32 px track with a visible "Bật" or "Tắt" text label next to it |
| Chip | Minimum height 40 px inside a 48 px touch area. Selected: `primary` fill with a tick icon. |
| Text input | `surface-2` fill, 2 px `outline` border, visible label above, helper or error text below, minimum height 52 px |
| Card | `surface` fill, 20 px radius, 4 px bottom edge |
| Bottom sheet | Slides from the bottom on a phone. Centered dialog from 768 px. Has a close button and closes on the Escape key. |
| Toast | Top of the screen, below the safe area. Closes after 4 s. Uses `aria-live="polite"`. |
| Countdown bar | 12 px high, `cta` fill. In the last 3 seconds: `accent` fill and a larger seconds number. |

Every interactive component defines five states:

- Default.
- Pressed.
- Focus-visible: a 3 px `outline` ring with a 2 px offset.
- Disabled: 45% opacity, the `disabled` attribute, no press motion.
- Loading: a spinner replaces the icon and the label stays.

Answer button states:

| State | Look |
|---|---|
| Default | `surface` fill, `outline` border |
| Chosen, before reveal | `primary` fill, white label, `pop` motion. All four buttons lock. |
| Correct, on reveal | `success` fill, `ink` label, tick icon |
| Chosen and wrong, on reveal | `danger` border, cross icon, `shake` motion |
| Other choices, on reveal | 50% opacity |

Each reveal state has an icon. Color is never the only signal.

## Screen rules

| Screen | Main action (`cta`) | Rules |
|---|---|---|
| Home | "Chơi nhóm" | Three large stacked blocks with an icon and a one-line description. The game title uses the display style. |
| Party entry | "Tạo phòng" or "Vào phòng" | Name label is visible. The error text sits below its field and states the fix. |
| Audio gate | "Bật âm thanh" | One action on the screen. After the chime: "Nghe rồi" and "Phát lại". |
| Lobby | "Bắt đầu" (host) | The room code uses the display style. A locked start button shows its reason as text below it. |
| Question | None. The four answers share the focus. | Fixed order: progress and timer, prompt, answers, player strip. No scroll at 360 by 640 px. |
| Result | "Chơi lại" or "Chơi tiếp" | The winner card enters with `pop`. Scores count up. |
| Library | "Thêm bài" | Sticky search bar. Song cards. Empty search result shows a message and a "Xoá bộ lọc" button. |

Rules for all screens:

- Each screen has one main action. Other actions use the secondary or ghost style.
- Each screen below Home has a back button at the top left with a 48 px touch area.
- A loading time above 300 ms shows a spinner or a skeleton. The interface never freezes with no feedback.
- An error message states the cause and the next step, in Vietnamese.
- A destructive action (delete a song, reset the library, leave a running game) asks for confirmation.
- Fixed bars add safe-area padding. Scroll content adds bottom padding equal to the height of a fixed bar.
- Layout is designed at 360 px, then adjusted at 768 px and 1440 px. No horizontal scroll at any width.
- In the horizontal phone orientation, the question screen uses two columns: prompt and timer left, answers right.

## Navigation

The game has no URL router, because a refresh ends the session by design. The skill rule for deep links does not apply.

The browser back action still needs a predictable result:

- On entry to a room, push one history entry. On a back action, show the "Rời phòng?" dialog and stay on the page.
- During a game, a tab close or reload shows the browser leave warning through `beforeunload`.
- Outside a room, the back button of the game returns to Home.

## Accessibility

- Keyboard: all controls are reachable in visual order. On the question screen, keys 1 to 4 pick an answer.
- After a screen change, move focus to the screen heading.
- Use real `button`, `input` and `label` elements. A `div` is never a control.
- A sheet or dialog traps focus and returns it to the trigger on close.
- Announce the reveal result and the lobby errors through an `aria-live` region.
- Never disable browser zoom in the viewport meta tag.
- Text scales with the browser font size. Use `rem` for font sizes.

## Pre-delivery checklist

- [ ] No emoji used as an icon. All icons come from Lucide with one stroke width.
- [ ] No raw hex value in a component. All colors come from tokens.
- [ ] Each touch target is 48 px or larger, with 8 px or more between targets.
- [ ] Each interactive element shows its pressed, focus-visible and disabled states.
- [ ] A press never moves other elements on the screen.
- [ ] Each screen has exactly one main action.
- [ ] Reveal states have an icon as well as a color.
- [ ] The question screen fits 360 by 640 px with no scroll, with the longest song title in the library.
- [ ] Vietnamese diacritics are not clipped in display text.
- [ ] `prefers-reduced-motion` removes movement.
- [ ] Browser text size at 200% does not break the question screen.
- [ ] The back action inside a room shows the leave dialog.
- [ ] Safe areas are respected on a phone with a notch, in both orientations.
