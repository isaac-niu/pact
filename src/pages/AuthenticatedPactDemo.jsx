import { useAuth0 } from "@auth0/auth0-react";
import { useCallback, useEffect, useState } from "react";
import { api, fetchHealth } from "../api.js";
import { AUTH0_CALLBACK_URL, AUTH0_LOGOUT_URL, clientEnvReady, env } from "../env.js";

const MOCK_PEOPLE = {
  isaac: { name: "ISAAC", id: "auth0|demo-isaac", opponent: "auth0|demo-maya" },
  maya: { name: "MAYA", id: "auth0|demo-maya", opponent: "auth0|demo-isaac" },
};

function PactDesk({
  title,
  subtitle,
  onSignOut,
  signOutLabel = "Sign out",
  pacts,
  ledger,
  users,
  selectedOpponent,
  onOpponentChange,
  titleValue,
  onTitleChange,
  stake,
  onStakeChange,
  onCreate,
  onAccept,
  onDecline,
  message,
  userId,
}) {
  return (
    <section>
      <div className="page-head">
        <div>
          <div className="kicker">Authenticated desk</div>
          <h2>{title}</h2>
          {subtitle ? <p className="hint">{subtitle}</p> : null}
        </div>
        <button className="btn btn-ghost" type="button" onClick={onSignOut}>
          {signOutLabel}
        </button>
      </div>
      <form className="card form" onSubmit={onCreate}>
        <label>
          Challenge
          <textarea value={titleValue} onChange={(event) => onTitleChange(event.target.value)} />
        </label>
        <label>
          Stake each (whole SOL)
          <input
            type="number"
            min="1"
            value={stake}
            onChange={(event) => onStakeChange(event.target.value)}
          />
        </label>
        {onOpponentChange ? (
          <label>
            Opponent
            <select
              value={selectedOpponent}
              onChange={(event) => onOpponentChange(event.target.value)}
            >
              <option value="">Select a signed-in counterparty</option>
              {users.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                  {person.email ? ` · ${person.email}` : ""}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button className="btn btn-lime" type="submit">
          Create pact
        </button>
      </form>
      {message ? (
        <p className="status" role="status">
          {message}
        </p>
      ) : null}
      <div className="card">
        <h3>My pacts</h3>
        {pacts.length === 0 ? <p className="hint">No pacts yet.</p> : null}
        {pacts.map((pact) => (
          <article className="slip" key={pact.id}>
            <div>
              <b className="slip-title">{pact.title}</b>
              <p className="meta">
                {pact.stakeLamports / 1_000_000_000} SOL each · {pact.status}
              </p>
              {pact.opponentId === userId && pact.status === "draft" ? (
                <div className="pact-actions">
                  <button className="btn btn-lime" type="button" onClick={() => onAccept(pact.id)}>
                    Accept
                  </button>
                  <button className="btn btn-ghost" type="button" onClick={() => onDecline(pact.id)}>
                    Decline
                  </button>
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      <div className="card">
        <h3>Ledger / balance</h3>
        <p>{ledger ? `${ledger.balanceLamports / 1_000_000_000} SOL available` : "Loading balance…"}</p>
      </div>
    </section>
  );
}

function MockPactDesk() {
  const [session, setSession] = useState(null);
  const [pacts, setPacts] = useState([]);
  const [ledger, setLedger] = useState(null);
  const [title, setTitle] = useState("");
  const [stake, setStake] = useState("1");
  const [message, setMessage] = useState("");

  const refresh = useCallback(
    async (next = session) => {
      if (!next) return;
      const [myPacts, myLedger] = await Promise.all([
        api("/api/pacts", { token: next.token }),
        api("/api/ledger", { token: next.token }),
      ]);
      setPacts(myPacts);
      setLedger(myLedger);
    },
    [session],
  );

  useEffect(() => {
    refresh().catch((error) => setMessage(error.message));
  }, [refresh]);

  if (!session) {
    return (
      <section className="card">
        <h2>Sign in to Pact</h2>
        <p>Protected pact data is hidden until you sign in. Mock mode uses ISAAC and MAYA.</p>
        <div className="auth-actions">
          {Object.entries(MOCK_PEOPLE).map(([key, person]) => (
            <button
              className="btn btn-lime"
              key={key}
              type="button"
              onClick={async () => {
                try {
                  const login = await api("/api/auth/mock-login", { method: "POST", body: { as: key } });
                  setSession({ ...login, key });
                  setMessage("");
                } catch (error) {
                  setMessage(error.message);
                }
              }}
            >
              Sign in as {person.name}
            </button>
          ))}
        </div>
        {message ? (
          <p className="status" role="status">
            {message}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <PactDesk
      title={`${session.user.name} Pact desk`}
      subtitle="Deterministic mock identities (PACT_MOCK_AUTH=1)."
      onSignOut={() => {
        setSession(null);
        setPacts([]);
        setLedger(null);
      }}
      pacts={pacts}
      ledger={ledger}
      titleValue={title}
      onTitleChange={setTitle}
      stake={stake}
      onStakeChange={setStake}
      onCreate={async (event) => {
        event.preventDefault();
        try {
          await api("/api/pacts", {
            token: session.token,
            method: "POST",
            body: {
              title,
              stakeLamports: Number(stake) * 1_000_000_000,
              opponentId: MOCK_PEOPLE[session.key].opponent,
            },
          });
          setTitle("");
          setMessage("Pact created.");
          await refresh();
        } catch (error) {
          setMessage(error.message);
        }
      }}
      onAccept={async (id) => {
        await api(`/api/pacts/${id}/accept`, { token: session.token, method: "PATCH" });
        await refresh();
      }}
      onDecline={async (id) => {
        await api(`/api/pacts/${id}/decline`, { token: session.token, method: "PATCH" });
        await refresh();
      }}
      message={message}
      userId={session.user.id}
    />
  );
}

function LivePactDesk() {
  const { isAuthenticated, isLoading, loginWithRedirect, logout, getAccessTokenSilently, user } =
    useAuth0();
  const [pacts, setPacts] = useState([]);
  const [ledger, setLedger] = useState(null);
  const [users, setUsers] = useState([]);
  const [me, setMe] = useState(null);
  const [opponentId, setOpponentId] = useState("");
  const [title, setTitle] = useState("");
  const [stake, setStake] = useState("1");
  const [message, setMessage] = useState("");

  const tokenOf = useCallback(
    () =>
      getAccessTokenSilently({
        authorizationParams: { audience: env.AUTH0_AUDIENCE },
      }),
    [getAccessTokenSilently],
  );

  const refresh = useCallback(async () => {
    const token = await tokenOf();
    const [identity, myPacts, myLedger, directory] = await Promise.all([
      api("/api/auth/me", { token }),
      api("/api/pacts", { token }),
      api("/api/ledger", { token }),
      api("/api/users", { token }),
    ]);
    setMe(identity);
    setPacts(myPacts);
    setLedger(myLedger);
    setUsers(directory);
    setOpponentId((current) => current || directory[0]?.id || "");
  }, [tokenOf]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let cancelled = false;
    refresh().catch((error) => {
      if (!cancelled) setMessage(error.message);
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, refresh]);

  if (isLoading) {
    return (
      <section className="card">
        <h2>Sign in to Pact</h2>
        <p>Checking your Auth0 session…</p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="card">
        <h2>Sign in to Pact</h2>
        <p>
          Live Auth0 login for {AUTH0_CALLBACK_URL}. Protected pact data stays hidden until you
          authenticate. Have two demo accounts sign in once so they can challenge each other.
        </p>
        <div className="auth-actions">
          <button
            className="btn btn-lime"
            type="button"
            onClick={() =>
              loginWithRedirect({
                appState: { returnTo: "/app" },
                authorizationParams: {
                  audience: env.AUTH0_AUDIENCE,
                  redirect_uri: env.AUTH0_CALLBACK_URL || AUTH0_CALLBACK_URL,
                },
              })
            }
          >
            Continue with Auth0
          </button>
        </div>
      </section>
    );
  }

  return (
    <PactDesk
      title={`${me?.name || user?.name || "Pact user"} Pact desk`}
      subtitle={me?.email || user?.email || me?.id}
      onSignOut={() =>
        logout({
          logoutParams: { returnTo: AUTH0_LOGOUT_URL },
        })
      }
      pacts={pacts}
      ledger={ledger}
      users={users}
      selectedOpponent={opponentId}
      onOpponentChange={setOpponentId}
      titleValue={title}
      onTitleChange={setTitle}
      stake={stake}
      onStakeChange={setStake}
      onCreate={async (event) => {
        event.preventDefault();
        try {
          const token = await tokenOf();
          await api("/api/pacts", {
            token,
            method: "POST",
            body: {
              title,
              stakeLamports: Number(stake) * 1_000_000_000,
              opponentId,
            },
          });
          setTitle("");
          setMessage("Pact created.");
          await refresh();
        } catch (error) {
          setMessage(error.message);
        }
      }}
      onAccept={async (id) => {
        const token = await tokenOf();
        await api(`/api/pacts/${id}/accept`, { token, method: "PATCH" });
        await refresh();
      }}
      onDecline={async (id) => {
        const token = await tokenOf();
        await api(`/api/pacts/${id}/decline`, { token, method: "PATCH" });
        await refresh();
      }}
      message={message}
      userId={me?.id}
    />
  );
}

export default function AuthenticatedPactDemo() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchHealth().then((body) => {
      if (!cancelled) setHealth(body);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!health) {
    return (
      <section className="card">
        <h2>Checking API health</h2>
        <p>Looking up whether this desk is using Auth0 or mock sign-in…</p>
      </section>
    );
  }

  if (health.status === "down") {
    return (
      <section className="card">
        <h2>API unreachable</h2>
        <p>
          Start the backend with <code>npm run server</code> (live Auth0 + Atlas) or{" "}
          <code>PACT_MOCK_AUTH=1 npm run server</code> for ISAAC/MAYA.
        </p>
      </section>
    );
  }

  if (health.auth?.mode === "live") {
    const ready = clientEnvReady();
    if (!ready.ready) {
      return (
        <section className="card">
          <h2>Auth0 client env missing</h2>
          <p>{ready.message}</p>
        </section>
      );
    }
    return <LivePactDesk />;
  }

  return <MockPactDesk />;
}
