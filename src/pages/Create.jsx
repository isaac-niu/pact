import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePact } from "../store.jsx";

export default function Create() {
  const { createPact, user, opponent } = usePact();
  const navigate = useNavigate();
  const [title, setTitle] = useState("I'll upload a gym selfie");
  const [stake, setStake] = useState("2");

  function onSubmit(e) {
    e.preventDefault();
    const amount = Number(stake);
    if (!title.trim() || !Number.isFinite(amount) || amount <= 0) return;
    const pact = createPact({ title, stake: amount });
    navigate(`/pact/${pact.id}`);
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="kicker">New slip</div>
          <h2>Write the pact</h2>
        </div>
      </div>
      <form className="card form" onSubmit={onSubmit}>
        <label>
          Challenge
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="I'll upload a gym selfie"
          />
        </label>
        <label>
          Stake each (fake SOL)
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={stake}
            onChange={(e) => setStake(e.target.value)}
          />
        </label>
        <p className="hint">
          {user.handle} posts the slip. {opponent.handle} must accept and match{" "}
          {Number(stake) || 0} SOL. Pot = {(Number(stake) * 2 || 0).toFixed(2)} SOL.
          Numbers only — no wallet.
        </p>
        <button className="btn btn-lime" type="submit">
          Post to the board
        </button>
      </form>
    </div>
  );
}
