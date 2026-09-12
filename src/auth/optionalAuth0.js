import { useContext } from "react";
import { Auth0Context } from "@auth0/auth0-react";

const EMPTY = {
  isAuthenticated: false,
  isLoading: false,
  user: null,
  getAccessTokenSilently: null,
  loginWithRedirect: null,
  logout: null,
};

export function useOptionalAuth0() {
  return useContext(Auth0Context) || EMPTY;
}
