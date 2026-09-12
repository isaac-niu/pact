import { Auth0Provider } from "@auth0/auth0-react";
import { useLocation, useNavigate } from "react-router-dom";
import { AUTH0_CALLBACK_URL, clientEnvReady, env, pageIsHttps } from "../env.js";

function needsAuth0(pathname) {
  if (pageIsHttps()) return true;
  // /create needs a live Auth0 session too: it offers "send to a group",
  // which is an authenticated-desk feature (real multi-person groups only
  // exist behind Auth0 + Mongo, not the local you/friend desk).
  return (
    pathname === "/app" ||
    pathname.startsWith("/app/") ||
    pathname === "/callback" ||
    pathname === "/create"
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
