import test from "node:test";
import assert from "node:assert/strict";
import { mongoConfigured, mongoDbName } from "./mongo.js";

test("mongo helpers read Atlas env names Person B already uses", () => {
  assert.equal(mongoDbName({ MONGO_DB_NAME: "pact", MONGODB_DB_NAME: "other" }), "other");
  assert.equal(mongoDbName({ MONGO_DB_NAME: "pact" }), "pact");
  assert.equal(mongoConfigured({}), false);
  assert.equal(mongoConfigured({ MONGODB_URI: "mongodb://localhost" }), true);
});
