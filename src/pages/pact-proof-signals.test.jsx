import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { useEffect } from "react";
import { acceptPact, resetDesk, switchUser } from "../api/local.js";
import PactDetail from "./PactDetail.jsx";
import { PactProvider, usePact } from "../store.jsx";

function SwitchToCreator() {
  const { switchUser, userId } = usePact();
  useEffect(() => {
    if (userId !== "friend") switchUser("friend");
  }, [switchUser, userId]);
  return null;
}

describe("location and fitness proof hooks", () => {
  beforeEach(() => {
    localStorage.clear();
    resetDesk();
  });

  it("shows location / fitness affordances and a stubbed Strava hook", async () => {
    render(
      <MemoryRouter initialEntries={["/pact/demo-live-leetcode"]}>
        <PactProvider>
          <SwitchToCreator />
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
    render(
      <MemoryRouter initialEntries={["/pact/demo-open-run"]}>
        <PactProvider>
          <Routes>
            <Route path="/pact/:id" element={<PactDetail />} />
          </Routes>
        </PactProvider>
      </MemoryRouter>,
    );

    switchUser("friend");
    await acceptPact("demo-open-run", { actorId: "friend" });
    switchUser("you");
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
