const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

// Start "Sign in with Google" (OpenID Connect + PKCE).
// Full page navigation, so the backend can set the state cookie
// and then redirect to Google.
export const redirectToGoogleOAuth = async (role = "user") => {
  const safeRole = role === "tutor" ? "tutor" : "user";
  window.location.assign(
    `${BACKEND_URL}/api/google-oauth/start?role=${safeRole}`
  );
};