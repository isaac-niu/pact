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

export const AUTH0_CALLBACK_URL = "http://localhost:5173/callback";
export const AUTH0_LOGOUT_URL = "http://localhost:5173";
export const AUTH0_ORIGIN = "http://localhost:5173";
export const RECOMMENDED_AUTH0_AUDIENCE = "https://pact-api";

/**
 * Read a single VITE_ env var. Returns undefined when absent.
 */
export function getViteEnv(key) {
  const value = (import.meta.env ?? {})[`VITE_${key}`];
  return value === undefined ? undefined : String(value);
}

export function isMockAuth(environment = process.env) {
  return environment.PACT_MOCK_AUTH === "1";
}

/**
 * Reject the common localhost footgun (`https//localhost`, missing `:`)
 * and other broken schemes. Prefer a stable API identifier such as
 * `https://pact-api` — never bake a tenant-specific secret audience here.
 */
export function validateAuth0Audience(audience) {
  const value = typeof audience === "string" ? audience.trim() : "";
  if (!value) {
    throw new Error(
      "AUTH0_AUDIENCE is required. Use a stable API identifier such as https://pact-api, not a malformed value like https//localhost.",
    );
  }

  if (/https?\/\//i.test(value) && !/^https?:\/\//i.test(value)) {
    throw new Error(
      `AUTH0_AUDIENCE looks malformed (${value}). Missing ':' after the URL scheme. ` +
        `Use a stable API identifier such as ${RECOMMENDED_AUTH0_AUDIENCE}, not https//localhost.`,
    );
  }

  if (/https?\/\//i.test(value)) {
    throw new Error(
      `AUTH0_AUDIENCE looks malformed (${value}). Missing ':' after the URL scheme. ` +
        `Use a stable API identifier such as ${RECOMMENDED_AUTH0_AUDIENCE}, not https//localhost.`,
    );
  }

  if (/^https?:[^/]/i.test(value)) {
    throw new Error(
      `AUTH0_AUDIENCE looks malformed (${value}). Expected a URI such as ${RECOMMENDED_AUTH0_AUDIENCE}.`,
    );
  }

  return value;
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
      "See env-template.txt for a template.",
    ].join("\n");
    throw new Error(msg);
  }

  validateAuth0Audience(environment.AUTH0_AUDIENCE);
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
  AUTH0_AUDIENCE: getViteEnv("AUTH0_AUDIENCE"),
  AUTH0_CALLBACK_URL: getViteEnv("AUTH0_CALLBACK_URL") || AUTH0_CALLBACK_URL,
  API_URL: getViteEnv("API_URL"),
};

/**
 * Check whether the client-side env is fully configured for live Auth0.
 * Returns a human-readable message when something is missing.
 */
export function clientEnvReady() {
  const missing = [];
  if (!env.AUTH0_DOMAIN) missing.push("VITE_AUTH0_DOMAIN");
  if (!env.AUTH0_CLIENT_ID) missing.push("VITE_AUTH0_CLIENT_ID");
  if (!env.AUTH0_AUDIENCE) missing.push("VITE_AUTH0_AUDIENCE");

  if (missing.length > 0) {
    return {
      ready: false,
      message:
        `Missing client env vars: ${missing.join(", ")}. ` +
        "Set them in .env and restart the Vite dev server. " +
        `VITE_AUTH0_AUDIENCE should match AUTH0_AUDIENCE (recommended: ${RECOMMENDED_AUTH0_AUDIENCE}).`,
    };
  }
  return { ready: true, message: null };
}
