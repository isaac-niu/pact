/**
 * PACT backend — placeholder for the Auth0 + Atlas migration.
 *
 * When the server is wired up:
 *   - `npm run server` starts the Express API on port 3001.
 *   - The frontend dev server proxies `/api` requests to the backend.
 *   - Auth0 handles authentication; Atlas (MongoDB) handles persistence.
 *
 * Until then, the frontend runs entirely on localStorage (see src/store.jsx).
 */

import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { validateServerEnv } from "../env.js";

function sendJson(response, status, body) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

export function createApp() {
  return createServer((request, response) => {
    if (request.method === "GET" && request.url === "/api/health") {
      sendJson(response, 200, { status: "ok" });
      return;
    }

    if (request.method === "GET" && request.url === "/api/pacts") {
      sendJson(response, 200, []);
      return;
    }

    if (request.method === "POST" && request.url === "/api/pacts") {
      sendJson(response, 501, { error: "Not yet backed by Atlas" });
      return;
    }

    sendJson(response, 404, { error: "Not found" });
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    validateServerEnv();
    const port = Number(process.env.PORT ?? 3001);
    createApp().listen(port, () => {
      console.log(`PACT backend listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
