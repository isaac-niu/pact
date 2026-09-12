/**
 * Poll hygiene for /api/health, /api/desk, and reminder ticks.
 *
 * Do not tight-loop a down desk. Back off, pause when the tab is hidden,
 * and stop after a fixed miss count. A full reload starts the loop again.
 *
 * See docs/HEALTH.md.
 */

export const POLL_POLICIES = {
  health: {
    id: "health",
    intervalMs: 30_000,
    maxBackoffMs: 5 * 60_000,
    stopAfterFails: 5,
    pauseWhenHidden: true,
  },
  desk: {
    id: "desk",
    intervalMs: 4_000,
    maxBackoffMs: 60_000,
    stopAfterFails: 8,
    pauseWhenHidden: true,
  },
  reminders: {
    id: "reminders",
    intervalMs: 60_000,
    maxBackoffMs: 5 * 60_000,
    stopAfterFails: 5,
    pauseWhenHidden: true,
  },
};

export function nextDelayMs(fails, policy) {
  if (!fails || fails <= 0) return policy.intervalMs;
  return Math.min(policy.intervalMs * 2 ** fails, policy.maxBackoffMs);
}

export function shouldStopPolling(fails, policy) {
  return fails >= policy.stopAfterFails;
}

export function healthIsUp(body) {
  if (!body || body.status === "down") return false;
  return body.ok === true || body.status === "ok" || Boolean(body.auth?.mode);
}

export function createHygienePoll({
  policy,
  run,
  isHidden = () => typeof document !== "undefined" && Boolean(document.hidden),
  onVisibility = (fn) => {
    if (typeof document === "undefined") return () => {};
    document.addEventListener("visibilitychange", fn);
    return () => document.removeEventListener("visibilitychange", fn);
  },
  schedule = (fn, ms) => {
    const id = setTimeout(fn, ms);
    return () => clearTimeout(id);
  },
  onStop,
} = {}) {
  let fails = 0;
  let stopped = false;
  let cancelTimer = () => {};
  let unlisten = () => {};

  async function tick() {
    if (stopped) return;
    if (policy.pauseWhenHidden && isHidden()) return;
    try {
      await run();
      fails = 0;
    } catch {
      fails += 1;
      if (shouldStopPolling(fails, policy)) {
        stopped = true;
        onStop?.({ fails, policy });
        return;
      }
    }
    if (stopped) return;
    cancelTimer = schedule(tick, nextDelayMs(fails, policy));
  }

  function onVis() {
    if (stopped) return;
    cancelTimer();
    if (!isHidden()) tick();
  }

  function stop() {
    stopped = true;
    cancelTimer();
    unlisten();
  }

  function start() {
    unlisten = policy.pauseWhenHidden ? onVisibility(onVis) : () => {};
    tick();
    return stop;
  }

  return {
    start,
    stop,
    getFails: () => fails,
    isStopped: () => stopped,
  };
}

export function startHealthWatch({
  fetchHealth,
  setHealth,
  createPoll = createHygienePoll,
  policy = POLL_POLICIES.health,
} = {}) {
  let poll;
  poll = createPoll({
    policy,
    run: async () => {
      const body = await fetchHealth();
      if (!healthIsUp(body)) {
        setHealth({ ...body, status: "down", stopped: false });
        throw new Error("desk health down");
      }
      setHealth(body);
      poll.stop();
    },
    onStop: () => {
      setHealth((prev) => ({
        ...(typeof prev === "object" && prev ? prev : {}),
        status: "down",
        stopped: true,
      }));
    },
  });
  return poll.start();
}
