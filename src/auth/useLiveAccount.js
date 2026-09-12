import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { env } from "../env.js";
import { useOptionalAuth0 } from "./optionalAuth0.js";

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
    const [identity, directory, social, crew] = await Promise.all([
      api("/api/auth/me", { token }),
      api("/api/users", { token }),
      api("/api/friends", { token }),
      api("/api/groups", { token }),
    ]);
    setMe(identity);
    setPeople(directory);
    setFriends(social);
    setGroups(crew);
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
    friends,
    groups,
    error,
    setError,
    refresh,
    tokenOf,
  };
}
