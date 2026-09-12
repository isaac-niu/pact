import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { usePact } from "./store.jsx";
import { sol } from "./lib/format.js";
import { AUTH0_LOGOUT_URL, clientEnvReady } from "./env.js";
import Home from "./pages/Home.jsx";
import Create from "./pages/Create.jsx";
import Feed from "./pages/Feed.jsx";
import PactDetail from "./pages/PactDetail.jsx";
import Profile from "./pages/Profile.jsx";
import AuthenticatedPactDemo from "./pages/AuthenticatedPactDemo.jsx";
import Callback from "./pages/Callback.jsx";

function Auth0Account() {
  const { isAuthenticated, isLoading, loginWithRedirect, logout, user } = useAuth0();

  if (isLoading) return <span className="account-status">Checking account…</span>;
  if (!isAuthenticated) {
    return <button className="account-login" type="button" onClick={() => loginWithRedirect()}>Sign in</button>;
  }

  const name = user?.name || user?.nickname || user?.email || "Signed-in user";
  return (
    <div className="account-control" aria-label="Signed-in account">
      <span className="account-name" title={name}>{name}</span>
      <button
        className="account-logout"
        type="button"
        onClick={() => logout({ logoutParams: { returnTo: AUTH0_LOGOUT_URL } })}
      >
        Sign out
      </button>
    </div>
  );
}

export function AccountControl() {
  if (!clientEnvReady().ready) {
    return <NavLink className="account-login" to="/app">Sign in</NavLink>;
  }
  return <Auth0Account />;
}

function Shell({ children }) {
  const { user, bank, backend } = usePact();
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
          <NavLink to="/me">Me</NavLink>
          <NavLink to="/app">Pact app</NavLink>
        </nav>
        <div className="top-tools">
          <NavLink to="/me" className="bank-chip" title="Virtual SOL ledger">
            <span className="bank-who">{user.handle}</span>
            <b>{sol(bank)}</b>
            <span>SOL</span>
          </NavLink>
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
        <Route path="/profile" element={<Navigate to="/me" replace />} />
        <Route path="/app" element={<AuthenticatedPactDemo />} />
        <Route path="/callback" element={<Callback />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
