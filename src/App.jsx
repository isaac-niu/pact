import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { usePact } from "./store.jsx";
import { sol } from "./lib/format.js";
import Home from "./pages/Home.jsx";
import Create from "./pages/Create.jsx";
import Feed from "./pages/Feed.jsx";
import PactDetail from "./pages/PactDetail.jsx";
import Profile from "./pages/Profile.jsx";

function Switcher() {
  const { userId, switchUser, users } = usePact();
  return (
    <div className="switcher" role="group" aria-label="Demo user">
      {users.map((u) => (
        <button
          key={u.id}
          type="button"
          className={userId === u.id ? "on" : ""}
          onClick={() => switchUser(u.id)}
        >
          <span className="switcher-pill">{u.pill}</span>
          <span className="switcher-handle">{u.handle}</span>
        </button>
      ))}
    </div>
  );
}

function Shell({ children }) {
  const { user, bank } = usePact();
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <NavLink to="/" className="brand-mark">
            PACT
          </NavLink>
          <span className="brand-sub">Gemini desk</span>
        </div>
        <nav className="nav">
          <NavLink to="/" end>
            Pitch
          </NavLink>
          <NavLink to="/create">Write</NavLink>
          <NavLink to="/feed">Tape</NavLink>
          <NavLink to="/me">Me</NavLink>
        </nav>
        <div className="top-tools">
          <NavLink to="/me" className="bank-chip" title="Virtual SOL ledger">
            <span className="bank-who">{user.handle}</span>
            <b>{sol(bank)}</b>
            <span>SOL</span>
          </NavLink>
          <Switcher />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
