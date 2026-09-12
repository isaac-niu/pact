import { Link } from "react-router-dom";
import { usePact } from "../store.jsx";
import { sol } from "../lib/format.js";

const STEPS = [
  { n: "01", label: "Say it", copy: "Write the pact in one line." },
  { n: "02", label: "Stake it", copy: "Friend matches virtual SOL." },
  { n: "03", label: "Prove it", copy: "Upload the photo. Desk calls it." },
  { n: "04", label: "Share it", copy: "The settled ticket is the post." },
];

export default function Home() {
  const { pacts, events } = usePact();
  const live = pacts.filter((p) => p.status !== "resolved").length;
  const last = events[0];

  return (
    <section className="hero">
      <p className="kicker">1v1 accountability · virtual SOL · mocked referee</p>
      <h1>
        Bet on the
        <br />
        version of you
        <br />
        that shows up.
      </h1>

      <ol className="loop" aria-label="Product loop">
        {STEPS.map((step, i) => (
          <li key={step.n} title={step.copy}>
            <span className="loop-n">{step.n}</span>
            <strong>{step.label}</strong>
            {i < STEPS.length - 1 ? <span className="loop-arrow" aria-hidden="true">→</span> : null}
          </li>
        ))}
      </ol>

      <p className="lede">
        Social media for accountability, not attention. You post a pact, a
        friend matches the stake, you prove it with a photo, a referee stands
        or fades the slip. Winner takes the pot. This branch is local only —
        no wallet, no auth, no chain.
      </p>

      <div className="cta-row">
        <Link className="btn btn-lime" to="/create">
          Write a slip
        </Link>
        <Link className="btn btn-ghost" to="/feed">
          Open the tape
        </Link>
      </div>

      <div className="hero-board">
        <article className="ticket ticket-hero">
          <div className="ticket-edge" aria-hidden="true" />
          <header className="ticket-head">
            <span>Official slip</span>
            <span className="stamp stamp-open">SAMPLE</span>
          </header>
          <h3>I&apos;ll upload a gym selfie</h3>
          <p className="ticket-criteria">Face or body in frame · gym floor or iron visible</p>
          <div className="odds-strip">
            <div className="odds-cell">
              <div className="odds-label">Say it</div>
              <div className="odds-value">ISAAC</div>
            </div>
            <div className="odds-cell">
              <div className="odds-label">Stake each</div>
              <div className="odds-value">{sol(2)}</div>
            </div>
            <div className="odds-cell">
              <div className="odds-label">Pot</div>
              <div className="odds-value lime">{sol(4)}</div>
            </div>
          </div>
          <footer className="ticket-foot">
            Friend (MAYA) must accept before the pot locks. Proof is any photo.
          </footer>
        </article>

        <aside className="hero-stats">
          <div className="stat">
            <div className="odds-label">Live slips</div>
            <div className="odds-value">{live}</div>
          </div>
          <div className="stat">
            <div className="odds-label">Tape marks</div>
            <div className="odds-value">{events.length}</div>
          </div>
          <div className="stat">
            <div className="odds-label">Last mark</div>
            <div className="odds-value small">{last ? last.type.toUpperCase() : "—"}</div>
          </div>
        </aside>
      </div>
    </section>
  );
}
