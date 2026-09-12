import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { clientEnvReady, env } from "../env.js";
import { isStubbedSocialError } from "../lib/social.js";
import { challengeTargets, mergeLiveBoard, submitLiveProof } from "../lib/livePacts.js";
import { useOptionalAuth0 } from "./optionalAuth0.js";

async function optionalApi(path, options, fallback) {
  try {
    return await api(path, options);
  } catch (error) {
    if (isStubbedSocialError(error)) return fallback;
    throw error;
  }
}

export function useLivePacts({ pactId } = {}) {
  const auth = useOptionalAuth0();
  const configured = clientEnvReady().ready;
  const signedIn = Boolean(configured && auth.isAuthenticated);
  const [me, setMe] = useState(null);
  const [people, setPeople] = useState([]);
  const [friends, setFriends] = useState([]);
  const [livePacts, setLivePacts] = useState([]);
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const tokenOf = useCallback(async () => {
    if (!auth.getAccessTokenSilently) throw new Error("Sign in first");
    return auth.getAccessTokenSilently({
      authorizationParams: { audience: env.AUTH0_AUDIENCE },
    });
  }, [auth]);

  const refresh = useCallback(async () => {
    if (!signedIn) {
      setMe(null);
      setPeople([]);
      setFriends([]);
      setLivePacts([]);
      setTicket(null);
      return;
    }
    setLoading(true);
    try {
      const token = await tokenOf();
      const [identity, social, directory, list] = await Promise.all([
        api("/api/auth/me", { token }),
        optionalApi("/api/friends", { token }, { friends: [], incoming: [], outgoing: [] }),
        optionalApi("/api/users", { token }, []),
        api("/api/pacts", { token }),
      ]);
      const ones = Array.isArray(list) ? list : [];
      setMe(identity);
      setPeople(directory);
      setFriends(social.friends || []);
      setLivePacts(ones);
      if (pactId) {
        const fromList = ones.find((p) => p.id === pactId);
        if (fromList) {
          setTicket(fromList);
        } else {
          try {
            setTicket(await api(`/api/pacts/${encodeURIComponent(pactId)}`, { token }));
          } catch {
            setTicket(null);
          }
        }
      } else {
        setTicket(null);
      }
      setError("");
    } catch (err) {
      setError(err.message || "Could not load live slips");
    } finally {
      setLoading(false);
    }
  }, [signedIn, tokenOf, pactId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const directory = useMemo(() => {
    const byId = new Map();
    if (me) byId.set(me.id, me);
    for (const person of [...friends, ...people]) byId.set(person.id, person);
    return [...byId.values()];
  }, [me, friends, people]);

  const targets = useMemo(() => challengeTargets(friends, people), [friends, people]);

  async function acceptLive(id) {
    const token = await tokenOf();
    const next = await api(`/api/pacts/${encodeURIComponent(id)}/accept`, {
      token,
      method: "PATCH",
    });
    await refresh();
    return next;
  }

  async function submitLiveEvidence(pact, file) {
    const next = await submitLiveProof(pact, file, tokenOf);
    await refresh();
    return next;
  }

  return {
    signedIn,
    me,
    people,
    friends,
    targets,
    directory,
    livePacts,
    ticket,
    error,
    loading,
    refresh,
    tokenOf,
    acceptLive,
    submitLiveEvidence,
    loginWithRedirect: auth.loginWithRedirect,
    authLoading: auth.isLoading,
  };
}

export function overlayLiveBoard(localPacts, localEvents, livePacts) {
  return mergeLiveBoard(localPacts, localEvents, livePacts);
}
