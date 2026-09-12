import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    const groups = [
      {
        id: "open-runners",
        name: "Open runners",
        visibility: "public",
        discoverable: true,
        memberIds: ["auth0|demo-maya"],
        requested: false,
      },
    ];
    const people = [{ id: "auth0|demo-maya", name: "MAYA", email: null }];
    api.mockImplementation(async (path, options = {}) => {
      if (path === "/api/auth/mock-login") {
        return {
          token: "mock-auth0|demo-isaac",
          user: { id: "auth0|demo-isaac", name: "ISAAC", balanceLamports: 10_000_000_000 },
        };
      }
      if (path === "/api/pacts" && (!options.method || options.method === "GET")) return [];
      if (path === "/api/ledger") return { balanceLamports: 10_000_000_000, transactions: [] };
      if (path === "/api/users") return people;
      if (path === "/api/groups" && (!options.method || options.method === "GET")) return groups;
      if (path === "/api/groups" && options.method === "POST") {
        const created = {
          id: "new-group",
          name: options.body.name,
          visibility: options.body.visibility,
          discoverable: options.body.discoverable,
          memberIds: ["auth0|demo-isaac"],
          creatorId: "auth0|demo-isaac",
          joinCode: "TRAIN123",
        };
        groups.unshift(created);
        return created;
      }
      if (path === "/api/groups/join" || /\/api\/groups\/.+\/join$/.test(path)) {
        const group = groups.find((entry) => path.includes(entry.id)) || groups[0];
        group.requested = true;
        return { ...group, requested: true };
      }
      if (path === "/api/friends" && (!options.method || options.method === "GET")) {
        return { friends: [], incoming: [], outgoing: [] };
      }
      if (path === "/api/friends" && options.method === "POST") {
        const person = people.find((entry) => entry.id === options.body.userId);
        if (person) person.friend = true;
        return { status: "requested" };
      }
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

  it("shows feedback when adding a friend, creating a group, and requesting to join", async () => {
    fetchHealth.mockResolvedValue({
      status: "ok",
      auth: { mode: "mock" },
      mongo: { mode: "memory" },
    });
    render(<AuthenticatedPactDemo />);
    fireEvent.click(await screen.findByRole("button", { name: "Sign in as ISAAC" }));
    expect(await screen.findByRole("heading", { name: "ISAAC Pact desk" })).toBeInTheDocument();

    const directoryCheck = screen.getByRole("checkbox", { name: /list in the directory/i });
    expect(directoryCheck.closest("label").classList.contains("check")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Add friend" }));
    expect(await screen.findByText("Friend added.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Friend added" })).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("Training crew"), { target: { value: "Training crew" } });
    fireEvent.click(screen.getByRole("button", { name: "Create group" }));
    expect(await screen.findByText("Group created.")).toBeInTheDocument();
    expect(await screen.findByText("TRAIN123")).toBeInTheDocument();

    const joinButtons = screen.getAllByRole("button", { name: "Request to join" });
    fireEvent.click(joinButtons[joinButtons.length - 1]);
    await waitFor(() => {
      expect(screen.getByText("Requested.")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Requested" })).toBeDisabled();
  });

  it("explains how to start the API when health is down", async () => {
    fetchHealth.mockResolvedValue({ status: "down" });
    render(<AuthenticatedPactDemo />);
    expect(await screen.findByRole("heading", { name: "API unreachable" })).toBeInTheDocument();
  });
});
