import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { usePact, userById } from "../store.jsx";
import Announcer from "../components/Announcer.jsx";

export default function PactDetail() {
  const { id } = useParams();
  const { pacts, userId, acceptPact, uploadEvidence, resolvePact } = usePact();
  const [busy, setBusy] = useState(false);
  const pact = pacts.find((p) => p.id === id);

  if (!pact) {
    return (
      <div className="empty">
        Slip not found. <Link to="/feed">Back to the board</Link>
      </div>
    );
  }

  const creator = userById(pact.creatorId);
  const opponent = userById(pact.opponentId);
  const winner = userById(pact.winnerId);
  const pot = (pact.stake * 2).toFixed(2);
  const canAccept = pact.status === "open" && userId === pact.opponentId;
  const canUpload =
    (pact.status === "accepted" || pact.status === "evidence") &&
    userId === pact.creatorId;
  const canResolve =
    pact.status === "evidence" && userId === pact.creatorId && pact.evidenceUrl;

  async function onResolve() {
    setBusy(true);
    await resolvePact(pact.id);
    setBusy(false);
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="kicker">Ticket {pact.id}</div>
          <h2>{pact.title}</h2>
        </div>
        <div className="stake">
          <b>{pot}</b>
          <span className="hint">SOL pot</span>
        </div>
      </div>

      <div className="vs">
        <div className={`side ${pact.winnerId === creator.id ? "win" : ""}`}>
          <div className="odds-label">Challenger</div>
          <div className="side-name">{creator.handle}</div>
          <div className="hint">{pact.stake.toFixed(2)} SOL locked</div>
        </div>
        <div className="vs-mark">VS</div>
        <div className={`side ${pact.winnerId === opponent.id ? "win" : ""}`}>
          <div className="odds-label">Counterparty</div>
          <div className="side-name">{opponent.handle}</div>
          <div className="hint">
            {pact.status === "open" ? "awaiting accept" : `${pact.stake.toFixed(2)} SOL matched`}
          </div>
        </div>
      </div>

      <div className="detail-grid">
        <div className="card">
          <div className="kicker">Evidence</div>
          {pact.evidenceUrl ? (
            <img className="preview" src={pact.evidenceUrl} alt={pact.evidenceName || "Evidence"} />
          ) : (
            <p className="hint">No photo yet. Challenger uploads a local file — it never leaves this browser.</p>
          )}
          {canUpload && (
            <label className="file">
              Upload photo
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadEvidence(pact.id, file);
                }}
              />
            </label>
          )}
          {pact.status === "open" && userId === pact.creatorId && (
            <p className="hint">Switch to Friend in the top-right, then accept this slip.</p>
          )}
        </div>

        <div className="card">
          <div className="kicker">Desk</div>
          {canAccept && (
            <>
              <p className="hint">Match the stake and put this pact live.</p>
              <button className="btn btn-lime" onClick={() => acceptPact(pact.id)}>
                Accept · {pact.stake.toFixed(2)} SOL
              </button>
            </>
          )}
          {pact.status === "open" && !canAccept && (
            <p className="hint">Waiting on {opponent.handle} to accept.</p>
          )}
          {pact.status === "accepted" && (
            <p className="hint">Live. {creator.handle} owes a photo.</p>
          )}
          {canResolve && (
            <button className="btn btn-lime" onClick={onResolve} disabled={busy}>
              Send to referee
            </button>
          )}
          {pact.status === "judging" && <p className="hint">Referee reviewing the frame…</p>}

          {pact.verdict && (
            <div className={`verdict ${pact.verdict.result}`}>
              <div className="result">{pact.verdict.result}</div>
              <div className="hint">
                Confidence {(pact.verdict.confidence * 100).toFixed(0)}% · mocked
              </div>
              <p>{pact.verdict.rationale}</p>
              <div className="payout">
                {winner.handle} takes the pot · {pot} SOL
              </div>
              <Announcer pact={pact} winnerHandle={winner.handle} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
