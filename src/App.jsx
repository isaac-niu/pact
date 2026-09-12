import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { usePact } from "./store.jsx";
import Home from "./pages/Home.jsx";
import Create from "./pages/Create.jsx";
import Feed from "./pages/Feed.jsx";
import PactDetail from "./pages/PactDetail.jsx";
import AuthenticatedPactDemo from "./pages/AuthenticatedPactDemo.jsx";
import Callback from "./pages/Callback.jsx";

function Switcher() {
  const { userId, switchUser } = usePact();
  return (
    <div className="switcher" role="group" aria-label="Demo user">
      <button className={userId === "you" ? "on" : ""} onClick={() => switchUser("you")}>
        You
      </button>
      <button className={userId === "friend" ? "on" : ""} onClick={() => switchUser("friend")}>
        Friend
      </button>
    </div>
  );
}

function Shell({ children }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <NavLink to="/" className="brand-mark">
            PACT
          </NavLink>
          <span className="brand-sub">Local desk</span>
        </div>
        <nav className="nav">
          <NavLink to="/" end>
            Pitch
          </NavLink>
          <NavLink to="/create">Write slip</NavLink>
          <NavLink to="/feed">Board</NavLink>
          <NavLink to="/app">Pact app</NavLink>
        </nav>
        <Switcher />
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
        <Route path="/app" element={<AuthenticatedPactDemo />} />
        <Route path="/callback" element={<Callback />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
