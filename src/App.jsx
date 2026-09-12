import { useState, useEffect } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { usePact } from "./store.jsx";
import Home from "./pages/Home.jsx";
import Create from "./pages/Create.jsx";
import Feed from "./pages/Feed.jsx";
import PactDetail from "./pages/PactDetail.jsx";

const API_BASE = "/api";

function AuthStatus() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          credentials: "include",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            },
          });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          } else {
          setUser(null);
          }
        } catch {
        setUser(null);
        } finally {
        setLoading(false);
        }
      }
    fetchUser();
    }, []);

  async function handleLogout() {
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: "GET" });
      } catch {
       // Ignore logout errors
      }
    localStorage.removeItem("auth_token");
    setUser(null);
    window.location.href = "/";
    }

  if (loading) {
    return <span className="auth-loading">Loading...</span>;
    }

  if (user) {
    return (
        <div className="auth-status">
          <span className="auth-user" title={user.email}>
            {user.name}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
           Sign out
          </button>
        </div>
      );
    }

  return (
      <div className="auth-status">
        <button
         className="btn btn-lime btn-sm"
         onClick={() => {
           window.location.href = `${API_BASE}/auth/login`;
          }}
        >
         Sign in
        </button>
      </div>
    );
}

function Switcher() {
  const { userId, switchUser } = usePact();
  return (
      <div className="switcher" role="group" aria-label="Demo user">
        <button
         className={userId === "you" ? "on" : ""}
         onClick={() => switchUser("you")}
        >
         You
        </button>
        <button
         className={userId === "friend" ? "on" : ""}
         onClick={() => switchUser("friend")}
        >
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
          </nav>
          <div className="topbar-right">
            <AuthStatus />
            <Switcher />
          </div>
        </header>
        {children}
      </div>
    );
}

function ProtectedRoute({ children }) {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          credentials: "include",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            },
          });
        if (res.ok) {
          setAuthed(true);
          } else {
          setAuthed(false);
          }
        } catch {
        setAuthed(false);
        } finally {
        setLoading(false);
        }
      }
    checkAuth();
    }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
    }

  if (!authed) {
    return <Navigate to="/" replace />;
    }

  return children;
}

export default function App() {
  return (
      <Shell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
           path="/create"
           element={
              <ProtectedRoute>
                <Create />
              </ProtectedRoute>
            }
          />
          <Route
           path="/feed"
           element={
              <ProtectedRoute>
                <Feed />
              </ProtectedRoute>
            }
          />
          <Route
           path="/pact/:id"
           element={
              <ProtectedRoute>
                <PactDetail />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Shell>
    );
}
