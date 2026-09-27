import crypto from "crypto";

// "admin" is not allowed.
export const SELF_SIGNUP_ROLES = ["user", "tutor"];

export const sanitizeSignupRole = (role) =>
  typeof role === "string" && SELF_SIGNUP_ROLES.includes(role) ? role : "user";


export const randomToken = () => crypto.randomBytes(32).toString("base64url");


export const hashToken = (value) =>
  crypto.createHash("sha256").update(String(value)).digest("hex");


export const pkceChallenge = (codeVerifier) =>
  crypto.createHash("sha256").update(codeVerifier).digest("base64url");


export const safeEqual = (a, b) => {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};