import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { refereePlugin } from "./server/refereePlugin.js";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), refereePlugin(root)],
  server: {
    host: true,
    port: 43127,
  },
  preview: {
    host: true,
    port: 43128,
  },
});
