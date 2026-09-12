/** Groups named like "test group", "testgroup", "Test Group 2". */
export const TEST_GROUP_NAME = /test\s*group/i;

/** Obviously-test pacts — title/name contains the word "test". */
export const TEST_PACT_TITLE = /\btest\b/i;

export function isTestGroupName(name) {
  return TEST_GROUP_NAME.test(String(name ?? ""));
}

export function isTestPactTitle(...fields) {
  return fields.some((field) => TEST_PACT_TITLE.test(String(field ?? "")));
}

export function pactIdsToDelete(pacts) {
  return (pacts || [])
    .filter((pact) => isTestPactTitle(pact?.title, pact?.name))
    .map((pact) => pact.id)
    .filter(Boolean);
}

export function stripDeskTestPacts(state) {
  if (!state || !Array.isArray(state.pacts)) return { state, removed: 0 };
  const drop = new Set(pactIdsToDelete(state.pacts));
  if (drop.size === 0) return { state, removed: 0 };
  return {
    removed: drop.size,
    state: {
      ...state,
      pacts: state.pacts.filter((pact) => !drop.has(pact.id)),
      events: (state.events || []).filter((row) => !drop.has(row.pactId)),
      ledger: (state.ledger || []).filter((row) => !drop.has(row.pactId)),
      notifications: (state.notifications || []).filter((row) => !drop.has(row.pactId)),
    },
  };
}
