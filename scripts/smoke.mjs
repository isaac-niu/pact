#!/usr/bin/env node
/**
 * Production smoke checks. Does not require Auth0/Mongo/Gemini/ElevenLabs.
 *
 *   BASE_URL=http://127.0.0.1:3000 node scripts/smoke.mjs
 */
const base = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");

async function req(path, opts = {}) {
  const res = await fetch(base + path, { ...opts, redirect: "manual" });
  const buf = Buffer.from(await res.arrayBuffer());
  return { res, buf, text: buf.toString("utf8") };
}

function fail(msg) {
  console.error("SMOKE FAIL:", msg);
  process.exit(1);
}

const checks = [];

try {
  const home = await req("/");
  if (home.res.status !== 200) fail(`GET / -> ${home.res.status}`);
  if (!/PACT/i.test(home.text)) fail("homepage missing PACT title");
  checks.push("homepage loads");

  const health = await req("/api/health");
  if (health.res.status !== 200) fail(`GET /api/health -> ${health.res.status}`);
  const body = JSON.parse(health.text);
  if (!body.ok) fail("health.ok is not true");
  if (!body.features || typeof body.features.elevenlabs !== "boolean") {
    fail("health.features.elevenlabs missing");
  }
  if (JSON.stringify(body).toLowerCase().includes("secret")) fail("health leaked a secret-looking field");
  checks.push("health endpoint");

  const cfg = await req("/api/config");
  if (cfg.res.status !== 200) fail(`GET /api/config -> ${cfg.res.status}`);
  checks.push("config endpoint");

  const announce = await req("/api/announce", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      text: "ISAAC completed the challenge. The pact is settled.",
      winner: "ISAAC",
      result: "pass",
    }),
  });
  if (![200, 204, 503].includes(announce.res.status)) {
    fail(`POST /api/announce -> ${announce.res.status}`);
  }
  if (announce.res.status === 204) checks.push("announcer disabled without crash");
  else if (announce.res.status === 200) checks.push("announcer returned audio");
  else checks.push("announcer unavailable handled");

  const spa = await req("/pact/demo-settled-gym");
  if (spa.res.status !== 200) fail(`SPA fallback /pact/:id -> ${spa.res.status}`);
  if (!/PACT/i.test(spa.text)) fail("SPA fallback did not return index.html");
  checks.push("spa fallback");

  const authHealth = await req("/api/auth/health");
  if (authHealth.res.status === 200) {
    const authBody = JSON.parse(authHealth.text);
    if (authBody.auth?.mode !== "live" && authBody.auth?.mode !== "mock") {
      fail("auth health missing mode");
    }
    if (JSON.stringify(authBody).toLowerCase().includes("secret")) fail("auth health leaked a secret");
    checks.push(`auth api ${authBody.auth.mode}`);
  } else if (authHealth.res.status === 503) {
    checks.push("auth api not mounted");
  } else {
    fail(`GET /api/auth/health -> ${authHealth.res.status}`);
  }

  console.log(`SMOKE OK @ ${base}`);
  for (const c of checks) console.log(" -", c);
  console.log("features", body.features);
} catch (err) {
  fail(err.message || String(err));
}
