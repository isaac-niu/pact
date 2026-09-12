import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDesk } from "../api/local.js";
import { LAMPORTS_PER_SOL } from "../backend/constants.js";
import { PactProvider } from "../store.jsx";
import Feed from "./Feed.jsx";
import PactDetail from "./PactDetail.jsx";

const liveState = {
  signedIn: true,
  me: { id: "auth0|isaac", name: "Isaac" },
  people: [{ id: "auth0|pat", name: "Pat" }],
  friends: [{ id: "auth0|pat", name: "Pat" }],
  targets: [{ id: "auth0|pat", name: "Pat" }],
  directory: [
    { id: "auth0|isaac", name: "Isaac" },
    { id: "auth0|pat", name: "Pat" },
  ],
  livePacts: [],
  ticket: null,
  error: "",
  loading: false,
  refresh: vi.fn(),
  acceptLive: vi.fn(),
  submitLiveEvidence: vi.fn(),
};

vi.mock("../auth/useLivePacts.js", () => ({
  useLivePacts: () => liveState,
}));

function acceptedLive() {
  return {
    id: "live-gym",
    title: "I'll upload a gym selfie",
    criteria: "Face or body in frame with gym floor or equipment visible.",
    stakeLamports: 2 * LAMPORTS_PER_SOL,
    creatorId: "auth0|isaac",
    opponentId: "auth0|pat",
    groupId: null,
    status: "accepted",
    visibility: "public",
    createdAt: Date.now() - 60_000,
    acceptedAt: Date.now() - 10_000,
    evidenceUrl: null,
    evidenceName: null,
    verdict: null,
    winnerId: null,
  };
}

describe("live 1v1 on Tape", () => {
  beforeEach(() => {
    localStorage.clear();
    resetDesk();
    liveState.livePacts = [acceptedLive()];
    liveState.ticket = acceptedLive();
    liveState.me = { id: "auth0|isaac", name: "Isaac" };
    liveState.submitLiveEvidence.mockReset();
    liveState.submitLiveEvidence.mockResolvedValue({ status: "settled" });
  });

  it("shows the accepted live 1v1 on Tape", () => {
    render(
      <MemoryRouter initialEntries={["/feed"]}>
        <PactProvider>
          <Feed />
        </PactProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText(/Isaac vs Pat/)).toBeInTheDocument();
    expect(screen.getAllByRole("link").some((link) => link.getAttribute("href") === "/pact/live-gym")).toBe(
      true,
    );
  });

  it("lets the creator upload proof on the live ticket", async () => {
    render(
      <MemoryRouter initialEntries={["/pact/live-gym"]}>
        <PactProvider>
          <Routes>
            <Route path="/pact/:id" element={<PactDetail />} />
          </Routes>
        </PactProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "I'll upload a gym selfie" })).toBeInTheDocument();
    const input = screen.getByLabelText("Upload photo");
    const file = new File(["gym"], "gym.jpg", { type: "image/jpeg" });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => {
      expect(liveState.submitLiveEvidence).toHaveBeenCalled();
    });
    const [pact, sent] = liveState.submitLiveEvidence.mock.calls[0];
    expect(pact.id).toBe("live-gym");
    expect(pact.creatorId).toBe("auth0|isaac");
    expect(sent.name).toBe("gym.jpg");
  });
});
