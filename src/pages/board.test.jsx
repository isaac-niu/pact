import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDesk } from "../api/local.js";
import { PactProvider } from "../store.jsx";
import App from "../App.jsx";
import Board from "./Board.jsx";

describe("daily board", () => {
  beforeEach(() => {
    localStorage.clear();
    resetDesk();
  });

  it("ranks the open book and links a public ticket", () => {
    render(
      <MemoryRouter initialEntries={["/board"]}>
        <PactProvider>
          <Routes>
            <Route path="/board" element={<Board />} />
          </Routes>
        </PactProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Open book" })).toBeInTheDocument();
    expect(screen.getByText(/Cheap daily look/)).toBeInTheDocument();
    const isaac = screen.getByRole("link", { name: "ISAAC" });
    expect(isaac).toHaveAttribute("href", "/u/ISAAC");
    expect(screen.getByText("100%")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Pot taken" }));
    expect(screen.getByText(/Pot taken on the open book/)).toBeInTheDocument();
    expect(screen.getAllByText(/SOL taken/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Dawn gym" }));
    expect(screen.getByRole("heading", { name: "Dawn gym" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "FRIEND" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "GALE" })).not.toBeInTheDocument();
  });

  it("exposes Board in the desk nav", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <PactProvider>
          <App />
        </PactProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Board" })).toHaveAttribute("href", "/board");
  });
});
