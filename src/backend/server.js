import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import { getAuth0PublicUrls, isMockAuth, validateServerEnv } from "../env.js";
import { createAuth0Authenticator, createMockAuthenticator, mockLoginUser } from "./auth.js";
import { LAMPORTS_PER_SOL } from "./constants.js";
import { closeMongo, connectMongo, mongoConfigured, pingMongo } from "./mongo.js";
import { createMongoStore } from "./mongo-store.js";
import { createMemoryStore, publicDirectoryUser, publicPact, publicUser } from "./store.js";
import {
  applyArchiveGroup,
  applyDeleteGroup,
  applyRemoveMember,
  applyTransferOwnership,
} from "../lib/groupAdmin.js";

export { LAMPORTS_PER_SOL };

function corsOrigin() {
  return getAuth0PublicUrls().origin;
}

const send = (res, status, body) => {
  res.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": corsOrigin(),
    "access-control-allow-headers": "authorization, content-type",
    "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
  });
  res.end(JSON.stringify(body));
};

const bodyOf = (req) =>
  new Promise((resolve) => {
    let value = "";
    req.on("data", (part) => {
      value += part;
    });
    req.on("end", () => {
      try {
        resolve(value ? JSON.parse(value) : {});
      } catch {
        resolve(null);
      }
    });
  });

function isParticipant(pact, user) {
  return pact.creatorId === user.id || pact.opponentId === user.id;
}

function isGroupMember(group, user) {
  return Boolean(group?.memberIds?.includes(user.id));
}

function publicGroup(group, user) {
  const { joinCode, pendingMemberIds = [], ...safeGroup } = group;
  if (group.creatorId === user.id) return { ...safeGroup, joinCode, pendingMemberIds };
  return { ...safeGroup, requested: pendingMemberIds.includes(user.id) };
}

async function requestToJoinGroup(store, group, user) {
  if (isGroupMember(group, user)) return { group, status: 200 };
  if (!group.pendingMemberIds.includes(user.id)) group.pendingMemberIds.push(user.id);
  await store.saveGroup(group);
  return { group: { ...group, requested: true }, status: 202 };
}

export function createPactRequestHandler(options = {}) {
  const mode = options.mode ?? "mock";
  const store = options.store ?? createMemoryStore({ seedDemoUsers: mode === "mock" });
  const authenticate =
    options.authenticate ??
    (mode === "live"
      ? createAuth0Authenticator({
          domain: options.auth0Domain ?? process.env.AUTH0_DOMAIN,
          audience: options.auth0Audience ?? process.env.AUTH0_AUDIENCE,
          store,
          verifyAccessToken: options.verifyAccessToken,
          fetchUserInfo: options.fetchUserInfo,
        })
      : createMockAuthenticator(store));
  const mongoHealth =
    options.mongoHealth ??
    (async () =>
      mode === "live"
        ? { configured: mongoConfigured(), mode: "atlas", connected: false }
        : { configured: mongoConfigured(), mode: "memory", connected: false });

  return async function handlePactApi(req, res) {
    const url = new URL(req.url, "http://localhost");
    const urls = getAuth0PublicUrls();

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "access-control-allow-origin": urls.origin,
        "access-control-allow-headers": "authorization, content-type",
        "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
      });
      return res.end();
    }

    if (
      req.method === "GET" &&
      (url.pathname === "/api/health" || url.pathname === "/api/auth/health")
    ) {
      return send(res, 200, {
        status: "ok",
        auth: {
          mode,
          callbackUrl: urls.callbackUrl,
          logoutUrl: urls.logoutUrl,
          origin: urls.origin,
        },
        mongo: await mongoHealth(),
      });
    }

    if (req.method === "POST" && url.pathname === "/api/auth/mock-login") {
      if (mode !== "mock") {
        return send(res, 404, {
          error: "Mock login is disabled. Set PACT_MOCK_AUTH=1 for deterministic local QA.",
        });
      }
      const body = await bodyOf(req);
      const demo = mockLoginUser(body?.as);
      if (!demo) return send(res, 400, { error: "Choose isaac or friend" });
      const user = await store.getUserById(demo.id);
      return send(res, 200, { token: `mock-${user.id}`, user: publicUser(user) });
    }

    const user = await authenticate(req);
    if (!user) return send(res, 401, { error: "Authentication required" });

    if (req.method === "GET" && url.pathname === "/api/auth/me") {
      return send(res, 200, publicUser(user));
    }

    if (req.method === "GET" && url.pathname === "/api/users") {
      const others = (await store.listUsers())
        .filter((entry) => entry.id !== user.id)
        .map((entry) => publicDirectoryUser(entry, user));
      return send(res, 200, others);
    }

    if (req.method === "GET" && url.pathname === "/api/friends") {
      if (!store.requestFriend) return send(res, 501, { error: "Friends are not available" });
      const people = await store.listUsers();
      const byId = Object.fromEntries(people.map((entry) => [entry.id, entry]));
      const pick = (ids = []) =>
        ids
          .map((id) => byId[id])
          .filter(Boolean)
          .map((entry) => publicDirectoryUser(entry, user));
      return send(res, 200, {
        friends: pick(user.friendIds),
        incoming: pick(user.incomingFriendIds),
        outgoing: pick(user.outgoingFriendIds),
      });
    }

    if (req.method === "POST" && url.pathname === "/api/friends") {
      if (!store.requestFriend) return send(res, 501, { error: "Friends are not available" });
      const toId = (await bodyOf(req))?.userId;
      if (!toId) return send(res, 400, { error: "userId is required" });
      try {
        return send(res, 200, await store.requestFriend(user.id, toId));
      } catch (error) {
        return send(res, 400, { error: error.message });
      }
    }

    const friendAccept = url.pathname.match(/^\/api\/friends\/([^/]+)\/accept$/);
    if (req.method === "POST" && friendAccept) {
      if (!store.acceptFriend) return send(res, 501, { error: "Friends are not available" });
      try {
        return send(res, 200, await store.acceptFriend(user.id, decodeURIComponent(friendAccept[1])));
      } catch (error) {
        return send(res, 400, { error: error.message });
      }
    }

    if (req.method === "GET" && url.pathname === "/api/groups") {
      const groups = await store.listGroupsForUser(user.id);
      return send(
        res,
        200,
        groups
          .filter((group) => {
            const admin = group.creatorId === user.id;
            if (group.archivedAt) return admin;
            return group.discoverable || isGroupMember(group, user) || admin;
          })
          .map((group) => publicGroup(group, user)),
      );
    }

    if (req.method === "GET" && url.pathname === "/api/groups/directory") {
      const groups = await store.listGroupsForUser(user.id);
      const needle = (url.searchParams.get("q") || "").trim().toLowerCase();
      const listed = groups
        .filter((group) => group.discoverable && !group.archivedAt)
        .filter((group) => !needle || group.name.toLowerCase().includes(needle))
        .map((group) => publicGroup(group, user));
      return send(res, 200, listed);
    }

    if (req.method === "POST" && url.pathname === "/api/groups") {
      const body = await bodyOf(req);
      const name = body?.name?.trim();
      const visibility = body?.visibility;
      if (!name || !["public", "private"].includes(visibility)) return send(res, 400, { error: "name and visibility are required" });
      const group = await store.createGroup({ name, visibility, discoverable: Boolean(body?.discoverable), creatorId: user.id });
      return send(res, 201, publicGroup(group, user));
    }

    if (req.method === "POST" && url.pathname === "/api/groups/join") {
      const joinCode = (await bodyOf(req))?.joinCode?.trim().toUpperCase();
      if (!joinCode) return send(res, 400, { error: "A join code is required" });
      const group = await store.getGroupByJoinCode(joinCode);
      if (!group) return send(res, 404, { error: "Group not found" });
      const result = await requestToJoinGroup(store, group, user);
      return send(res, result.status, publicGroup(result.group, user));
    }

    const groupMatch = url.pathname.match(/^\/api\/groups\/([^/]+)\/(join|approve|remove|transfer|archive)$/);
    if (req.method === "POST" && groupMatch) {
      const group = await store.getGroup(groupMatch[1]);
      if (!group) return send(res, 404, { error: "Group not found" });
      const action = groupMatch[2];
      if (action === "join") {
        if (!group.discoverable && !isGroupMember(group, user) && group.creatorId !== user.id) return send(res, 403, { error: "Use this group's join code" });
        const result = await requestToJoinGroup(store, group, user);
        return send(res, result.status, publicGroup(result.group, user));
      }
      if (action === "approve") {
        if (group.creatorId !== user.id) return send(res, 403, { error: "Only the group admin can approve members" });
        const memberId = (await bodyOf(req))?.userId;
        if (!group.pendingMemberIds.includes(memberId)) return send(res, 404, { error: "Join request not found" });
        group.pendingMemberIds = group.pendingMemberIds.filter((id) => id !== memberId);
        group.memberIds.push(memberId);
        return send(res, 200, publicGroup(await store.saveGroup(group), user));
      }
      try {
        if (action === "remove") {
          const memberId = (await bodyOf(req))?.userId;
          return send(res, 200, publicGroup(await store.saveGroup(applyRemoveMember(group, user.id, memberId)), user));
        }
        if (action === "transfer") {
          const nextAdminId = (await bodyOf(req))?.userId;
          return send(res, 200, publicGroup(await store.saveGroup(applyTransferOwnership(group, user.id, nextAdminId)), user));
        }
        return send(res, 200, publicGroup(await store.saveGroup(applyArchiveGroup(group, user.id)), user));
      } catch (error) {
        return send(res, 403, { error: error.message });
      }
    }

    const groupDelete = url.pathname.match(/^\/api\/groups\/([^/]+)$/);
    if (req.method === "DELETE" && groupDelete) {
      const group = await store.getGroup(groupDelete[1]);
      if (!group) return send(res, 404, { error: "Group not found" });
      try {
        applyDeleteGroup(group, user.id);
        if (!store.deleteGroup) return send(res, 501, { error: "Groups cannot be deleted" });
        await store.deleteGroup(group.id);
        return send(res, 200, { deleted: true, id: group.id });
      } catch (error) {
        return send(res, 403, { error: error.message });
      }
    }

    if (req.method === "GET" && url.pathname === "/api/pacts") {
      return send(res, 200, (await store.listPactsForUser(user.id)).map(publicPact));
    }

    if (req.method === "POST" && url.pathname === "/api/pacts") {
      const body = await bodyOf(req);
      const opponent = body?.opponentId ? await store.getUserById(body.opponentId) : null;
      const group = body?.groupId ? await store.getGroup(body.groupId) : null;
      if (
        !body?.title?.trim() ||
        !Number.isInteger(body.stakeLamports) ||
        body.stakeLamports <= 0 ||
        (Boolean(opponent) === Boolean(group)) ||
        (opponent && body.opponentId === user.id) ||
        (group && !isGroupMember(group, user))
      ) {
        return send(res, 400, {
          error: "title, positive integer stakeLamports, and one valid counterparty or group are required",
        });
      }
      const pact = await store.createPact({
        title: body.title.trim(),
        stakeLamports: body.stakeLamports,
        creatorId: user.id,
        opponentId: opponent?.id ?? null,
        groupId: group?.id ?? null,
      });
      return send(res, 201, publicPact(pact));
    }

    const pactMatch = url.pathname.match(/^\/api\/pacts\/([^/]+)$/);
    if (req.method === "GET" && pactMatch) {
      const pact = await store.getPact(pactMatch[1]);
      if (!pact) return send(res, 404, { error: "Pact not found" });
      const group = pact.groupId ? await store.getGroup(pact.groupId) : null;
      if (!isParticipant(pact, user) && !(pact.sharedToGroupAt && isGroupMember(group, user))) return send(res, 403, { error: "Forbidden" });
      return send(res, 200, publicPact(pact));
    }

    const shareMatch = url.pathname.match(/^\/api\/pacts\/([^/]+)\/share$/);
    if (req.method === "POST" && shareMatch) {
      const pact = await store.getPact(shareMatch[1]);
      const group = pact?.groupId ? await store.getGroup(pact.groupId) : null;
      if (!pact) return send(res, 404, { error: "Pact not found" });
      if (pact.creatorId !== user.id || !isGroupMember(group, user)) return send(res, 403, { error: "Only the creator can share this pact with its group" });
      pact.sharedToGroupAt = Date.now();
      return send(res, 200, publicPact(await store.savePact(pact)));
    }

    const actionMatch = url.pathname.match(/^\/api\/pacts\/([^/]+)\/(accept|decline|settle)$/);
    if (req.method === "PATCH" && actionMatch) {
      const pact = await store.getPact(actionMatch[1]);
      const action = actionMatch[2];
      if (!pact) return send(res, 404, { error: "Pact not found" });
      const group = pact.groupId ? await store.getGroup(pact.groupId) : null;
      if (!isParticipant(pact, user) && !(pact.sharedToGroupAt && isGroupMember(group, user))) return send(res, 403, { error: "Forbidden" });

      if (action === "accept") {
        const creator = await store.getUserById(pact.creatorId);
        const groupCanAccept = pact.groupId && pact.sharedToGroupAt && isGroupMember(group, user) && user.id !== pact.creatorId;
        if ((!groupCanAccept && user.id !== pact.opponentId) || pact.status !== "draft") {
          return send(res, 409, { error: "Pact cannot be accepted" });
        }
        if (groupCanAccept) pact.opponentId = user.id;
        const opponent = await store.getUserById(pact.opponentId);
        if (
          !creator ||
          !opponent ||
          creator.balanceLamports < pact.stakeLamports ||
          opponent.balanceLamports < pact.stakeLamports
        ) {
          return send(res, 409, { error: "Pact cannot be accepted" });
        }
        creator.balanceLamports -= pact.stakeLamports;
        opponent.balanceLamports -= pact.stakeLamports;
        await store.saveUser(creator);
        await store.saveUser(opponent);
        pact.status = "accepted";
        await store.addTransaction({
          pactId: pact.id,
          type: "lock",
          amountLamports: pact.stakeLamports * 2,
        });
      } else if (action === "decline") {
        if (user.id !== pact.opponentId || pact.status !== "draft") {
          return send(res, 403, { error: "Only the invited counterparty can decline a draft" });
        }
        pact.status = "declined";
        await store.addTransaction({ pactId: pact.id, type: "decline", amountLamports: 0 });
      } else {
        const winner = url.searchParams.get("winnerId");
        const winnerUser = winner ? await store.getUserById(winner) : null;
        if (user.id !== pact.creatorId || pact.status !== "accepted" || !winnerUser) {
          return send(res, 409, { error: "Only the creator can settle an accepted pact with a known winner" });
        }
        winnerUser.balanceLamports += pact.stakeLamports * 2;
        await store.saveUser(winnerUser);
        pact.status = "settled";
        pact.winnerId = winnerUser.id;
        await store.addTransaction({
          pactId: pact.id,
          type: "settle",
          amountLamports: pact.stakeLamports * 2,
        });
      }

      const saved = await store.savePact(pact);
      return send(res, 200, publicPact(saved));
    }

    if (req.method === "GET" && url.pathname === "/api/ledger") {
      return send(res, 200, {
        balanceLamports: user.balanceLamports,
        transactions: await store.listTransactionsForUser(user.id),
      });
    }

    return send(res, 404, { error: "Not found" });
  };
}

export function createPactServer(options = {}) {
  return createServer(createPactRequestHandler(options));
}

export async function startPactServer({
  env: environment = process.env,
  port = Number(environment.PORT ?? 3001),
} = {}) {
  if (isMockAuth(environment)) {
    const server = createPactServer({ mode: "mock" });
    await new Promise((resolve) => server.listen(port, resolve));
    console.log(`PACT API (mock auth, memory store) listening on http://localhost:${port}`);
    return { server, mode: "mock", mongo: null };
  }

  validateServerEnv(environment);
  const { client, db } = await connectMongo({
    uri: environment.MONGODB_URI,
    dbName: environment.MONGODB_DB_NAME,
  });
  const store = createMongoStore(db);
  const server = createPactServer({
    mode: "live",
    store,
    auth0Domain: environment.AUTH0_DOMAIN,
    auth0Audience: environment.AUTH0_AUDIENCE,
    mongoHealth: () => pingMongo(client),
  });

  server.on("close", () => {
    closeMongo(client).catch(() => {});
  });

  await new Promise((resolve) => server.listen(port, resolve));
  console.log(`PACT API (live Auth0, Atlas) listening on http://localhost:${port}`);
  return { server, mode: "live", mongo: { client, db } };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  loadDotenv({ path: ".env" });
  loadDotenv({ path: ".env.local", override: true });
  startPactServer().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
