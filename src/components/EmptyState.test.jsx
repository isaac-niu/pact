import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import EmptyState from "./EmptyState.jsx";

describe("empty desk card", () => {
  it("renders art, copy, and a suggested next action", () => {
    render(
      <EmptyState
        art="crew"
        kicker="Your desk"
        title="No crew on your desk"
        lede="Name a crew above."
        action={<a href="#create-crew">Name a crew</a>}
      />,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No crew on your desk" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Name a crew" })).toHaveAttribute("href", "#create-crew");
    expect(document.querySelector(".empty-art")).toBeTruthy();
  });
});
