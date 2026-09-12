export const LAMPORTS_PER_SOL = 1_000_000_000;
export const STARTING_BALANCE_LAMPORTS = 10 * LAMPORTS_PER_SOL;

const friend = {
  id: "auth0|demo-maya",
  authSub: "auth0|demo-maya",
  name: "FRIEND",
  email: null,
  balanceLamports: STARTING_BALANCE_LAMPORTS,
};

export const DEMO_USERS = {
  isaac: {
    id: "auth0|demo-isaac",
    authSub: "auth0|demo-isaac",
    name: "ISAAC",
    email: null,
    balanceLamports: STARTING_BALANCE_LAMPORTS,
  },
  friend,
  // Alias so existing mock-login `as: "maya"` still resolves to the same identity.
  maya: friend,
};

export const AUTH0_CALLBACK_URL = "http://localhost:5173/callback";
export const AUTH0_LOGOUT_URL = "http://localhost:5173";
export const AUTH0_ORIGIN = "http://localhost:5173";
