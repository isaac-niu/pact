/** Feature flags from env. Never return secret values. */

export function featureFlags(env = process.env) {
  return {
    auth0: Boolean(env.AUTH0_DOMAIN && env.AUTH0_CLIENT_ID),
    mongo: Boolean(env.MONGODB_URI),
    gemini: Boolean(env.GEMINI_API_KEY),
    elevenlabs: Boolean(env.ELEVENLABS_API_KEY),
  };
}

export function publicConfig(env = process.env) {
  const flags = featureFlags(env);
  return {
    ok: true,
    service: "pact",
    announcer: flags.elevenlabs,
    features: flags,
  };
}
