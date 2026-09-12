import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import App from "./App.jsx";
import { PactProvider } from "./store.jsx";

function renderPactApp(path = "/") {
  localStorage.clear();
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PactProvider>
        <App />
      </PactProvider>
    </MemoryRouter>,
  );
}

describe("local Pact proof of concept", () => {
  it("supports the documented create, accept, evidence, and referee flow", async () => {
    vi.useFakeTimers();
    renderPactApp();

    fireEvent.click(screen.getByRole("link", { name: "Open a pact" }));
    expect(screen.getByRole("heading", { name: "Write the pact" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Challenge"), {
      target: { value: "Run a 5k" },
    });
    fireEvent.change(screen.getByLabelText(/Stake each/), { target: { value: "3.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Post to the board" }));

    expect(screen.getByRole("heading", { name: "Run a 5k" })).toBeInTheDocument();
    expect(screen.getByText("7.00")).toBeInTheDocument();
    expect(screen.getByText("SOL pot")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Friend" }));
    fireEvent.click(screen.getByRole("button", { name: "Accept · 3.50 SOL" }));
    expect(screen.getByText(/Live\. ISAAC owes a photo/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "You" }));
    const evidence = new File(["proof"], "run.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Upload photo"), { target: { files: [evidence] } });
    expect(screen.getByRole("img", { name: "run.png" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Send to referee" }));
    expect(screen.getByText(/Referee reviewing/)).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1400);
    });

    expect(screen.getByText("pass")).toBeInTheDocument();
    expect(screen.getByText(/ISAAC takes the pot · 7.00 SOL/)).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("keeps the main navigation available from every application route", () => {
    renderPactApp("/feed");

    expect(screen.getByRole("link", { name: "PACT" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Write slip" })).toHaveAttribute("href", "/create");
    expect(screen.getByRole("link", { name: "Board" })).toHaveAttribute("href", "/feed");
  });
});
