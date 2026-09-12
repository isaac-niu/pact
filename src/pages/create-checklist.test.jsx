import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDesk } from "../api/local.js";
import Create from "./Create.jsx";
import { PactProvider } from "../store.jsx";

describe("structured success criteria on the write desk", () => {
  beforeEach(() => {
    localStorage.clear();
    resetDesk();
  });

  it("lets a creator list HOLD/MISS lines instead of one paragraph", async () => {
    render(
      <MemoryRouter>
        <PactProvider>
          <Create />
        </PactProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText("Success criteria")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Face visible")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Gym floor or equipment visible")).toBeInTheDocument();
    expect(screen.getByText(/HOLD \/ MISS/)).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue("Face visible"), {
      target: { value: "Face in frame" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add a line" }));
    const inputs = screen.getAllByPlaceholderText(/Gym floor or equipment visible|Face visible/);
    fireEvent.change(inputs.at(-1), { target: { value: "Clock on the wall" } });

    expect(screen.getByText("Face in frame")).toBeInTheDocument();
    expect(screen.getByText("Clock on the wall")).toBeInTheDocument();
  });
});
