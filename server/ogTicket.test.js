import test from "node:test";
import assert from "node:assert/strict";
import { handleOgApi, htmlWithTicketOg } from "./ogTicket.js";

function mockRes() {
  return {
    status: 0,
    body: "",
    headers: {},
  };
}

function send(res, status, body, headers = {}) {
  res.status = status;
  res.body = body;
  res.headers = headers;
}

test("OG query endpoint draws a ticket card", async () => {
  const res = mockRes();
  const handled = await handleOgApi(
    {
      method: "GET",
      url: "/api/og/ticket.svg?title=Gym+selfie&challenger=ISAAC&friend=MAYA&stake=2&status=resolved&winner=ISAAC",
      headers: { host: "localhost:3000" },
    },
    res,
    { send },
  );
  assert.equal(handled, true);
  assert.equal(res.status, 200);
  assert.match(res.headers["content-type"], /image\/svg\+xml/);
  assert.match(String(res.body), /ISAAC/);
  assert.match(String(res.body), /Gym selfie/);
});

test("ticket HTML gets OG image tags", async () => {
  const html = await htmlWithTicketOg(
    "<html><head><title>PACT</title></head></html>",
    "/pact/demo-settled-gym",
    { headers: { host: "localhost:3000" } },
  );
  assert.match(html, /og:image/);
  assert.match(html, /demo-settled-gym/);
});
