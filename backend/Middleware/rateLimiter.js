import { rateLimit } from "express-rate-limit";

// Login: 10 failed attempts per 15 minutes per client.
// Successful logins are not counted, so normal users are not affected.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { msg: "Too many login attempts. Please try again in 15 minutes." },
});

// Forgot / reset password: 5 requests per 15 minutes per client.
// Stops people flooding a user's inbox with reset emails.
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { msg: "Too many password reset requests. Please try again later." },
});

// Other public auth endpoints (e.g. check-email): 20 requests per 15 minutes.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { msg: "Too many requests. Please try again later." },
});