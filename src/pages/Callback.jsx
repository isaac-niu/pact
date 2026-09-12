import { useAuth0 } from "@auth0/auth0-react";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AUTH0_CALLBACK_URL, clientEnvReady, env } from "../env.js";

function Auth0Callback() {
  const { error, isLoading } = useAuth0();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !error) {
      navigate("/app", { replace: true });
    }
  }, [error, isLoading, navigate]);

  if (error) {
    return (
      <section className="card">
        <h2>Sign-in failed</h2>
        <p role="alert">{error.message}</p>
        <Link className="btn btn-ghost" to="/app">
          Back to Pact app
        </Link>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>Finishing sign-in</h2>
      <p className="hint">Auth0 is returning you to {env.AUTH0_CALLBACK_URL || AUTH0_CALLBACK_URL}.</p>
    </section>
  );
}

export default function Callback() {
  const ready = clientEnvReady();
  if (!ready.ready) {
    return (
      <section className="card">
        <h2>Auth0 callback</h2>
        <p>{ready.message}</p>
        <Link className="btn btn-ghost" to="/app">
          Back to Pact app
        </Link>
      </section>
    );
  }
  return <Auth0Callback />;
}
