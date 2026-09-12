export function isStubbedSocialError(error) {
  const message = String(error?.message || "");
  return /404|501|not_found|not found|unavailable|Friends are not available|auth_api_unavailable/i.test(
    message,
  );
}

export function demoGroup({ name, visibility, discoverable, creatorId }) {
  const id = `demo-${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
  return {
    id,
    name,
    visibility: visibility === "private" ? "private" : "public",
    discoverable: Boolean(discoverable),
    joinCode: id.replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase(),
    creatorId,
    memberIds: creatorId ? [creatorId] : [],
    pendingMemberIds: [],
    requested: false,
  };
}

export async function runSocialAction({ setBusy, setStatus, key, work }) {
  setBusy(key);
  try {
    return await work();
  } catch (error) {
    setStatus({ tone: "err", text: error.message || "That action failed." });
    throw error;
  } finally {
    setBusy("");
  }
}

export async function callOrFallback(work, fallback) {
  try {
    return await work();
  } catch (error) {
    if (!fallback || !isStubbedSocialError(error)) throw error;
    return fallback(error);
  }
}
