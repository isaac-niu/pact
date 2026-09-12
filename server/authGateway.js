import { createPactRequestHandler } from "../src/backend/server.js";
import { createMongoStore } from "../src/backend/mongo-store.js";
import { connectMongo, pingMongo } from "../src/backend/mongo.js";
import { isMockAuth, validateServerEnv } from "../src/env.js";

let handler = null;
let booted = false;

export function isPersonBApi(req) {
  const url = String(req.url || "").split("?")[0];
  if (url === "/api/auth/health" || url.startsWith("/api/auth/")) return true;
  if (url === "/api/users" || url.startsWith("/api/users/")) return true;
  if (url === "/api/friends" || url.startsWith("/api/friends/")) return true;
  if (url === "/api/groups" || url.startsWith("/api/groups/")) return true;
  if (url === "/api/ledger") return true;
  if (url === "/api/pacts" || url.startsWith("/api/pacts/")) {
    const authz = req.headers.authorization || req.headers.Authorization || "";
    return typeof authz === "string" && /^Bearer /i.test(authz);
  }
  return false;
}

export async function bootAuthApi(environment = process.env) {
  if (booted) return handler;
  booted = true;
  try {
    if (!environment.MONGODB_DB_NAME && environment.MONGO_DB_NAME) {
      environment.MONGODB_DB_NAME = environment.MONGO_DB_NAME;
    }
    if (isMockAuth(environment)) {
      handler = createPactRequestHandler({ mode: "mock" });
      console.log("auth api: mock mode mounted");
      return handler;
    }
    validateServerEnv(environment);
    const { client, db } = await connectMongo({
      uri: environment.MONGODB_URI,
      dbName: environment.MONGODB_DB_NAME,
    });
    handler = createPactRequestHandler({
      mode: "live",
      store: createMongoStore(db),
      auth0Domain: environment.AUTH0_DOMAIN,
      auth0Audience: environment.AUTH0_AUDIENCE,
      mongoHealth: () => pingMongo(client),
    });
    console.log("auth api: live Auth0 mounted");
    return handler;
  } catch {
    handler = createPactRequestHandler({ mode: "mock" });
    console.log("auth api: mock mode fallback");
    return handler;
  }
}

export function getAuthApiHandler() {
  return handler;
}
