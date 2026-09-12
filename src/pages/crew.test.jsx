import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { CreateGroupForm } from "../components/SocialForms.jsx";
import Crew from "./Crew.jsx";
import { PactProvider } from "../store.jsx";

describe("create group form", () => {
  it("keeps the directory checkbox inline with its label", () => {
    render(<CreateGroupForm onSubmit={vi.fn()} busy="" />);
    const checkbox = screen.getByRole("checkbox", { name: /list in the directory/i });
    const label = checkbox.closest("label");
    expect(label.className).toContain("check");
    expect(label.textContent.trim()).toMatch(/list in the directory/i);
    expect(checkbox.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_CONTAINS).toBeTruthy();
  });
});

describe("crew directory", () => {
  it("lists seeded public crews and shows a created listed crew on the board", async () => {
    render(
      <MemoryRouter>
        <PactProvider>
          <Crew />
        </PactProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Listed crews" })).toBeInTheDocument();
    expect(screen.getByText("Dawn gym")).toBeInTheDocument();
    expect(screen.getByText("Night runners")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search listed crews"), { target: { value: "dawn" } });
    expect(screen.getByText("Dawn gym")).toBeInTheDocument();
    expect(screen.queryByText("Night runners")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search listed crews"), { target: { value: "" } });
    fireEvent.change(screen.getByPlaceholderText("Training crew"), { target: { value: "Westside iron" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /list in the directory/i }));
    fireEvent.click(screen.getByRole("button", { name: "Create group" }));
    expect(await screen.findByText("Group created.")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByText("Westside iron").length).toBeGreaterThan(0);
    });
  });
});
