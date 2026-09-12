import { createRemoteJWKSet, jwtVerify } from "jose";
import { DEMO_USERS } from "./constants.js";

export function readBearerToken(req) {
  const header = req.headers.authorization ?? req.headers.Authorization;
  if (!header || typeof header !== "string" || !header.startsWith("Bearer ")) {
    return null;
  }
  const token = header.slice("Bearer ".length).trim();
  return token || null;
}

export function createMockAuthenticator(store) {
  return async function authenticate(req) {
    const token = readBearerToken(req);
    if (!token?.startsWith("mock-")) return null;
    return store.getUserById(token.slice("mock-".length));
  };
}

export function mockLoginUser(as) {
  return DEMO_USERS[as] ?? null;
}

export function createJoseVerifier({ domain, audience }) {
  const issuer = `https://${domain}/`;
  const jwks = createRemoteJWKSet(new URL(`${issuer}.well-known/jwks.json`));
  return async function verifyAccessToken(token) {
    try {
      const { payload } = await jwtVerify(token, jwks, { issuer, audience });
      return payload;
    } catch {
      return null;
    }
  };
}

export async function fetchAuth0UserInfo(domain, token) {
  try {
    const response = await fetch(`https://${domain}/userinfo`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export function createAuth0Authenticator({
  domain,
  audience,
  store,
  verifyAccessToken,
  fetchUserInfo,
} = {}) {
  if (!verifyAccessToken && (!domain || !audience)) {
    throw new Error("Live Auth0 authenticator requires domain and audience, or an injected verifier.");
  }

  const verify = verifyAccessToken ?? createJoseVerifier({ domain, audience });
  const userInfo =
    fetchUserInfo ?? (domain ? (token) => fetchAuth0UserInfo(domain, token) : async () => null);

  return async function authenticate(req) {
    const token = readBearerToken(req);
    if (!token) return null;
    const payload = await verify(token);
    if (!payload?.sub) return null;

    const profile = {
      sub: payload.sub,
      name: typeof payload.name === "string" ? payload.name : undefined,
      nickname: typeof payload.nickname === "string" ? payload.nickname : undefined,
      email: typeof payload.email === "string" ? payload.email : undefined,
    };

    if (!profile.name && !profile.email && !profile.nickname) {
      const info = await userInfo(token);
      if (info && typeof info === "object") {
        if (typeof info.name === "string") profile.name = info.name;
        if (typeof info.nickname === "string") profile.nickname = info.nickname;
        if (typeof info.email === "string") profile.email = info.email;
      }
    }

    return store.upsertUserFromAuth(profile);
  };
}
