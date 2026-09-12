import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { getSnapshot, replaceDesk, resetDesk } from "../api/local.js";
import PactDetail from "./PactDetail.jsx";
import { PactProvider } from "../store.jsx";

function seedAcceptedGym() {
  const now = Date.now();
  const snap = getSnapshot();
  replaceDesk({
    ...snap,
    pacts: [
      ...snap.pacts,
      {
        id: "test-accepted-gym",
        title: "I'll upload a gym selfie",
        criteria: "Face visible · gym iron visible.",
        checklist: [
          { id: "sc_face", label: "Face visible" },
          { id: "sc_gym", label: "Gym iron visible" },
        ],
        stake: 2,
        deadline: now + 8 * 60 * 60 * 1000,
        creatorId: "you",
        opponentId: "friend",
        status: "accepted",
        visibility: "public",
        createdAt: now,
        acceptedAt: now,
      },
    ],
  });
}

describe("video and burst proof desk", () => {
  beforeEach(() => {
    localStorage.clear();
    resetDesk();
  });

  it("keeps the single-photo dropzone and also takes a burst or clip", async () => {
    seedAcceptedGym();
    render(
      <MemoryRouter initialEntries={["/pact/test-accepted-gym"]}>
        <PactProvider>
          <Routes>
            <Route path="/pact/:id" element={<PactDetail />} />
          </Routes>
        </PactProvider>
      </MemoryRouter>,
    );

    const input = await screen.findByLabelText("Upload proof");
    expect(input).toHaveAttribute("multiple");
    expect(input.getAttribute("accept")).toMatch(/image\/\*/);
    expect(input.getAttribute("accept")).toMatch(/video\/mp4/);
    expect(screen.getByText(/One photo, a burst/)).toBeInTheDocument();
  });
});
