export const AUTH_COOKIE_NAME = "token";

const AUTH_COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const sharedAuthCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
});

export const getAuthCookieOptions = () => ({
  ...sharedAuthCookieOptions(),
  maxAge: AUTH_COOKIE_MAX_AGE_MS,
});

export const getAuthCookieClearOptions = () => sharedAuthCookieOptions();
