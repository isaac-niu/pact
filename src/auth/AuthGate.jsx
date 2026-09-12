import { Auth0Provider } from "@auth0/auth0-react";
import { useLocation, useNavigate } from "react-router-dom";
import { AUTH0_CALLBACK_URL, clientEnvReady, env, pageIsHttps } from "../env.js";

export function needsAuth0(pathname) {
  if (pageIsHttps()) return true;
  // Write/Tape/ticket need the session so a signed-in 1v1 can leave the
  // local You/Friend desk and show up for Gemini on /feed.
  return (
    pathname === "/app" ||
    pathname.startsWith("/app/") ||
    pathname === "/callback" ||
    pathname === "/create" ||
    pathname === "/feed" ||
    pathname.startsWith("/pact/") ||
    pathname === "/people" ||
    pathname === "/crew"
  );
}

export default function AuthGate({ children }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const ready = clientEnvReady();
  const https = pageIsHttps();

  if (!ready.ready || !needsAuth0(pathname)) {
    return children;
  }

  return (
    <Auth0Provider
      domain={env.AUTH0_DOMAIN}
      clientId={env.AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: env.AUTH0_CALLBACK_URL || AUTH0_CALLBACK_URL,
        audience: env.AUTH0_AUDIENCE,
        scope: "openid profile email",
      }}
      cacheLocation="localstorage"
      useRefreshTokens={https}
      onRedirectCallback={(appState) => {
        navigate(appState?.returnTo || "/app", { replace: true });
      }}
    >
      {children}
    </Auth0Provider>
  );
}
