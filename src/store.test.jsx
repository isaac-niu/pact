import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { resetDesk, STORAGE_KEY } from "./api/local.js";
import { PactProvider, usePact } from "./store.jsx";

describe("PactProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    resetDesk();
  });

  it("provides initial user as 'you'", () => {
    const { result } = renderHook(() => usePact(), {
      wrapper: PactProvider,
    });
    expect(result.current.userId).toBe("you");
  });

  it("provides the correct user object for 'you'", () => {
    const { result } = renderHook(() => usePact(), {
      wrapper: PactProvider,
    });
    expect(result.current.user.id).toBe("you");
    expect(result.current.user.handle).toBe("ISAAC");
  });

  it("provides the correct opponent for 'you'", () => {
    const { result } = renderHook(() => usePact(), {
      wrapper: PactProvider,
    });
    expect(result.current.opponent.id).toBe("friend");
    expect(result.current.opponent.handle).toBe("FRIEND");
  });

  it("switches user between 'you' and 'friend'", () => {
    const { result } = renderHook(() => usePact(), {
      wrapper: PactProvider,
    });

    act(() => result.current.switchUser("friend"));
    expect(result.current.userId).toBe("friend");

    act(() => result.current.switchUser("you"));
    expect(result.current.userId).toBe("you");
  });

  it("creates a pact with correct fields", async () => {
    const { result } = renderHook(() => usePact(), {
      wrapper: PactProvider,
    });

    await act(async () => {
      await result.current.createPact({
        title: "Test challenge",
        criteria: "Show a photo of the thing.",
        stake: 2,
      });
    });

    const created = result.current.pacts.find((p) => p.title === "Test challenge");
    expect(created).toBeTruthy();
    expect(created.stake).toBe(2);
    expect(created.creatorId).toBe("you");
    expect(created.opponentId).toBe("friend");
    expect(created.status).toBe("open");
    expect(created.visibility).toBe("public");
    expect(created.cadence).toBe("none");
    expect(created.checklist.map((item) => item.label)).toEqual(["Show a photo of the thing"]);
  });

  it("writes a series onto a new slip", async () => {
    const { result } = renderHook(() => usePact(), {
      wrapper: PactProvider,
    });

    await act(async () => {
      await result.current.createPact({
        title: "Gym 3x",
        criteria: "Show a photo of the thing.",
        stake: 1,
        cadence: "3x-week",
        seriesUntil: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });
    });

    const created = result.current.pacts.find((p) => p.title === "Gym 3x");
    expect(created.cadence).toBe("3x-week");
    expect(created.seriesId).toBeTruthy();
    expect(created.occurrence).toBe(1);
    expect(created.streak).toBe(0);
  });

  it("accepts a pact when called by the opponent", async () => {
    const { result } = renderHook(() => usePact(), {
      wrapper: PactProvider,
    });

    await act(async () => {
      await result.current.createPact({
        title: "Test",
        criteria: "Show a photo of the thing.",
        stake: 2,
      });
    });

    const id = result.current.pacts.find((p) => p.title === "Test").id;
    act(() => result.current.switchUser("friend"));
    await act(async () => {
      await result.current.acceptPact(id);
    });

    expect(result.current.pacts.find((p) => p.id === id).status).toBe("accepted");
    expect(result.current.notifications.some((n) => n.type === "accepted" && n.pactId === id && n.userId === "you")).toBe(
      true,
    );
  });

  it("ticks a single deadline reminder onto a live slip", async () => {
    const { result } = renderHook(() => usePact(), {
      wrapper: PactProvider,
    });

    await act(async () => {
      await result.current.createPact({
        title: "Soon",
        criteria: "Show a photo of the thing.",
        stake: 1,
        deadline: Date.now() + 3 * 60 * 60 * 1000,
      });
    });
    const id = result.current.pacts.find((p) => p.title === "Soon").id;
    act(() => result.current.switchUser("friend"));
    await act(async () => {
      await result.current.acceptPact(id);
    });
    act(() => result.current.switchUser("you"));
    await act(async () => {
      await result.current.tickReminders();
    });
    const reminders = result.current.notifications.filter((n) => n.type === "deadline" && n.pactId === id);
    expect(reminders).toHaveLength(1);
    await act(async () => {
      await result.current.tickReminders();
    });
    expect(result.current.notifications.filter((n) => n.type === "deadline" && n.pactId === id)).toHaveLength(1);
  });

  it("marks desk notices read for the current desk", async () => {
    const { result } = renderHook(() => usePact(), {
      wrapper: PactProvider,
    });

    await act(async () => {
      await result.current.createPact({
        title: "Soon",
        criteria: "Show a photo of the thing.",
        stake: 1,
      });
    });
    const id = result.current.pacts.find((p) => p.title === "Soon").id;
    act(() => result.current.switchUser("friend"));
    await act(async () => {
      await result.current.acceptPact(id);
    });
    act(() => result.current.switchUser("you"));

    expect(result.current.unreadNotices).toBeGreaterThan(0);
    const first = result.current.notices.find((n) => !n.readAt);
    await act(async () => {
      await result.current.markNoticeRead(first.id);
    });
    expect(result.current.notices.find((n) => n.id === first.id).readAt).toBeTruthy();

    await act(async () => {
      await result.current.markAllNoticesRead();
    });
    expect(result.current.unreadNotices).toBe(0);
  });

  it("lets the current desk heat a public mark and post a take", async () => {
    const { result } = renderHook(() => usePact(), {
      wrapper: PactProvider,
    });

    await act(async () => {
      await result.current.reactToMark("ev-gym-won", "🔥");
    });
    expect(result.current.reactions.some((row) => row.eventId === "ev-gym-won" && row.userId === "you")).toBe(
      true,
    );

    await act(async () => {
      await result.current.commentOnMark("ev-gym-won", "Book stands.");
    });
    expect(result.current.comments.some((row) => row.body === "Book stands.")).toBe(true);
  });

  it("attaches an escrow lock onto a new slip", async () => {
    const { result } = renderHook(() => usePact(), {
      wrapper: PactProvider,
    });

    await act(async () => {
      await result.current.createPact({
        title: "Chain lock",
        criteria: "Show a photo of the thing.",
        stake: 1,
      });
    });
    const created = result.current.pacts.find((p) => p.title === "Chain lock");
    expect(created.escrow.rail).toBe("virtual");
    await act(async () => {
      await result.current.attachEscrow(created.id, {
        rail: "solana",
        status: "locked",
        lockSig: "sig-desk",
        creatorPubkey: "CREATOR",
      });
    });
    expect(result.current.pacts.find((p) => p.id === created.id).escrow).toMatchObject({
      rail: "solana",
      status: "locked",
      lockSig: "sig-desk",
    });
  });

  it("persists state to localStorage", async () => {
    const { result } = renderHook(() => usePact(), {
      wrapper: PactProvider,
    });

    await act(async () => {
      await result.current.createPact({
        title: "Persisted",
        criteria: "Show a photo of the thing.",
        stake: 5,
      });
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.pacts.some((p) => p.title === "Persisted")).toBe(true);
  });

  it("keeps the switched desk after remount", async () => {
    const { result, rerender } = renderHook(() => usePact(), {
      wrapper: PactProvider,
    });

    act(() => result.current.switchUser("friend"));
    rerender();
    await waitFor(() => {
      expect(result.current.userId).toBe("friend");
    });
  });
});
