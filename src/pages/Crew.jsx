import { useLiveAccount } from "../auth/useLiveAccount.js";
import { api } from "../api.js";

export default function Crew() {
  const live = useLiveAccount();

  if (!live.live) {
    return (
      <section className="card">
        <h2>Groups</h2>
        <p className="lede">Sign in to create a crew, share a join code, and pitch the group.</p>
      </section>
    );
  }

  async function createGroup(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const token = await live.tokenOf();
    await api("/api/groups", {
      token,
      method: "POST",
      body: {
        name: data.get("groupName"),
        visibility: data.get("visibility"),
        discoverable: data.get("discoverable") === "on",
      },
    });
    event.currentTarget.reset();
    await live.refresh();
  }

  async function joinCode(event) {
    event.preventDefault();
    const token = await live.tokenOf();
    await api("/api/groups/join", {
      token,
      method: "POST",
      body: { joinCode: new FormData(event.currentTarget).get("joinCode") },
    });
    event.currentTarget.reset();
    await live.refresh();
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="kicker">Crews</div>
          <h2>Groups</h2>
          <p className="lede slim">Public groups show in the directory. Private groups take a join code, then the admin approves.</p>
        </div>
      </div>
      <form className="card form" onSubmit={createGroup}>
        <label>
          New group
          <input name="groupName" required placeholder="Training crew" />
        </label>
        <label>
          Type
          <select name="visibility">
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </label>
        <label>
          <input type="checkbox" name="discoverable" /> List in the directory
        </label>
        <button className="btn btn-lime" type="submit">
          Create group
        </button>
      </form>
      <form className="card form" onSubmit={joinCode}>
        <label>
          Join with code
          <input name="joinCode" required placeholder="8-character code" autoCapitalize="characters" />
        </label>
        <button className="btn btn-ghost" type="submit">
          Request to join
        </button>
      </form>
      <div className="card">
        {live.groups.map((group) => (
          <article className="slip" key={group.id}>
            <b className="slip-title">{group.name}</b>
            <p className="meta">
              {group.visibility} · {group.discoverable ? "listed" : "code only"} · {group.memberIds.length} members
            </p>
            {group.joinCode ? <p className="hint">Join code {group.joinCode}</p> : null}
            {!group.memberIds.includes(live.me?.id) ? (
              <button
                className="btn btn-ghost"
                type="button"
                onClick={async () => {
                  const token = await live.tokenOf();
                  await api(`/api/groups/${group.id}/join`, { token, method: "POST" });
                  await live.refresh();
                }}
              >
                {group.requested ? "Request pending" : "Request to join"}
              </button>
            ) : null}
            {group.creatorId === live.me?.id &&
              group.pendingMemberIds?.map((memberId) => (
                <button
                  key={memberId}
                  className="btn btn-ghost"
                  type="button"
                  onClick={async () => {
                    const token = await live.tokenOf();
                    await api(`/api/groups/${group.id}/approve`, { token, method: "POST", body: { userId: memberId } });
                    await live.refresh();
                  }}
                >
                  Approve member
                </button>
              ))}
          </article>
        ))}
      </div>
    </div>
  );
}
