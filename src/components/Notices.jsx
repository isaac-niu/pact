import { Link } from "react-router-dom";
import { usePact } from "../store.jsx";
import { formatWhen } from "../lib/format.js";

const LABELS = {
  accepted: "accepted",
  proved: "proved",
  review: "review",
  deadline: "deadline",
  appeal: "appeal",
  graded: "graded",
};

export default function Notices() {
  const { notices, unreadNotices, markNoticeRead, markAllNoticesRead } = usePact();

  async function onOpen(id) {
    try {
      await markNoticeRead(id);
    } catch {
      /* local desk still navigates */
    }
  }

  return (
    <section className="card notices" aria-label="Desk notices">
      <div className="notices-head">
        <div>
          <div className="kicker">The wire</div>
          <h3 className="subhead">Desk notices</h3>
        </div>
        {unreadNotices > 0 ? (
          <button className="btn btn-ghost" type="button" onClick={() => markAllNoticesRead()}>
            Clear the board
          </button>
        ) : null}
      </div>
      {notices.length === 0 ? (
        <p className="hint">No marks on your desk. Accepts, proof, and REVIEW calls land here.</p>
      ) : (
        <ol className="notice-list">
          {notices.map((n) => (
            <li key={n.id} className={n.readAt ? "is-read" : "is-unread"}>
              <Link to={`/pact/${n.pactId}`} onClick={() => onOpen(n.id)}>
                <span className={`badge type-${n.type}`}>{LABELS[n.type] || n.type}</span>
                <div className="notice-body">
                  <div className="notice-title">{n.title}</div>
                  <div className="meta">{n.body}</div>
                </div>
                <time>{formatWhen(n.at)}</time>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
