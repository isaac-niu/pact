import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePact } from "../store.jsx";
import { defaultDeadline, localInputValue, sol } from "../lib/format.js";

export default function Create() {
  const { createPact, user, opponent, bank } = usePact();
  const navigate = useNavigate();
  const [title, setTitle] = useState("I'll upload a gym selfie");
  const [criteria, setCriteria] = useState(
    "Face or body in frame with gym floor or equipment visible.",
  );
  const [stake, setStake] = useState("2");
  const [deadline, setDeadline] = useState(localInputValue(defaultDeadline()));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const amount = Number(stake);
  const pot = Number.isFinite(amount) ? amount * 2 : 0;
  const opponentId = opponent.id;

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const pact = await createPact({
        title,
        criteria,
        stake: amount,
        deadline: new Date(deadline).getTime(),
        opponentId,
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
                max={bank}
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                required
              />
              <span className="hint">Max {sol(bank)} SOL</span>
            </label>
            <label>
              Deadline
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
              />
            </label>
          </div>
          <fieldset className="opp-field">
            <legend>Opponent</legend>
            <div className="opp-card on">
              <span>
                <b>{opponent.handle}</b>
                <em>
                  {opponent.pill} · the other demo user
                </em>
              </span>
            </div>
          </fieldset>
          {error ? <p className="err">{error}</p> : null}
          <p className="hint">
            {user.handle} posts. {opponent.handle} must accept and match{" "}
            {sol(amount || 0)} SOL. Bank {sol(bank)} SOL. Numbers only — no wallet.
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
          <span className="stamp">UNPOSTED</span>
        </header>
        <h3>{title.trim() || "Untitled pact"}</h3>
        <p className="ticket-criteria">{criteria.trim() || "No criteria yet"}</p>
        <div className="vs compact">
          <div className="side">
            <div className="odds-label">Challenger</div>
            <div className="side-name">{user.handle}</div>
          </div>
          <div className="vs-mark">VS</div>
          <div className="side">
            <div className="odds-label">Friend</div>
            <div className="side-name">{opponent.handle}</div>
          </div>
        </div>
        <div className="odds-strip">
          <div className="odds-cell">
            <div className="odds-label">Stake</div>
            <div className="odds-value">{sol(amount || 0)}</div>
          </div>
          <div className="odds-cell">
            <div className="odds-label">Pot</div>
            <div className="odds-value lime">{sol(pot)}</div>
          </div>
        </div>
      </article>
    </div>
  );
}
