import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";

const SERVER_URL = "http://localhost:3001";

// The default library lives in data/songs.csv. The client fetches it as /songs.csv.
function copySongsCsv(): Plugin {
  const copy = () => {
    mkdirSync(resolve("public"), { recursive: true });
    copyFileSync(resolve("data/songs.csv"), resolve("public/songs.csv"));
  };
  return {
    name: "copy-songs-csv",
    buildStart() {
      try {
        copy();
      } catch {
        this.warn("data/songs.csv not found. The client starts with an empty library.");
      }
    },
  };
}

export default defineConfig({
  plugins: [copySongsCsv(), react(), tailwindcss()],
  build: { outDir: "dist/client", emptyOutDir: true },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/socket.io": { target: SERVER_URL, ws: true },
      "/healthz": SERVER_URL,
    },
  },
});
