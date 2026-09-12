import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { getSnapshot, replaceDesk, resetDesk } from "../api/local.js";
import PactDetail from "./PactDetail.jsx";
import { PactProvider } from "../store.jsx";

function seedAccepted(pact) {
  const snap = getSnapshot();
  replaceDesk({
    ...snap,
    pacts: [...snap.pacts, pact],
  });
}

describe("location and fitness proof hooks", () => {
  beforeEach(() => {
    localStorage.clear();
    resetDesk();
  });

  it("shows location / fitness affordances and a stubbed Strava hook", async () => {
    const now = Date.now();
    seedAccepted({
      id: "test-accepted-gym",
      title: "I'll upload a gym selfie",
      criteria: "Face visible · gym iron visible.",
      stake: 2,
      deadline: now + 8 * 60 * 60 * 1000,
      creatorId: "you",
      opponentId: "friend",
      status: "accepted",
      visibility: "public",
      createdAt: now,
      acceptedAt: now,
    });

    render(
      <MemoryRouter initialEntries={["/pact/test-accepted-gym"]}>
        <PactProvider>
          <Routes>
            <Route path="/pact/:id" element={<PactDetail />} />
          </Routes>
        </PactProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("button", { name: "Prove with location" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Prove with fitness" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Strava (stub)" }));
    expect(screen.getByText(/OAuth not wired/)).toBeInTheDocument();
  });

  it("posts a demo fitness signal as alternate proof on a run slip", async () => {
    const now = Date.now();
    seedAccepted({
      id: "test-accepted-run",
      title: "Run 5K before work",
      criteria: "≥5.00 km completed",
      stake: 2,
      deadline: now + 8 * 60 * 60 * 1000,
      creatorId: "you",
      opponentId: "friend",
      status: "accepted",
      visibility: "public",
      createdAt: now,
      acceptedAt: now,
    });

    render(
      <MemoryRouter initialEntries={["/pact/test-accepted-run"]}>
        <PactProvider>
          <Routes>
            <Route path="/pact/:id" element={<PactDetail />} />
          </Routes>
        </PactProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Prove with fitness" })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Prove with fitness" }));
    await waitFor(() => {
      expect(screen.getAllByText(/Fitness · Run/).length).toBeGreaterThan(0);
    });
    expect(screen.getByText("GRADED")).toBeInTheDocument();
  });
});
