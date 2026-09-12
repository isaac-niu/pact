import { describe, expect, it } from "vitest";
import { createMongoStore } from "./mongo-store.js";

function createFakeCollection(docs = []) {
  const match = (query, doc) => {
    if (!query || Object.keys(query).length === 0) return true;
    if (query.$or) return query.$or.some((part) => match(part, doc));
    return Object.entries(query).every(([key, value]) => {
      if (value && typeof value === "object" && value.$in) {
        return value.$in.includes(doc[key]);
      }
      return doc[key] === value;
    });
  };

  return {
    async findOne(query) {
      const found = docs.find((doc) => match(query, doc));
      return found ? { ...found } : null;
    },
    find(query) {
      const rows = docs.filter((doc) => match(query, doc)).map((doc) => ({ ...doc }));
      return {
        project() {
          return this;
        },
        sort() {
          return this;
        },
        async toArray() {
          return rows;
        },
      };
    },
    async insertOne(doc) {
      docs.push({ ...doc, _id: doc.id });
      return { insertedId: doc.id };
    },
    async updateOne(query, update, options = {}) {
      const index = docs.findIndex((doc) => match(query, doc));
      if (index === -1) {
        if (options.upsert && update.$set) {
          docs.push({ ...update.$set, _id: update.$set.id });
        }
        return { matchedCount: 0 };
      }
      docs[index] = { ...docs[index], ...update.$set };
      return { matchedCount: 1 };
    },
  };
}

describe("mongo store", () => {
  it("persists users, pacts, and ledger entries through the collection API", async () => {
    const db = {
      collection(name) {
        this._cols ??= {
          users: createFakeCollection(),
          pacts: createFakeCollection(),
          transactions: createFakeCollection(),
          groups: createFakeCollection(),
          messages: createFakeCollection(),
        };
        return this._cols[name];
      },
    };
    const store = createMongoStore(db);

    const alice = await store.upsertUserFromAuth({ sub: "auth0|alice", name: "ALICE" });
    const bob = await store.upsertUserFromAuth({ sub: "auth0|bob", name: "BOB" });
    const pact = await store.createPact({
      title: "Atlas pact",
      stakeLamports: 5,
      creatorId: alice.id,
      opponentId: bob.id,
    });
    await store.addTransaction({ pactId: pact.id, type: "lock", amountLamports: 10 });

    expect((await store.getUserByAuthSub("auth0|alice")).name).toBe("ALICE");
    expect((await store.getUserByAuthSub("auth0|alice")).sub).toBe("auth0|alice");
    expect(await store.listPactsForUser(alice.id)).toHaveLength(1);
    expect(await store.listPactsForUser("auth0|stranger")).toHaveLength(0);
    expect(await store.listTransactionsForUser(bob.id)).toHaveLength(1);
  });

  it("stores friend requests and messages", async () => {
    const db = {
      collection(name) {
        this._cols ??= {
          users: createFakeCollection(),
          pacts: createFakeCollection(),
          transactions: createFakeCollection(),
          groups: createFakeCollection(),
          messages: createFakeCollection(),
        };
        return this._cols[name];
      },
    };
    const store = createMongoStore(db);
    const alice = await store.upsertUserFromAuth({ sub: "auth0|alice", name: "ALICE" });
    const bob = await store.upsertUserFromAuth({ sub: "auth0|bob", name: "BOB" });
    expect(await store.requestFriend(alice.id, bob.id)).toEqual({ status: "requested" });
    expect(await store.acceptFriend(bob.id, alice.id)).toEqual({ status: "friends" });
    await store.addMessage({ fromId: alice.id, toId: bob.id, body: "Gym?" });
    expect(await store.listMessages(bob.id, alice.id)).toHaveLength(1);
    expect((await store.listThreads(bob.id))[0].otherId).toBe(alice.id);
  });
});
