import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useParams } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDesk } from "../api/local.js";
import { PactProvider } from "../store.jsx";
import Create from "./Create.jsx";

const liveState = {
  live: false,
  isLoading: false,
  me: null,
  people: [],
  friends: { friends: [], incoming: [], outgoing: [] },
  groups: [],
  error: "",
  tokenOf: vi.fn(),
  loginWithRedirect: vi.fn(),
};

vi.mock("../auth/useLiveAccount.js", () => ({
  useLiveAccount: () => liveState,
}));

vi.mock("../env.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    clientEnvReady: () => ({ ready: true, message: null }),
  };
});

vi.mock("../api.js", () => ({
  api: vi.fn(),
  fetchHealth: vi.fn(),
}));

import { api } from "../api.js";

function TicketStub() {
  const { id } = useParams();
  return <h2>Ticket {id}</h2>;
}

function renderWrite() {
  return render(
    <MemoryRouter initialEntries={["/create"]}>
      <PactProvider>
        <Routes>
          <Route path="/create" element={<Create />} />
          <Route path="/pact/:id" element={<TicketStub />} />
        </Routes>
      </PactProvider>
    </MemoryRouter>,
  );
}

describe("signed-in Write", () => {
  beforeEach(() => {
    localStorage.clear();
    resetDesk();
    liveState.live = false;
    liveState.me = null;
    liveState.people = [];
    liveState.friends = { friends: [], incoming: [], outgoing: [] };
    liveState.tokenOf.mockReset();
    api.mockReset();
  });

  it("keeps the unsigned desk aimed at FRIEND", () => {
    renderWrite();
    expect(screen.getAllByText("FRIEND").length).toBeGreaterThan(0);
    expect(screen.getByText("Friend · 1v1 on this desk")).toBeInTheDocument();
    expect(screen.queryByLabelText("Signed-in friend")).not.toBeInTheDocument();
  });

  it("lists real friends and posts a live /api/pacts 1v1", async () => {
    liveState.live = true;
    liveState.me = { id: "auth0|isaac", name: "Isaac" };
    liveState.friends = {
      friends: [{ id: "auth0|pat", name: "Pat", email: "pat@example.com" }],
      incoming: [],
      outgoing: [],
    };
    liveState.tokenOf.mockResolvedValue("tok");
    api.mockResolvedValue({ id: "live-gym", title: "I'll upload a gym selfie" });

    renderWrite();
    const picker = await screen.findByLabelText("Signed-in friend");
    expect(picker).toHaveValue("auth0|pat");
    expect(screen.getByText(/Signed-in friend · live 1v1/)).toBeInTheDocument();
    expect(screen.queryByText("Maya")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Post to the board" }));
    await waitFor(() => {
      expect(api).toHaveBeenCalledWith(
        "/api/pacts",
        expect.objectContaining({
          token: "tok",
          method: "POST",
          body: expect.objectContaining({
            title: "I'll upload a gym selfie",
            opponentId: "auth0|pat",
            criteria: "Face visible · Gym floor or equipment visible",
            checklist: [
              { id: "sc_face", label: "Face visible" },
              { id: "sc_gym", label: "Gym floor or equipment visible" },
            ],
          }),
        }),
      );
    });
    expect(await screen.findByRole("heading", { name: /Ticket/ })).toBeInTheDocument();
  });
});
