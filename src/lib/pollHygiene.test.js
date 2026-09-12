import { describe, expect, it, vi } from "vitest";
import {
  POLL_POLICIES,
  createHygienePoll,
  healthIsUp,
  nextDelayMs,
  shouldStopPolling,
  startHealthWatch,
} from "./pollHygiene.js";

describe("poll hygiene", () => {
  it("backs off and caps the wait", () => {
    const policy = POLL_POLICIES.health;
    expect(nextDelayMs(0, policy)).toBe(30_000);
    expect(nextDelayMs(1, policy)).toBe(60_000);
    expect(nextDelayMs(2, policy)).toBe(120_000);
    expect(nextDelayMs(8, policy)).toBe(policy.maxBackoffMs);
    expect(shouldStopPolling(4, policy)).toBe(false);
    expect(shouldStopPolling(5, policy)).toBe(true);
  });

  it("treats desk ok and auth mode as up", () => {
    expect(healthIsUp({ ok: true })).toBe(true);
    expect(healthIsUp({ status: "ok", auth: { mode: "mock" } })).toBe(true);
    expect(healthIsUp({ status: "down" })).toBe(false);
    expect(healthIsUp(null)).toBe(false);
  });

  it("stops after the miss limit and does not hammer", async () => {
    const scheduled = [];
    const run = vi.fn().mockRejectedValue(new Error("down"));
    const onStop = vi.fn();
    const poll = createHygienePoll({
      policy: { ...POLL_POLICIES.health, stopAfterFails: 3, intervalMs: 10 },
      run,
      isHidden: () => false,
      schedule: (fn, ms) => {
        scheduled.push({ fn, ms });
        return () => {};
      },
      onStop,
    });
    poll.start();
    await Promise.resolve();
    expect(run).toHaveBeenCalledTimes(1);
    expect(scheduled).toHaveLength(1);
    await scheduled[0].fn();
    await scheduled[1].fn();
    expect(run).toHaveBeenCalledTimes(3);
    expect(poll.isStopped()).toBe(true);
    expect(onStop).toHaveBeenCalledTimes(1);
    expect(scheduled).toHaveLength(2);
  });

  it("pauses while the tab is hidden and resumes when it is back", async () => {
    let hidden = true;
    const run = vi.fn().mockResolvedValue();
    let vis;
    const scheduled = [];
    const poll = createHygienePoll({
      policy: POLL_POLICIES.desk,
      run,
      isHidden: () => hidden,
      onVisibility: (fn) => {
        vis = fn;
        return () => {};
      },
      schedule: (fn, ms) => {
        scheduled.push({ fn, ms });
        return () => {};
      },
    });
    poll.start();
    await Promise.resolve();
    expect(run).not.toHaveBeenCalled();
    hidden = false;
    vis();
    await Promise.resolve();
    expect(run).toHaveBeenCalledTimes(1);
    poll.stop();
  });

  it("watches /api/health then stops on a live desk", async () => {
    const setHealth = vi.fn();
    const fetchHealth = vi.fn().mockResolvedValue({ status: "ok", auth: { mode: "mock" } });
    const stop = startHealthWatch({ fetchHealth, setHealth });
    await Promise.resolve();
    expect(setHealth).toHaveBeenCalledWith({ status: "ok", auth: { mode: "mock" } });
    stop();
  });

  it("marks health stopped after repeated downs", async () => {
    const setHealth = vi.fn();
    const fetchHealth = vi.fn().mockResolvedValue({ status: "down" });
    const scheduled = [];
    startHealthWatch({
      fetchHealth,
      setHealth,
      policy: { ...POLL_POLICIES.health, stopAfterFails: 2, intervalMs: 5 },
      createPoll: (opts) =>
        createHygienePoll({
          ...opts,
          isHidden: () => false,
          schedule: (fn, ms) => {
            scheduled.push({ fn, ms });
            return () => {};
          },
        }),
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(setHealth).toHaveBeenCalledWith({ status: "down", stopped: false });
    expect(scheduled[0]).toBeTruthy();
    await scheduled[0].fn();
    await Promise.resolve();
    await Promise.resolve();
    expect(setHealth).toHaveBeenCalledWith(expect.any(Function));
    const last = setHealth.mock.calls.at(-1)[0];
    expect(last({ status: "down" })).toMatchObject({ status: "down", stopped: true });
  });
});
