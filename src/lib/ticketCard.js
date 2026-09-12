import { userById } from "../data/users.js";
import { sol } from "./format.js";
import { pactVisibility } from "./visibility.js";

export const TICKET_CARD_WIDTH = 1200;
export const TICKET_CARD_HEIGHT = 630;

const STAMPS = {
  open: "OPEN",
  accepted: "LIVE",
  evidence: "PROOF",
  judging: "DESK",
  review: "REVIEW",
  appeal: "APPEAL",
  resolved: "GRADED",
};

export function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function ticketCardModel(pact, { origin = "" } = {}) {
  const creator = userById(pact.creatorId);
  const opponent = userById(pact.opponentId);
  const winner = userById(pact.winnerId);
  const pot = Number(pact.stake || 0) * 2;
  return {
    id: pact.id,
    title: pact.title || "Untitled slip",
    criteria: pact.criteria || "",
    stake: Number(pact.stake || 0),
    pot,
    status: pact.status || "open",
    visibility: pactVisibility(pact),
    challenger: creator?.handle || "CHALLENGER",
    friend: opponent?.handle || "FRIEND",
    winner: winner?.handle || "",
    url: origin ? `${origin.replace(/\/$/, "")}/pact/${pact.id}` : `/pact/${pact.id}`,
  };
}

export function ticketCardFromQuery(params) {
  const query = params instanceof URLSearchParams ? params : new URLSearchParams(params || "");
  return {
    id: query.get("id") || "ticket",
    title: query.get("title") || "PACT",
    criteria: query.get("criteria") || "",
    stake: Number(query.get("stake") || 0),
    pot: Number(query.get("pot") || Number(query.get("stake") || 0) * 2),
    status: query.get("status") || "open",
    visibility: query.get("visibility") === "private" ? "private" : "public",
    challenger: query.get("challenger") || "CHALLENGER",
    friend: query.get("friend") || "FRIEND",
    winner: query.get("winner") || "",
    url: query.get("url") || "",
  };
}

export function ticketCardQuery(model) {
  const params = new URLSearchParams({
    id: model.id || "",
    title: model.title || "",
    challenger: model.challenger || "",
    friend: model.friend || "",
    stake: String(model.stake ?? ""),
    pot: String(model.pot ?? ""),
    status: model.status || "",
    visibility: model.visibility || "public",
  });
  if (model.winner) params.set("winner", model.winner);
  if (model.criteria) params.set("criteria", model.criteria);
  return params.toString();
}

export function ticketOgPath(model) {
  if (model?.id && model.id !== "ticket") return `/api/og/ticket/${encodeURIComponent(model.id)}.svg`;
  return `/api/og/ticket.svg?${ticketCardQuery(model || {})}`;
}

export function ticketShareLine(model) {
  if (model.winner) {
    return `PACT SETTLED · ${model.winner} takes ${sol(model.pot)} SOL · ${model.title}`;
  }
  return `PACT · ${model.challenger} vs ${model.friend} · ${model.title}`;
}

export function renderTicketSvg(model) {
  const stamp = STAMPS[model.status] || "OPEN";
  const title = escapeXml(model.title);
  const challenger = escapeXml(model.challenger);
  const friend = escapeXml(model.friend);
  const vis = escapeXml(model.visibility);
  const pot = escapeXml(sol(model.pot));
  const id = escapeXml(model.id);
  const result = model.winner ? escapeXml(`${model.winner} takes the pot`) : "1v1 desk · virtual SOL";
  const holes = Array.from({ length: 9 }, (_, i) => {
    const y = 40 + i * 66;
    return `<circle cx="28" cy="${y}" r="10" fill="#070806"/>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${TICKET_CARD_WIDTH}" height="${TICKET_CARD_HEIGHT}" viewBox="0 0 ${TICKET_CARD_WIDTH} ${TICKET_CARD_HEIGHT}" role="img" aria-label="PACT ticket ${id}">
  <rect width="100%" height="100%" fill="#070806"/>
  <rect x="36" y="36" width="1128" height="558" fill="#12150f" stroke="#3a4228"/>
  <rect x="36" y="36" width="44" height="558" fill="#10120e"/>
  <line x1="80" y1="50" x2="80" y2="580" stroke="#3a4228" stroke-dasharray="6 8"/>
  ${holes}
  <text x="110" y="78" fill="#8d907c" font-family="Barlow, system-ui, sans-serif" font-size="18" letter-spacing="4">PACT · ${vis.toUpperCase()} TAPE · ${id}</text>
  <rect x="980" y="52" width="150" height="40" fill="none" stroke="#f5b942" stroke-width="3" transform="rotate(-6 1055 72)"/>
  <text x="1000" y="80" fill="#f5b942" font-family="Anton, Barlow, sans-serif" font-size="22" letter-spacing="3">${escapeXml(stamp)}</text>
  <text x="110" y="180" fill="#f3f0e6" font-family="Anton, Barlow Condensed, sans-serif" font-size="64">${title}</text>
  <text x="110" y="280" fill="#8d907c" font-family="Barlow, system-ui, sans-serif" font-size="22" letter-spacing="3">CHALLENGER</text>
  <text x="110" y="330" fill="#c8f542" font-family="Anton, sans-serif" font-size="48">${challenger}</text>
  <text x="560" y="318" fill="#8d907c" font-family="Anton, sans-serif" font-size="36">VS</text>
  <text x="680" y="280" fill="#8d907c" font-family="Barlow, system-ui, sans-serif" font-size="22" letter-spacing="3">FRIEND</text>
  <text x="680" y="330" fill="#f3f0e6" font-family="Anton, sans-serif" font-size="48">${friend}</text>
  <text x="110" y="430" fill="#8d907c" font-family="Barlow, system-ui, sans-serif" font-size="20" letter-spacing="3">VIRTUAL SOL POT</text>
  <text x="110" y="500" fill="#c8f542" font-family="IBM Plex Mono, ui-monospace, monospace" font-size="56">${pot}</text>
  <text x="110" y="560" fill="#8d907c" font-family="Barlow, system-ui, sans-serif" font-size="22">${escapeXml(result)}</text>
</svg>`;
}

export function ticketOgTags(model, origin = "") {
  const base = origin.replace(/\/$/, "");
  const imagePath = model.id && model.id !== "ticket"
    ? `${ticketOgPath(model)}?${ticketCardQuery(model)}`
    : ticketOgPath(model);
  const image = base ? `${base}${imagePath}` : imagePath;
  const url = model.url || (base ? `${base}/pact/${model.id}` : `/pact/${model.id}`);
  return {
    title: ticketShareLine(model),
    description: `${model.challenger} vs ${model.friend} · ${sol(model.pot)} SOL pot · ${model.visibility} tape`,
    image,
    url,
  };
}

export function injectOgMeta(html, tags) {
  const block = [
    `<meta property="og:type" content="website"/>`,
    `<meta property="og:title" content="${escapeXml(tags.title)}"/>`,
    `<meta property="og:description" content="${escapeXml(tags.description)}"/>`,
    `<meta property="og:image" content="${escapeXml(tags.image)}"/>`,
    `<meta property="og:url" content="${escapeXml(tags.url)}"/>`,
    `<meta name="twitter:card" content="summary_large_image"/>`,
    `<meta name="twitter:title" content="${escapeXml(tags.title)}"/>`,
    `<meta name="twitter:image" content="${escapeXml(tags.image)}"/>`,
  ].join("");
  if (html.includes("og:title")) {
    return html.replace(/<meta property="og:title"[^>]*>/, block);
  }
  return html.replace("</head>", `${block}</head>`);
}
