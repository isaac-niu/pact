import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { PactProvider } from "../store.jsx";
import Feed from "./Feed.jsx";

function renderFeed(initialPath = "/feed") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/feed" element={
            <PactProvider>
              <Feed />
            </PactProvider>
          } />
        </Routes>
      </MemoryRouter>,
    );
}

describe("Feed page", () => {
  beforeEach(() => {
    localStorage.clear();
    });

  afterEach(() => {
    localStorage.clear();
    });

  it("renders the page head with 'Active book' kicker and 'Pact board' heading", () => {
    renderFeed();
    expect(screen.getByText("Active book")).toBeInTheDocument();
    expect(screen.getByText("Pact board")).toBeInTheDocument();
    });

  it("renders the 'New pact' link", () => {
    renderFeed();
    const link = screen.getByRole("link", { name: /New pact/i });
    expect(link).toHaveAttribute("href", "/create");
    });

  it("shows empty state when there are no pacts", () => {
    renderFeed();
    expect(screen.getByText(/No slips yet/)).toBeInTheDocument();
    });

  it("shows pacts in the feed when pacts exist", () => {
    render(
        <MemoryRouter initialEntries={["/feed"]}>
          <Routes>
            <Route path="/feed" element={
              <PactProvider>
                <Feed />
              </PactProvider>
            } />
            <Route path="/pact/:id" element={
              <PactProvider>
                <Feed />
              </PactProvider>
            } />
          </Routes>
        </MemoryRouter>,
      );
      // Create a pact first
    const pactProviderEl = document.querySelector("[data-testid='pact-provider']");
      // We need to create a pact via the store. Let's use the store directly.
    const { PactProvider: Provider, usePact } = require("../store.jsx");
      // Actually, let's just render the feed after creating a pact via the store
    localStorage.setItem("pact.demo.v1", JSON.stringify({
      userId: "you",
      pacts: [{
        id: "test-pact-1",
        title: "Test challenge",
        stake: 2,
        creatorId: "you",
        opponentId: "friend",
        status: "open",
        evidenceUrl: null,
        evidenceName: null,
        verdict: null,
        createdAt: Date.now(),
      }],
    }));
    render(
        <MemoryRouter initialEntries={["/feed"]}>
          <Routes>
            <Route path="/feed" element={
              <PactProvider>
                <Feed />
              </PactProvider>
            } />
            <Route path="/pact/:id" element={
              <PactProvider>
                <Feed />
              </PactProvider>
            } />
          </Routes>
        </MemoryRouter>,
      );
    expect(screen.getByText("Test challenge")).toBeInTheDocument();
    expect(screen.getByText(/ISAAC vs MAYA/)).toBeInTheDocument();
    expect(screen.getByText(/Open/)).toBeInTheDocument();
    expect(screen.getByText(/2.00 SOL each/)).toBeInTheDocument();
    });

  it("links each slip to its detail page", () => {
    localStorage.setItem("pact.demo.v1", JSON.stringify({
      userId: "you",
      pacts: [{
        id: "test-pact-2",
        title: "Another challenge",
        stake: 3,
        creatorId: "you",
        opponentId: "friend",
        status: "open",
        evidenceUrl: null,
        evidenceName: null,
        verdict: null,
        createdAt: Date.now(),
      }],
    }));
    render(
        <MemoryRouter initialEntries={["/feed"]}>
          <Routes>
            <Route path="/feed" element={
              <PactProvider>
                <Feed />
              </PactProvider>
            } />
          </Routes>
        </MemoryRouter>,
      );
    const slipLink = screen.getByRole("link", { name: /Another challenge/i });
    expect(slipLink).toHaveAttribute("href", "/pact/test-pact-2");
    });

  it("shows 'Live' badge for accepted pacts", () => {
    localStorage.setItem("pact.demo.v1", JSON.stringify({
      userId: "you",
      pacts: [{
        id: "test-pact-3",
        title: "Live challenge",
        stake: 1,
        creatorId: "you",
        opponentId: "friend",
        status: "accepted",
        evidenceUrl: null,
        evidenceName: null,
        verdict: null,
        createdAt: Date.now(),
      }],
    }));
    renderFeed();
    expect(screen.getByText("Live")).toBeInTheDocument();
    });

  it("shows 'Evidence in' badge for evidence pacts", () => {
    localStorage.setItem("pact.demo.v1", JSON.stringify({
      userId: "you",
      pacts: [{
        id: "test-pact-4",
        title: "Evidence challenge",
        stake: 1,
        creatorId: "you",
        opponentId: "friend",
        status: "evidence",
        evidenceUrl: "data:image/png;base64,test",
        evidenceName: "test.png",
        verdict: null,
        createdAt: Date.now(),
      }],
    }));
    renderFeed();
    expect(screen.getByText("Evidence in")).toBeInTheDocument();
    });

  it("shows 'Referee' badge for judging pacts", () => {
    localStorage.setItem("pact.demo.v1", JSON.stringify({
      userId: "you",
      pacts: [{
        id: "test-pact-5",
        title: "Referee challenge",
        stake: 1,
        creatorId: "you",
        opponentId: "friend",
        status: "judging",
        evidenceUrl: "data:image/png;base64,test",
        evidenceName: "test.png",
        verdict: null,
        createdAt: Date.now(),
      }],
    }));
    renderFeed();
    expect(screen.getByText("Referee")).toBeInTheDocument();
    });

  it("shows 'Settled' badge for resolved pacts", () => {
    localStorage.setItem("pact.demo.v1", JSON.stringify({
      userId: "you",
      pacts: [{
        id: "test-pact-6",
        title: "Settled challenge",
        stake: 1,
        creatorId: "you",
        opponentId: "friend",
        status: "resolved",
        evidenceUrl: "data:image/png;base64,test",
        evidenceName: "test.png",
        verdict: { result: "pass", confidence: 0.95, rationale: "Good photo" },
        winnerId: "you",
        createdAt: Date.now(),
      }],
    }));
    renderFeed();
    expect(screen.getByText("Settled")).toBeInTheDocument();
    });
});
