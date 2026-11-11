---
title: "Phase 5: Library editor"
status: done
priority: P2
effort: 5h
dependencies: [3]
---

# Phase 5: Library editor

## Overview

Build the "Kho nhạc" screen. A player uses it to add songs, correct song data, manage custom lists, and import or export the CSV.

## Requirements

- [x] Browse and search the library on a phone with one hand.
- [x] Add a song from iTunes search with no manual typing of ids or URLs.
- [x] Edit title, artist, decade, tags and custom lists of a song.
- [x] Turn a song off without deleting it.
- [x] Import a CSV, export a CSV, and reset to the default library.

## Storage model

- The default library is `public/songs.csv`, built from `data/songs.csv`.
- The working library is in localStorage under `library.v1`. The first visit copies the default into it.
- Edits change only the working library of that browser.
- A Party game uses the working library of the host.
- To share edits with all players, export the CSV, replace `data/songs.csv`, and deploy.

The screen states this model in one short Vietnamese note near the export button.

## Files

Create, under `/home/bim-dev/projects/doan-nhac/src/client`:

- `screens/library-screen.tsx`
- `components/song-card.tsx`
- `components/song-edit-sheet.tsx`
- `components/song-add-sheet.tsx`
- `components/tag-input.tsx`
- `lib/itunes-search.ts`: browser call to the iTunes Search API
- `lib/preview-player.ts`: a second audio element used only on this screen

Modify: `src/client/lib/library-store.ts` to add create, update, delete, import, export and reset.

## Screen design

All components follow [the design system](./design-system.md). The confirmation dialog comes from phase 3.

Library list:

- Sticky top bar: search field, song counter, and an "Thêm bài" button.
- Filter chips: "Tất cả", "Đang tắt", then one chip per tag, decade and custom list.
- Each song is a card, not a table row: play button, title, artist, small tag chips, and an on/off toggle.
- Render the list in pages of 50 with a "Xem thêm" button. This keeps 1000 rows fast with no extra library.
- A tap on a card opens the edit sheet.
- An overflow menu holds "Nhập CSV", "Xuất CSV" and "Khôi phục mặc định".

Edit sheet (bottom sheet on a phone, centered dialog on a desktop):

- Fields: "Tên bài", "Ca sĩ", "Thời kì" as four segment buttons, "Thể loại" as a tag input, "Danh sách riêng" as a tag input.
- The tag inputs suggest existing values as chips. A new value is created on Enter or on a comma.
- Buttons: "Lưu", "Xoá bài" with a confirmation dialog.
- Read-only line: `trackId`, release year and iTunes genre.

Add sheet:

- One search field. Search starts 500 ms after the last key press and needs 2 or more characters.
- The call goes directly from the browser to `https://itunes.apple.com/search` with `country=vn`, `media=music`, `entity=song`, `limit=25`. The research confirmed the CORS header.
- Each result shows title, artist, year, a listen button, and an "Thêm" button.
- A result that is already in the library shows "Đã có" in place of the button.
- A new song gets `decade` from its release year, empty `tags`, and `enabled` set.
- On HTTP 403 or 429, show "iTunes đang giới hạn, thử lại sau một phút".

Import and export:

- Export downloads `songs.csv` as UTF-8 with a byte order mark, using `serializeSongsCsv` from phase 2.
- Import reads a file with `parseSongsCsv`. It offers "Gộp" (merge by `trackId`, imported rows win) and "Thay thế".
- If a required column is missing or a `trackId` is not a number, reject the file and show the row number.
- Reset asks for confirmation, because it removes all local edits.

## Implementation Steps

1. Extend `library-store.ts`. Unit test create, update, delete, merge import, replace import and reset.
2. If a localStorage write fails, keep the library in memory and show a warning toast.
3. Write `itunes-search.ts` with an `AbortController`, so that a new search cancels the previous one.
4. Write `preview-player.ts`. One preview plays at a time. Leaving the screen stops it.
5. Build the list with search, chips and paging.
6. Build the edit sheet and the tag input.
7. Build the add sheet.
8. Build import, export and reset with the confirmation dialog.
9. Add a song, tag it with a new custom list, then start a Solo game with that list as the source.

Commit after each numbered step that leaves the tests green. Push to `origin main` at the end of the phase.

## Todo

- [x] Library store operations with tests
- [x] iTunes search client
- [x] List, search, filter chips, paging
- [x] Edit sheet and tag input
- [x] Add sheet
- [x] Import, export, reset

## Success Criteria

- A player adds a song by search in fewer than 5 taps after typing the name.
- An edited tag appears as a chip in the source picker of phase 4.
- A song that is turned off never appears in a game.
- Export followed by "Thay thế" import gives an identical library, including diacritics.
- A malformed CSV shows a Vietnamese error and changes nothing.
- The list scrolls smoothly with 1000 songs on a mid-range phone.
