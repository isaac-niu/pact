import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { env } from "../env.js";
import { isStubbedSocialError } from "../lib/social.js";
import { useOptionalAuth0 } from "./optionalAuth0.js";

async function optionalApi(path, options, fallback) {
  try {
    return await api(path, options);
  } catch (error) {
    if (isStubbedSocialError(error)) return fallback;
    throw error;
  }
}

export function useLiveAccount() {
  const auth0 = useOptionalAuth0();
  const [me, setMe] = useState(null);
  const [people, setPeople] = useState([]);
  const [friends, setFriends] = useState({ friends: [], incoming: [], outgoing: [] });
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState("");

  const ready = Boolean(auth0.isAuthenticated && env.AUTH0_DOMAIN);
  const tokenOf = useCallback(async () => {
    if (!auth0.getAccessTokenSilently) throw new Error("Sign in first");
    return auth0.getAccessTokenSilently({
      authorizationParams: { audience: env.AUTH0_AUDIENCE },
    });
  }, [auth0]);

  const refresh = useCallback(async () => {
    if (!ready) return;
    const token = await tokenOf();
    const [identity, directory, social, crew, listed] = await Promise.all([
      api("/api/auth/me", { token }),
      optionalApi("/api/users", { token }, []),
      optionalApi("/api/friends", { token }, { friends: [], incoming: [], outgoing: [] }),
      optionalApi("/api/groups", { token }, []),
      optionalApi("/api/groups/directory", { token }, []),
    ]);
    setMe(identity);
    setPeople(directory);
    setFriends(social);
    const byId = new Map();
    for (const group of [...listed, ...crew]) byId.set(group.id, { ...byId.get(group.id), ...group });
    setGroups([...byId.values()]);
  }, [ready, tokenOf]);

  useEffect(() => {
    if (!ready) {
      setMe(null);
      return undefined;
    }
    let cancelled = false;
    refresh().catch((err) => {
      if (!cancelled) setError(err.message);
    });
    return () => {
      cancelled = true;
    };
  }, [ready, refresh]);

  return {
    ...auth0,
    live: ready,
    me,
    people,
    setPeople,
    friends,
    setFriends,
    groups,
    setGroups,
    error,
    setError,
    refresh,
    tokenOf,
  };
}
