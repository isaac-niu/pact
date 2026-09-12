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

describe("tape reactions and short takes", () => {
  beforeEach(() => {
    localStorage.clear();
    resetDesk();
  });

  it("lets a spectator throw heat on a public mark without leaving the tape", async () => {
    renderTape();

    const heat = screen.getAllByRole("button", { name: /Heat/ })[0];
    expect(heat).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(heat);
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /Heat/ })[0]).toHaveAttribute("aria-pressed", "true");
    });
    expect(screen.getByRole("heading", { name: "Public tape" })).toBeInTheDocument();
  });

  it("posts a short take under a seeded mark", async () => {
    renderTape();

    expect(screen.getByText("Clean frame. Book stands.")).toBeInTheDocument();
    const field = screen.getAllByPlaceholderText("Short take on this mark")[0];
    fireEvent.change(field, { target: { value: "Rail likes this settle." } });
    fireEvent.click(screen.getAllByRole("button", { name: "Post take" })[0]);
    expect(await screen.findByText("Rail likes this settle.")).toBeInTheDocument();
  });
});
