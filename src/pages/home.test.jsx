import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PactProvider } from "../store.jsx";
import Home from "./Home.jsx";

function renderHome() {
  return render(
    <MemoryRouter>
      <PactProvider>
        <Home />
      </PactProvider>
    </MemoryRouter>,
  );
}

describe("Home page", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("renders the hero kicker text", () => {
    renderHome();
    expect(screen.getByText("1v1 self-improvement · fake SOL · mocked referee")).toBeInTheDocument();
  });

  it("renders the main headline", () => {
    renderHome();
    expect(screen.getByText(/Bet on the/)).toBeInTheDocument();
    expect(screen.getByText(/version of you/)).toBeInTheDocument();
    expect(screen.getByText(/that shows up/)).toBeInTheDocument();
  });

  it("renders the lede paragraph with key phrases", () => {
    renderHome();
    expect(screen.getByText(/Write a pact/)).toBeInTheDocument();
    expect(screen.getByText(/A friend matches the stake/)).toBeInTheDocument();
    expect(screen.getByText(/no wallet, no auth, no chain/)).toBeInTheDocument();
  });

  it("renders the 'Open a pact' CTA link", () => {
    renderHome();
    const link = screen.getByRole("link", { name: /Open a pact/i });
    expect(link).toHaveAttribute("href", "/create");
  });

  it("renders the 'View the board' CTA link", () => {
    renderHome();
    const link = screen.getByRole("link", { name: /View the board/i });
    expect(link).toHaveAttribute("href", "/feed");
  });

  it("renders the odds strip with line, stake, and pot values", () => {
    renderHome();
    expect(screen.getByText("Line")).toBeInTheDocument();
    expect(screen.getByText("Gym selfie")).toBeInTheDocument();
    expect(screen.getByText("Stake each")).toBeInTheDocument();
    expect(screen.getByText("2.00 SOL")).toBeInTheDocument();
    expect(screen.getByText("Pot")).toBeInTheDocument();
    expect(screen.getByText("4.00 SOL")).toBeInTheDocument();
  });

  it("navigates to /create when clicking 'Open a pact'", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <PactProvider>
          <Home />
        </PactProvider>
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: /Open a pact/i });
    fireEvent.click(link);
    // After navigation, we should see the Create page content
    expect(screen.getByText(/Write the pact/i)).toBeInTheDocument();
  });

  it("navigates to /feed when clicking 'View the board'", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <PactProvider>
          <Home />
        </PactProvider>
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: /View the board/i });
    fireEvent.click(link);
    expect(screen.getByText(/Pact board/i)).toBeInTheDocument();
  });
});
