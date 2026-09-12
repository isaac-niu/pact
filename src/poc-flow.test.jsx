import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDesk } from "./api/local.js";
import App from "./App.jsx";
import { PactProvider } from "./store.jsx";

function renderPactApp(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PactProvider>
        <App />
      </PactProvider>
    </MemoryRouter>,
  );
}

describe("local Pact proof of concept", () => {
  beforeEach(() => {
    localStorage.clear();
    resetDesk();
  });

  it("supports the documented create, accept, evidence, and referee flow", async () => {
    renderPactApp();

    fireEvent.click(screen.getByRole("link", { name: "Write a slip" }));
    expect(screen.getByRole("heading", { name: "Write the pact" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Run a 5k" },
    });
    fireEvent.change(screen.getByLabelText(/Virtual SOL stake/), { target: { value: "3.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Post to the board" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2, name: "Run a 5k" })).toBeInTheDocument();
      expect(screen.getByText("SOL pot")).toBeInTheDocument();
    });
    expect(screen.getByText("7.00")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Friend/ }));
    fireEvent.click(screen.getByRole("button", { name: "Accept · 3.50 SOL" }));
    await waitFor(() => {
      expect(screen.getByText(/Live\. ISAAC owes a photo/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /^You/ }));
    const evidence = new File(["proof"], "run.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Upload photo"), { target: { files: [evidence] } });

    await waitFor(() => {
      expect(screen.getByRole("img", { name: "run.png" })).toBeInTheDocument();
      expect(screen.getByText("pass")).toBeInTheDocument();
    });
    expect(screen.getByText(/ISAAC takes the pot · 7.00 SOL/)).toBeInTheDocument();
  });

  it("keeps the main navigation available from every application route", () => {
    renderPactApp("/feed");

    expect(screen.getByRole("link", { name: "PACT" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Write" })).toHaveAttribute("href", "/create");
    expect(screen.getByRole("link", { name: "Tape" })).toHaveAttribute("href", "/feed");
    expect(screen.getByRole("link", { name: "Pact app" })).toHaveAttribute("href", "/app");
  });
});
