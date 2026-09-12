import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDesk } from "../api/local.js";
import { PactProvider } from "../store.jsx";
import Profile from "./Profile.jsx";
import PublicProfile from "./PublicProfile.jsx";

function mount(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PactProvider>
        <Routes>
          <Route path="/me" element={<Profile />} />
          <Route path="/u/:handle" element={<PublicProfile />} />
        </Routes>
      </PactProvider>
    </MemoryRouter>,
  );
}

describe("public profile ticket", () => {
  beforeEach(() => {
    localStorage.clear();
    resetDesk();
  });

  it("shows ISAAC's public book and hides the private 5K slip", () => {
    mount("/u/isaac");
    expect(screen.getByRole("heading", { name: "ISAAC" })).toBeInTheDocument();
    expect(screen.getByText("Public ticket · CHALLENGER")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("1-0")).toBeInTheDocument();
    expect(screen.getByText("I'll upload a gym selfie")).toBeInTheDocument();
    expect(screen.queryByText("Run 5K before work")).not.toBeInTheDocument();
  });

  it("renders an empty book for an unknown handle", () => {
    mount("/u/ghost");
    expect(screen.getByText(/No ticket on this book/)).toBeInTheDocument();
  });

  it("links /me out to the public ticket", () => {
    mount("/me");
    const link = screen.getByRole("link", { name: "Open public ticket" });
    expect(link).toHaveAttribute("href", "/u/ISAAC");
  });

  it("copies the public link", async () => {
    const writeText = vi.fn().mockResolvedValue();
    Object.assign(navigator, { clipboard: { writeText } });
    mount("/u/MAYA");
    fireEvent.click(screen.getByRole("button", { name: "Copy public link" }));
    expect(writeText).toHaveBeenCalled();
    expect(await screen.findByText(/Link on the slip/)).toBeInTheDocument();
  });
});
