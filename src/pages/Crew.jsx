import { useState } from "react";
import { useLiveAccount } from "../auth/useLiveAccount.js";
import { ActionStatus, CreateGroupForm, DirectoryBrowse, GroupList, JoinCodeForm } from "../components/SocialForms.jsx";
import { createSocialActions } from "../lib/socialActions.js";
import { demoDirectoryGroups, groupsInDirectory, yourCrews } from "../lib/directory.js";

export default function Crew() {
  const live = useLiveAccount();
  const [busy, setBusy] = useState("");
  const [status, setStatus] = useState(null);
  const [localGroups, setLocalGroups] = useState(() => demoDirectoryGroups());
  const [query, setQuery] = useState("");
  const groups = live.live ? live.groups : localGroups;
  const setGroups = live.live ? live.setGroups : setLocalGroups;
  const userId = live.me?.id || "demo-you";
  const listed = groupsInDirectory(groups, query);
  const mine = yourCrews(groups, userId);

  const actions = createSocialActions({
    tokenOf: live.live ? live.tokenOf : async () => {
      throw new Error("not_found");
    },
    refresh: live.live ? live.refresh : undefined,
    userId,
    setBusy,
    setStatus,
    setGroups,
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
            Check “list in the directory” to put a public crew on the board. Private crews take a
            join code, then the admin approves.
          </p>
        </div>
      </div>
      {!live.live ? (
        <p className="hint">
          Demo desk — actions stay on this page until you sign in.{" "}
          {live.loginWithRedirect ? (
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => live.loginWithRedirect({ appState: { returnTo: "/crew" } })}
            >
              Sign in
            </button>
          ) : null}
        </p>
      ) : null}
      <ActionStatus status={status || (live.error ? { tone: "err", text: live.error } : null)} />
      <CreateGroupForm onSubmit={actions.createGroup} busy={busy} />
      <JoinCodeForm onSubmit={actions.joinWithCode} busy={busy} />
      <DirectoryBrowse
        groups={listed}
        query={query}
        onQuery={setQuery}
        userId={userId}
        onJoin={actions.joinGroup}
        busy={busy}
      />
      <div className="card">
        <div className="kicker">Your crews</div>
        <GroupList
          groups={mine}
          userId={userId}
          people={live.people}
          onJoin={actions.joinGroup}
          onApprove={actions.approveMember}
          onRemove={actions.removeMember}
          onTransfer={actions.transferOwnership}
          onArchive={actions.archiveGroup}
          onDelete={actions.deleteGroup}
          busy={busy}
        />
      </div>
    </div>
  );
}
