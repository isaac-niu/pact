import { useState } from "react";
import { useLiveAccount } from "../auth/useLiveAccount.js";
import { ActionStatus, CreateGroupForm, GroupList, JoinCodeForm } from "../components/SocialForms.jsx";
import { createSocialActions } from "../lib/socialActions.js";

export default function Crew() {
  const live = useLiveAccount();
  const [busy, setBusy] = useState("");
  const [status, setStatus] = useState(null);

  if (!live.live) {
    return (
      <section className="card">
        <h2>Groups</h2>
        <p className="lede">Sign in to create a crew, share a join code, and pitch the group.</p>
        {live.loginWithRedirect ? (
          <button
            className="btn btn-lime"
            type="button"
            onClick={() => live.loginWithRedirect({ appState: { returnTo: "/crew" } })}
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
          <div className="kicker">Crews</div>
          <h2>Groups</h2>
          <p className="lede slim">
            Public groups show in the directory. Private groups take a join code, then the admin approves.
          </p>
        </div>
      </div>
      <ActionStatus status={status || (live.error ? { tone: "err", text: live.error } : null)} />
      <CreateGroupForm onSubmit={actions.createGroup} busy={busy} />
      <JoinCodeForm onSubmit={actions.joinWithCode} busy={busy} />
      <div className="card">
        <GroupList
          groups={live.groups}
          userId={live.me?.id}
          onJoin={actions.joinGroup}
          onApprove={actions.approveMember}
          busy={busy}
        />
      </div>
    </div>
  );
}
