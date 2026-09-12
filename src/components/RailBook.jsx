import { useState } from "react";
import { usePact, userById } from "../store.jsx";
import { sol } from "../lib/format.js";
import { canPlaceSideStake, openSideStakeForUser, railBook } from "../lib/sideStakes.js";

export default function RailBook({ pact }) {
  const { userId, sideStakes, placeSideStake, switchUser, bankOf } = usePact();
  const [side, setSide] = useState("challenger");
  const [amount, setAmount] = useState("1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const book = railBook(sideStakes, pact.id);
  const mine = openSideStakeForUser(sideStakes, pact.id, userId);
  const canFade = canPlaceSideStake(pact, userId);
  const creator = userById(pact.creatorId);
  const opponent = userById(pact.opponentId);
  const sittingRail = userId === "rail";

  async function onLock(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await placeSideStake(pact.id, { side, amount });
    } catch (err) {
      setError(err.message || "Could not lock the rail ticket");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card rail-book">
      <div className="kicker">Rail book</div>
      <p className="hint">
        Spectators fade challenger or friend with virtual SOL. Even money against the house — lock
        a ticket, collect 2× if that desk takes the pot.
      </p>
      <div className="odds-strip rail-strip">
        <div className="odds-cell">
          <div className="odds-label">Challenger</div>
          <div className="odds-value">{sol(book.challenger)}</div>
          <div className="hint">{creator?.handle}</div>
        </div>
        <div className="odds-cell">
          <div className="odds-label">Friend</div>
          <div className="odds-value">{sol(book.friend)}</div>
          <div className="hint">{opponent?.handle}</div>
        </div>
        <div className="odds-cell">
          <div className="odds-label">On the rail</div>
          <div className="odds-value lime">{sol(book.total)}</div>
          <div className="hint">{book.count} ticket{book.count === 1 ? "" : "s"}</div>
        </div>
      </div>
      {mine ? (
        <p className="hint lime-hint">
          Your rail ticket · {mine.side} · {sol(mine.amount)} SOL locked
          {mine.settledAt ? (mine.won ? " · paid" : " · faded") : ""}
        </p>
      ) : null}
      {canFade ? (
        <form className="take-form rail-form" onSubmit={onLock}>
          <div className="rail-sides" role="group" aria-label="Fade which desk">
            <button
              type="button"
              className={`react-btn ${side === "challenger" ? "on" : ""}`}
              onClick={() => setSide("challenger")}
            >
              Challenger
            </button>
            <button
              type="button"
              className={`react-btn ${side === "friend" ? "on" : ""}`}
              onClick={() => setSide("friend")}
            >
              Friend
            </button>
          </div>
          <label className="rail-amount">
            Virtual SOL
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-label="Rail ticket stake"
            />
          </label>
          <button className="btn btn-lime" type="submit" disabled={busy}>
            {busy ? "Locking…" : `Lock rail ticket · ${sol(bankOf(userId))} bank`}
          </button>
        </form>
      ) : pact.status === "resolved" ? (
        <p className="hint">Rail book is closed on a settled slip.</p>
      ) : sittingRail ? (
        <p className="hint">This slip is off the public rail.</p>
      ) : (
        <button className="btn btn-ghost" type="button" onClick={() => switchUser("rail")}>
          Sit the rail
        </button>
      )}
      {sittingRail ? (
        <button className="btn btn-ghost" type="button" onClick={() => switchUser("you")}>
          Back to ISAAC&apos;s desk
        </button>
      ) : null}
      {error ? <p className="err">{error}</p> : null}
    </div>
  );
}
