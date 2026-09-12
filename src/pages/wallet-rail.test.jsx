import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDesk } from "../api/local.js";
import { PactProvider } from "../store.jsx";
import { WalletProvider } from "../wallet/WalletProvider.jsx";
import Profile from "./Profile.jsx";
import Create from "./Create.jsx";

vi.mock("../lib/solanaChain.js", () => ({
  sendEscrowMemo: vi.fn(async ({ method, intent, wallet }) => ({
    signature: `test-${method}-${intent.pactId}`,
    demo: wallet?.kind === "demo",
  })),
}));

function mount(ui, path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <WalletProvider>
        <PactProvider>{ui}</PactProvider>
      </WalletProvider>
    </MemoryRouter>,
  );
}

describe("wallet rail on the desk", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    resetDesk();
    delete window.solana;
  });

  it("sits the demo desk on /me and shows the pubkey", async () => {
    mount(
      <Routes>
        <Route path="/me" element={<Profile />} />
      </Routes>,
      "/me",
    );

    expect(screen.getByText("Wallet rail")).toBeInTheDocument();
    expect(screen.getByText(/virtual book still holds the ticket/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sit the demo desk" }));
    await waitFor(() => {
      expect(screen.getByText("DEMO")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Stand down" })).toBeInTheDocument();
    expect(screen.getByText(/signs locally and does not broadcast/i)).toBeInTheDocument();
  });

  it("lets a connected demo desk lock a new slip on the chain rail", async () => {
    mount(
      <Routes>
        <Route path="/create" element={<Create />} />
        <Route path="/pact/:id" element={<p>ticket</p>} />
      </Routes>,
      "/create",
    );

    fireEvent.click(screen.getByRole("button", { name: "Sit the demo desk" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Lock this stake on the chain rail")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText("Lock this stake on the chain rail"));
    fireEvent.click(screen.getByRole("button", { name: "Post to the board" }));
    await waitFor(() => {
      expect(screen.getByText("ticket")).toBeInTheDocument();
    });
  });
});
