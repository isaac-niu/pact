import { useState } from "react";
import { Link } from "react-router-dom";
import { useLiveAccount } from "../auth/useLiveAccount.js";
import { ActionStatus, FriendsList } from "../components/SocialForms.jsx";
import { createSocialActions } from "../lib/socialActions.js";

export default function People() {
  const live = useLiveAccount();
  const [busy, setBusy] = useState("");
  const [status, setStatus] = useState(null);

  if (!live.live) {
    return (
      <section className="card">
        <h2>Friends</h2>
        <p className="lede">Sign in with Auth0 to add real accounts — not just the ISAAC / MAYA demo desks.</p>
        {live.loginWithRedirect ? (
          <button
            className="btn btn-lime"
            type="button"
            onClick={() => live.loginWithRedirect({ appState: { returnTo: "/people" } })}
          >
            Sign in
          </button>
        ) : null}
      </section>
    );
  }

  const actions = createSocialActions({
    tokenOf: live.tokenOf,
    refresh: live.refresh,
    userId: live.me?.id,
    setBusy,
    setStatus,
    setGroups: live.setGroups,
    setPeople: live.setPeople,
    setFriends: live.setFriends,
  });

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="kicker">{live.me?.name}</div>
          <h2>People</h2>
          <p className="lede slim">Anyone who has signed in once lands here. Friend them, then pitch them.</p>
        </div>
        <Link className="btn btn-lime" to="/create">
          Write a slip
        </Link>
      </div>
      <ActionStatus status={status || (live.error ? { tone: "err", text: live.error } : null)} />
      <FriendsList
        people={live.people}
        incoming={live.friends.incoming}
        onAdd={actions.addFriend}
        onAccept={actions.acceptFriend}
        busy={busy}
      />
    </div>
  );
}
