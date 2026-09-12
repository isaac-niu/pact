import { describe, expect, it } from "vitest";
import { mongoConfigured, redactSecrets } from "./mongo.js";
import { USER_INDEXES } from "./userIdentity.js";

describe("mongo helpers", () => {
  it("redacts connection strings from error text", () => {
    expect(
      redactSecrets("failed mongodb+srv://user:pass@cluster.mongodb.net/pact boom"),
    ).toBe("failed mongodb://*** boom");
  });

  it("detects whether Atlas env is present without reading secret values", () => {
    expect(mongoConfigured({})).toBe(false);
    expect(mongoConfigured({ MONGODB_URI: "mongodb://localhost", MONGODB_DB_NAME: "pact" })).toBe(true);
  });

  it("keeps unique authSub from colliding on missing fields", () => {
    const authSub = USER_INDEXES.find((spec) => spec.name === "authSub_1");
    expect(authSub.unique).toBe(true);
    expect(authSub.partialFilterExpression).toEqual({ authSub: { $type: "string" } });
  });
});
