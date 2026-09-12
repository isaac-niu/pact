import { useState } from "react";
import { FITNESS_PROVIDERS } from "../lib/proofSignals.js";

export function SignalCard({ signal }) {
  if (!signal) return null;
  if (signal.kind === "gps") {
    return (
      <div className="proof-frame signal-card">
        <div className="kicker">Location pin</div>
        <p className="signal-title">{signal.label}</p>
        <p className="hint">
          {signal.lat.toFixed(4)}, {signal.lng.toFixed(4)}
          {signal.accuracy != null ? ` · ±${Math.round(signal.accuracy)}m` : ""} · {signal.source}
        </p>
      </div>
    );
  }
  return (
    <div className="proof-frame signal-card">
      <div className="kicker">Fitness hook</div>
      <p className="signal-title">
        {signal.activity}
        {signal.distanceM ? ` · ${(signal.distanceM / 1000).toFixed(2)} km` : ""}
      </p>
      <p className="hint">
        {FITNESS_PROVIDERS.find((row) => row.id === signal.provider)?.label || signal.provider} ·{" "}
        {signal.source}
      </p>
    </div>
  );
}

export default function ProofSignals({ onLocation, onFitness, busy }) {
  const [hookNote, setHookNote] = useState("");

  function tapStub(provider) {
    setHookNote(provider.hint);
  }

  return (
    <div className="proof-signals">
      <div className="kicker">Alternate proof</div>
      <p className="hint">Prove with a location pin or a fitness hook. Strava OAuth is stubbed on this desk.</p>
      <div className="announcer-row">
        <button className="btn btn-ghost" type="button" disabled={busy} onClick={onLocation}>
          Prove with location
        </button>
        <button className="btn btn-ghost" type="button" disabled={busy} onClick={onFitness}>
          Prove with fitness
        </button>
      </div>
      <div className="signal-stubs">
        {FITNESS_PROVIDERS.filter((row) => !row.ready).map((provider) => (
          <button
            key={provider.id}
            type="button"
            className="btn btn-ghost"
            disabled={busy}
            onClick={() => tapStub(provider)}
          >
            {provider.label} (stub)
          </button>
        ))}
      </div>
      {hookNote ? <p className="hint">{hookNote}</p> : null}
    </div>
  );
}
