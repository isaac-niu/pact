import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { refereePlugin } from "./server/refereePlugin.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const pactApiUrl = process.env.PACT_API_URL ?? "http://localhost:3001";

function isRefereeApi(url = "") {
  const pathName = url.split("?")[0];
  return (
    pathName === "/api/referee" ||
    pathName === "/api/config" ||
    pathName === "/api/pacts/verify" ||
    pathName === "/api/proof-signals" ||
    pathName.startsWith("/api/evidence/")
  );
}

export default defineConfig({
  plugins: [react(), refereePlugin(root)],
  plugins: [react(), refereePlugin(root)],
  // @solana/web3.js and its dependencies reference the Node `global` and
  // `Buffer` globals; the Buffer polyfill lives in main.jsx, this covers
  // the bare `global` references some of those packages make.
  define: {
    global: "globalThis",
  },
  resolve: {
    alias: {
      buffer: "buffer",
    },
  },
  optimizeDeps: {
    include: ["buffer", "@solana/web3.js"],
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/healthz": "http://127.0.0.1:3000",
      "/api/announce": "http://127.0.0.1:3000",
      "/api/desk": "http://127.0.0.1:3000",
      "/api/auth": "http://localhost:3001",
      "/api/users": "http://localhost:3001",
      "/api/ledger": "http://localhost:3001",
      "/api/health": "http://localhost:3001",
      "/api/groups": pactApiUrl,
      "/api/friends": pactApiUrl,
      "/api/pacts": {
        target: pactApiUrl,
        bypass(req) {
          if (isRefereeApi(req.url)) return req.url;
        },
      },
      "/api": {
        target: "http://127.0.0.1:3000",
        bypass(req) {
          if (isRefereeApi(req.url)) return req.url;
        },
      },
    },
  },
  preview: {
    host: true,
    port: 4173,
  },
});
