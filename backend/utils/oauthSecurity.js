import crypto from "crypto";

// Roles a user may choose for themselves. "admin" is not allowed.
export const SELF_SIGNUP_ROLES = ["user", "tutor"];

export const sanitizeSignupRole = (role) =>
  typeof role === "string" && SELF_SIGNUP_ROLES.includes(role) ? role : "user";

// Random, URL-safe value (256 bits). Used for login codes, state, nonce and PKCE.
export const randomToken = () => crypto.randomBytes(32).toString("base64url");

// SHA-256 hash. We store only hashes of one-time secrets.
export const hashToken = (value) =>
  crypto.createHash("sha256").update(String(value)).digest("hex");

// PKCE (RFC 7636, S256): code_challenge = BASE64URL(SHA256(code_verifier))
export const pkceChallenge = (codeVerifier) =>
  crypto.createHash("sha256").update(codeVerifier).digest("base64url");

// Compare two strings in constant time (no timing leaks)
export const safeEqual = (a, b) => {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};