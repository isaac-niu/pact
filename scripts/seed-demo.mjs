#!/usr/bin/env node
/**
 * Prints demo fixtures. Does not write Mongo unless you later add an explicit seeder.
 *
 * SAFETY: refuses unless DEMO_SEED=true.
 * SAFETY: refuses NODE_ENV=production unless DEMO_SEED_PRODUCTION=true.
 *
 * The live Node desk auto-inserts this seed once if the `desk` document is missing.
 * It never overwrites an existing Atlas desk.
 */
import { demoPacts } from "../src/data/seed.js";

if (process.env.DEMO_SEED !== "true") {
  console.error("Refusing to seed. Set DEMO_SEED=true if you really want this.");
  process.exit(2);
}

if (process.env.NODE_ENV === "production" && process.env.DEMO_SEED_PRODUCTION !== "true") {
  console.error("Refusing to seed production. Set DEMO_SEED_PRODUCTION=true to override.");
  process.exit(2);
}

const pacts = demoPacts();
console.log(`Demo fixtures (${pacts.length} pacts):`);
console.log(JSON.stringify(pacts, null, 2));
console.log("Empty Atlas `pact.desk` is seeded automatically on first server boot.");
