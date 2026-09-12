import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

describe("phone-first proof desk", () => {
  beforeEach(() => {
    localStorage.clear();
    resetDesk();
    window.matchMedia = () => ({
      matches: true,
      media: "(pointer: coarse)",
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
    });
  });

  afterEach(() => {
    delete window.matchMedia;
  });

  it("opens the rear camera without dropping the desktop roll", async () => {
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

    const camera = await screen.findByLabelText("Take a frame");
    expect(camera).toHaveAttribute("capture", "environment");
    expect(camera).toHaveAttribute("accept", "image/*");
    expect(camera).not.toHaveAttribute("multiple");

    const roll = screen.getByLabelText("Upload proof");
    expect(roll).toHaveAttribute("multiple");
    expect(roll.getAttribute("accept")).toMatch(/video\/mp4/);
    expect(screen.getByText("Upload from the roll")).toBeInTheDocument();
  });
});
