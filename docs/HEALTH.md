# Health and poll hygiene

Do not tight-loop `/api/health` or the desk snapshot when the book is down.

## Endpoints

| Path | Owner | Shape |
|------|--------|--------|
| `GET /api/health` | Desk (`server/httpDesk.js`) | `{ ok, service, uptime, features }` |
| `GET /healthz` | Desk | same |
| `GET /api/auth/health` | Person B (`src/backend/server.js`) | `{ status, auth, mongo }` |

On the unified production server, `/api/health` is the **desk**. `/api/auth/health` is Person B.

The browser probe (`src/api.js` `fetchHealth`) tries `/api/auth/health` then `/api/health`. That is **one** request pair, not a poll.

## Client loops

Implemented in `src/lib/pollHygiene.js`. Hidden tabs pause. A full reload starts a stopped loop again.

| Loop | Where | Interval | Backoff cap | Stop after |
|------|--------|----------|-------------|------------|
| Health | `/app` (`startHealthWatch`) | 30s | 5 min | 5 consecutive downs |
| Desk snapshot | `src/api/remote.js` `subscribe` | 4s | 60s | 8 consecutive misses |
| Deadline reminders | `src/store.jsx` | 60s | 5 min | 5 consecutive misses |

Rules:

1. **Success resets** the miss count and the wait.
2. **Each miss doubles** the wait, capped at the policy max.
3. **Stop** after `stopAfterFails`. No more network until reload.
4. **`document.hidden`** cancels the next tick; visibility resumes unless stopped.
5. **`/api` is not cached** by the PWA service worker.

`/app` stops the health watch as soon as a live or mock desk answers. A down desk retries with backoff, then shows “Stopped checking — refresh to try again.”

## Ops

Smoke and deploy still one-shot `curl` the desk. They do not poll.

```bash
curl -sS http://127.0.0.1:3000/api/health
curl -sS http://127.0.0.1:3001/api/auth/health
```
