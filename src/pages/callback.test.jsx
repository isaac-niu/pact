import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Callback from "./Callback.jsx";

vi.mock("../env.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    clientEnvReady: () => ({
      ready: false,
      message: "Missing client env vars: VITE_AUTH0_DOMAIN.",
    }),
  };
});

describe("Auth0 callback route", () => {
  it("does not crash without an Auth0 provider when client env is missing", () => {
    render(
      <MemoryRouter>
        <Callback />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "Auth0 callback" })).toBeInTheDocument();
    expect(screen.getByText(/VITE_AUTH0_DOMAIN/)).toBeInTheDocument();
  });
});
