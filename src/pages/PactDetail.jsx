import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useLivePacts } from "../auth/useLivePacts.js";
import { usePact } from "../store.jsx";
import Announcer from "../components/Announcer.jsx";
import DeadlineBanner from "../components/DeadlineBanner.jsx";
import { canFlagAppeal, canResolveAppeal } from "../lib/appeals.js";
import { deadlineTone, formatWhen, sol } from "../lib/format.js";
import { eventsFromLivePact, liveActor, toDeskPact } from "../lib/livePacts.js";
import { cadenceLabel, normalizeCadence } from "../lib/recurring.js";
import { canSeePact, pactVisibility } from "../lib/visibility.js";
import TapeTalk from "../components/TapeTalk.jsx";
import RailBook from "../components/RailBook.jsx";
import TicketShare from "../components/TicketShare.jsx";

const STAMPS = {
  open: { label: "OPEN", className: "stamp-open" },
  accepted: { label: "LIVE", className: "stamp-live" },
  evidence: { label: "PROOF", className: "stamp-live" },
  judging: { label: "DESK", className: "stamp-hot" },
  review: { label: "REVIEW", className: "stamp-hot" },
  appeal: { label: "APPEAL", className: "stamp-hot" },
  resolved: { label: "GRADED", className: "stamp-done" },
};

function sourceLabel(verdict) {
  if (verdict?.source === "gemini") return "Gemini Flash";
  if (verdict?.source === "gemini-error") return "Gemini error";
  if (verdict?.source === "appeal") return "open appeal";
  if (verdict?.source === "friend") return "friend grade";
  return "mocked";
}

export default function PactDetail() {
  const { id } = useParams();
  const { pacts, events, userId, acceptPact, submitEvidence, verifyPact, flagAppeal, bankOf } = usePact();
  const live = useLivePacts({ pactId: id });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [localPreview, setLocalPreview] = useState("");
  const [gradeReason, setGradeReason] = useState("");
  const [flagNote, setFlagNote] = useState("");
  const deskPact = pacts.find((p) => p.id === id);
  const livePact = live.ticket ? toDeskPact(live.ticket) : null;
  const pact = livePact || deskPact;
  const liveSlip = pact?.source === "live";
  const viewerId = liveSlip ? live.me?.id : userId;

  if (live.signedIn && live.loading && !pact) {
    return (
      <div className="empty">
        Opening the live ticket… <Link to="/feed">Back to the tape</Link>
      </div>
    );
  }

  if (!pact || !canSeePact(pact, viewerId || userId)) {
    return (
      <div className="empty">
        {pact ? "This slip is on a private tape." : "Slip not found."}{" "}
        <Link to="/feed">Back to the tape</Link>
      </div>
    );
  }

  const creator = liveActor(pact.creatorId, live.directory);
  const opponent = liveActor(pact.opponentId, live.directory);
  const winner = pact.winnerId ? liveActor(pact.winnerId, live.directory) : null;
  const pot = pact.stake * 2;
  const stamp = STAMPS[pact.status] ?? STAMPS.open;
  const canAccept = pact.status === "open" && viewerId === pact.opponentId;
  const canUpload =
    (pact.status === "accepted" || pact.status === "evidence") && viewerId === pact.creatorId;
  const canVerify = !liveSlip && canResolveAppeal(pact, userId);
  const canFlag = !liveSlip && canFlagAppeal(pact, userId);
  const marks = (liveSlip ? eventsFromLivePact(pact) : events)
    .filter((e) => e.pactId === pact.id)
    .sort((a, b) => a.at - b.at);
  const tone = deadlineTone(pact.deadline);

  async function onAccept() {
    setError("");
    setBusy(true);
    try {
      if (liveSlip) await live.acceptLive(pact.id);
      else await acceptPact(pact.id);
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
      await verifyPact(pact.id, pass, gradeReason);
    } catch (err) {
      setError(err.message || "Could not verify");
    } finally {
      setBusy(false);
    }
  }

  async function onFlag() {
    setError("");
    setBusy(true);
    try {
      await flagAppeal(pact.id, flagNote);
    } catch (err) {
      setError(err.message || "Could not flag");
    } finally {
      setBusy(false);
    }
  }

  async function takeFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Drop a photo (png, jpg, webp).");
      return;
    }
    setError("");
    if (localPreview) URL.revokeObjectURL(localPreview);
    try {
      if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
        setLocalPreview(URL.createObjectURL(file));
      }
    } catch {
      /* jsdom / old browsers */
    }
    setBusy(true);
    try {
      if (liveSlip) await live.submitLiveEvidence(pact, file);
      else await submitEvidence(pact.id, file);
    } catch (err) {
      setError(err.message || "Could not send proof");
    } finally {
      setBusy(false);
    }
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    await takeFile(file);
    e.target.value = "";
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
          <span>1v1 desk · {pactVisibility(pact)} tape</span>
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
          {normalizeCadence(pact.cadence) !== "none" ? (
            <div>
              <dt>Series</dt>
              <dd>
                {cadenceLabel(pact.cadence)} · streak {pact.streak || 0} · slip {pact.occurrence || 1}
              </dd>
            </div>
          ) : null}
        </dl>
        <DeadlineBanner pactId={pact.id} />
      </article>

      {!liveSlip && pactVisibility(pact) === "public" ? <RailBook pact={pact} /> : null}
      <TicketShare pact={pact} />

      <div className="detail-grid">
        <div className="card">
          <div className="kicker">Evidence</div>
          {pact.evidenceUrl || localPreview ? (
            <div className="proof-frame">
              <img
                className="preview"
                src={pact.evidenceUrl || localPreview}
                alt={pact.evidenceName || "Evidence"}
              />
              {pact.evidenceName ? <span className="proof-name">{pact.evidenceName}</span> : null}
            </div>
          ) : (
            <p className="hint">No photo yet. Challenger drops a frame for Gemini Flash.</p>
          )}
          {canUpload ? (
            <label
              className={`dropzone ${dragOver ? "is-over" : ""} ${busy ? "is-busy" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                takeFile(e.dataTransfer.files?.[0]);
              }}
            >
              <input
                type="file"
                accept="image/*"
                aria-label="Upload photo"
                onChange={onFile}
                disabled={busy}
              />
              <span className="dropzone-kicker">{busy ? "Sending to the desk…" : "Proof frame"}</span>
              <span className="dropzone-title">Upload photo</span>
              <span className="dropzone-hint">Drop an image here or click to browse. PNG, JPG, WebP.</span>
            </label>
          ) : null}
          {pact.status === "open" && userId === pact.creatorId ? (
            <p className="hint">
              Counterparty accepts this slip from their signed-in Pact app, or from the other desk.
            </p>
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
            <p className="hint">
              Gemini is in the middle band. Both desks see the rationale. Either can flag the call;
              a grade needs a written reason on the tape.
            </p>
          ) : null}
          {pact.status === "appeal" ? (
            <p className="hint">
              Open appeal. {liveActor(pact.appeal?.flaggedBy, live.directory).handle || "A desk"} flagged this call
              — resolve it in the open, not a silent pass/fail.
            </p>
          ) : null}
          {pact.appeal?.note ? (
            <div className="appeal-note">
              <div className="kicker">Flag</div>
              <p>{pact.appeal.note}</p>
            </div>
          ) : null}

          {pact.verdict ? (
            <div className={`verdict ${pact.verdict.result}`}>
              <div className="result">{pact.verdict.result}</div>
              <div className="hint">
                Confidence {(pact.verdict.confidence * 100).toFixed(0)}% · {sourceLabel(pact.verdict)}
              </div>
              <p>{pact.verdict.rationale}</p>
              {pact.verdict.sidekick?.text ? (
                <p className="sidekick-line">
                  <span className="kicker">
                    {pact.verdict.sidekick.source === "ifm" ? "IFM sidekick" : "sidekick"}
                  </span>{" "}
                  {pact.verdict.sidekick.text}
                </p>
              ) : null}
              {pact.appeal?.resolution?.reason ? (
                <p className="hint">
                  Open grade · {liveActor(pact.appeal.resolution.actorId, live.directory).handle}:{" "}
                  {pact.appeal.resolution.reason}
                </p>
              ) : null}
              {pact.status === "resolved" && winner ? (
                <>
                  <div className="payout">
                    {winner.handle} takes the pot · {sol(pot)} SOL
                  </div>
                  <Announcer pact={pact} winnerHandle={winner.handle} />
                </>
              ) : null}
            </div>
          ) : null}

          {canFlag ? (
            <label className="appeal-field">
              Flag this call
              <textarea
                value={flagNote}
                onChange={(e) => setFlagNote(e.target.value)}
                placeholder="What’s wrong with the referee rationale?"
              />
              <button className="btn btn-ghost" type="button" disabled={busy} onClick={onFlag}>
                Flag / dispute
              </button>
            </label>
          ) : null}
          {canVerify ? (
            <>
              <label className="appeal-field">
                Visible grade
                <textarea
                  value={gradeReason}
                  onChange={(e) => setGradeReason(e.target.value)}
                  placeholder="Write why this frame stands or fades."
                  required
                />
              </label>
              <div className="announcer-row">
                <button className="btn btn-lime" type="button" disabled={busy} onClick={() => onVerify(true)}>
                  Stand the slip
                </button>
                <button className="btn btn-ghost" type="button" disabled={busy} onClick={() => onVerify(false)}>
                  Fade the slip
                </button>
              </div>
            </>
          ) : null}
          {pact.status === "review" && !canVerify && !canFlag ? (
            <p className="hint">
              {opponent.handle} grades this frame from their signed-in Pact app.
            </p>
          ) : null}
          {error ? <p className="err">{error}</p> : null}
        </div>
      </div>

      <div className="card marks">
        <div className="kicker">Marks on this slip</div>
        <ol className="mark-list">
          {marks.map((ev) => (
            <li key={ev.id}>
              <div className="mark-line">
                <span className={`badge type-${ev.type}`}>{ev.type}</span>
                <span>
                  {liveActor(ev.actorId, live.directory).handle} · {ev.note}
                </span>
                <time>{formatWhen(ev.at)}</time>
              </div>
              {liveSlip ? null : <TapeTalk eventId={ev.id} />}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
