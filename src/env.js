/**
 * Safe environment-variable parsing for the PACT app.
 *
 * Rules:
 *   - Only `VITE_` prefixed variables are exposed to the client bundle.
 *   - Required variables are validated at startup; missing ones throw a
 *     clear error so the dev server does not start silently broken.
 *   - No secret values (API keys, connection strings) are ever written to
 *     tracked files.  They live only in `.env` / `.env.local` which are
 *     git-ignored.
 *
 * Usage in the app:
 *   import { env } from "./env.js";
 *   const domain = env.AUTH0_DOMAIN;          // throws if missing
 *   const clientId = env.AUTH0_CLIENT_ID;     // throws if missing
 *   const apiUrl = env.API_URL ?? "http://localhost:3001";
 */

const REQUIRED = [
  "AUTH0_DOMAIN",
  "AUTH0_CLIENT_ID",
  "AUTH0_CLIENT_SECRET",
  "AUTH0_AUDIENCE",
  "AUTH0_SECRET",
  "MONGODB_URI",
  "MONGODB_DB_NAME",
];

/**
 * Read a single VITE_ env var. Returns undefined when absent.
 */
export function getViteEnv(key) {
  const value = (import.meta.env ?? {})[`VITE_${key}`];
  return value === undefined ? undefined : String(value);
}

/**
 * Validate that all required server-side env vars are present.
 * Throws a descriptive error listing every missing variable.
 */
export function validateServerEnv(environment = process.env) {
  const missing = REQUIRED.filter((k) => {
    const val = environment[k];
    return val === undefined || val.trim() === "";
  });

  if (missing.length > 0) {
    const msg = [
      "PACT startup failed: missing required environment variables.",
      "",
      ...missing.map((k) => `  - ${k}`),
      "",
      "Create a .env file (or .env.local for dev) with these values.",
      "See .env.example for a template.",
    ].join("\n");
    throw new Error(msg);
  }
}

// Retained as a small compatibility alias while the backend is introduced.
export const validateEnv = validateServerEnv;

/**
 * Expose only VITE_ vars to the client as a plain object.
 * Never includes secrets.
 */
export const env = {
  AUTH0_DOMAIN: getViteEnv("AUTH0_DOMAIN"),
  AUTH0_CLIENT_ID: getViteEnv("AUTH0_CLIENT_ID"),
  API_URL: getViteEnv("API_URL"),
};

/**
 * Check whether the client-side env is fully configured.
 * Returns a human-readable message when something is missing.
 */
export function clientEnvReady() {
  const missing = [];
  if (!env.AUTH0_DOMAIN) missing.push("VITE_AUTH0_DOMAIN");
  if (!env.AUTH0_CLIENT_ID) missing.push("VITE_AUTH0_CLIENT_ID");

  if (missing.length > 0) {
    return {
      ready: false,
      message:
        `Missing client env vars: ${missing.join(", ")}. ` +
        "Set them in .env and restart the dev server.",
    };
  }
  return { ready: true, message: null };
}
