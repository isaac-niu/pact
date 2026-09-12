import { Auth0Provider } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import { AUTH0_CALLBACK_URL, clientEnvReady, env } from "../env.js";

export default function AuthGate({ children }) {
  const navigate = useNavigate();
  const ready = clientEnvReady();

  if (!ready.ready) {
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
      useRefreshTokens
      onRedirectCallback={(appState) => {
        navigate(appState?.returnTo || "/app", { replace: true });
      }}
    >
      {children}
    </Auth0Provider>
  );
}
