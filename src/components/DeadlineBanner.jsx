import { Link } from "react-router-dom";
import { usePact } from "../store.jsx";
import { approachingForUser, bannerCopy } from "../lib/reminders.js";

export default function DeadlineBanner({ pactId = null }) {
  const { pacts, userId } = usePact();
  const now = Date.now();
  const rows = approachingForUser(pacts, userId, now).filter((p) => !pactId || p.id === pactId);
  if (!rows.length) return null;

  return (
    <div className="deadline-banners" aria-label="Approaching deadlines">
      {rows.map((pact) => (
        <Link key={pact.id} className="deadline-banner" to={`/pact/${pact.id}`}>
          <span className="badge type-deadline">clock</span>
          <span>{bannerCopy(pact, userId, now)}</span>
          <span className="meta">{pact.title}</span>
        </Link>
      ))}
    </div>
  );
}
