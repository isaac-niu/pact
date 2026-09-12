import { useState } from "react";
import { Link } from "react-router-dom";
import { usePact } from "../store.jsx";
import { formatWhen, sol } from "../lib/format.js";
import { WalletRail } from "../components/WalletRail.jsx";
import { useOnboarding } from "../components/OnboardingWalkthrough.jsx";

export default function Profile() {
  const { user, bank, record, ledger, pacts, resetDesk, backend, sideStakes } = usePact();
  const tour = useOnboarding();
  const [flash, setFlash] = useState("");
  const mine = pacts.filter((p) => p.creatorId === user.id || p.opponentId === user.id);
  const railTickets = (sideStakes || []).filter((row) => row.userId === user.id);
  const rate = record.rate == null ? "—" : `${Math.round(record.rate * 100)}%`;

  function onReset() {
    resetDesk();
    tour?.reset();
    setFlash("Desk wiped and reseeded — bank back to the opening book.");
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="kicker">{user.pill} · {user.tag}</div>
          <h2>{user.handle}</h2>
          <p className="lede slim">{user.name} · SOL bank lives in MongoDB on this desk</p>
        </div>
        <Link className="btn btn-ghost" to={`/u/${user.handle}`}>
          Open public ticket
        </Link>
      </div>

      <WalletRail />

      <div className="odds-strip profile-strip">
        <div className="odds-cell">
          <div className="odds-label">Bank</div>
          <div className="odds-value lime">{sol(bank)}</div>
        </div>
        <div className="odds-cell">
          <div className="odds-label">Success rate</div>
          <div className="odds-value">{rate}</div>
        </div>
        <div className="odds-cell">
          <div className="odds-label">Record</div>
          <div className="odds-value">
            {record.wins}-{record.losses}
          </div>
        </div>
      </div>

      <div className="detail-grid">
        <div className="card">
          <div className="kicker">Ledger</div>
          {ledger.filter((row) => row.userId === user.id).length === 0 ? (
            <p className="hint">No marks yet.</p>
          ) : (
            <ol className="ledger">
              {ledger
                .filter((row) => row.userId === user.id)
                .map((row) => (
                  <li key={row.id}>
                    <span className={row.amount >= 0 ? "credit" : "debit"}>
                      {row.amount >= 0 ? "+" : ""}
                      {sol(row.amount)}
                    </span>
                    <span>
                      {row.kind} · {row.note}
                    </span>
                    <time>{formatWhen(row.at)}</time>
                  </li>
                ))}
            </ol>
          )}
        </div>
        <div className="card">
          <div className="kicker">Slips</div>
          {railTickets.length ? (
            <p className="hint">
              Rail tickets · {railTickets.length} on the book
              {railTickets.some((row) => !row.settledAt) ? " · live fade" : ""}
            </p>
          ) : null}
          {mine.length === 0 ? (
            <p className="hint">This desk has no tickets.</p>
          ) : (
            <ul className="profile-slips">
              {mine.map((p) => (
                <li key={p.id}>
                  <Link to={`/pact/${p.id}`}>{p.title}</Link>
                  <span className="hint">
                    {p.status} · {sol(p.stake)} SOL
                  </span>
                </li>
              ))}
            </ul>
          )}
          {backend === "mongo" ? (
            <p className="hint">Atlas stores this desk’s users, SOL balances, and ledger. Browser reset is off so judges keep the book.</p>
          ) : (
            <>
              <button className="btn btn-ghost" type="button" onClick={onReset}>
                Reset local desk
              </button>
              {flash ? (
                <p className="hint lime-hint">{flash}</p>
              ) : (
                <p className="hint">Wipes this browser, reseeds the gym demo slip, and replays the first-visit walk.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
