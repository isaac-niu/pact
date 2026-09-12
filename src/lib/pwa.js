export const PWA_MANIFEST = {
  name: "PACT",
  short_name: "PACT",
  description: "Write a slip, stake virtual SOL, prove it, share the ticket.",
  start_url: "/",
  scope: "/",
  display: "standalone",
  background_color: "#070806",
  theme_color: "#070806",
  icons: [
    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
  ],
};

export const PWA_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/pact-logo.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

export function shouldRegisterServiceWorker(env = import.meta.env, nav = globalThis.navigator) {
  return Boolean(env?.PROD && nav && "serviceWorker" in nav);
}

export async function registerServiceWorker(opts = {}) {
  const env = opts.env ?? import.meta.env;
  const nav = opts.navigator ?? globalThis.navigator;
  if (!shouldRegisterServiceWorker(env, nav)) return null;
  return nav.serviceWorker.register(opts.path || "/sw.js");
}

export function isApiRequest(url) {
  const path = typeof url === "string" ? url : url?.pathname || "";
  return path === "/healthz" || path.startsWith("/api/");
}
