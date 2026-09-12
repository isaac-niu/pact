export function isListedGroup(group) {
  return Boolean(group?.discoverable && !group?.archivedAt);
}

export function groupsInDirectory(groups, query = "") {
  const needle = String(query ?? "").trim().toLowerCase();
  return (groups || [])
    .filter(isListedGroup)
    .filter((group) => !needle || String(group.name || "").toLowerCase().includes(needle))
    .slice()
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

export function yourCrews(groups, userId) {
  return (groups || []).filter(
    (group) => group.creatorId === userId || (!group.archivedAt && group.memberIds?.includes(userId)),
  );
}

export function demoDirectoryGroups() {
  return [
    {
      id: "demo-dawn-gym",
      name: "Dawn gym",
      visibility: "public",
      discoverable: true,
      creatorId: "demo-coach",
      memberIds: ["demo-coach"],
      pendingMemberIds: [],
      requested: false,
    },
    {
      id: "demo-night-runners",
      name: "Night runners",
      visibility: "public",
      discoverable: true,
      creatorId: "demo-coach",
      memberIds: ["demo-coach"],
      pendingMemberIds: [],
      requested: false,
    },
  ];
}
