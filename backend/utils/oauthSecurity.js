export const SELF_SIGNUP_ROLES = ["user", "tutor"];

export const sanitizeSignupRole = (role) =>
  typeof role === "string" && SELF_SIGNUP_ROLES.includes(role) ? role : "user";