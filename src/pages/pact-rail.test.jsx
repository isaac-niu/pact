import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { replaceDesk, resetDesk } from "../api/local.js";
import { emptyDemoState } from "../data/seed.js";
import App from "../App.jsx";
import PactDetail from "./PactDetail.jsx";
import { PactProvider } from "../store.jsx";

const LIVE_ID = "test-live-public";

function livePublicPact(now = Date.now()) {
  return {
    id: LIVE_ID,
    title: "I'll post proof",
    criteria: "Photo of the work.",
    stake: 2,
    deadline: now + 8 * 60 * 60 * 1000,
    creatorId: "you",
    opponentId: "friend",
    status: "accepted",
    visibility: "public",
    createdAt: now,
    acceptedAt: now,
    winnerId: null,
    verdict: null,
    evidenceUrl: null,
    evidenceName: null,
  };
}

describe("spectator rail tickets", () => {
  beforeEach(() => {
    localStorage.clear();
    resetDesk();
    const base = emptyDemoState();
    replaceDesk({
      ...base,
      pacts: [livePublicPact(), ...base.pacts],
    });
  });

  it("shows rail money on the public tape and lets GALE lock a ticket", async () => {
    render(
      <MemoryRouter initialEntries={["/feed"]}>
        <PactProvider>
          <App />
        </PactProvider>
      </MemoryRouter>,
    );

    expect(screen.getAllByText(/rail 1.00/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Sit the rail" }));
    expect(await screen.findByRole("button", { name: /Back to ISAAC/ })).toBeInTheDocument();
  });

  it("locks a rail ticket on a live public slip from the ticket", async () => {
    render(
      <MemoryRouter initialEntries={[`/pact/${LIVE_ID}`]}>
        <PactProvider>
          <Routes>
            <Route path="/pact/:id" element={<PactDetail />} />
          </Routes>
        </PactProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText("Rail book")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sit the rail" }));
    fireEvent.click(screen.getByRole("button", { name: "Friend" }));
    fireEvent.change(screen.getByLabelText("Rail ticket stake"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: /Lock rail ticket/ }));
    await waitFor(() => {
      expect(screen.getByText(/Your rail ticket · friend · 2.00 SOL locked/)).toBeInTheDocument();
    });
  });
});
