import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { usePact, userById } from "../store.jsx";
import Announcer from "../components/Announcer.jsx";
import DeadlineBanner from "../components/DeadlineBanner.jsx";
import { canFlagAppeal, canResolveAppeal } from "../lib/appeals.js";
import { deadlineTone, formatWhen, sol } from "../lib/format.js";
import { cadenceLabel, normalizeCadence } from "../lib/recurring.js";
import { canSeePact, pactVisibility } from "../lib/visibility.js";
import TapeTalk from "../components/TapeTalk.jsx";
import RailBook from "../components/RailBook.jsx";
import TicketShare from "../components/TicketShare.jsx";
import { ChecklistGrade, ChecklistGradeForm, ChecklistList } from "../components/ChecklistMarks.jsx";
import ProofPreview from "../components/ProofPreview.jsx";
import ProofSignals from "../components/ProofSignals.jsx";
import { isAllowedProofFile, requireProofFiles } from "../lib/proofMedia.js";
import { ingestProofSignal, mockFitnessWorkout, mockGpsCheckin, normalizeSignal } from "../lib/proofSignals.js";
import { pactChecklist } from "../lib/successCriteria.js";

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
  if (verdict?.source === "appeal") return "open appeal";
  if (verdict?.source === "friend") return "friend grade";
  return "mocked";
}

export default function PactDetail() {
  const { id } = useParams();
  const { pacts, events, userId, acceptPact, submitEvidence, verifyPact, flagAppeal, bankOf } = usePact();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [localFiles, setLocalFiles] = useState([]);
  const [gradeReason, setGradeReason] = useState("");
  const [itemMarks, setItemMarks] = useState([]);
  const [flagNote, setFlagNote] = useState("");
  const pact = pacts.find((p) => p.id === id);
  const checklist = pactChecklist(pact);

  if (!pact || !canSeePact(pact, userId)) {
    return (
      <div className="empty">
        {pact ? "This slip is on a private tape." : "Slip not found."}{" "}
        <Link to="/feed">Back to the tape</Link>
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
  const canVerify = canResolveAppeal(pact, userId);
  const canFlag = canFlagAppeal(pact, userId);
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
      await verifyPact(pact.id, pass, gradeReason, itemMarks);
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

  async function takeFiles(list) {
    const raw = Array.from(list || []).filter(Boolean);
    if (!raw.length) return;
    try {
      requireProofFiles(raw);
    } catch (err) {
      setError(err.message || "Drop a photo (png, jpg, webp), a burst, or a short clip.");
      return;
    }
    if (raw.some((file) => !isAllowedProofFile(file))) {
      setError("Drop a photo (png, jpg, webp), a burst, or a short clip.");
      return;
    }
    setError("");
    localFiles.forEach((file) => {
      if (file.dataUrl?.startsWith("blob:")) URL.revokeObjectURL(file.dataUrl);
    });
    try {
      if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
        setLocalFiles(
          raw.map((file) => ({
            name: file.name,
            mime: file.type,
            dataUrl: URL.createObjectURL(file),
          })),
        );
      }
    } catch {
      /* jsdom / old browsers */
    }
    setBusy(true);
    try {
      await submitEvidence(pact.id, raw.length === 1 ? raw[0] : raw);
    } catch (err) {
      setError(err.message || "Could not send proof");
    } finally {
      setBusy(false);
    }
  }

  async function onFile(e) {
    await takeFiles(e.target.files);
    e.target.value = "";
  }

  async function postSignal(raw) {
    setError("");
    setBusy(true);
    try {
      let ingested = ingestProofSignal(raw);
      try {
        const res = await fetch("/api/proof-signals", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(raw),
        });
        if (res.ok) ingested = await res.json();
      } catch {
        /* hook down — local ingest already ran */
      }
      if (!ingested.ok) throw new Error(ingested.error || "Signal faded");
      await submitEvidence(pact.id, { signal: ingested.signal });
    } catch (err) {
      setError(err.message || "Could not send proof");
    } finally {
      setBusy(false);
    }
  }

  async function onLocation() {
    const pin = await new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            source: "device",
            label: "Device pin",
          }),
        () => resolve(null),
        { timeout: 2500, maximumAge: 30_000 },
      );
    });
    await postSignal(pin ? normalizeSignal({ kind: "gps", ...pin }) : mockGpsCheckin(pact));
  }

  async function onFitness() {
    await postSignal(mockFitnessWorkout(pact));
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
            <dd>
              {checklist.length ? <ChecklistList items={checklist} /> : pact.criteria}
            </dd>
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

      {pactVisibility(pact) === "public" ? <RailBook pact={pact} /> : null}
      <TicketShare pact={pact} />

      <div className="detail-grid">
        <div className="card">
          <div className="kicker">Evidence</div>
          <ProofPreview pact={pact} localFiles={localFiles} />
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
                takeFiles(e.dataTransfer.files);
              }}
            >
              <input
                type="file"
                accept="image/*,video/mp4,video/webm,video/quicktime"
                multiple
                aria-label="Upload proof"
                onChange={onFile}
                disabled={busy}
              />
              <span className="dropzone-kicker">{busy ? "Sending to the desk…" : "Proof desk"}</span>
              <span className="dropzone-title">Upload proof</span>
              <span className="dropzone-hint">
                One photo, a burst (up to 4), or a short clip. PNG, JPG, WebP, MP4, WebM.
              </span>
            </label>
          ) : null}
          {canUpload ? <ProofSignals busy={busy} onLocation={onLocation} onFitness={onFitness} /> : null}
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
            <p className="hint">Live. {creator.handle} owes a frame, burst, or clip.</p>
          ) : null}
          {pact.status === "review" ? (
            <p className="hint">
              Gemini is in the middle band. Both desks see the rationale. Either can flag the call;
              a grade needs a written reason on the tape.
            </p>
          ) : null}
          {pact.status === "appeal" ? (
            <p className="hint">
              Open appeal. {userById(pact.appeal?.flaggedBy)?.handle || "A desk"} flagged this call
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
              <ChecklistGrade marks={pact.verdict.items} />
              {pact.appeal?.resolution?.reason ? (
                <p className="hint">
                  Open grade · {userById(pact.appeal.resolution.actorId)?.handle}:{" "}
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
              <ChecklistGradeForm items={checklist} marks={itemMarks} onChange={setItemMarks} />
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
                  {userById(ev.actorId)?.handle} · {ev.note}
                </span>
                <time>{formatWhen(ev.at)}</time>
              </div>
              <TapeTalk eventId={ev.id} />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
