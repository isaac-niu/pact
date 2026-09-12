import test from "node:test";
import assert from "node:assert/strict";
import { emptyDemoState } from "../src/data/seed.js";
import { bankOf, createDeskLogic } from "./desk.js";
import { listDeskUsers, syncDeskUsers, usersFromState } from "./deskUsers.js";

function memoryDb() {
  const tables = {
    desk_users: new Map(),
    desk_ledger: new Map(),
  };
  return {
    collection(name) {
      const col = tables[name];
      return {
        async bulkWrite(ops) {
          for (const op of ops) {
            const { filter, update } = op.updateOne;
            const prev = col.get(filter.id) || {};
            col.set(filter.id, { ...prev, ...update.$set });
          }
        },
        find() {
          return {
            sort() {
              return {
                async toArray() {
                  return [...col.values()].sort((a, b) => String(a.id).localeCompare(String(b.id)));
                },
              };
            },
          };
        },
      };
    },
  };
}

test("usersFromState persists SOL banks for both desks", () => {
  const state = emptyDemoState();
  const users = usersFromState(state);
  assert.equal(users.length, 2);
  const isaac = users.find((u) => u.id === "you");
  const maya = users.find((u) => u.id === "friend");
  assert.equal(isaac.handle, "ISAAC");
  assert.equal(isaac.balance, bankOf("you", state));
  assert.equal(maya.balance, bankOf("friend", state));
  assert.ok(Number.isFinite(isaac.balance));
});

test("usersFromState drops the staker's bank after a new slip", async () => {
  const desk = createDeskLogic(async () => ({ result: "pass", confidence: 0.9, auto: true }));
  const start = emptyDemoState();
  const before = usersFromState(start).find((u) => u.id === "you").balance;
  const created = await desk.createPact(
    start,
    { title: "Gym", criteria: "Selfie", stake: 2, opponentId: "friend" },
    "you",
  );
  const after = usersFromState(created.state).find((u) => u.id === "you").balance;
  assert.equal(after, before - 2);
});

test("syncDeskUsers upserts SOL banks and ledger rows", async () => {
  const db = memoryDb();
  const state = emptyDemoState();
  const out = await syncDeskUsers(state, { db, force: true });
  assert.equal(out.persist, true);
  const users = await listDeskUsers(db);
  assert.equal(users.length, 2);
  assert.equal(
    users.find((u) => u.id === "you").balance,
    bankOf("you", state),
  );
});
