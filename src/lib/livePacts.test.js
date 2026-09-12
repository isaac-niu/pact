import { beforeEach, describe, expect, it, vi } from "vitest";
import { LAMPORTS_PER_SOL } from "../backend/constants.js";
import { api } from "../api.js";
import { judgeEvidence } from "../api/referee.js";
import {
  challengeTargets,
  eventsFromLivePact,
  liveActor,
  liveStatusToDesk,
  mergeLiveBoard,
  shouldAutoSettle,
  submitLiveProof,
  toDeskPact,
} from "./livePacts.js";

vi.mock("../api.js", () => ({
  api: vi.fn(),
}));

vi.mock("../api/referee.js", () => ({
  judgeEvidence: vi.fn(),
}));

describe("live pact mapping", () => {
  beforeEach(() => {
    api.mockReset();
    judgeEvidence.mockReset();
  });

  it("prefers accepted friends over the full directory", () => {
    const friends = [{ id: "auth0|pat", name: "Pat" }];
    const people = [{ id: "auth0|other", name: "Other" }, ...friends];
    expect(challengeTargets(friends, people)).toEqual(friends);
    expect(challengeTargets([], people)).toEqual(people);
  });

  it("maps a live 1v1 onto the desk ticket shape", () => {
    const live = {
      id: "live-1",
      title: "I'll upload a gym selfie",
      criteria: "Gym floor in frame.",
      stakeLamports: 2 * LAMPORTS_PER_SOL,
      creatorId: "auth0|isaac",
      opponentId: "auth0|pat",
      status: "accepted",
      visibility: "public",
      createdAt: 1_700_000_000_000,
      acceptedAt: 1_700_000_100_000,
    };
    const desk = toDeskPact(live);
    expect(desk.source).toBe("live");
    expect(desk.status).toBe("accepted");
    expect(desk.stake).toBe(2);
    expect(desk.criteria).toBe("Gym floor in frame.");
    expect(liveStatusToDesk("draft")).toBe("open");
    expect(liveStatusToDesk("settled")).toBe("resolved");
  });

  it("merges live 1v1s onto the local tape and skips group slips", () => {
    const local = [{ id: "pkt_local", title: "Desk slip", creatorId: "you", opponentId: "friend" }];
    const events = [{ id: "ev1", pactId: "pkt_local", type: "posted" }];
    const live = [
      {
        id: "live-1",
        title: "Gym selfie",
        stakeLamports: LAMPORTS_PER_SOL,
        creatorId: "auth0|isaac",
        opponentId: "auth0|pat",
        groupId: null,
        status: "accepted",
        createdAt: 10,
        acceptedAt: 20,
      },
      {
        id: "live-group",
        title: "Crew run",
        stakeLamports: LAMPORTS_PER_SOL,
        creatorId: "auth0|isaac",
        opponentId: null,
        groupId: "crew-1",
        status: "draft",
        createdAt: 11,
      },
    ];
    const board = mergeLiveBoard(local, events, live);
    expect(board.pacts.map((p) => p.id)).toEqual(["live-1", "pkt_local"]);
    expect(board.events.some((e) => e.pactId === "live-1" && e.type === "accepted")).toBe(true);
    expect(eventsFromLivePact(board.pacts[0])).toHaveLength(2);
  });

  it("resolves Auth0 names without inventing a desk handle", () => {
    const pat = liveActor("auth0|pat", [{ id: "auth0|pat", name: "Pat" }]);
    expect(pat.handle).toBe("Pat");
    expect(liveActor("you").handle).toBe("ISAAC");
  });

  it("auto-settles only a confident pass or fail", () => {
    expect(shouldAutoSettle({ result: "pass", auto: true, source: "gemini" })).toBe(true);
    expect(shouldAutoSettle({ result: "review", auto: false, source: "gemini" })).toBe(false);
    expect(shouldAutoSettle({ result: "fail", source: "gemini-error" })).toBe(false);
  });

  it("sends Gemini proof to the live evidence endpoint", async () => {
    judgeEvidence.mockResolvedValue({
      result: "pass",
      confidence: 0.93,
      rationale: "Gym in frame.",
      source: "gemini",
      auto: true,
      evidenceUrl: "/api/evidence/grid",
    });
    api.mockResolvedValue({ id: "live-1", status: "settled", verdict: { source: "gemini" } });
    const file = new File(["gym"], "gym.jpg", { type: "image/jpeg" });
    const out = await submitLiveProof(
      {
        id: "live-1",
        title: "I'll upload a gym selfie",
        criteria: "Gym floor in frame.",
        creatorId: "auth0|isaac",
        opponentId: "auth0|pat",
        stake: 2,
      },
      file,
      async () => "tok",
    );
    expect(judgeEvidence).toHaveBeenCalledWith(
      expect.objectContaining({ pactId: "live-1", fileName: "gym.jpg" }),
    );
    expect(api).toHaveBeenCalledWith(
      "/api/pacts/live-1/evidence",
      expect.objectContaining({
        token: "tok",
        method: "POST",
        body: expect.objectContaining({
          evidenceName: "gym.jpg",
          evidenceUrl: "/api/evidence/grid",
          verdict: expect.objectContaining({ source: "gemini" }),
        }),
      }),
    );
    expect(out.status).toBe("settled");
  });
});
