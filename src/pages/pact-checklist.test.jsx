import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { getSnapshot, replaceDesk, resetDesk } from "../api/local.js";
import PactDetail from "./PactDetail.jsx";
import { PactProvider } from "../store.jsx";

describe("checklist marks on a ticket", () => {
  beforeEach(() => {
    localStorage.clear();
    resetDesk();
  });

  it("shows HOLD/MISS lines on a graded gym slip", () => {
    render(
      <MemoryRouter initialEntries={["/pact/demo-settled-gym"]}>
        <PactProvider>
          <Routes>
            <Route path="/pact/:id" element={<PactDetail />} />
          </Routes>
        </PactProvider>
      </MemoryRouter>,
    );

    expect(screen.getAllByText("Face or body in frame").length).toBeGreaterThan(0);
    expect(screen.getAllByText("HOLD").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Subject in frame/).length).toBeGreaterThan(0);
  });

  it("lets the friend grade each REVIEW line", () => {
    const now = Date.now();
    const snap = getSnapshot();
    replaceDesk({
      ...snap,
      pacts: [
        ...snap.pacts,
        {
          id: "test-review-gym",
          title: "I'll upload a gym selfie",
          criteria: "Face in frame · gym iron visible.",
          checklist: [
            { id: "sc_face", label: "Face in frame" },
            { id: "sc_gym", label: "Gym iron visible" },
          ],
          stake: 2,
          deadline: now + 8 * 60 * 60 * 1000,
          creatorId: "friend",
          opponentId: "you",
          status: "review",
          evidenceName: "gym.jpg",
          verdict: {
            result: "review",
            confidence: 0.61,
            rationale: "Iron is clear. Face is a maybe.",
            source: "gemini",
            auto: false,
            items: [
              { id: "sc_face", label: "Face in frame", pass: true, note: "Face looks in frame." },
              { id: "sc_gym", label: "Gym iron visible", pass: false, note: "Iron is a maybe." },
            ],
          },
          winnerId: null,
          visibility: "public",
          createdAt: now,
          acceptedAt: now,
          provedAt: now,
        },
      ],
    });

    render(
      <MemoryRouter initialEntries={["/pact/test-review-gym"]}>
        <PactProvider>
          <Routes>
            <Route path="/pact/:id" element={<PactDetail />} />
          </Routes>
        </PactProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText("Grade each line")).toBeInTheDocument();
    expect(screen.getAllByText("Face in frame").length).toBeGreaterThan(0);
    expect(screen.getByText("MISS")).toBeInTheDocument();
  });
});
