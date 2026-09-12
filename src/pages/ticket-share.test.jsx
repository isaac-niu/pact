import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDesk } from "../api/local.js";
import PactDetail from "./PactDetail.jsx";
import { PactProvider } from "../store.jsx";

describe("shareable ticket card", () => {
  beforeEach(() => {
    localStorage.clear();
    resetDesk();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn(async () => {}) },
    });
  });

  it("shows a generated ticket card and copies the URL plus card path", async () => {
    render(
      <MemoryRouter initialEntries={["/pact/demo-settled-gym"]}>
        <PactProvider>
          <Routes>
            <Route path="/pact/:id" element={<PactDetail />} />
          </Routes>
        </PactProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole("img", { name: "PACT ticket demo-settled-gym" })).toBeInTheDocument();
    expect(screen.getByText("Share the ticket")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copy URL + card" }));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
    const copied = navigator.clipboard.writeText.mock.calls[0][0];
    expect(copied).toMatch(/pact\/demo-settled-gym/);
    expect(copied).toMatch(/\/api\/og\/ticket\/demo-settled-gym/);
  });
});
