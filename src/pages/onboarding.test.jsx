import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDesk } from "../api/local.js";
import App from "../App.jsx";
import { ONBOARDING_KEY, persistOnboarding, skipOnboarding } from "../lib/onboarding.js";
import { PactProvider } from "../store.jsx";

function renderDesk(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PactProvider>
        <App />
      </PactProvider>
    </MemoryRouter>,
  );
}

describe("first-visit desk walk", () => {
  beforeEach(() => {
    localStorage.clear();
    resetDesk();
  });

  it("opens on the pitch and distinguishes the SAMPLE ticket from a real slip", () => {
    renderDesk("/");

    expect(screen.getByRole("status", { name: "Desk walkthrough" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "SAMPLE is a dummy ticket" })).toBeInTheDocument();
    expect(screen.getByText("SAMPLE")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Write a real slip" })).toHaveAttribute("href", "/create");
    expect(screen.getByRole("link", { name: "Write a slip" })).toHaveAttribute("href", "/create");
    expect(document.querySelector("[data-tour='sample-ticket']")).toBeTruthy();
  });

  it("walks Write then the live ticket after a real post", async () => {
    renderDesk("/");

    fireEvent.click(screen.getByRole("link", { name: "Write a real slip" }));
    expect(screen.getByRole("heading", { name: "Write the pact" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Post a live slip" })).toBeInTheDocument();
    expect(document.querySelector("[data-tour='write-slip']")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "I'll run the stairs" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Post to the board" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2, name: "I'll run the stairs" })).toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { name: "This slip is on the book" })).toBeInTheDocument();
    expect(screen.getByText(/SAMPLE ticket never left the pitch/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Walk done" }));
    expect(screen.queryByRole("status", { name: "Desk walkthrough" })).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(ONBOARDING_KEY)).status).toBe("done");
  });

  it("does not replay after skip, and Walk the desk starts it again", () => {
    persistOnboarding(skipOnboarding());
    renderDesk("/");

    expect(screen.queryByRole("status", { name: "Desk walkthrough" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Walk the desk" }));
    expect(screen.getByRole("heading", { name: "SAMPLE is a dummy ticket" })).toBeInTheDocument();
  });
});
