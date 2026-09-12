import { useState } from "react";
import { Link } from "react-router-dom";
import { usePact, userById } from "../store.jsx";
import { formatClock, sol } from "../lib/format.js";
import Glossary from "../components/Glossary.jsx";
import DeadlineBanner from "../components/DeadlineBanner.jsx";
import Notices from "../components/Notices.jsx";
import { approachingDeadline } from "../lib/reminders.js";
import { cadenceLabel, normalizeCadence } from "../lib/recurring.js";
import { eventsOnTape, pactVisibility, pactsOnTape } from "../lib/visibility.js";
import TapeTalk from "../components/TapeTalk.jsx";
import { railBook } from "../lib/sideStakes.js";

const EVENT_FILTERS = ["all", "posted", "accepted", "proved", "won", "lost"];

const PACT_LABELS = {
  open: "Open",
  accepted: "Live",
  evidence: "Evidence",
  judging: "Desk",
  review: "Review",
  appeal: "Appeal",
  resolved: "Settled",
};

export default function Feed() {
  const { events, pacts, userId, sideStakes, switchUser } = usePact();
  const [tape, setTape] = useState("public");
  const [filter, setFilter] = useState("all");
  const board = pactsOnTape(pacts, tape, userId);
  const marks = eventsOnTape(events, pacts, tape, userId).filter(
    (e) => filter === "all" || e.type === filter,
  );

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="kicker">Active book</div>
          <h2>{tape === "private" ? "Private tape" : "Public tape"}</h2>
        </div>
        <div className="page-head-actions">
          {userId === "rail" ? (
            <button className="btn btn-ghost" type="button" onClick={() => switchUser("you")}>
              Back to ISAAC&apos;s desk
            </button>
          ) : tape === "public" ? (
            <button className="btn btn-ghost" type="button" onClick={() => switchUser("rail")}>
              Sit the rail
            </button>
          ) : null}
          <Link className="btn btn-lime" to="/create">
            New slip
          </Link>
        </div>
      </div>
      <Glossary />
      <DeadlineBanner />
      <Notices />
      <div className="filters" role="tablist" aria-label="Tape">
        <button type="button" className={tape === "public" ? "on" : ""} onClick={() => setTape("public")}>
          Public tape
        </button>
        <button type="button" className={tape === "private" ? "on" : ""} onClick={() => setTape("private")}>
          Private tape
        </button>
      </div>

      <div className="filters" role="tablist" aria-label="Event type">
        {EVENT_FILTERS.map((key) => (
          <button
            key={key}
            type="button"
            className={filter === key ? "on" : ""}
            onClick={() => setFilter(key)}
          >
            {key}
          </button>
        ))}
      </div>

      {marks.length === 0 ? (
        <div className="empty">
          {tape === "private"
            ? "No private marks yet. Write a slip and keep it on the private tape."
            : "No marks on this filter. Write a slip."}
        </div>
      ) : (
        <div className="tape">
          {marks.map((ev) => {
            const pact = pacts.find((p) => p.id === ev.pactId);
            const actor = userById(ev.actorId);
            return (
              <article className={`tape-card type-${ev.type}`} key={ev.id}>
                <Link className={`tape-row type-${ev.type}`} to={`/pact/${ev.pactId}`}>
                  <time>{formatClock(ev.at)}</time>
                  <span className={`badge type-${ev.type}`}>{ev.type}</span>
                  <div className="tape-body">
                    <div className="tape-title">{pact?.title ?? "Slip"}</div>
                    <div className="meta">
                      {actor?.handle} · {ev.note} · {pactVisibility(pact)}
                    </div>
                  </div>
                  <div className="stake">
                    <b>{sol(pact?.stake ?? 0)}</b>
                    <span className="hint">SOL each</span>
                  </div>
                </Link>
                <TapeTalk eventId={ev.id} compact />
              </article>
            );
          })}
        </div>
      )}

      <div className="page-head tight">
        <div>
          <div className="kicker">{tape === "private" ? "Private group" : "Open book"}</div>
          <h3 className="subhead">Slips</h3>
        </div>
      </div>
      <div className="feed">
        {board.length === 0 ? (
          <div className="empty">No slips on this tape.</div>
        ) : (
          board.map((p) => {
            const creator = userById(p.creatorId);
            const badgeClass =
              p.status === "resolved" ? "done" : p.status === "open" ? "" : "live";
            const rail = railBook(sideStakes, p.id);
            return (
              <Link className="slip" key={p.id} to={`/pact/${p.id}`}>
                <div>
                  <div className="slip-title">{p.title}</div>
                  <div className="meta">
                    {creator?.handle} vs {userById(p.opponentId)?.handle} ·{" "}
                    <span className={`badge ${badgeClass}`}>{PACT_LABELS[p.status]}</span>
                    {approachingDeadline(p) ? (
                      <>
                        {" · "}
                        <span className="badge type-deadline">clock</span>
                      </>
                    ) : null}
                    {" · "}
                    {pactVisibility(p)}
                    {normalizeCadence(p.cadence) !== "none"
                      ? ` · ${cadenceLabel(p.cadence)} · streak ${p.streak || 0}`
                      : ""}
                    {rail.total > 0 ? ` · rail ${sol(rail.total)}` : ""}
                  </div>
                </div>
                <div className="stake">
                  <b>{sol(p.stake)}</b>
                  <span className="hint">SOL each</span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
