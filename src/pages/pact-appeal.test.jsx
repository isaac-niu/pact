import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDesk } from "../api/local.js";
import PactDetail from "./PactDetail.jsx";
import { PactProvider } from "../store.jsx";

function renderTicket() {
  return render(
    <MemoryRouter initialEntries={["/pact/demo-review-standup"]}>
      <PactProvider>
        <Routes>
          <Route path="/pact/:id" element={<PactDetail />} />
        </Routes>
      </PactProvider>
    </MemoryRouter>,
  );
}

describe("REVIEW appeal on a ticket", () => {
  beforeEach(() => {
    localStorage.clear();
    resetDesk();
  });

  it("shows Gemini rationale to the listed friend and requires a written grade", async () => {
    renderTicket();

    expect(screen.getByText("REVIEW")).toBeInTheDocument();
    expect(screen.getByText(/Notes are in frame but the date is hard to read/)).toBeInTheDocument();
    expect(screen.getByText(/Both desks see the rationale/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Stand the slip" }));
    expect(await screen.findByText(/Write why this call stands or fades/)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Write why this frame stands or fades."), {
      target: { value: "Date is on the top of the page." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Stand the slip" }));

    await waitFor(() => {
      expect(screen.getByText("GRADED")).toBeInTheDocument();
    });
    expect(screen.getByText("Date is on the top of the page.")).toBeInTheDocument();
  });

  it("lets the listed friend flag the call before grading", async () => {
    renderTicket();

    fireEvent.change(screen.getByPlaceholderText("What’s wrong with the referee rationale?"), {
      target: { value: "The date is smudged." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Flag / dispute" }));

    await waitFor(() => {
      expect(screen.getByText("APPEAL")).toBeInTheDocument();
    });
    expect(screen.getByText("The date is smudged.")).toBeInTheDocument();
    expect(screen.getByText(/Open appeal/)).toBeInTheDocument();
  });
});
