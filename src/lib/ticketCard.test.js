import { describe, expect, it } from "vitest";
import { emptyDemoState } from "../data/seed.js";
import {
  escapeXml,
  injectOgMeta,
  renderTicketSvg,
  ticketCardFromQuery,
  ticketCardModel,
  ticketOgTags,
  ticketShareLine,
} from "./ticketCard.js";

describe("shareable ticket cards", () => {
  it("builds a desk ticket model from a public slip", () => {
    const gym = emptyDemoState().pacts.find((p) => p.id === "demo-settled-gym");
    const model = ticketCardModel(gym, { origin: "https://pact.example" });
    expect(model.challenger).toBe("ISAAC");
    expect(model.friend).toBe("MAYA");
    expect(model.winner).toBe("ISAAC");
    expect(model.pot).toBe(4);
    expect(model.url).toBe("https://pact.example/pact/demo-settled-gym");
    expect(ticketShareLine(model)).toMatch(/PACT SETTLED · ISAAC takes 4.00 SOL/);
  });

  it("renders ticket art as SVG without leaking markup", () => {
    const svg = renderTicketSvg({
      id: "pkt_1",
      title: 'Gym <selfie> & "iron"',
      challenger: "ISAAC",
      friend: "MAYA",
      pot: 4,
      status: "resolved",
      visibility: "public",
      winner: "ISAAC",
    });
    expect(svg).toContain("<svg");
    expect(svg).toContain("ISAAC");
    expect(svg).toContain("GRADED");
    expect(svg).toContain(escapeXml('Gym <selfie> & "iron"'));
    expect(svg).not.toContain("<selfie>");
  });

  it("round-trips query params for the OG endpoint", () => {
    const model = ticketCardFromQuery("title=Run+5K&challenger=ISAAC&friend=MAYA&stake=3&status=open");
    expect(model.title).toBe("Run 5K");
    expect(model.challenger).toBe("ISAAC");
    expect(model.pot).toBe(6);
    const tags = ticketOgTags(model, "https://pact.example");
    expect(tags.image).toContain("/api/og/ticket.svg");
    expect(injectOgMeta("<html><head></head></html>", tags)).toContain('property="og:image"');
  });
});
