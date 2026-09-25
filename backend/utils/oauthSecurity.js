import crypto from "crypto";

export const SELF_SIGNUP_ROLES = ["user", "tutor"];

export const sanitizeSignupRole = (role) =>
  typeof role === "string" && SELF_SIGNUP_ROLES.includes(role) ? role : "user";


// Random, URL-safe code (256 bits)
export const randomToken = () => crypto.randomBytes(32).toString("base64url");

// SHA-256 hash. We store only the hash, so a database leak does not expose usable codes.
export const hashToken = (value) =>
  crypto.createHash("sha256").update(String(value)).digest("hex");