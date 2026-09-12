import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, fetchHealth } from "../api.js";
import AuthenticatedPactDemo from "./AuthenticatedPactDemo.jsx";

const auth0State = {
  isAuthenticated: false,
  isLoading: false,
  loginWithRedirect: vi.fn(),
  logout: vi.fn(),
  getAccessTokenSilently: vi.fn(),
  user: null,
};

vi.mock("@auth0/auth0-react", () => ({
  useAuth0: () => auth0State,
  Auth0Provider: ({ children }) => children,
}));

vi.mock("../env.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    clientEnvReady: () => ({ ready: true, message: null }),
    env: {
      AUTH0_DOMAIN: "example.auth0.com",
      AUTH0_CLIENT_ID: "client",
      AUTH0_AUDIENCE: "https://pact-api",
      AUTH0_CALLBACK_URL: "http://localhost:5173/callback",
    },
  };
});

vi.mock("../api.js", () => ({
  api: vi.fn(),
  fetchHealth: vi.fn(),
}));

describe("AuthenticatedPactDemo", () => {
  beforeEach(() => {
    auth0State.isAuthenticated = false;
    auth0State.isLoading = false;
    auth0State.loginWithRedirect.mockReset();
    api.mockReset();
    fetchHealth.mockReset();
    api.mockImplementation(async (path, options = {}) => {
      if (path === "/api/auth/mock-login") {
        return {
          token: "mock-auth0|demo-isaac",
          user: { id: "auth0|demo-isaac", name: "ISAAC", balanceLamports: 10_000_000_000 },
        };
      }
      if (path === "/api/pacts" && (!options.method || options.method === "GET")) return [];
      if (path === "/api/ledger") return { balanceLamports: 10_000_000_000, transactions: [] };
      throw new Error(`unhandled ${path}`);
    });
  });

  it("keeps pact data hidden until a mock user signs in", async () => {
    fetchHealth.mockResolvedValue({
      status: "ok",
      auth: { mode: "mock" },
      mongo: { mode: "memory" },
    });
    render(<AuthenticatedPactDemo />);

    expect(await screen.findByRole("button", { name: "Sign in as ISAAC" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sign in to Pact" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in as MAYA" })).toBeInTheDocument();
    expect(screen.queryByText("My pacts")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sign in as ISAAC" }));
    expect(await screen.findByRole("heading", { name: "ISAAC Pact desk" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "My pacts" })).toBeInTheDocument();
  });

  it("uses Auth0 instead of mock buttons when the API is live", async () => {
    fetchHealth.mockResolvedValue({
      status: "ok",
      auth: { mode: "live" },
      mongo: { mode: "atlas", connected: true },
    });
    render(<AuthenticatedPactDemo />);
    expect(await screen.findByRole("button", { name: "Continue with Auth0" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign in as ISAAC" })).not.toBeInTheDocument();
    expect(screen.queryByText("My pacts")).not.toBeInTheDocument();
  });

  it("explains how to start the API when health is down", async () => {
    fetchHealth.mockResolvedValue({ status: "down" });
    render(<AuthenticatedPactDemo />);
    expect(await screen.findByRole("heading", { name: "API unreachable" })).toBeInTheDocument();
  });
});
