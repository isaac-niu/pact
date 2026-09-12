import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { PactProvider } from "../store.jsx";
import PactDetail from "./PactDetail.jsx";

function renderPactDetail(pactId, initialPath = "/pact/test-id") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
       <Routes>
          <Route path="/pact/:id" element={
            <PactProvider>
              <PactDetail />
            </PactProvider>
          } />
        </Routes>
      </MemoryRouter>,
    );
}

describe("PactDetail page", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("open pact (not yet accepted)", () => {
    it("renders the ticket ID and pact title", () => {
      localStorage.setItem("pact.demo.v1", JSON.stringify({
        userId: "you",
        pacts: [{
          id: "open-pact-1",
          title: "Open challenge",
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
      renderPactDetail("open-pact-1", "/pact/open-pact-1");
      expect(screen.getByText(/Ticket/)).toBeInTheDocument();
      expect(screen.getByText("Open challenge")).toBeInTheDocument();
    });

    it("displays the stake pot correctly", () => {
      localStorage.setItem("pact.demo.v1", JSON.stringify({
        userId: "you",
        pacts: [{
          id: "open-pact-2",
          title: "Stake test",
          stake: 5,
          creatorId: "you",
          opponentId: "friend",
          status: "open",
          evidenceUrl: null,
          evidenceName: null,
          verdict: null,
          createdAt: Date.now(),
        }],
      }));
      renderPactDetail("open-pact-2", "/pact/open-pact-2");
      expect(screen.getByText("10.00 SOL pot")).toBeInTheDocument();
    });

    it("shows Challenger and Counterparty sides with correct handles", () => {
      localStorage.setItem("pact.demo.v1", JSON.stringify({
        userId: "you",
        pacts: [{
          id: "open-pact-3",
          title: "Side test",
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
      renderPactDetail("open-pact-3", "/pact/open-pact-3");
      expect(screen.getByText("Challenger")).toBeInTheDocument();
      expect(screen.getByText("ISAAC")).toBeInTheDocument();
      expect(screen.getByText("Counterparty")).toBeInTheDocument();
      expect(screen.getByText("MAYA")).toBeInTheDocument();
    });

    it("shows 'awaiting accept' for the counterparty when open", () => {
      localStorage.setItem("pact.demo.v1", JSON.stringify({
        userId: "you",
        pacts: [{
          id: "open-pact-4",
          title: "Await test",
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
      renderPactDetail("open-pact-4", "/pact/open-pact-4");
      expect(screen.getByText(/awaiting accept/)).toBeInTheDocument();
    });

    it("shows 'No photo yet' when no evidence exists", () => {
      localStorage.setItem("pact.demo.v1", JSON.stringify({
        userId: "you",
        pacts: [{
          id: "open-pact-5",
          title: "Evidence test",
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
      renderPactDetail("open-pact-5", "/pact/open-pact-5");
      expect(screen.getByText(/No photo yet/)).toBeInTheDocument();
    });

    it("shows hint to switch to Friend when creator views open pact", () => {
      localStorage.setItem("pact.demo.v1", JSON.stringify({
        userId: "you",
        pacts: [{
          id: "open-pact-6",
          title: "Switch hint test",
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
      renderPactDetail("open-pact-6", "/pact/open-pact-6");
      expect(screen.getByText(/Switch to Friend/)).toBeInTheDocument();
    });

    it("shows 'Waiting on ISAAC to accept' when friend views open pact", () => {
      localStorage.setItem("pact.demo.v1", JSON.stringify({
        userId: "friend",
        pacts: [{
          id: "open-pact-7",
          title: "Wait test",
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
      renderPactDetail("open-pact-7", "/pact/open-pact-7");
      expect(screen.getByText(/Waiting on ISAAC/)).toBeInTheDocument();
    });
  });

  describe("accepted pact (waiting for evidence)", () => {
    it("shows 'Live' and 'ISAAC owes a photo' for accepted pacts", () => {
      localStorage.setItem("pact.demo.v1", JSON.stringify({
        userId: "you",
        pacts: [{
          id: "accepted-pact-1",
          title: "Accepted challenge",
          stake: 2,
          creatorId: "you",
          opponentId: "friend",
          status: "accepted",
          evidenceUrl: null,
          evidenceName: null,
          verdict: null,
          createdAt: Date.now(),
        }],
      }));
      renderPactDetail("accepted-pact-1", "/pact/accepted-pact-1");
      expect(screen.getByText("Live")).toBeInTheDocument();
      expect(screen.getByText(/ISAAC owes a photo/)).toBeInTheDocument();
    });

    it("shows 'Upload photo' button for the creator of an accepted pact", () => {
      localStorage.setItem("pact.demo.v1", JSON.stringify({
        userId: "you",
        pacts: [{
          id: "accepted-pact-2",
          title: "Upload test",
          stake: 2,
          creatorId: "you",
          opponentId: "friend",
          status: "accepted",
          evidenceUrl: null,
          evidenceName: null,
          verdict: null,
          createdAt: Date.now(),
        }],
      }));
      renderPactDetail("accepted-pact-2", "/pact/accepted-pact-2");
      expect(screen.getByText(/Upload photo/)).toBeInTheDocument();
    });

    it("does not show 'Upload photo' for the opponent of an accepted pact", () => {
      localStorage.setItem("pact.demo.v1", JSON.stringify({
        userId: "friend",
        pacts: [{
          id: "accepted-pact-3",
          title: "No upload test",
          stake: 2,
          creatorId: "you",
          opponentId: "friend",
          status: "accepted",
          evidenceUrl: null,
          evidenceName: null,
          verdict: null,
          createdAt: Date.now(),
        }],
      }));
      renderPactDetail("accepted-pact-3", "/pact/accepted-pact-3");
      expect(screen.queryByText(/Upload photo/)).not.toBeInTheDocument();
    });
  });

  describe("evidence uploaded (ready for referee)", () => {
    it("shows 'Send to referee' button for creator with evidence", () => {
      localStorage.setItem("pact.demo.v1", JSON.stringify({
        userId: "you",
        pacts: [{
          id: "evidence-pact-1",
          title: "Referee test",
          stake: 2,
          creatorId: "you",
          opponentId: "friend",
          status: "evidence",
          evidenceUrl: "data:image/png;base64,test",
          evidenceName: "selfie.png",
          verdict: null,
          createdAt: Date.now(),
        }],
      }));
      renderPactDetail("evidence-pact-1", "/pact/evidence-pact-1");
      expect(screen.getByText("Send to referee")).toBeInTheDocument();
    });

    it("shows evidence preview image when evidence exists", () => {
      localStorage.setItem("pact.demo.v1", JSON.stringify({
        userId: "you",
        pacts: [{
          id: "evidence-pact-2",
          title: "Preview test",
          stake: 2,
          creatorId: "you",
          opponentId: "friend",
          status: "evidence",
          evidenceUrl: "data:image/png;base64,test",
          evidenceName: "selfie.png",
          verdict: null,
          createdAt: Date.now(),
        }],
      }));
      renderPactDetail("evidence-pact-2", "/pact/evidence-pact-2");
      const img = screen.getByRole("img", { name: /selfie/i });
      expect(img).toBeInTheDocument();
    });

    it("does not show 'Send to referee' for opponent with evidence", () => {
      localStorage.setItem("pact.demo.v1", JSON.stringify({
        userId: "friend",
        pacts: [{
          id: "evidence-pact-3",
          title: "No referee test",
          stake: 2,
          creatorId: "you",
          opponentId: "friend",
          status: "evidence",
          evidenceUrl: "data:image/png;base64,test",
          evidenceName: "selfie.png",
          verdict: null,
          createdAt: Date.now(),
        }],
      }));
      renderPactDetail("evidence-pact-3", "/pact/evidence-pact-3");
      expect(screen.queryByText("Send to referee")).not.toBeInTheDocument();
    });
  });

  describe("judging state", () => {
    it("shows 'Referee reviewing' message when status is judging", () => {
      localStorage.setItem("pact.demo.v1", JSON.stringify({
        userId: "you",
        pacts: [{
          id: "judging-pact-1",
          title: "Judging test",
          stake: 2,
          creatorId: "you",
          opponentId: "friend",
          status: "judging",
          evidenceUrl: "data:image/png;base64,test",
          evidenceName: "selfie.png",
          verdict: null,
          createdAt: Date.now(),
        }],
      }));
      renderPactDetail("judging-pact-1", "/pact/judging-pact-1");
      expect(screen.getByText(/Referee reviewing/)).toBeInTheDocument();
    });
  });

  describe("resolved state with verdict", () => {
    it("shows pass verdict with confidence and rationale", () => {
      localStorage.setItem("pact.demo.v1", JSON.stringify({
        userId: "you",
        pacts: [{
          id: "resolved-pact-1",
          title: "Pass test",
          stake: 2,
          creatorId: "you",
          opponentId: "friend",
          status: "resolved",
          evidenceUrl: "data:image/png;base64,test",
          evidenceName: "selfie.png",
          verdict: {
            result: "pass",
            confidence: 0.94,
            rationale: "Clear gym-floor selfie.",
          },
          winnerId: "you",
          createdAt: Date.now(),
        }],
      }));
      renderPactDetail("resolved-pact-1", "/pact/resolved-pact-1");
      expect(screen.getByText("pass")).toBeInTheDocument();
      expect(screen.getByText(/94%/)).toBeInTheDocument();
      expect(screen.getByText(/mocked/)).toBeInTheDocument();
      expect(screen.getByText(/Clear gym-floor selfie/)).toBeInTheDocument();
    });

    it("shows who takes the pot in the verdict", () => {
      localStorage.setItem("pact.demo.v1", JSON.stringify({
        userId: "you",
        pacts: [{
          id: "resolved-pact-2",
          title: "Pot test",
          stake: 3,
          creatorId: "you",
          opponentId: "friend",
          status: "resolved",
          evidenceUrl: "data:image/png;base64,test",
          evidenceName: "selfie.png",
          verdict: {
            result: "pass",
            confidence: 0.94,
            rationale: "Good photo",
          },
          winnerId: "you",
          createdAt: Date.now(),
        }],
      }));
      renderPactDetail("resolved-pact-2", "/pact/resolved-pact-2");
      expect(screen.getByText(/ISAAC takes the pot/)).toBeInTheDocument();
      expect(screen.getByText(/6.00 SOL/)).toBeInTheDocument();
    });

    it("shows fail verdict when the challenge was not completed", () => {
      localStorage.setItem("pact.demo.v1", JSON.stringify({
        userId: "you",
        pacts: [{
          id: "resolved-pact-3",
          title: "Fail test",
          stake: 2,
          creatorId: "you",
          opponentId: "friend",
          status: "resolved",
          evidenceUrl: null,
          evidenceName: null,
          verdict: {
            result: "fail",
            confidence: 0.72,
            rationale: "Image is too ambiguous.",
          },
          winnerId: "friend",
          createdAt: Date.now(),
        }],
      }));
      renderPactDetail("resolved-pact-3", "/pact/resolved-pact-3");
      expect(screen.getByText("fail")).toBeInTheDocument();
      expect(screen.getByText(/MAYA takes the pot/)).toBeInTheDocument();
    });
  });

  describe("not found state", () => {
    it("shows 'Slip not found' when pact does not exist", () => {
      localStorage.setItem("pact.demo.v1", JSON.stringify({
        userId: "you",
        pacts: [],
      }));
      renderPactDetail("nonexistent", "/pact/nonexistent");
      expect(screen.getByText(/Slip not found/)).toBeInTheDocument();
      expect(screen.getByText(/Back to the board/)).toBeInTheDocument();
    });
  });

  describe("accept flow", () => {
    it("shows 'Accept' button for the opponent of an open pact", () => {
      localStorage.setItem("pact.demo.v1", JSON.stringify({
        userId: "friend",
        pacts: [{
          id: "accept-pact-1",
          title: "Accept test",
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
      renderPactDetail("accept-pact-1", "/pact/accept-pact-1");
      expect(screen.getByText(/Accept · 2.00 SOL/)).toBeInTheDocument();
    });

    it("accepts the pact and changes status to accepted", () => {
      localStorage.setItem("pact.demo.v1", JSON.stringify({
        userId: "friend",
        pacts: [{
          id: "accept-pact-2",
          title: "Accept flow test",
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
      renderPactDetail("accept-pact-2", "/pact/accept-pact-2");
      const acceptBtn = screen.getByText(/Accept · 2.00 SOL/);
      fireEvent.click(acceptBtn);
      expect(screen.getByText(/Live/)).toBeInTheDocument();
      expect(screen.getByText(/ISAAC owes a photo/)).toBeInTheDocument();
    });

    it("does not show 'Accept' button for the creator of an open pact", () => {
      localStorage.setItem("pact.demo.v1", JSON.stringify({
        userId: "you",
        pacts: [{
          id: "accept-pact-3",
          title: "No accept test",
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
      renderPactDetail("accept-pact-3", "/pact/accept-pact-3");
      expect(screen.queryByText(/Accept ·/)).not.toBeInTheDocument();
    });
  });

  describe("upload evidence flow", () => {
    it("uploads evidence and changes status to evidence", () => {
      localStorage.setItem("pact.demo.v1", JSON.stringify({
        userId: "you",
        pacts: [{
          id: "upload-pact-1",
          title: "Upload flow test",
          stake: 2,
          creatorId: "you",
          opponentId: "friend",
          status: "accepted",
          evidenceUrl: null,
          evidenceName: null,
          verdict: null,
          createdAt: Date.now(),
        }],
      }));
      renderPactDetail("upload-pact-1", "/pact/upload-pact-1");
      // Find the file input via the label text
      const uploadLabel = screen.getByText(/Upload photo/);
      const fileInput = uploadLabel.querySelector("input[type='file']");
      expect(fileInput).toBeInTheDocument();
      const testFile = new File(["test"], "selfie.png", { type: "image/png" });
      fireEvent.change(fileInput, { target: { files: [testFile] } });
      expect(screen.getByText(/Evidence in/)).toBeInTheDocument();
    });
  });

  describe("referee flow", () => {
    it("shows 'Send to referee' and resolves the pact", async () => {
      localStorage.setItem("pact.demo.v1", JSON.stringify({
        userId: "you",
        pacts: [{
          id: "referee-pact-1",
          title: "Referee flow test",
          stake: 2,
          creatorId: "you",
          opponentId: "friend",
          status: "evidence",
          evidenceUrl: "data:image/png;base64,test",
          evidenceName: "selfie.png",
          verdict: null,
          createdAt: Date.now(),
        }],
      }));
      renderPactDetail("referee-pact-1", "/pact/referee-pact-1");
      const submitBtn = screen.getByText("Send to referee");
      fireEvent.click(submitBtn);
      await waitFor(() => {
        expect(screen.getByText(/Referee reviewing/)).toBeInTheDocument();
      });
      await waitFor(() => {
        expect(screen.getByText(/pass|fail/)).toBeInTheDocument();
      });
    });
  });
});
