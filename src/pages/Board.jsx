import { useState } from "react";
import { Link } from "react-router-dom";
import { usePact } from "../store.jsx";
import { formatRate } from "../lib/publicProfile.js";
import { BOARD_METRICS, DESK_CREWS, boardCopy, crewById, rankDesks } from "../lib/leaderboard.js";
import { sol } from "../lib/format.js";
import Glossary from "../components/Glossary.jsx";
import EmptyState from "../components/EmptyState.jsx";

export default function Board() {
  const { pacts, ledger } = usePact();
  const [crewId, setCrewId] = useState("open-book");
  const [metric, setMetric] = useState("winRate");
  const crew = crewById(crewId);
  const rows = rankDesks({
    pacts,
    ledger,
    metric,
    memberIds: crew.memberIds,
  });

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="kicker">Daily board</div>
          <h2>{crew.name}</h2>
          <p className="lede slim">{boardCopy(metric)}</p>
        </div>
      </div>
      <Glossary />

      <div className="filters" role="tablist" aria-label="Crew board">
        {DESK_CREWS.map((row) => (
          <button
            key={row.id}
            type="button"
            className={crewId === row.id ? "on" : ""}
            onClick={() => setCrewId(row.id)}
          >
            {row.name}
          </button>
        ))}
      </div>
      <div className="filters" role="tablist" aria-label="Rank by">
        {BOARD_METRICS.map((row) => (
          <button
            key={row.id}
            type="button"
            className={metric === row.id ? "on" : ""}
            onClick={() => setMetric(row.id)}
          >
            {row.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          art="crew"
          kicker="Board"
          title="No desks on this crew board"
          lede="This crew has no scored desks yet. Write a public slip, then check back tomorrow."
          action={
            <Link className="btn btn-lime" to="/create">
              Write a slip
            </Link>
          }
        />
      ) : (
        <ol className="board-list">
          {rows.map((row) => (
            <li key={row.userId} className="board-row">
              <span className="board-rank">{row.rank}</span>
              <div>
                <Link className="board-handle" to={`/u/${row.handle}`}>
                  {row.handle}
                </Link>
                <div className="meta">
                  {row.tag} · {row.wins}-{row.losses}
                  {row.streak ? ` · streak ${row.streak}` : ""}
                </div>
              </div>
              <div className="stake">
                <b>
                  {metric === "potWon"
                    ? sol(row.potWon)
                    : metric === "streak"
                      ? row.streak
                      : formatRate(row.rate)}
                </b>
                <span className="hint">
                  {metric === "potWon" ? "SOL taken" : metric === "streak" ? "hot" : "win rate"}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
