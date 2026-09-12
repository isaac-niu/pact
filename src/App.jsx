import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { usePact } from "./store.jsx";
import { api } from "./api.js";
import { sol } from "./lib/format.js";
import { AUTH0_LOGOUT_URL, clientEnvReady, env, pageIsHttps } from "./env.js";
import Home from "./pages/Home.jsx";
import Create from "./pages/Create.jsx";
import Feed from "./pages/Feed.jsx";
import PactDetail from "./pages/PactDetail.jsx";
import Profile from "./pages/Profile.jsx";
import AuthenticatedPactDemo from "./pages/AuthenticatedPactDemo.jsx";
import Callback from "./pages/Callback.jsx";
import People from "./pages/People.jsx";
import Crew from "./pages/Crew.jsx";

const LAMPORTS_PER_SOL = 1_000_000_000;

function onAuthRoute(pathname) {
  return pathname === "/app" || pathname.startsWith("/app/") || pathname === "/callback";
}

function Auth0Account() {
  const { isAuthenticated, isLoading, loginWithRedirect, logout, user } = useAuth0();

  if (isLoading) return <span className="account-status">Checking account…</span>;
  if (!isAuthenticated) {
    return (
      <button className="account-login" type="button" onClick={() => loginWithRedirect()}>
        Sign in
      </button>
    );
  }

  const name = user?.name || user?.nickname || user?.email || "Signed-in user";
  return (
    <div className="account-control" aria-label="Signed-in account">
      <span className="account-name" title={name}>
        {name}
      </span>
      <button
        className="account-logout"
        type="button"
        onClick={() => logout({ logoutParams: { returnTo: env.AUTH0_LOGOUT_URL || AUTH0_LOGOUT_URL } })}
      >
        Sign out
      </button>
    </div>
  );
}

export function AccountControl() {
  const { pathname } = useLocation();
  if (!clientEnvReady().ready || (!onAuthRoute(pathname) && !pageIsHttps())) {
    return (
      <NavLink className="account-login" to="/app">
        Sign in
      </NavLink>
    );
  }
  return <Auth0Account />;
}

function Auth0Balance() {
  const { getAccessTokenSilently, isAuthenticated, isLoading, user } = useAuth0();
  const [balanceLamports, setBalanceLamports] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setBalanceLamports(null);
      return undefined;
    }

    let active = true;
    getAccessTokenSilently()
      .then((token) => api("/api/ledger", { token }))
      .then((ledger) => {
        if (active) setBalanceLamports(ledger.balanceLamports);
      })
      .catch(() => {
        if (active) setBalanceLamports(null);
      });
    return () => {
      active = false;
    };
  }, [getAccessTokenSilently, isAuthenticated]);

  // Signed-out visitors have no authenticated ledger — show nothing rather
  // than a chip implying a balance exists before you've actually signed in.
  if (!isLoading && !isAuthenticated) return null;

  const name = user?.name || user?.nickname || user?.email || "Account";
  const balance = balanceLamports === null ? "—" : sol(balanceLamports / LAMPORTS_PER_SOL);
  return (
    <NavLink to="/app" className="bank-chip" title="Your authenticated virtual SOL ledger">
      <span className="bank-who">{isLoading ? "Account" : name}</span>
      <b>{balance}</b>
      <span>SOL</span>
    </NavLink>
  );
}

export function BalanceControl() {
  const { pathname } = useLocation();
  // The local-desk balance only belongs on its own page (/me), where it's
  // unambiguous whose bank you're looking at. The shared header only shows
  // a balance once there's a real signed-in Auth0 identity behind it.
  if (!clientEnvReady().ready || (!onAuthRoute(pathname) && !pageIsHttps())) {
    return null;
  }
  return <Auth0Balance />;
}

function Shell({ children }) {
  const { backend } = usePact();
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <NavLink to="/" className="brand-mark">
            PACT
          </NavLink>
          <span className="brand-sub">{backend === "mongo" ? "Live desk" : "Local desk"}</span>
        </div>
        <nav className="nav">
          <NavLink to="/" end>
            Pitch
          </NavLink>
          <NavLink to="/create">Write</NavLink>
          <NavLink to="/feed">Tape</NavLink>
          <NavLink to="/people">People</NavLink>
          <NavLink to="/crew">Crew</NavLink>
          <NavLink to="/me">Me</NavLink>
          <NavLink to="/app">Pact app</NavLink>
        </nav>
        <div className="top-tools">
          <BalanceControl />
          <AccountControl />
        </div>
      </header>
      {children}
    </div>
  );
}

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<Create />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/pact/:id" element={<PactDetail />} />
        <Route path="/me" element={<Profile />} />
        <Route path="/people" element={<People />} />
        <Route path="/crew" element={<Crew />} />
        <Route path="/profile" element={<Navigate to="/me" replace />} />
        <Route path="/app" element={<AuthenticatedPactDemo />} />
        <Route path="/callback" element={<Callback />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
