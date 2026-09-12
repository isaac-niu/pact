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
    expect(result.current.opponent.handle).toBe("MAYA");
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
