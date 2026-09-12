import { useMemo, useState } from "react";
import {
  renderTicketSvg,
  ticketCardModel,
  ticketCardQuery,
  ticketOgPath,
  ticketShareLine,
} from "../lib/ticketCard.js";

export default function TicketShare({ pact }) {
  const [status, setStatus] = useState("");
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const model = useMemo(() => ticketCardModel(pact, { origin }), [pact, origin]);
  const svg = useMemo(() => renderTicketSvg(model), [model]);
  const pageUrl = model.url;
  const imageUrl = `${origin}${ticketOgPath(model)}?${ticketCardQuery(model)}`;

  async function copyTicket() {
    const line = `${ticketShareLine(model)}\n${pageUrl}\nCard: ${imageUrl}`;
    try {
      await navigator.clipboard.writeText(line);
      setStatus("copied");
    } catch {
      setStatus(line);
    }
  }

  function downloadCard() {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `pact-ticket-${pact.id}.svg`;
    link.click();
    URL.revokeObjectURL(href);
    setStatus("saved");
  }

  async function shareNative() {
    if (!navigator.share) {
      await copyTicket();
      return;
    }
    try {
      await navigator.share({
        title: ticketShareLine(model),
        text: ticketShareLine(model),
        url: pageUrl,
      });
      setStatus("shared");
    } catch (err) {
      if (err?.name !== "AbortError") await copyTicket();
    }
  }

  return (
    <div className="card ticket-share">
      <div className="kicker">Share the ticket</div>
      <p className="hint">OG card + ticket URL — not a bare line of text.</p>
      <div className="ticket-card-frame">
        <img src={imageUrl} alt={`PACT ticket ${pact.id}`} />
      </div>
      <div className="announcer-row">
        <button className="btn btn-lime" type="button" onClick={shareNative}>
          {status === "shared" ? "Shared" : "Share ticket"}
        </button>
        <button className="btn btn-ghost" type="button" onClick={copyTicket}>
          {status === "copied" ? "Copied URL + card" : "Copy URL + card"}
        </button>
        <button className="btn btn-ghost" type="button" onClick={downloadCard}>
          {status === "saved" ? "Saved SVG" : "Download card"}
        </button>
      </div>
      {status && status !== "copied" && status !== "saved" && status !== "shared" ? (
        <p className="hint">{status}</p>
      ) : (
        <p className="hint">{pageUrl}</p>
      )}
    </div>
  );
}
