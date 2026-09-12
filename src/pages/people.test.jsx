import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { FriendsList } from "../components/SocialForms.jsx";
import People from "./People.jsx";
import { PactProvider } from "../store.jsx";

describe("people empty desk", () => {
  it("fills the incoming and friends holes on the demo book", () => {
    render(
      <MemoryRouter>
        <PactProvider>
          <People />
        </PactProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "No incoming friend slips" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No friends on your desk" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Write a slip" }).length).toBeGreaterThan(0);
  });

  it("shows a next action when no other desks have signed in", () => {
    render(
      <MemoryRouter>
        <FriendsList people={[]} incoming={[]} friends={[]} onAdd={() => {}} onAccept={() => {}} busy="" />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "No other desks on this book" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Write a slip anyway" })).toHaveAttribute("href", "/create");
  });
});
