import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { PactProvider, usePact } from "./store.jsx";

describe("PactProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    });

  afterEach(() => {
    localStorage.clear();
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

  it("creates a pact with correct fields", () => {
    const { result } = renderHook(() => usePact(), {
      wrapper: PactProvider,
      });

    act(() => {
      result.current.createPact({ title: "Test challenge", stake: 2 });
      });

    const pacts = result.current.pacts;
    expect(pacts).toHaveLength(1);
    expect(pacts[0].title).toBe("Test challenge");
    expect(pacts[0].stake).toBe(2);
    expect(pacts[0].creatorId).toBe("you");
    expect(pacts[0].opponentId).toBe("friend");
    expect(pacts[0].status).toBe("open");
    });

  it("accepts a pact when called by the opponent", () => {
    const { result } = renderHook(() => usePact(), {
      wrapper: PactProvider,
      });

      // Create as "you"
    act(() => {
      result.current.createPact({ title: "Test", stake: 2 });
      });

      // Switch to friend and accept
    act(() => result.current.switchUser("friend"));
    act(() => {
      result.current.acceptPact(result.current.pacts[0].id);
      });

    expect(result.current.pacts[0].status).toBe("accepted");
    });

  it("persists state to localStorage", () => {
    const { result } = renderHook(() => usePact(), {
      wrapper: PactProvider,
      });

    act(() => {
      result.current.createPact({ title: "Persisted", stake: 5 });
      });

    const stored = JSON.parse(localStorage.getItem("pact.demo.v1"));
    expect(stored.pacts).toHaveLength(1);
    expect(stored.pacts[0].title).toBe("Persisted");
    });

  it("loads state from localStorage on init", () => {
    localStorage.setItem(
        "pact.demo.v1",
      JSON.stringify({ userId: "friend", pacts: [] }),
      );

    const { result } = renderHook(() => usePact(), {
      wrapper: PactProvider,
      });

    expect(result.current.userId).toBe("friend");
    });
});
