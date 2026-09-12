#!/usr/bin/env node
/**
 * Demo seed for Person B's future Mongo layer.
 *
 * SAFETY: refuses to run unless DEMO_SEED=true.
 * SAFETY: refuses if NODE_ENV=production unless DEMO_SEED_PRODUCTION=true as well.
 *
 * Today the live demo still uses client localStorage (see src/demo/fixtures.js).
 * This script only prints fixtures unless MONGODB_URI is set AND a future
 * Person B adapter exists at server/seed/mongo.js — we never invent their schema.
 */
import { demoPacts } from "../src/demo/fixtures.js";

if (process.env.DEMO_SEED !== "true") {
  console.error("Refusing to seed. Set DEMO_SEED=true if you really want this.");
  process.exit(2);
}

if (process.env.NODE_ENV === "production" && process.env.DEMO_SEED_PRODUCTION !== "true") {
  console.error("Refusing to seed production. Set DEMO_SEED_PRODUCTION=true to override.");
  process.exit(2);
}

const pacts = demoPacts();
console.log(`Demo fixtures (${pacts.length} pacts) for localStorage / future Mongo:`);
console.log(JSON.stringify(pacts, null, 2));

if (!process.env.MONGODB_URI) {
  console.log("No MONGODB_URI — nothing written. Client seed fills an empty browser automatically.");
  process.exit(0);
}

console.log(
  "MONGODB_URI is set, but this lane does not write Mongo documents (Person B owns the schema).",
);
console.log("Leave this output for B to map onto users / pacts / ledger collections.");
