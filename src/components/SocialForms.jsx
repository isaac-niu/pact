export function ActionStatus({ status }) {
  if (!status?.text) return null;
  return (
    <p className={`status ${status.tone || ""}`} role="status">
      {status.text}
    </p>
  );
}

export function CreateGroupForm({ onSubmit, busy, embedded = false }) {
  return (
    <form className={embedded ? "form" : "card form"} onSubmit={onSubmit}>
      <label>
        New group
        <input name="groupName" required placeholder="Training crew" disabled={Boolean(busy)} />
      </label>
      <label>
        Type
        <select name="visibility" disabled={Boolean(busy)}>
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>
      </label>
      <label className="check">
        <input type="checkbox" name="discoverable" disabled={Boolean(busy)} />
        List in the directory
      </label>
      <button className="btn btn-lime" type="submit" disabled={busy === "create-group"}>
        {busy === "create-group" ? "Creating…" : "Create group"}
      </button>
    </form>
  );
}

export function JoinCodeForm({ onSubmit, busy, embedded = false }) {
  return (
    <form className={embedded ? "form" : "card form"} onSubmit={onSubmit}>
      <label>
        Join with code
        <input
          name="joinCode"
          required
          placeholder="8-character code"
          autoCapitalize="characters"
          disabled={Boolean(busy)}
        />
      </label>
      <button className="btn btn-ghost" type="submit" disabled={busy === "join-code"}>
        {busy === "join-code" ? "Requesting…" : "Request to join"}
      </button>
    </form>
  );
}

export function GroupList({ groups, userId, onJoin, onApprove, busy }) {
  if (!groups.length) return <p className="hint">No groups yet. Create one or request to join.</p>;
  return groups.map((group) => {
    const member = group.memberIds?.includes(userId);
    const joining = busy === `join:${group.id}`;
    return (
      <article className="slip" key={group.id}>
        <div>
          <b className="slip-title">{group.name}</b>
          <p className="meta">
            {group.visibility} · {group.discoverable ? "listed" : "code only"} · {group.memberIds.length}{" "}
            member{group.memberIds.length === 1 ? "" : "s"}
          </p>
          {group.joinCode ? (
            <p className="meta">
              Join code: <b>{group.joinCode}</b>
            </p>
          ) : null}
          {!member ? (
            <button
              className="btn btn-ghost"
              type="button"
              disabled={joining || group.requested}
              onClick={() => onJoin(group.id)}
            >
              {joining ? "Requesting…" : group.requested ? "Requested" : "Request to join"}
            </button>
          ) : null}
          {group.creatorId === userId &&
            group.pendingMemberIds?.map((memberId) => (
              <button
                className="btn btn-ghost"
                type="button"
                key={memberId}
                disabled={busy === `approve:${group.id}:${memberId}`}
                onClick={() => onApprove(group.id, memberId)}
              >
                {busy === `approve:${group.id}:${memberId}` ? "Approving…" : "Approve member"}
              </button>
            ))}
        </div>
      </article>
    );
  });
}

export function FriendsList({ people, incoming = [], onAdd, onAccept, busy }) {
  return (
    <>
      {incoming.length ? (
        <div className="card">
          <div className="kicker">Incoming</div>
          {incoming.map((person) => (
            <div className="people-row" key={person.id}>
              <div>
                <b>{person.name}</b>
                <div className="hint">{person.email || person.id}</div>
              </div>
              <button
                className="btn btn-lime"
                type="button"
                disabled={busy === `accept:${person.id}`}
                onClick={() => onAccept(person.id)}
              >
                {busy === `accept:${person.id}` ? "Accepting…" : "Accept"}
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="card">
        <div className="kicker">Signed-in accounts</div>
        {people.length === 0 ? (
          <p className="hint">No other accounts yet. Have a friend open this desk and sign in once.</p>
        ) : (
          people.map((person) => {
            const adding = busy === `friend:${person.id}`;
            return (
              <div className="people-row" key={person.id}>
                <div>
                  <b>{person.name}</b>
                  <div className="hint">{person.email || person.id}</div>
                </div>
                {person.friend ? (
                  <button className="btn btn-ghost" type="button" disabled>
                    Friend added
                  </button>
                ) : (
                  <button
                    className="btn btn-ghost"
                    type="button"
                    disabled={adding || person.requested}
                    onClick={() => onAdd(person.id)}
                  >
                    {adding ? "Adding…" : person.requested ? "Requested" : "Add friend"}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
