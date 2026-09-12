import { useAuth0 } from "@auth0/auth0-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, fetchHealth } from "../api.js";
import { CreateGroupForm, FriendsList, GroupList, JoinCodeForm } from "../components/SocialForms.jsx";
import { AUTH0_CALLBACK_URL, AUTH0_LOGOUT_URL, clientEnvReady, env } from "../env.js";
import { createSocialActions } from "../lib/socialActions.js";
import { isStubbedSocialError } from "../lib/social.js";

function clientCallbackUrl() {
  return env.AUTH0_CALLBACK_URL || AUTH0_CALLBACK_URL;
}

function clientLogoutUrl() {
  if (env.AUTH0_LOGOUT_URL) return env.AUTH0_LOGOUT_URL;
  try {
    return new URL(clientCallbackUrl()).origin;
  } catch {
    return AUTH0_LOGOUT_URL;
  }
}

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
  groups = [],
  activeFeed = "mine",
  onFeedChange,
  selectedGroup,
  onGroupChange,
  sendTarget = "opponent",
  onSendTargetChange,
  onCreateGroup,
  onJoinGroup,
  onJoinWithCode,
  onApprove,
  onRemove,
  onTransfer,
  onArchive,
  onDelete,
  onAddFriend,
  onAcceptFriend,
  incomingFriends = [],
  busy = "",
  onShare,
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
        {onOpponentChange && onGroupChange ? (
          <>
            <div className="tape-choice" role="radiogroup" aria-label="Opponent or group">
              <label className={`opp-card ${sendTarget !== "group" ? "on" : ""}`}>
                <input
                  type="radio"
                  name="sendTarget"
                  value="opponent"
                  checked={sendTarget !== "group"}
                  onChange={() => onSendTargetChange("opponent")}
                />
                <span>
                  <b>Opponent</b>
                  <em>1v1 with a signed-in counterparty.</em>
                </span>
              </label>
              <label className={`opp-card ${sendTarget === "group" ? "on" : ""}`}>
                <input
                  type="radio"
                  name="sendTarget"
                  value="group"
                  checked={sendTarget === "group"}
                  onChange={() => onSendTargetChange("group")}
                />
                <span>
                  <b>Group</b>
                  <em>Post to everyone in one of your groups.</em>
                </span>
              </label>
            </div>
            {sendTarget === "group" ? (
              <label>
                Group
                <select
                  value={selectedGroup}
                  onChange={(event) => onGroupChange(event.target.value)}
                >
                  <option value="" disabled>
                    Choose a group
                  </option>
                  {groups
                    .filter((group) => group.memberIds.includes(userId))
                    .map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                </select>
              </label>
            ) : (
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
            )}
          </>
        ) : null}
        <button className="btn btn-lime" type="submit">
          Create pact
        </button>
      </form>
      {message ? (
        <p className={`status ${typeof message === "object" ? message.tone : ""}`} role="status">
          {typeof message === "object" ? message.text : message}
        </p>
      ) : null}
      {onAddFriend ? (
        <div>
          <h3>Friends</h3>
          <FriendsList
            people={users}
            incoming={incomingFriends}
            onAdd={onAddFriend}
            onAccept={onAcceptFriend}
            busy={busy}
          />
        </div>
      ) : null}
      {onFeedChange ? (
        <div className="card">
          <h3>Group feeds</h3>
          <div className="pact-actions">
            <button className="btn btn-ghost" type="button" onClick={() => onFeedChange("mine")}>
              My feed
            </button>
            {groups
              .filter((group) => group.memberIds.includes(userId))
              .map((group) => (
                <button
                  className="btn btn-ghost"
                  type="button"
                  key={group.id}
                  onClick={() => onFeedChange(group.id)}
                >
                  {group.name}
                  {activeFeed === group.id ? " · selected" : ""}
                </button>
              ))}
          </div>
          <CreateGroupForm onSubmit={onCreateGroup} busy={busy} embedded />
          <JoinCodeForm onSubmit={onJoinWithCode} busy={busy} embedded />
          <GroupList
            groups={groups}
            userId={userId}
            people={users}
            onJoin={onJoinGroup}
            onApprove={onApprove}
            onRemove={onRemove}
            onTransfer={onTransfer}
            onArchive={onArchive}
            onDelete={onDelete}
            busy={busy}
          />
        </div>
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
              {(pact.opponentId === userId || (pact.groupId && pact.sharedToGroupAt && pact.creatorId !== userId)) && pact.status === "draft" ? (
                <div className="pact-actions">
                  <button className="btn btn-lime" type="button" onClick={() => onAccept(pact.id)}>
                    Accept
                  </button>
                  <button className="btn btn-ghost" type="button" onClick={() => onDecline(pact.id)}>
                    Decline
                  </button>
                </div>
              ) : null}
              {pact.groupId && pact.creatorId === userId && !pact.sharedToGroupAt ? <button className="btn btn-ghost" type="button" onClick={() => onShare(pact.id)}>Share with group</button> : null}
              {pact.groupId ? <p className="meta">Group pact {pact.sharedToGroupAt ? "· shared" : "· private draft"}</p> : null}
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
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [friends, setFriends] = useState({ friends: [], incoming: [], outgoing: [] });
  const [title, setTitle] = useState("");
  const [stake, setStake] = useState("1");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [status, setStatus] = useState(null);

  const refresh = useCallback(
    async (next = session) => {
      if (!next) return;
      const token = next.token;
      const optional = async (path, fallback) => {
        try {
          return await api(path, { token });
        } catch (error) {
          if (isStubbedSocialError(error)) return fallback;
          throw error;
        }
      };
      const [myPacts, myLedger, directory, myGroups, social] = await Promise.all([
        api("/api/pacts", { token }),
        api("/api/ledger", { token }),
        optional("/api/users", []),
        optional("/api/groups", []),
        optional("/api/friends", { friends: [], incoming: [], outgoing: [] }),
      ]);
      setPacts(myPacts);
      setLedger(myLedger);
      setUsers(directory);
      setGroups(myGroups);
      setFriends(social);
    },
    [session],
  );

  const social = useMemo(
    () =>
      createSocialActions({
        tokenOf: async () => session?.token,
        refresh,
        userId: session?.user?.id,
        setBusy,
        setStatus,
        setGroups,
        setPeople: setUsers,
        setFriends,
      }),
    [refresh, session],
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
        setUsers([]);
        setGroups([]);
        setFriends({ friends: [], incoming: [], outgoing: [] });
      }}
      pacts={pacts}
      ledger={ledger}
      users={users}
      groups={groups}
      incomingFriends={friends.incoming}
      activeFeed="mine"
      onFeedChange={() => {}}
      onCreateGroup={social.createGroup}
      onJoinGroup={social.joinGroup}
      onJoinWithCode={social.joinWithCode}
      onApprove={social.approveMember}
      onRemove={social.removeMember}
      onTransfer={social.transferOwnership}
      onArchive={social.archiveGroup}
      onDelete={social.deleteGroup}
      onAddFriend={social.addFriend}
      onAcceptFriend={social.acceptFriend}
      busy={busy}
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
      message={status || message}
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
  const [groups, setGroups] = useState([]);
  const [activeFeed, setActiveFeed] = useState("mine");
  const [groupId, setGroupId] = useState("");
  const [me, setMe] = useState(null);
  const [opponentId, setOpponentId] = useState("");
  const [sendTarget, setSendTarget] = useState("opponent"); // "opponent" | "group"
  const [title, setTitle] = useState("");
  const [stake, setStake] = useState("1");
  const [message, setMessage] = useState("");
  const [friends, setFriends] = useState({ friends: [], incoming: [], outgoing: [] });
  const [busy, setBusy] = useState("");
  const [status, setStatus] = useState(null);

  const tokenOf = useCallback(
    () =>
      getAccessTokenSilently({
        authorizationParams: { audience: env.AUTH0_AUDIENCE },
      }),
    [getAccessTokenSilently],
  );

  const refresh = useCallback(async () => {
    const token = await tokenOf();
    const optional = async (path, fallback) => {
      try {
        return await api(path, { token });
      } catch (error) {
        if (isStubbedSocialError(error)) return fallback;
        throw error;
      }
    };
    const [identity, myPacts, myLedger, directory, myGroups, social] = await Promise.all([
      api("/api/auth/me", { token }),
      api("/api/pacts", { token }),
      api("/api/ledger", { token }),
      optional("/api/users", []),
      optional("/api/groups", []),
      optional("/api/friends", { friends: [], incoming: [], outgoing: [] }),
    ]);
    setMe(identity);
    setPacts(myPacts);
    setLedger(myLedger);
    setUsers(directory);
    setGroups(myGroups);
    setFriends(social);
    setOpponentId((current) => current || directory[0]?.id || "");
  }, [tokenOf]);

  const socialActions = useMemo(
    () =>
      createSocialActions({
        tokenOf,
        refresh,
        userId: me?.id,
        setBusy,
        setStatus,
        setGroups,
        setPeople: setUsers,
        setFriends,
      }),
    [tokenOf, refresh, me?.id],
  );

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
          Live Auth0 login for {clientCallbackUrl()}. Protected pact data stays hidden until you
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
                  redirect_uri: clientCallbackUrl(),
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
          logoutParams: { returnTo: clientLogoutUrl() },
        })
      }
      pacts={activeFeed === "mine" ? pacts.filter((pact) => !pact.groupId || pact.creatorId === me?.id || pact.opponentId === me?.id) : pacts.filter((pact) => pact.groupId === activeFeed && pact.sharedToGroupAt)}
      ledger={ledger}
      users={users}
      groups={groups}
      activeFeed={activeFeed}
      onFeedChange={setActiveFeed}
      selectedGroup={groupId}
      onGroupChange={setGroupId}
      sendTarget={sendTarget}
      onSendTargetChange={(next) => {
        setSendTarget(next);
        // Clear the other field so a stale selection can't ride along once
        // the user switches — only one of opponentId/groupId should ever
        // be live at a time.
        if (next === "group") setOpponentId("");
        else setGroupId("");
      }}
      onCreateGroup={socialActions.createGroup}
      onJoinGroup={socialActions.joinGroup}
      onJoinWithCode={socialActions.joinWithCode}
      onApprove={socialActions.approveMember}
      onRemove={socialActions.removeMember}
      onTransfer={socialActions.transferOwnership}
      onArchive={socialActions.archiveGroup}
      onDelete={socialActions.deleteGroup}
      onAddFriend={socialActions.addFriend}
      onAcceptFriend={socialActions.acceptFriend}
      incomingFriends={friends.incoming}
      busy={busy}
      onShare={async (id) => { try { const token = await tokenOf(); await api(`/api/pacts/${id}/share`, { token, method: "POST" }); setMessage("Shared with group."); await refresh(); } catch (error) { setMessage(error.message); } }}
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
              ...(sendTarget === "group" ? { groupId } : { opponentId }),
            },
          });
          setTitle("");
          setGroupId("");
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
      message={status || message}
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
