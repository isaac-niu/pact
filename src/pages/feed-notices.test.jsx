import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { replaceDesk, resetDesk } from "../api/local.js";
import { emptyDemoState } from "../data/seed.js";
import { NOTICE_TYPES, notice } from "../lib/notifications.js";
import App from "../App.jsx";
import { PactProvider } from "../store.jsx";

function renderTape() {
  return render(
    <MemoryRouter initialEntries={["/feed"]}>
      <PactProvider>
        <App />
      </PactProvider>
    </MemoryRouter>,
  );
}

describe("desk notices on tape", () => {
  beforeEach(() => {
    localStorage.clear();
    resetDesk();
    const now = Date.now();
    const base = emptyDemoState(now);
    const live = {
      id: "demo-live-proof",
      title: "I'll upload a gym selfie",
      criteria: "Face or body in frame with gym floor or equipment visible.",
      stake: 1.5,
      deadline: now + 5 * 60 * 60 * 1000,
      creatorId: "friend",
      opponentId: "you",
      status: "accepted",
      evidenceUrl: null,
      evidenceName: null,
      verdict: null,
      winnerId: null,
      visibility: "public",
      createdAt: now - 6 * 60 * 60 * 1000,
      acceptedAt: now - 5 * 60 * 60 * 1000,
      provedAt: null,
      resolvedAt: null,
    };
    replaceDesk({
      ...base,
      pacts: [live, ...base.pacts],
      notifications: [
        notice({
          id: "ntf-rev-you",
          userId: "you",
          type: NOTICE_TYPES.REVIEW,
          pactId: live.id,
          title: "Your turn to verify",
          body: `REVIEW on “${live.title}” — grade the frame.`,
          at: now,
        }),
        ...base.notifications,
      ],
    });
  });

  it("badges Tape and lists an unread REVIEW notice", async () => {
    renderTape();

    expect(screen.getByRole("link", { name: /^Tape, \d+ unread/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Desk notices" })).toBeInTheDocument();
    expect(screen.getByText("Your turn to verify")).toBeInTheDocument();
    expect(screen.getByText(/REVIEW on “I'll upload a gym selfie”/)).toBeInTheDocument();
    expect(screen.getByLabelText("Approaching deadlines")).toBeInTheDocument();
    expect(screen.getByText(/hours left — FRIEND still owes proof/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear the board" }));
    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Tape" })).toBeInTheDocument();
    });
  });
});
