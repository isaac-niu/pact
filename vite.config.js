import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { refereePlugin } from "./server/refereePlugin.js";

const root = path.dirname(fileURLToPath(import.meta.url));

function isRefereeApi(url = "") {
  const pathName = url.split("?")[0];
  return (
    pathName === "/api/referee" ||
    pathName === "/api/config" ||
    pathName === "/api/pacts/verify" ||
    pathName.startsWith("/api/evidence/")
  );
}

export default defineConfig({
  plugins: [react(), refereePlugin(root)],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        bypass(req) {
          if (isRefereeApi(req.url)) return req.url;
        },
      },
    },
  },
  preview: {
    host: true,
    port: 43128,
  },
});
