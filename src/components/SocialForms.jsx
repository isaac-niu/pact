import { useState } from "react";
import EmptyState from "./EmptyState.jsx";

export function ActionStatus({ status }) {
  if (!status?.text) return null;
  return (
    <p className={`status ${status.tone || ""}`} role="status">
      {status.text}
    </p>
  );
}

export function CreateGroupForm({ onSubmit, busy, embedded = false }) {
  const [listed, setListed] = useState(false);
  return (
    <form
      id="create-crew"
      className={embedded ? "form" : "card form"}
      onSubmit={(event) => {
        onSubmit(event);
        setListed(false);
      }}
    >
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
        <input
          type="checkbox"
          name="discoverable"
          value="on"
          checked={listed}
          onChange={(event) => setListed(event.target.checked)}
          disabled={Boolean(busy)}
        />
        List in the directory
      </label>
      {listed ? <p className="hint lime-hint">This crew will show on the directory board.</p> : null}
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

export function DirectoryBrowse({ groups, query, onQuery, userId, onJoin, busy }) {
  return (
    <div className="card">
      <div className="kicker">Directory</div>
      <h3 className="subhead">Listed crews</h3>
      <p className="hint">Public crews that checked “list in the directory” show on this board.</p>
      <label>
        Search the board
        <input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Dawn gym"
          aria-label="Search listed crews"
        />
      </label>
      {groups.length === 0 ? (
        <EmptyState
          art="crew"
          kicker="Directory"
          title="No listed crews on this filter"
          lede="Check “list in the directory” when you create one, or clear the search."
          action={
            <a className="btn btn-lime" href="#create-crew">
              Name a crew
            </a>
          }
        />
      ) : (
        groups.map((group) => {
          const member = group.memberIds?.includes(userId) || group.creatorId === userId;
          const joining = busy === `join:${group.id}`;
          return (
            <article className="slip" key={group.id}>
              <div>
                <b className="slip-title">{group.name}</b>
                <p className="meta">
                  {group.visibility} · listed · {group.memberIds?.length || 0} member
                  {(group.memberIds?.length || 0) === 1 ? "" : "s"}
                </p>
                {member ? (
                  <p className="hint lime-hint">On your desk</p>
                ) : (
                  <button
                    className="btn btn-ghost"
                    type="button"
                    disabled={joining || group.requested}
                    onClick={() => onJoin(group.id)}
                  >
                    {joining ? "Requesting…" : group.requested ? "Requested" : "Request to join"}
                  </button>
                )}
              </div>
            </article>
          );
        })
      )}
    </div>
  );
}

export function GroupAdminTools({ group, userId, people = [], onRemove, onTransfer, onArchive, onDelete, busy }) {
  const [confirm, setConfirm] = useState("");
  const [nextAdmin, setNextAdmin] = useState("");
  if (group.creatorId !== userId) return null;
  const others = (group.memberIds || []).filter((id) => id !== userId);
  const deskName = (id) => people.find((person) => person.id === id)?.name || id;

  return (
    <div className="group-admin">
      <div className="kicker">Admin desk</div>
      {group.archivedAt ? <p className="hint">Scratched from the directory.</p> : null}
      {others.map((memberId) => (
        <div className="people-row" key={memberId}>
          <div>
            <b>{deskName(memberId)}</b>
            <div className="hint">Member</div>
          </div>
          <button
            className="btn btn-ghost"
            type="button"
            disabled={busy === `remove:${group.id}:${memberId}`}
            onClick={() => {
              const key = `remove:${group.id}:${memberId}`;
              if (confirm !== key) {
                setConfirm(key);
                return;
              }
              setConfirm("");
              onRemove(group.id, memberId);
            }}
          >
            {confirm === `remove:${group.id}:${memberId}` ? "Confirm cut" : "Cut from crew"}
          </button>
        </div>
      ))}
      {others.length ? (
        <label>
          Hand the book
          <select value={nextAdmin} onChange={(event) => setNextAdmin(event.target.value)} aria-label={`Hand the book for ${group.name}`}>
            <option value="">Pick a member</option>
            {others.map((memberId) => (
              <option key={memberId} value={memberId}>
                {deskName(memberId)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {nextAdmin ? (
        <button
          className="btn btn-ghost"
          type="button"
          disabled={busy === `transfer:${group.id}:${nextAdmin}`}
          onClick={() => {
            const key = `transfer:${group.id}:${nextAdmin}`;
            if (confirm !== key) {
              setConfirm(key);
              return;
            }
            setConfirm("");
            onTransfer(group.id, nextAdmin);
          }}
        >
          {confirm === `transfer:${group.id}:${nextAdmin}` ? "Confirm hand-off" : "Hand the book"}
        </button>
      ) : null}
      <div className="pact-actions">
        {!group.archivedAt ? (
          <button
            className="btn btn-ghost"
            type="button"
            disabled={busy === `archive:${group.id}`}
            onClick={() => {
              const key = `archive:${group.id}`;
              if (confirm !== key) {
                setConfirm(key);
                return;
              }
              setConfirm("");
              onArchive(group.id);
            }}
          >
            {confirm === `archive:${group.id}` ? "Confirm scratch" : "Scratch from directory"}
          </button>
        ) : null}
        <button
          className="btn btn-ghost"
          type="button"
          disabled={busy === `delete:${group.id}`}
          onClick={() => {
            const key = `delete:${group.id}`;
            if (confirm !== key) {
              setConfirm(key);
              return;
            }
            setConfirm("");
            onDelete(group.id);
          }}
        >
          {confirm === `delete:${group.id}` ? "Confirm delete" : "Delete crew"}
        </button>
      </div>
    </div>
  );
}

export function GroupList({
  groups,
  userId,
  people = [],
  onJoin,
  onApprove,
  onRemove,
  onTransfer,
  onArchive,
  onDelete,
  busy,
}) {
  if (!groups.length) {
    return (
      <EmptyState
        art="crew"
        kicker="Your desk"
        title="No crew on your desk"
        lede="Name a crew above, or request a listed one. Then write slips to the group."
        action={
          <a className="btn btn-lime" href="#create-crew">
            Name a crew
          </a>
        }
      />
    );
  }
  return groups.map((group) => {
    const member = group.memberIds?.includes(userId);
    const joining = busy === `join:${group.id}`;
    return (
      <article className="slip" key={group.id}>
        <div>
          <b className="slip-title">{group.name}</b>
          <p className="meta">
            {group.visibility} · {group.discoverable ? "listed" : "code only"}
            {group.archivedAt ? " · scratched" : ""} · {group.memberIds.length}{" "}
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
          {onRemove || onTransfer || onArchive || onDelete ? (
            <GroupAdminTools
              group={group}
              userId={userId}
              people={people}
              onRemove={onRemove}
              onTransfer={onTransfer}
              onArchive={onArchive}
              onDelete={onDelete}
              busy={busy}
            />
          ) : null}
        </div>
      </article>
    );
  });
}

export function FriendsList({ people, incoming = [], friends = [], onAdd, onAccept, busy }) {
  const friended = people.filter((person) => person.friend).concat(friends);
  const seen = new Set();
  const uniqueFriends = friended.filter((person) => {
    if (seen.has(person.id)) return false;
    seen.add(person.id);
    return true;
  });

  return (
    <>
      <div className="card">
        <div className="kicker">Incoming</div>
        {incoming.length ? (
          incoming.map((person) => (
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
          ))
        ) : (
          <EmptyState
            art="people"
            kicker="Incoming"
            title="No incoming friend slips"
            lede="A friend signs in, adds you, then you can pitch them a pact."
            action={
              <a className="btn btn-lime" href="/create">
                Write a slip
              </a>
            }
          />
        )}
      </div>
      <div className="card">
        <div className="kicker">Your friends</div>
        {uniqueFriends.length ? (
          uniqueFriends.map((person) => (
            <div className="people-row" key={person.id}>
              <div>
                <b>{person.name}</b>
                <div className="hint">{person.email || person.id}</div>
              </div>
              <span className="hint lime-hint">On your desk</span>
            </div>
          ))
        ) : (
          <EmptyState
            art="people"
            kicker="Book"
            title="No friends on your desk"
            lede="Add a desk from the list below, then write them a slip."
            action={
              <a className="btn btn-lime" href="/create">
                Write a slip
              </a>
            }
          />
        )}
      </div>
      <div className="card">
        <div className="kicker">Signed-in accounts</div>
        {people.length === 0 ? (
          <EmptyState
            art="people"
            kicker="Directory"
            title="No other desks on this book"
            lede="Have a friend open this desk and sign in once. Then friend them and pitch a slip."
            action={
              <a className="btn btn-ghost" href="/create">
                Write a slip anyway
              </a>
            }
          />
        ) : (
          people.map((person) => {
            const adding = busy === `friend:${person.id}`;
            return (
              <div className="people-row" key={person.id}>
                <div>
                  <b>{person.name}</b>
                  <div className="hint">{person.email || person.id}</div>
                </div>
                {person.friend || person.requested ? (
                  <button className="btn btn-ghost" type="button" disabled>
                    Friend added
                  </button>
                ) : (
                  <button
                    className="btn btn-ghost"
                    type="button"
                    disabled={adding}
                    onClick={() => onAdd(person.id)}
                  >
                    {adding ? "Adding…" : "Add friend"}
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
