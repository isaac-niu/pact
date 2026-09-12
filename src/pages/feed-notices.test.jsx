import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDesk } from "../api/local.js";
import App from "../App.jsx";
import { PactProvider } from "../store.jsx";

function renderTape() {
  return render(
    <MemoryRouter initialEntries={["/feed"]}>
      <PactProvider>
        <App />
      </PactProvider>
    </MemoryRouter>,
  );
}

describe("desk notices on tape", () => {
  beforeEach(() => {
    localStorage.clear();
    resetDesk();
  });

  it("badges Tape and lists the seeded REVIEW notice", async () => {
    renderTape();

    expect(screen.getByRole("link", { name: /^Tape, \d+ unread/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Desk notices" })).toBeInTheDocument();
    expect(screen.getByText("Your turn to verify")).toBeInTheDocument();
    expect(screen.getByText(/REVIEW on “Show today's standup notes”/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear the board" }));
    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Tape" })).toBeInTheDocument();
    });
  });
});
