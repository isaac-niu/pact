import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDesk } from "../api/local.js";
import PactDetail from "./PactDetail.jsx";
import { PactProvider, usePact } from "../store.jsx";
import { useEffect } from "react";

function SwitchToCreator() {
  const { switchUser, userId } = usePact();
  useEffect(() => {
    if (userId !== "friend") switchUser("friend");
  }, [switchUser, userId]);
  return null;
}

describe("video and burst proof desk", () => {
  beforeEach(() => {
    localStorage.clear();
    resetDesk();
  });

  it("keeps the single-photo dropzone and also takes a burst or clip", async () => {
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

    const input = await screen.findByLabelText("Upload proof");
    expect(input).toHaveAttribute("multiple");
    expect(input.getAttribute("accept")).toMatch(/image\/\*/);
    expect(input.getAttribute("accept")).toMatch(/video\/mp4/);
    expect(screen.getByText(/One photo, a burst/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Take a frame")).not.toBeInTheDocument();
  });
});
