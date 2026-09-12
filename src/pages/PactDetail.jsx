import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { usePact, userById } from "../store.jsx";
import Announcer from "../components/Announcer.jsx";
import { deadlineTone, formatWhen, sol } from "../lib/format.js";

const STAMPS = {
  open: { label: "OPEN", className: "stamp-open" },
  accepted: { label: "LIVE", className: "stamp-live" },
  evidence: { label: "PROOF", className: "stamp-live" },
  judging: { label: "DESK", className: "stamp-hot" },
  review: { label: "REVIEW", className: "stamp-hot" },
  resolved: { label: "GRADED", className: "stamp-done" },
};

export default function PactDetail() {
  const { id } = useParams();
  const { pacts, events, userId, acceptPact, submitEvidence, verifyPact, bankOf } = usePact();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const pact = pacts.find((p) => p.id === id);

  if (!pact) {
    return (
      <div className="empty">
        Slip not found. <Link to="/feed">Back to the tape</Link>
      </div>
    );
  }

  const creator = userById(pact.creatorId);
  const opponent = userById(pact.opponentId);
  const winner = userById(pact.winnerId);
  const pot = pact.stake * 2;
  const stamp = STAMPS[pact.status] ?? STAMPS.open;
  const canAccept = pact.status === "open" && userId === pact.opponentId;
  const canUpload =
    (pact.status === "accepted" || pact.status === "evidence") && userId === pact.creatorId;
  const canVerify = pact.status === "review" && userId === pact.opponentId;
  const marks = events.filter((e) => e.pactId === pact.id).sort((a, b) => a.at - b.at);
  const tone = deadlineTone(pact.deadline);

  async function onAccept() {
    setError("");
    setBusy(true);
    try {
      await acceptPact(pact.id);
    } catch (err) {
      setError(err.message || "Could not accept");
    } finally {
      setBusy(false);
    }
  }

  async function onVerify(pass) {
    setError("");
    setBusy(true);
    try {
      await verifyPact(pact.id, pass);
    } catch (err) {
      setError(err.message || "Could not verify");
    } finally {
      setBusy(false);
    }
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      await submitEvidence(pact.id, file);
    } catch (err) {
      setError(err.message || "Could not send proof");
    } finally {
      setBusy(false);
    }
  }

  async function copyShare() {
    const line = winner
      ? `PACT SETTLED · ${winner.handle} takes ${sol(pot)} SOL · ${pact.title}`
      : `PACT · ${creator.handle} vs ${opponent.handle} · ${pact.title}`;
    try {
      await navigator.clipboard.writeText(line);
      setCopied("copied");
    } catch {
      setCopied(line);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="kicker">Ticket {pact.id}</div>
          <h2>{pact.title}</h2>
        </div>
        <div className="stake">
          <b>{sol(pot)}</b>
          <span className="hint">SOL pot</span>
        </div>
      </div>

      <article className="ticket ticket-detail">
        <div className="ticket-edge" aria-hidden="true" />
        <header className="ticket-head">
          <span>1v1 desk</span>
          <span className={`stamp ${stamp.className}`}>{stamp.label}</span>
        </header>

        <div className="vs">
          <div className={`side ${pact.winnerId === creator.id ? "win" : ""}`}>
            <div className="odds-label">Challenger</div>
            <div className="side-name">{creator.handle}</div>
            <div className="hint">{sol(pact.stake)} SOL locked</div>
          </div>
          <div className="vs-mark">VS</div>
          <div className={`side ${pact.winnerId === opponent.id ? "win" : ""}`}>
            <div className="odds-label">Friend</div>
            <div className="side-name">{opponent.handle}</div>
            <div className="hint">
              {pact.status === "open" ? "awaiting accept" : `${sol(pact.stake)} SOL matched`}
            </div>
          </div>
        </div>

        <dl className="spec">
          <div>
            <dt>Success criteria</dt>
            <dd>{pact.criteria}</dd>
          </div>
          <div>
            <dt>Deadline</dt>
            <dd className={`tone-${tone}`}>{formatWhen(pact.deadline)}</dd>
          </div>
        </dl>
      </article>

      <div className="detail-grid">
        <div className="card">
          <div className="kicker">Evidence</div>
          {pact.evidenceUrl ? (
            <img className="preview" src={pact.evidenceUrl} alt={pact.evidenceName || "Evidence"} />
          ) : (
            <p className="hint">
              No photo yet. Challenger drops a photo for the referee.
            </p>
          )}
          {canUpload ? (
            <label className="file">
              Upload photo
              <input type="file" accept="image/*" onChange={onFile} disabled={busy} />
            </label>
          ) : null}
          {pact.status === "open" && userId === pact.creatorId ? (
            <p className="hint">Switch to Friend in the top-right, then accept this slip.</p>
          ) : null}
          {pact.status === "judging" ? (
            <p className="hint pulse">Referee reading the frame…</p>
          ) : null}
        </div>

        <div className="card">
          <div className="kicker">Desk</div>
          {canAccept ? (
            <>
              <p className="hint">
                Match {sol(pact.stake)} SOL from a {sol(bankOf(userId))} bank and lock the pot.
              </p>
              <button className="btn btn-lime" onClick={onAccept} disabled={busy}>
                Accept · {sol(pact.stake)} SOL
              </button>
            </>
          ) : null}
          {pact.status === "open" && !canAccept ? (
            <p className="hint">Waiting on {opponent.handle} to accept.</p>
          ) : null}
          {pact.status === "accepted" ? (
            <p className="hint">Live. {creator.handle} owes a photo.</p>
          ) : null}
          {pact.status === "review" ? (
            <p className="hint">Gemini is unsure. Friend verifies the frame.</p>
          ) : null}
          {canVerify ? (
            <div className="announcer-row">
              <button className="btn btn-lime" type="button" disabled={busy} onClick={() => onVerify(true)}>
                Friend: pass
              </button>
              <button className="btn btn-ghost" type="button" disabled={busy} onClick={() => onVerify(false)}>
                Friend: fail
              </button>
            </div>
          ) : null}
          {error ? <p className="err">{error}</p> : null}

          {pact.verdict ? (
            <div className={`verdict ${pact.verdict.result}`}>
              <div className="result">{pact.verdict.result}</div>
              <div className="hint">
                Confidence {(pact.verdict.confidence * 100).toFixed(0)}% ·{" "}
                {pact.verdict.source || "mocked"}
              </div>
              <p>{pact.verdict.rationale}</p>
              {pact.status === "resolved" && winner ? (
                <>
                  <div className="payout">
                    {winner.handle} takes the pot · {sol(pot)} SOL
                  </div>
                  <Announcer pact={pact} winnerHandle={winner.handle} />
                  <button className="btn btn-ghost" type="button" onClick={copyShare}>
                    {copied === "copied" ? "Copied the post" : "Share the ticket"}
                  </button>
                  {copied && copied !== "copied" ? (
                    <p className="hint">{copied}</p>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="card marks">
        <div className="kicker">Marks on this slip</div>
        <ol className="mark-list">
          {marks.map((ev) => (
            <li key={ev.id}>
              <span className={`badge type-${ev.type}`}>{ev.type}</span>
              <span>
                {userById(ev.actorId)?.handle} · {ev.note}
              </span>
              <time>{formatWhen(ev.at)}</time>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
