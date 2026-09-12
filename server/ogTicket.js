import { getDesk } from "./deskStore.js";
import { mongoReady } from "./mongo.js";
import {
  injectOgMeta,
  renderTicketSvg,
  ticketCardFromQuery,
  ticketCardModel,
  ticketOgTags,
} from "../src/lib/ticketCard.js";

function originOf(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  const proto = req.headers["x-forwarded-proto"] || "http";
  return `${proto}://${host}`;
}

export async function ticketModelForId(id, req) {
  if (!mongoReady()) return null;
  try {
    const snap = await getDesk("you");
    const pact = (snap.pacts || []).find((row) => row.id === id);
    if (!pact) return null;
    return ticketCardModel(pact, { origin: originOf(req) });
  } catch {
    return null;
  }
}

export async function handleOgApi(req, res, { send }) {
  const url = new URL(req.url, "http://localhost");
  if (req.method !== "GET") return false;

  const named = url.pathname.match(/^\/api\/og\/ticket\/([^/]+?)(?:\.svg)?$/);
  if (named) {
    const id = decodeURIComponent(named[1]);
    const fromDesk = await ticketModelForId(id, req);
    const fromQuery = ticketCardFromQuery(url.searchParams);
    const model = fromDesk || { ...fromQuery, id: fromQuery.id === "ticket" ? id : fromQuery.id };
    send(res, 200, renderTicketSvg(model), {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=60",
    });
    return true;
  }

  if (url.pathname === "/api/og/ticket.svg") {
    send(res, 200, renderTicketSvg(ticketCardFromQuery(url.searchParams)), {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=60",
    });
    return true;
  }

  return false;
}

export async function htmlWithTicketOg(html, reqPath, req) {
  const match = reqPath.match(/^\/pact\/([^/]+)$/);
  if (!match) return html;
  const id = decodeURIComponent(match[1]);
  const origin = originOf(req);
  const model = (await ticketModelForId(id, req)) || {
    id,
    title: "PACT ticket",
    challenger: "CHALLENGER",
    friend: "FRIEND",
    pot: 0,
    stake: 0,
    status: "open",
    visibility: "public",
    winner: "",
    url: `${origin}/pact/${id}`,
  };
  return injectOgMeta(html, ticketOgTags(model, origin));
}
