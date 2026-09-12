import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDesk } from "../api/local.js";
import PactDetail from "./PactDetail.jsx";
import { PactProvider } from "../store.jsx";

describe("checklist marks on a ticket", () => {
  beforeEach(() => {
    localStorage.clear();
    resetDesk();
  });

  it("shows HOLD/MISS lines on a graded gym slip", () => {
    render(
      <MemoryRouter initialEntries={["/pact/demo-settled-gym"]}>
        <PactProvider>
          <Routes>
            <Route path="/pact/:id" element={<PactDetail />} />
          </Routes>
        </PactProvider>
      </MemoryRouter>,
    );

    expect(screen.getAllByText("Face or body in frame").length).toBeGreaterThan(0);
    expect(screen.getAllByText("HOLD").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Subject in frame/).length).toBeGreaterThan(0);
  });

  it("lets the friend grade each REVIEW line", () => {
    render(
      <MemoryRouter initialEntries={["/pact/demo-review-standup"]}>
        <PactProvider>
          <Routes>
            <Route path="/pact/:id" element={<PactDetail />} />
          </Routes>
        </PactProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText("Grade each line")).toBeInTheDocument();
    expect(screen.getAllByText("Standup notes in frame").length).toBeGreaterThan(0);
    expect(screen.getByText("MISS")).toBeInTheDocument();
  });
});
