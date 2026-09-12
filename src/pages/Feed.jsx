import { useState } from "react";
import { Link } from "react-router-dom";
import { usePact, userById } from "../store.jsx";
import { formatClock, sol } from "../lib/format.js";

const EVENT_FILTERS = ["all", "posted", "accepted", "proved", "won", "lost"];

const PACT_LABELS = {
  open: "Open",
  accepted: "Live",
  evidence: "Evidence",
  judging: "Desk",
  review: "Review",
  resolved: "Settled",
};

export default function Feed() {
  const { events, pacts } = usePact();
  const [filter, setFilter] = useState("all");
  const shown = events.filter((e) => filter === "all" || e.type === filter);

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="kicker">Active book</div>
          <h2>The tape</h2>
        </div>
        <Link className="btn btn-lime" to="/create">
          New pact
        </Link>
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

      {shown.length === 0 ? (
        <div className="empty">No marks on this filter. Write a slip.</div>
      ) : (
        <div className="tape">
          {shown.map((ev) => {
            const pact = pacts.find((p) => p.id === ev.pactId);
            const actor = userById(ev.actorId);
            return (
              <Link className={`tape-row type-${ev.type}`} key={ev.id} to={`/pact/${ev.pactId}`}>
                <time>{formatClock(ev.at)}</time>
                <span className={`badge type-${ev.type}`}>{ev.type}</span>
                <div className="tape-body">
                  <div className="tape-title">{pact?.title ?? "Slip"}</div>
                  <div className="meta">
                    {actor?.handle} · {ev.note}
                  </div>
                </div>
                <div className="stake">
                  <b>{sol(pact?.stake ?? 0)}</b>
                  <span className="hint">SOL each</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="page-head tight">
        <div>
          <div className="kicker">Open book</div>
          <h3 className="subhead">Slips</h3>
        </div>
      </div>
      <div className="feed">
        {pacts.map((p) => {
          const creator = userById(p.creatorId);
          const badgeClass =
            p.status === "resolved" ? "done" : p.status === "open" ? "" : "live";
          return (
            <Link className="slip" key={p.id} to={`/pact/${p.id}`}>
              <div>
                <div className="slip-title">{p.title}</div>
                <div className="meta">
                  {creator?.handle} vs {userById(p.opponentId)?.handle} ·{" "}
                  <span className={`badge ${badgeClass}`}>{PACT_LABELS[p.status]}</span>
                </div>
              </div>
              <div className="stake">
                <b>{sol(p.stake)}</b>
                <span className="hint">SOL each</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
