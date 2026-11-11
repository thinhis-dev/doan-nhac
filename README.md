# Đoán Nhạc

Đoán Nhạc is a browser quiz for Vietnamese music. The game plays a 30-second iTunes preview, and each player picks the song title or the artist from four choices. You can play alone (Solo) or with 2 to 5 friends in one room (Party), and you can edit the song library in the browser.

## Requirements

- Node.js 24.22.1 or later in the 24.x line (see `.nvmrc`).
- npm.

## Commands

| Command | What it does |
|---|---|
| `npm install` | Installs the dependencies. |
| `npm run dev` | Starts the Vite client on port 5173 and the game server on port 3001. Open http://localhost:5173. |
| `npm test` | Runs the unit and integration tests. |
| `npm run typecheck` | Checks the TypeScript types. |
| `npm run build` | Builds the client to `dist/client` and the server to `dist/server`. |
| `npm start` | Serves the built game on `PORT` (default 3001). Open http://localhost:3001. |
| `npm run fetch-songs` | Updates `data/songs.csv` from the iTunes Search API. |

During development, Vite forwards `/socket.io` and `/healthz` to the server on port 3001. `GET /healthz` returns `ok`.

## Logo and icons

The logo source is `assets/logo.svg`. After you change it, run `./scripts/make-icons.sh` (needs `rsvg-convert` and ImageMagick). It writes `public/favicon.svg`, `public/favicon.ico`, `public/apple-touch-icon.png` and `assets/logo-512.png`. The in-app logo is `src/client/components/logo.tsx`; keep its drawing in step with the SVG.

## Configuration

The game has no secrets. `.env.example` lists the optional variables `PORT` and `HOST`. The server reads them from the environment.

## Update the default song library

1. Edit `data/artists.csv`. Each row is an artist name and tags joined with `;`.
2. Run `npm run fetch-songs`. The script waits 3.5 seconds between iTunes calls, so 60 artists take about 4 minutes.
3. Review `data/songs.csv`. A second run adds new songs and keeps your edits to title, artist, decade, tags, lists and the enabled flag.
4. Commit `data/songs.csv`.

The build copies `data/songs.csv` to `/songs.csv` for the client.

## Share library edits

Library edits stay in the browser that made them (localStorage). A Party game uses the library of the host.

To share edits with everyone, open "Kho nhạc", choose "Xuất CSV", replace `data/songs.csv` with the exported file, commit, and deploy.

## Deploy on Render

The repository has a `render.yaml` Blueprint for one Node web service.

1. In Render, choose **New > Blueprint** and connect `https://github.com/thinhis-dev/doan-nhac`.
2. Render reads `render.yaml`: build `npm ci && npm run build`, start `npm start`, health check `/healthz`, one instance.
3. After the deploy, open `https://<service>.onrender.com/healthz`. It returns `ok`.

Rooms live in server memory, so the service must run exactly one instance. A deploy or a restart ends all running games. The free plan stops an idle service. The first visit after that can wait about one minute. The game shows "Đang đánh thức máy chủ..." during that wait.

## Usage limit

The game streams iTunes previews from the Apple CDN and never stores audio. Apple allows previews for promotion only. Use the game privately with friends: no ads and no public listing.
