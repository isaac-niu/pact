import { useMemo, useState } from "react";
import { PROCESSORS, SOL_USD, parseDeposit, processorById, receiptCode } from "../lib/deposit.js";
import { sol } from "../lib/format.js";

function formatCard(value) {
  return value.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
}

export default function AddSol({ bankLabel, onConfirm }) {
  const [amount, setAmount] = useState(10);
  const [processor, setProcessor] = useState("card");
  const [step, setStep] = useState("pick");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [card, setCard] = useState("4242 4242 4242 4242");
  const [expiry, setExpiry] = useState("12 / 28");
  const [cvc, setCvc] = useState("123");
  const [name, setName] = useState("PACT DESK");
  const [receipt, setReceipt] = useState(null);

  const parsed = useMemo(() => {
    try {
      return parseDeposit({ amount, processor });
    } catch {
      return null;
    }
  }, [amount, processor]);
  const rail = processorById(processor);

  async function pay() {
    setError("");
    if (!parsed) {
      setError("Choose a stake between 1 and 500 SOL");
      return;
    }
    setBusy(true);
    setStep("processing");
    try {
      await new Promise((resolve) => setTimeout(resolve, 900));
      const last4 = card.replace(/\D/g, "").slice(-4) || "4242";
      const out = await onConfirm({
        amount: parsed.amount,
        processor: parsed.processor,
        last4,
        receipt: receiptCode(),
      });
      setReceipt({
        ...parsed,
        last4,
        confirmation: out?.receipt || receiptCode(),
        processorName: parsed.processorName,
      });
      setStep("done");
    } catch (err) {
      setError(err.message || "Rail declined");
      setStep("checkout");
    } finally {
      setBusy(false);
    }
  }

  if (step === "done" && receipt) {
    return (
      <div className="card receipt-card">
        <div className="kicker">Cleared · demo rail</div>
        <h3>Bank credited</h3>
        <p className="lede slim">
          {sol(receipt.amount)} SOL posted from {receipt.processorName}. No real money moved.
        </p>
        <dl className="receipt-grid">
          <div>
            <dt>Auth</dt>
            <dd>{receipt.confirmation}</dd>
          </div>
          <div>
            <dt>Quoted</dt>
            <dd>${receipt.usd.toFixed(2)} USD</dd>
          </div>
          <div>
            <dt>Instrument</dt>
            <dd>{receipt.last4 ? `•••• ${receipt.last4}` : rail.name}</dd>
          </div>
        </dl>
        <button className="btn btn-ghost" type="button" onClick={() => setStep("pick")}>
          Buy another pack
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-checkout">
      <div className="kicker">Cashier · {bankLabel}</div>
      <h3>Add virtual SOL</h3>
      <p className="hint">
        Demo processors only. Credits persist in Mongo. Quoted at ${SOL_USD.toFixed(2)} / SOL for the
        receipt — nothing is captured.
      </p>
      <div className="chip-row" role="group" aria-label="Amount">
        {[5, 10, 25, 50, 100].map((n) => (
          <button
            key={n}
            type="button"
            className={amount === n ? "chip on" : "chip"}
            onClick={() => setAmount(n)}
          >
            {n} SOL
          </button>
        ))}
        <label className="chip custom">
          Custom
          <input
            type="number"
            min="1"
            max="500"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="processor-grid">
        {PROCESSORS.map((row) => (
          <button
            key={row.id}
            type="button"
            className={`processor ${row.tone} ${processor === row.id ? "on" : ""}`}
            onClick={() => setProcessor(row.id)}
          >
            <b>{row.name}</b>
            <em>{row.rail}</em>
          </button>
        ))}
      </div>
      {parsed ? (
        <p className="hint">
          You pay <b>${parsed.usd.toFixed(2)}</b> · desk credits <b>{sol(parsed.amount)} SOL</b>
        </p>
      ) : null}
      {step === "pick" ? (
        <button className="btn btn-lime" type="button" onClick={() => setStep("checkout")}>
          Continue with {rail.name}
        </button>
      ) : (
        <form
          className="card form checkout-form"
          onSubmit={(e) => {
            e.preventDefault();
            pay();
          }}
        >
          {processor === "card" || processor === "paypal" ? (
            <>
              <label>
                Name on rail
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label>
                Card number
                <input value={card} onChange={(e) => setCard(formatCard(e.target.value))} inputMode="numeric" />
              </label>
              <div className="form-row">
                <label>
                  Expiry
                  <input value={expiry} onChange={(e) => setExpiry(e.target.value)} />
                </label>
                <label>
                  CVC
                  <input value={cvc} onChange={(e) => setCvc(e.target.value)} />
                </label>
              </div>
            </>
          ) : (
            <p className="hint">
              {rail.name} will authorize a sandbox payload, then the desk posts SOL. Use any name.
            </p>
          )}
          {error ? <p className="err">{error}</p> : null}
          <div className="announcer-row">
            <button className="btn btn-lime" type="submit" disabled={busy}>
              {busy ? "Authorizing…" : `Pay ${parsed ? `$${parsed.usd.toFixed(2)}` : ""}`}
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setStep("pick")}>
              Back
            </button>
          </div>
        </form>
      )}
      {step === "processing" ? (
        <ol className="cashier-steps">
          <li className="on">Authorize {rail.name}</li>
          <li className="on">Capture sandbox</li>
          <li className="pulse">Credit Mongo bank</li>
        </ol>
      ) : null}
    </div>
  );
}
