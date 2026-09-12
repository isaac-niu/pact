import { describe, expect, it } from "vitest";
import { USER_INDEXES, normalizeIdentity, withIdentity } from "./userIdentity.js";

describe("user identity", () => {
  it("copies Auth0 sub onto id and authSub", () => {
    expect(normalizeIdentity({ sub: "auth0|new" })).toEqual({
      id: "auth0|new",
      sub: "auth0|new",
      authSub: "auth0|new",
    });
  });

  it("fills friend arrays and never leaves sub empty", () => {
    const user = withIdentity({ name: "Ada", sub: "auth0|ada" });
    expect(user.sub).toBe("auth0|ada");
    expect(user.friendIds).toEqual([]);
  });

  it("uses a partial unique index so missing sub is not treated as null", () => {
    const subIndex = USER_INDEXES.find((spec) => spec.name === "sub_1");
    expect(subIndex.partialFilterExpression).toEqual({ sub: { $type: "string" } });
  });
});
