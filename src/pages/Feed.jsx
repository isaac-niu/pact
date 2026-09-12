import { Link } from "react-router-dom";
import { usePact, userById } from "../store.jsx";

const LABELS = {
  open: "Open",
  accepted: "Live",
  evidence: "Evidence in",
  judging: "Referee",
  resolved: "Settled",
};

export default function Feed() {
  const { pacts } = usePact();

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="kicker">Active book</div>
          <h2>Pact board</h2>
        </div>
        <Link className="btn btn-lime" to="/create">
          New pact
        </Link>
      </div>
      {pacts.length === 0 ? (
        <div className="empty">No slips yet. Write one in under ten seconds.</div>
      ) : (
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
                    <span className={`badge ${badgeClass}`}>{LABELS[p.status]}</span>
                  </div>
                </div>
                <div className="stake">
                  <b>{p.stake.toFixed(2)}</b>
                  <span className="hint">SOL each</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
