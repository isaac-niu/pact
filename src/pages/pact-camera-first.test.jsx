import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useEffect } from "react";
import { resetDesk } from "../api/local.js";
import PactDetail from "./PactDetail.jsx";
import { PactProvider, usePact } from "../store.jsx";

function SwitchToCreator() {
  const { switchUser, userId } = usePact();
  useEffect(() => {
    if (userId !== "friend") switchUser("friend");
  }, [switchUser, userId]);
  return null;
}

describe("phone-first proof desk", () => {
  beforeEach(() => {
    localStorage.clear();
    resetDesk();
    window.matchMedia = () => ({
      matches: true,
      media: "(pointer: coarse)",
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
    });
  });

  afterEach(() => {
    delete window.matchMedia;
  });

  it("opens the rear camera without dropping the desktop roll", async () => {
    render(
      <MemoryRouter initialEntries={["/pact/demo-live-leetcode"]}>
        <PactProvider>
          <SwitchToCreator />
          <Routes>
            <Route path="/pact/:id" element={<PactDetail />} />
          </Routes>
        </PactProvider>
      </MemoryRouter>,
    );

    const camera = await screen.findByLabelText("Take a frame");
    expect(camera).toHaveAttribute("capture", "environment");
    expect(camera).toHaveAttribute("accept", "image/*");
    expect(camera).not.toHaveAttribute("multiple");

    const roll = screen.getByLabelText("Upload proof");
    expect(roll).toHaveAttribute("multiple");
    expect(roll.getAttribute("accept")).toMatch(/video\/mp4/);
    expect(screen.getByText("Upload from the roll")).toBeInTheDocument();
  });
});
