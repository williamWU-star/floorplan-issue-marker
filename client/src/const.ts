export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Asset URLs — prefixed with BASE_URL so Vite adds the correct /repo-name/ path
// in production (GitHub Pages) while staying at / in local dev.
const ASSETS_BASE = import.meta.env.BASE_URL ?? "/";
export const LOGO_URL = `${ASSETS_BASE}assets/surveyor-mark.png`;
export const FLOORPLAN_URL = `${ASSETS_BASE}assets/floorplan-house.png`;

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
