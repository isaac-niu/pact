import { useState } from "react";
import { Link } from "react-router-dom";
import { useLiveAccount } from "../auth/useLiveAccount.js";
import { ActionStatus, FriendsList } from "../components/SocialForms.jsx";
import { createSocialActions } from "../lib/socialActions.js";

const DEMO_PEOPLE = [{ id: "auth0|demo-maya", name: "MAYA", email: null }];

export default function People() {
  const live = useLiveAccount();
  const [busy, setBusy] = useState("");
  const [status, setStatus] = useState(null);
  const [localPeople, setLocalPeople] = useState(DEMO_PEOPLE);
  const people = live.live ? live.people : localPeople;
  const setPeople = live.live ? live.setPeople : setLocalPeople;

  const actions = createSocialActions({
    tokenOf: live.live ? live.tokenOf : async () => {
      throw new Error("not_found");
    },
    refresh: live.live ? live.refresh : undefined,
    userId: live.me?.id || "demo-you",
    setBusy,
    setStatus,
    setGroups: live.setGroups,
    setPeople,
    setFriends: live.setFriends,
  });

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="kicker">{live.me?.name || "Friends"}</div>
          <h2>People</h2>
          <p className="lede slim">Anyone who has signed in once lands here. Friend them, then pitch them.</p>
        </div>
        <Link className="btn btn-lime" to="/create">
          Write a slip
        </Link>
      </div>
      {!live.live ? (
        <p className="hint">Demo desk — adding a friend stays on this page until you sign in.</p>
      ) : null}
      <ActionStatus status={status || (live.error ? { tone: "err", text: live.error } : null)} />
      <FriendsList
        people={people}
        incoming={live.friends.incoming}
        friends={live.friends.friends}
        onAdd={actions.addFriend}
        onAccept={actions.acceptFriend}
        busy={busy}
      />
    </div>
  );
}
