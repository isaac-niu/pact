export function isGroupAdmin(group, userId) {
  return Boolean(group && userId && group.creatorId === userId);
}

export function canRemoveMember(group, actorId, memberId) {
  if (!isGroupAdmin(group, actorId)) throw new Error("Only the crew admin can cut a member");
  if (!memberId) throw new Error("Pick a member to cut");
  if (memberId === group.creatorId) throw new Error("Hand the book off before you leave the desk");
  if (!group.memberIds?.includes(memberId)) throw new Error("That desk is not on this crew");
  return true;
}

export function canTransferGroup(group, actorId, nextAdminId) {
  if (!isGroupAdmin(group, actorId)) throw new Error("Only the crew admin can hand the book off");
  if (!nextAdminId) throw new Error("Pick a desk to take the book");
  if (nextAdminId === group.creatorId) throw new Error("That desk already has the book");
  if (!group.memberIds?.includes(nextAdminId)) throw new Error("Only a member can take the book");
  return true;
}

export function applyRemoveMember(group, actorId, memberId) {
  canRemoveMember(group, actorId, memberId);
  return {
    ...group,
    memberIds: group.memberIds.filter((id) => id !== memberId),
    pendingMemberIds: (group.pendingMemberIds || []).filter((id) => id !== memberId),
  };
}

export function applyTransferOwnership(group, actorId, nextAdminId) {
  canTransferGroup(group, actorId, nextAdminId);
  return { ...group, creatorId: nextAdminId };
}

export function applyArchiveGroup(group, actorId, now = Date.now()) {
  if (!isGroupAdmin(group, actorId)) throw new Error("Only the crew admin can scratch this crew");
  return { ...group, archivedAt: now };
}

export function applyDeleteGroup(group, actorId) {
  if (!isGroupAdmin(group, actorId)) throw new Error("Only the crew admin can delete this crew");
  return { deleted: true, id: group.id };
}
