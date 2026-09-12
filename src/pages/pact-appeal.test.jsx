import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { replaceDesk, resetDesk } from "../api/local.js";
import { emptyDemoState } from "../data/seed.js";
import PactDetail from "./PactDetail.jsx";
import { PactProvider } from "../store.jsx";

const REVIEW_ID = "demo-review-appeal";

function reviewPact(now = Date.now()) {
  return {
    id: REVIEW_ID,
    title: "I'll upload a gym selfie",
    criteria: "Face or body in frame with gym floor or equipment visible.",
    stake: 1,
    deadline: now + 8 * 60 * 60 * 1000,
    creatorId: "friend",
    opponentId: "you",
    status: "review",
    evidenceUrl: null,
    evidenceName: "gym-floor.jpg",
    verdict: {
      result: "review",
      confidence: 0.61,
      rationale: "Notes are in frame but the date is hard to read. Friend should confirm.",
      source: "gemini",
      auto: false,
    },
    winnerId: null,
    visibility: "public",
    createdAt: now - 9 * 60 * 60 * 1000,
    acceptedAt: now - 8 * 60 * 60 * 1000,
    provedAt: now - 25 * 60 * 1000,
    resolvedAt: null,
  };
}

function renderTicket() {
  return render(
    <MemoryRouter initialEntries={[`/pact/${REVIEW_ID}`]}>
      <PactProvider>
        <Routes>
          <Route path="/pact/:id" element={<PactDetail />} />
        </Routes>
      </PactProvider>
    </MemoryRouter>,
  );
}

describe("REVIEW appeal on a ticket", () => {
  beforeEach(() => {
    localStorage.clear();
    resetDesk();
    const base = emptyDemoState();
    const review = reviewPact();
    replaceDesk({
      ...base,
      pacts: [review, ...base.pacts],
      events: [
        {
          id: "ev-rev-pro",
          pactId: review.id,
          type: "proved",
          actorId: review.creatorId,
          at: review.provedAt,
          note: review.evidenceName,
        },
        {
          id: "ev-rev-rev",
          pactId: review.id,
          type: "review",
          actorId: review.opponentId,
          at: review.provedAt + 1000,
          note: "Gemini unsure — friend verifies",
        },
        ...base.events,
      ],
    });
  });

  it("shows Gemini rationale to the listed friend and requires a written grade", async () => {
    renderTicket();

    expect(screen.getByText("REVIEW")).toBeInTheDocument();
    expect(screen.getByText(/Notes are in frame but the date is hard to read/)).toBeInTheDocument();
    expect(screen.getByText(/Both desks see the rationale/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Stand the slip" }));
    expect(await screen.findByText(/Write why this call stands or fades/)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Write why this frame stands or fades."), {
      target: { value: "Date is on the top of the page." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Stand the slip" }));

    await waitFor(() => {
      expect(screen.getByText("GRADED")).toBeInTheDocument();
    });
    expect(screen.getByText("Date is on the top of the page.")).toBeInTheDocument();
  });

  it("lets the listed friend flag the call before grading", async () => {
    renderTicket();

    fireEvent.change(screen.getByPlaceholderText("What’s wrong with the referee rationale?"), {
      target: { value: "The date is smudged." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Flag / dispute" }));

    await waitFor(() => {
      expect(screen.getByText("APPEAL")).toBeInTheDocument();
    });
    expect(screen.getByText("The date is smudged.")).toBeInTheDocument();
    expect(screen.getByText(/Open appeal/)).toBeInTheDocument();
  });
});
