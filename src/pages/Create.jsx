import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePact } from "../store.jsx";
import { api } from "../api.js";
import { useLiveAccount } from "../auth/useLiveAccount.js";
import { clientEnvReady } from "../env.js";
import { defaultDeadline, localInputValue, sol } from "../lib/format.js";
import { DESK_OPPONENT, liveActor } from "../lib/livePacts.js";
import { cadenceLabel, defaultSeriesUntil } from "../lib/recurring.js";
import { criteriaFromChecklist, defaultGymChecklist } from "../lib/successCriteria.js";
import ChecklistEditor from "../components/ChecklistEditor.jsx";
import { ChecklistList } from "../components/ChecklistMarks.jsx";
import { WalletRail } from "../components/WalletRail.jsx";
import { createEscrowIntent, lockStake } from "../lib/solanaEscrow.js";
import { useWallet } from "../wallet/WalletProvider.jsx";

const LAMPORTS_PER_SOL = 1_000_000_000;

export default function Create() {
  const { createPact, attachEscrow, user, opponent, bank } = usePact();
  const { connected, publicKey, cluster, sendEscrow } = useWallet();
  // Auth0Provider only mounts here once Auth0 env vars are configured (see
  // AuthGate). Without it the optional hook stays signed out, so the unsigned
  // You↔Friend desk still posts a localStorage slip.
  const authConfigured = clientEnvReady().ready;
  const live = useLiveAccount();
  const navigate = useNavigate();
  const [title, setTitle] = useState("I'll upload a gym selfie");
  const [checklist, setChecklist] = useState(defaultGymChecklist);
  const [stake, setStake] = useState("2");
  const [deadline, setDeadline] = useState(localInputValue(defaultDeadline()));
  const [cadence, setCadence] = useState("none");
  const [seriesUntil, setSeriesUntil] = useState(localInputValue(defaultSeriesUntil()));
  const [visibility, setVisibility] = useState("public");
  const [destination, setDestination] = useState("desk"); // "desk" | "group"
  const [groupId, setGroupId] = useState("");
  const [liveOpponentId, setLiveOpponentId] = useState(DESK_OPPONENT);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [lockOnChain, setLockOnChain] = useState(false);

  const amount = Number(stake);
  const pot = Number.isFinite(amount) ? amount * 2 : 0;
  const liveTargets = live.friends.friends?.length ? live.friends.friends : live.people;
  const postingLive = Boolean(live.live && destination === "desk" && liveOpponentId !== DESK_OPPONENT);
  const friendName = postingLive ? liveActor(liveOpponentId, liveTargets).handle : opponent.handle;

  useEffect(() => {
    if (!live.live) {
      setLiveOpponentId(DESK_OPPONENT);
      return;
    }
    const targets = live.friends.friends?.length ? live.friends.friends : live.people;
    setLiveOpponentId((current) => {
      if (current !== DESK_OPPONENT && targets.some((person) => person.id === current)) {
        return current;
      }
      return targets[0]?.id || DESK_OPPONENT;
    });
  }, [live.live, live.friends.friends, live.people]);

  const myGroups = live.groups.filter((g) => !live.me?.id || g.memberIds?.includes(live.me.id));

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (destination === "group") {
        if (!groupId) throw new Error("Pick a group to send this slip to");
        const token = await live.tokenOf();
        await api("/api/pacts", {
          token,
          method: "POST",
          body: {
            title,
            stakeLamports: Math.round(amount * LAMPORTS_PER_SOL),
            groupId,
          },
        });
        navigate("/app");
        return;
      }
      if (postingLive) {
        if (!liveOpponentId || liveOpponentId === DESK_OPPONENT) {
          throw new Error("Pick a signed-in friend");
        }
        const token = await live.tokenOf();
        const pact = await api("/api/pacts", {
          token,
          method: "POST",
          body: {
            title,
            criteria: criteriaFromChecklist(checklist),
            checklist,
            stakeLamports: Math.round(amount * LAMPORTS_PER_SOL),
            opponentId: liveOpponentId,
            deadline: new Date(deadline).getTime(),
            visibility,
          },
        });
        navigate(`/pact/${pact.id}`);
        return;
      }
      const pact = await createPact({
        title,
        checklist,
        criteria: criteriaFromChecklist(checklist),
        stake: amount,
        deadline: new Date(deadline).getTime(),
        opponentId: opponent.id,
        visibility,
        cadence,
        seriesUntil: cadence === "none" ? null : new Date(seriesUntil).getTime(),
      });
      if (lockOnChain && connected) {
        const intent = createEscrowIntent({
          pactId: pact.id,
          stakeSol: amount,
          creatorPubkey: publicKey,
          cluster,
        });
        const out = await lockStake({ intent, wallet: { publicKey }, send: sendEscrow });
        await attachEscrow(pact.id, out.escrow);
      }
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
        <WalletRail />
        <form className="card form" onSubmit={onSubmit}>
          <label>
            Title
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="I'll upload a gym selfie"
              required
            />
          </label>
          <ChecklistEditor items={checklist} onChange={setChecklist} />
          <div className="form-row">
            <label>
              Virtual SOL stake
              <input
                type="number"
                min="0.1"
                step="0.1"
                max={destination === "desk" ? bank : undefined}
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                required
              />
              <span className="hint">
                Max {sol(bank)} SOL
                {connected && lockOnChain
                  ? " · virtual book still holds the ticket; chain lock is extra"
                  : " · virtual SOL on this desk"}
              </span>
            </label>
            <label>
              Deadline
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
                disabled={destination === "group"}
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              Cadence
              <select
                value={cadence}
                onChange={(e) => setCadence(e.target.value)}
                disabled={destination === "group" || postingLive}
              >
                <option value="none">One-off</option>
                <option value="daily">Daily</option>
                <option value="3x-week">3× / week</option>
                <option value="weekly">Weekly</option>
              </select>
              <span className="hint">Next slip posts on schedule after this one settles.</span>
            </label>
            <label>
              Series until
              <input
                type="datetime-local"
                value={seriesUntil}
                onChange={(e) => setSeriesUntil(e.target.value)}
                disabled={destination === "group" || postingLive || cadence === "none"}
              />
            </label>
          </div>

          <fieldset className="opp-field">
            <legend>Send to</legend>
            <div className="tape-choice" role="radiogroup" aria-label="Opponent or group">
              <label className={`opp-card ${destination === "desk" ? "on" : ""}`}>
                <input
                  type="radio"
                  name="destination"
                  value="desk"
                  checked={destination === "desk"}
                  onChange={() => setDestination("desk")}
                />
                <span>
                  <b>{friendName}</b>
                  <em>
                    {postingLive
                      ? "Signed-in friend · live 1v1"
                      : `${opponent.pill} · 1v1 on this desk`}
                  </em>
                </span>
              </label>
              <label className={`opp-card ${destination === "group" ? "on" : ""}`}>
                <input
                  type="radio"
                  name="destination"
                  value="group"
                  checked={destination === "group"}
                  onChange={() => setDestination("group")}
                />
                <span>
                  <b>A group</b>
                  <em>Post to everyone in one of your groups.</em>
                </span>
              </label>
            </div>
          </fieldset>

          {destination === "group" ? (
            <fieldset className="opp-field">
              <legend>Group</legend>
              {!authConfigured ? (
                <p className="hint">
                  Groups need Auth0 configured on this desk (see <code>env-template.txt</code>) —
                  not available on this run.
                </p>
              ) : !live.live ? (
                <div className="opp-card">
                  <span>
                    <b>Sign in required</b>
                    <em>Groups are shared across real accounts, not this local desk.</em>
                  </span>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    disabled={live.isLoading}
                    onClick={() => live.loginWithRedirect({ appState: { returnTo: "/create" } })}
                  >
                    Sign in
                  </button>
                </div>
              ) : myGroups.length === 0 ? (
                <p className="hint">
                  {live.error ||
                    "You're not in a group yet. Create or join one in the Pact app, then come back here."}
                </p>
              ) : (
                <label>
                  Group
                  <select value={groupId} onChange={(e) => setGroupId(e.target.value)} required>
                    <option value="" disabled>
                      Choose a group
                    </option>
                    {myGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} · {g.memberIds.length} member{g.memberIds.length === 1 ? "" : "s"}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </fieldset>
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
                    <em>Only you and {friendName} see this slip.</em>
                  </span>
                </label>
              </div>
            </fieldset>
          )}

          {destination === "desk" ? (
            <>
            <fieldset className="opp-field">
              <legend>Friend</legend>
              {!authConfigured ? (
                <p className="hint">
                  This desk posts to {opponent.handle}. Configure Auth0 to challenge a signed-in
                  friend.
                </p>
              ) : !live.live ? (
                <div className="opp-card">
                  <span>
                    <b>This desk · {opponent.handle}</b>
                    <em>Sign in to pick a real friend instead of the You/Friend switcher.</em>
                  </span>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    disabled={live.isLoading}
                    onClick={() => live.loginWithRedirect({ appState: { returnTo: "/create" } })}
                  >
                    Sign in
                  </button>
                </div>
              ) : (
                <label>
                  Challenge
                  <select
                    value={liveOpponentId}
                    onChange={(e) => setLiveOpponentId(e.target.value)}
                    aria-label="Signed-in friend"
                  >
                    {liveTargets.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name || person.email || "Friend"}
                        {person.email && person.name ? ` · ${person.email}` : ""}
                      </option>
                    ))}
                    <option value={DESK_OPPONENT}>This desk · {opponent.handle}</option>
                  </select>
                  <span className="hint">
                    {liveTargets.length
                      ? live.friends.friends?.length
                        ? "Live 1v1 — they accept on their Pact app or this ticket."
                        : "No friends yet — these are people who have signed in. Add one on People, or keep this desk."
                      : live.error ||
                        "No signed-in friends yet. Add one on People, or keep this desk's Friend."}
                  </span>
                </label>
              )}
            </fieldset>
            {connected ? (
              <label className={`opp-card ${lockOnChain ? "on" : ""}`}>
                <input
                  type="checkbox"
                  checked={lockOnChain}
                  onChange={(e) => setLockOnChain(e.target.checked)}
                  aria-label="Lock this stake on the chain rail"
                />
                <span>
                  <b>Chain rail</b>
                  <em>
                    Lock a memo on {cluster}. Virtual book still holds the ticket if the send misses.
                  </em>
                </span>
              </label>
            ) : (
              <p className="hint">Sit the wallet rail to lock this stake on-chain. Virtual book is the default.</p>
            )}
            </>
          ) : null}

          {error ? <p className="err">{error}</p> : null}
          <p className="hint">
            {destination === "group"
              ? `Posting as the group's stake — everyone in the group sees this slip once it's up.`
              : postingLive
                ? `${live.me?.name || user.handle} posts a live 1v1. ${friendName} accepts on their Pact app or this ticket, then you upload proof on Tape.`
                : `${user.handle} posts a slip. ${opponent.handle} must accept and match ${sol(
                    amount || 0,
                  )} SOL. Bank ${sol(bank)} SOL. Stakes are virtual SOL on this desk.`}
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
            {destination === "group"
              ? "GROUP"
              : cadence !== "none"
                ? cadenceLabel(cadence).toUpperCase()
                : visibility === "private"
                  ? "PRIVATE"
                  : "PUBLIC"}
          </span>
        </header>
        <h3>{title.trim() || "Untitled pact"}</h3>
        {checklist.some((item) => item.label.trim()) ? (
          <ChecklistList items={checklist.filter((item) => item.label.trim())} />
        ) : (
          <p className="ticket-criteria">No criteria yet</p>
        )}
        <div className="vs compact">
          <div className="side">
            <div className="odds-label">Challenger</div>
            <div className="side-name">{postingLive ? live.me?.name || user.handle : user.handle}</div>
          </div>
          <div className="vs-mark">VS</div>
          <div className="side">
            <div className="odds-label">{destination === "group" ? "Group" : "Friend"}</div>
            <div className="side-name">
              {destination === "group"
                ? myGroups.find((g) => g.id === groupId)?.name || "—"
                : friendName}
            </div>
          </div>
        </div>
        <div className="odds-strip">
          <div className="odds-cell">
            <div className="odds-label">Stake</div>
            <div className="odds-value">{sol(amount || 0)}</div>
          </div>
          <div className="odds-cell">
            <div className="odds-label">Pot</div>
            <div className="odds-value lime">{destination === "group" ? "—" : sol(pot)}</div>
          </div>
        </div>
      </article>
    </div>
  );
}
