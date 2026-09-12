export async function api(path, { token, method = "GET", body } = {}) {
  const response = await fetch(path, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || `Request failed (${response.status})`);
  }
  return result;
}

/** One probe. Retries and stop conditions live in src/lib/pollHygiene.js. */
export async function fetchHealth() {
  for (const path of ["/api/auth/health", "/api/health"]) {
    try {
      const body = await api(path);
      if (body?.auth?.mode || body?.status === "ok") return body;
    } catch {
      /* try the next health URL */
    }
  }
  return { status: "down" };
}
