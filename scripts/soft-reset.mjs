#!/usr/bin/env node
/**
 * One-shot soft reset for Atlas before a demo.
 *
 * Deletes:
 *   - groups whose name matches /test\s*group/i  (test group, testgroup, Test Group 2)
 *   - pacts whose title/name matches /\btest\b/i
 *   - related transactions, desk_ledger rows, and matching slips inside `desk`
 *
 * Does NOT wipe users, friends, Auth0 identities, or non-test groups/pacts.
 *
 * SAFETY: refuses unless SOFT_RESET=1.
 * Never prints the Mongo URI.
 */
import { MongoClient } from "mongodb";
import { loadEnvFile } from "../server/loadEnv.js";
import { isTestGroupName, isTestPactTitle, stripDeskTestPacts } from "../src/lib/softReset.js";

loadEnvFile(".env");

if (process.env.SOFT_RESET !== "1") {
  console.error("Refusing to run. Set SOFT_RESET=1 if you really want this one-shot cleanup.");
  process.exit(2);
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || process.env.MONGO_DB_NAME || "pact";

if (!uri) {
  console.error("MONGODB_URI is required.");
  process.exit(2);
}

const client = new MongoClient(uri, {
  maxPoolSize: 4,
  serverSelectionTimeoutMS: 8000,
});

try {
  await client.connect();
  const db = client.db(dbName);

  const groups = await db.collection("groups").find({}).toArray();
  const testGroups = groups.filter((group) => isTestGroupName(group.name));
  const testGroupIds = testGroups.map((group) => group.id).filter(Boolean);
  if (testGroupIds.length) {
    await db.collection("groups").deleteMany({ id: { $in: testGroupIds } });
  } else if (testGroups.length) {
    await db.collection("groups").deleteMany({
      _id: { $in: testGroups.map((group) => group._id) },
    });
  }

  const pacts = await db.collection("pacts").find({}).toArray();
  const testPacts = pacts.filter((pact) => isTestPactTitle(pact.title, pact.name));
  const testPactIds = testPacts.map((pact) => pact.id).filter(Boolean);
  if (testPactIds.length) {
    await db.collection("pacts").deleteMany({ id: { $in: testPactIds } });
    await db.collection("transactions").deleteMany({ pactId: { $in: testPactIds } });
    await db.collection("desk_ledger").deleteMany({ pactId: { $in: testPactIds } });
  }

  let deskRemoved = 0;
  const desk = await db.collection("desk").findOne({ _id: "main" });
  if (desk?.state) {
    const trimmed = stripDeskTestPacts(desk.state);
    if (trimmed.removed) {
      deskRemoved = trimmed.removed;
      await db.collection("desk").updateOne(
        { _id: "main" },
        {
          $set: {
            state: trimmed.state,
            updatedAt: Date.now(),
            softResetAt: Date.now(),
          },
          $inc: { version: 1 },
        },
      );
    }
  }

  const groupCount = testGroups.length;
  const pactCount = testPacts.length;
  console.log(
    `Deleted ${groupCount} test group${groupCount === 1 ? "" : "s"}, ${pactCount} test pact${
      pactCount === 1 ? "" : "s"
    }.`,
  );
  if (deskRemoved) {
    console.log(`Also stripped ${deskRemoved} test-named slip${deskRemoved === 1 ? "" : "s"} from the desk document.`);
  }
} catch (error) {
  const message = String(error?.message ?? error).replace(/mongodb(\+srv)?:\/\/\S+/gi, "mongodb://***");
  console.error(`Soft reset failed: ${message}`);
  process.exit(1);
} finally {
  await client.close().catch(() => {});
}
