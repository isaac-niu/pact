import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { usePact } from "../store.jsx";
import { useLiveAccount } from "../auth/useLiveAccount.js";
import { api } from "../api.js";
import { defaultDeadline, localInputValue, sol } from "../lib/format.js";
import { LAMPORTS_PER_SOL } from "../backend/constants.js";

export default function Create() {
  const { createPact, user, opponent, bank } = usePact();
  const live = useLiveAccount();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [title, setTitle] = useState("I'll upload a gym selfie");
  const [criteria, setCriteria] = useState(
    "Face or body in frame with gym floor or equipment visible.",
  );
  const [stake, setStake] = useState("2");
  const [deadline, setDeadline] = useState(localInputValue(defaultDeadline()));
  const [visibility, setVisibility] = useState("public");
  const [sendTarget, setSendTarget] = useState("opponent");
  const [opponentId, setOpponentId] = useState(params.get("vs") || "");
  const [groupId, setGroupId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const amount = Number(stake);
  const pot = Number.isFinite(amount) ? amount * 2 : 0;
  const livePeople = live.people;
  const myGroups = useMemo(
    () => live.groups.filter((group) => group.memberIds?.includes(live.me?.id)),
    [live.groups, live.me],
  );
  const chosen =
    livePeople.find((person) => person.id === opponentId) ||
    (live.live ? null : { id: opponent.id, name: opponent.handle });
  const chosenGroup = myGroups.find((group) => group.id === groupId);
  const challengerName = live.me?.name || user.handle;
  const friendName =
    sendTarget === "group"
      ? chosenGroup?.name || "a group"
      : chosen?.name || opponent.handle;
  const postingLive = live.live && sendTarget !== "desk";

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (postingLive || sendTarget === "group") {
        if (sendTarget === "group" && !groupId) throw new Error("Pick a group to send this slip to");
        if (sendTarget === "opponent" && !opponentId) throw new Error("Pick a signed-in friend");
        const token = await live.tokenOf();
        await api("/api/pacts", {
          token,
          method: "POST",
          body: {
            title,
            criteria,
            stakeLamports: Math.round(amount * LAMPORTS_PER_SOL),
            visibility,
            ...(sendTarget === "group" ? { groupId } : { opponentId }),
          },
        });
        navigate("/app");
        return;
      }
      const pact = await createPact({
        title,
        criteria,
        stake: amount,
        deadline: new Date(deadline).getTime(),
        opponentId: opponent.id,
        visibility,
      });
      navigate(`/pact/${pact.id}`);
    } catch (err) {
      setError(err.message || "Could not post the slip");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="split">
      <div>
        <div className="page-head">
          <div>
            <div className="kicker">New slip</div>
            <h2>Write the pact</h2>
          </div>
        </div>
        <form className="card form" onSubmit={onSubmit}>
          {live.live ? (
            <p className="hint">
              Pitching as <b>{challengerName}</b> from your Auth0 account. Pick a signed-in person or
              a group — not the Maya demo desk.
            </p>
          ) : (
            <p className="hint">
              Demo desk posts ISAAC vs MAYA. <Link to="/app">Sign in</Link> to pitch a real account
              or send the slip to a group.
            </p>
          )}
          <label>
            Title
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="I'll upload a gym selfie"
              required
            />
          </label>
          <label>
            Success criteria
            <textarea
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              placeholder="What does the referee need to see?"
              required
            />
          </label>
          <div className="form-row">
            <label>
              Virtual SOL stake
              <input
                type="number"
                min="0.1"
                step="0.1"
                max={sendTarget === "opponent" && !live.live ? bank : undefined}
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                required
              />
            </label>
            <label>
              Deadline
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
                disabled={sendTarget === "group"}
              />
            </label>
          </div>

          <fieldset className="opp-field">
            <legend>Send to</legend>
            <div className="tape-choice" role="radiogroup" aria-label="Opponent or group">
              <label className={`opp-card ${sendTarget !== "group" ? "on" : ""}`}>
                <input
                  type="radio"
                  name="sendTarget"
                  value="opponent"
                  checked={sendTarget !== "group"}
                  onChange={() => {
                    setSendTarget("opponent");
                    setGroupId("");
                  }}
                />
                <span>
                  <b>{live.live ? "Opponent" : opponent.handle}</b>
                  <em>
                    {live.live
                      ? "1v1 with someone who has signed in."
                      : `${opponent.pill} · demo desk until you sign in`}
                  </em>
                </span>
              </label>
              <label className={`opp-card ${sendTarget === "group" ? "on" : ""}`}>
                <input
                  type="radio"
                  name="sendTarget"
                  value="group"
                  checked={sendTarget === "group"}
                  onChange={() => {
                    setSendTarget("group");
                    setOpponentId("");
                  }}
                />
                <span>
                  <b>A group</b>
                  <em>Post to everyone in one of your groups.</em>
                </span>
              </label>
            </div>
          </fieldset>

          {sendTarget === "group" ? (
            <fieldset className="opp-field">
              <legend>Group</legend>
              {!live.live ? (
                <div className="opp-card">
                  <span>
                    <b>Sign in required</b>
                    <em>Groups are shared across real accounts, not this local desk.</em>
                  </span>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => live.loginWithRedirect?.({ appState: { returnTo: "/create" } })}
                  >
                    Sign in
                  </button>
                </div>
              ) : myGroups.length === 0 ? (
                <p className="hint">
                  {live.error || (
                    <>
                      You&apos;re not in a group yet. Make one in <Link to="/crew">Crew</Link>, then
                      come back.
                    </>
                  )}
                </p>
              ) : (
                <label>
                  Group
                  <select value={groupId} onChange={(e) => setGroupId(e.target.value)} required>
                    <option value="" disabled>
                      Choose a group
                    </option>
                    {myGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} · {group.memberIds.length} member
                        {group.memberIds.length === 1 ? "" : "s"}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </fieldset>
          ) : live.live ? (
            <label>
              Opponent
              <select value={opponentId} onChange={(e) => setOpponentId(e.target.value)} required>
                <option value="">Select a signed-in account</option>
                {livePeople.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                    {person.friend ? " · friend" : ""}
                    {person.email ? ` · ${person.email}` : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <fieldset className="opp-field">
              <legend>Tape</legend>
              <div className="tape-choice" role="radiogroup" aria-label="Public or private tape">
                <label className={`opp-card ${visibility === "public" ? "on" : ""}`}>
                  <input
                    type="radio"
                    name="visibility"
                    value="public"
                    checked={visibility === "public"}
                    onChange={() => setVisibility("public")}
                  />
                  <span>
                    <b>Public tape</b>
                    <em>Anyone on the board can see this slip and its marks.</em>
                  </span>
                </label>
                <label className={`opp-card ${visibility === "private" ? "on" : ""}`}>
                  <input
                    type="radio"
                    name="visibility"
                    value="private"
                    checked={visibility === "private"}
                    onChange={() => setVisibility("private")}
                  />
                  <span>
                    <b>Private tape</b>
                    <em>Only you and {opponent.handle} see this slip.</em>
                  </span>
                </label>
              </div>
            </fieldset>
          )}

          {live.live && sendTarget !== "group" ? (
            <fieldset className="opp-field">
              <legend>Tape</legend>
              <div className="tape-choice" role="radiogroup" aria-label="Public or private tape">
                <label className={`opp-card ${visibility === "public" ? "on" : ""}`}>
                  <input
                    type="radio"
                    name="visibility"
                    value="public"
                    checked={visibility === "public"}
                    onChange={() => setVisibility("public")}
                  />
                  <span>
                    <b>Public tape</b>
                    <em>Anyone on the board can see this slip and its marks.</em>
                  </span>
                </label>
                <label className={`opp-card ${visibility === "private" ? "on" : ""}`}>
                  <input
                    type="radio"
                    name="visibility"
                    value="private"
                    checked={visibility === "private"}
                    onChange={() => setVisibility("private")}
                  />
                  <span>
                    <b>Private tape</b>
                    <em>Only you and {friendName} see this slip.</em>
                  </span>
                </label>
              </div>
            </fieldset>
          ) : null}

          {error ? <p className="err">{error}</p> : null}
          <p className="hint">
            {sendTarget === "group"
              ? "Posting as the group's stake — everyone in the group sees this slip once it's up."
              : `${challengerName} posts a slip. ${friendName} matches ${sol(amount || 0)} SOL.${
                  live.live ? "" : ` Demo bank ${sol(bank)} SOL.`
                }`}
          </p>
          <button className="btn btn-lime" type="submit" disabled={busy}>
            Post to the board
          </button>
        </form>
      </div>

      <article className="ticket ticket-preview" aria-live="polite">
        <div className="ticket-edge" aria-hidden="true" />
        <header className="ticket-head">
          <span>Preview</span>
          <span className="stamp">
            {sendTarget === "group" ? "GROUP" : visibility === "private" ? "PRIVATE" : "PUBLIC"}
          </span>
        </header>
        <h3>{title.trim() || "Untitled pact"}</h3>
        <p className="ticket-criteria">{criteria.trim() || "No criteria yet"}</p>
        <div className="vs compact">
          <div className="side">
            <div className="odds-label">Challenger</div>
            <div className="side-name">{challengerName}</div>
          </div>
          <div className="vs-mark">VS</div>
          <div className="side">
            <div className="odds-label">{sendTarget === "group" ? "Group" : "Friend"}</div>
            <div className="side-name">{friendName}</div>
          </div>
        </div>
        <div className="odds-strip">
          <div className="odds-cell">
            <div className="odds-label">Stake</div>
            <div className="odds-value">{sol(amount || 0)}</div>
          </div>
          <div className="odds-cell">
            <div className="odds-label">Pot</div>
            <div className="odds-value lime">{sendTarget === "group" ? "—" : sol(pot)}</div>
          </div>
        </div>
      </article>
    </div>
  );
}
