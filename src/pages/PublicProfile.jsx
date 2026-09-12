import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { formatRate, publicProfileOf } from "../lib/publicProfile.js";
import { formatWhen, sol } from "../lib/format.js";
import { usePact } from "../store.jsx";
import EmptyState from "../components/EmptyState.jsx";

const STATUS = {
  open: "Open",
  accepted: "Live",
  evidence: "Evidence",
  judging: "Desk",
  review: "Review",
  appeal: "Appeal",
  resolved: "Settled",
};

export default function PublicProfile() {
  const { handle } = useParams();
  const { pacts, user: viewer } = usePact();
  const [copied, setCopied] = useState("");
  const ticket = publicProfileOf(handle, { pacts });

  if (!ticket) {
    return (
      <EmptyState
        art="ticket"
        kicker="Public book"
        title="No ticket on this book"
        lede="That handle is not on the open book."
        action={
          <Link className="btn btn-ghost" to="/feed">
            Back to the tape
          </Link>
        }
      />
    );
  }

  const { user, record, history, sharePath } = ticket;
  const mine = viewer?.id === user.id;

  async function onCopy() {
    const url = `${window.location.origin}${sharePath}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied("Link on the slip — anyone can open this ticket.");
    } catch {
      setCopied(url);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="kicker">Public ticket · {user.tag}</div>
          <h2>{user.handle}</h2>
          <p className="lede slim">
            {user.name} · open book only. Bank and private tape stay on the desk.
          </p>
        </div>
        <div className="page-head-actions">
          <button className="btn btn-ghost" type="button" onClick={onCopy}>
            Copy public link
          </button>
          {mine ? (
            <Link className="btn btn-lime" to="/me">
              Back to my desk
            </Link>
          ) : (
            <Link className="btn btn-lime" to="/create">
              Write a slip
            </Link>
          )}
        </div>
      </div>

      <div className="odds-strip profile-strip">
        <div className="odds-cell">
          <div className="odds-label">Win rate</div>
          <div className="odds-value lime">{formatRate(record.rate)}</div>
        </div>
        <div className="odds-cell">
          <div className="odds-label">Record</div>
          <div className="odds-value">
            {record.wins}-{record.losses}
          </div>
        </div>
        <div className="odds-cell">
          <div className="odds-label">Public slips</div>
          <div className="odds-value">{history.length}</div>
        </div>
      </div>
      {copied ? <p className="hint lime-hint">{copied}</p> : null}

      <div className="card">
        <div className="kicker">Public pact history</div>
        {history.length === 0 ? (
          <p className="hint">No public marks on this ticket yet.</p>
        ) : (
          <ul className="profile-slips">
            {history.map((pact) => (
              <li key={pact.id}>
                <Link to={`/pact/${pact.id}`}>{pact.title}</Link>
                <span className="hint">
                  {STATUS[pact.status] || pact.status} · {sol(pact.stake)} SOL
                  {pact.status === "resolved" && pact.winnerId === user.id ? " · stood" : ""}
                  {pact.status === "resolved" && pact.winnerId && pact.winnerId !== user.id
                    ? " · faded"
                    : ""}
                  {pact.resolvedAt ? ` · ${formatWhen(pact.resolvedAt)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
