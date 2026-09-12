import { Link } from "react-router-dom";

export default function Home() {
  return (
    <section className="hero">
      <div className="kicker">1v1 self-improvement · fake SOL · mocked referee</div>
      <h1>
        Bet on the
        <br />
        version of you
        <br />
        that shows up.
      </h1>
      <p className="lede">
        Write a pact. A friend matches the stake. You upload the proof. A
        referee calls pass or fail. Winner takes the pot. This demo is local
        only — no wallet, no auth, no chain.
      </p>
      <div className="cta-row">
        <Link className="btn btn-lime" to="/create">
          Open a pact
        </Link>
        <Link className="btn btn-ghost" to="/feed">
          View the board
        </Link>
      </div>
      <div className="odds-strip">
        <div className="odds-cell">
          <div className="odds-label">Line</div>
          <div className="odds-value">Gym selfie</div>
        </div>
        <div className="odds-cell">
          <div className="odds-label">Stake each</div>
          <div className="odds-value">2.00 SOL</div>
        </div>
        <div className="odds-cell">
          <div className="odds-label">Pot</div>
          <div className="odds-value">4.00 SOL</div>
        </div>
      </div>
    </section>
  );
}
