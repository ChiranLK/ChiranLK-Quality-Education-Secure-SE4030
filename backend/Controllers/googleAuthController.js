
import { google } from "googleapis";
import User from "../models/UserModel.js";
import LoginTicket from "../models/LoginTicketModel.js";
import OAuthState from "../models/OAuthStateModel.js";
import { createJWT } from "../utils/generateToken.js";
import { StatusCodes } from "http-status-codes";
import { BadRequestError } from "../errors/customErrors.js";
import { logSafeError } from "../utils/safeLogger.js";
import { AUTH_COOKIE_NAME, getAuthCookieOptions } from "../utils/authCookie.js";
import {
  sanitizeSignupRole,
  randomToken,
  hashToken,
  pkceChallenge,
  safeEqual,
} from "../utils/oauthSecurity.js";

const STATE_COOKIE = "g_oauth_state";
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes to finish signing in at Google
const LOGIN_CODE_TTL_MS = 60 * 1000; // one-time login code lasts 60 seconds

const getFrontendUrl = () => process.env.FRONTEND_URL || "http://localhost:5173";

const getOAuth2Client = () =>
  new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.BACKEND_URL || "http://localhost:5000"}/api/google-oauth/callback`
  );

const stateCookieOptions = {
  httpOnly: true,
  sameSite: "lax", // sent on the redirect back from Google
  secure: process.env.NODE_ENV === "production",
  path: "/api/google-oauth",
};

// Send the browser to the error page with a fixed code only (never error details)
const redirectWithError = (res, code) => {
  const errorUrl = new URL(`${getFrontendUrl()}/auth-error`);
  errorUrl.searchParams.set("error", code);
  return res.redirect(errorUrl.toString());
};


export const startGoogleSignIn = async (req, res) => {
  const role = sanitizeSignupRole(req.query.role); // "user" or "tutor" only, default to "user" never admin

  const state = randomToken(); 
  const nonce = randomToken(); 
  const codeVerifier = randomToken(); 
  const codeChallenge = pkceChallenge(codeVerifier);

  await OAuthState.create({
    stateHash: hashToken(state),
    codeVerifier,
    nonce,
    role,
    expiresAt: new Date(Date.now() + STATE_TTL_MS),
  });

  res.cookie(STATE_COOKIE, state, { ...stateCookieOptions, maxAge: STATE_TTL_MS });

  const url = getOAuth2Client().generateAuthUrl({
    scope: ["openid", "email", "profile"],
    access_type: "online", // no refresh token needed just to log in
    prompt: "select_account",
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  res.redirect(url);
};

// ─── STEP 2: GET /api/google-oauth/callback?code&state ──────────────────────
export const handleGoogleCallback = async (req, res) => {
  const cookieState = req.cookies?.[STATE_COOKIE];
  res.clearCookie(STATE_COOKIE, stateCookieOptions);

  try {
    const { code, state, error } = req.query;

    // User pressed "Cancel" on Google's screen
    if (error) return redirectWithError(res, "access_denied");

    if (typeof code !== "string" || typeof state !== "string") {
      return redirectWithError(res, "invalid_request");
    }

    // 1. Is this the same browser that started the sign-in?
    if (!safeEqual(cookieState, state)) {
      return redirectWithError(res, "session_expired");
    }

    // 2. Load the saved attempt and delete it in one step (single use)
    const saved = await OAuthState.findOneAndDelete({
      stateHash: hashToken(state),
      expiresAt: { $gt: new Date() },
    });
    if (!saved) return redirectWithError(res, "session_expired");

    // 3. Swap the code for tokens, proving we hold the PKCE verifier
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken({
      code,
      codeVerifier: saved.codeVerifier,
    });
    if (!tokens.id_token) return redirectWithError(res, "invalid_request");

    // 4. Verify the ID token: Google's signature, issuer, expiry, and that
    //    it was issued for OUR app (audience = our client ID)
    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const claims = ticket.getPayload();

    // 5. Our own checks on the ID token
    if (!claims?.sub || !claims.email) return redirectWithError(res, "invalid_request");
    if (!safeEqual(claims.nonce, saved.nonce)) return redirectWithError(res, "invalid_request");
    if (claims.email_verified !== true) return redirectWithError(res, "email_not_verified");

    const googleId = claims.sub; // Google's stable user ID
    const email = claims.email.toLowerCase();

    // 6. Find, link or create the user
    let user = await User.findOne({ googleId });

    if (!user) {
      user = await User.findOne({ email });

      if (user) {
        // This email is already linked to a different Google account
        if (user.googleId && user.googleId !== googleId) {
          return redirectWithError(res, "account_conflict");
        }
        user.googleId = googleId;
        user.authProvider = "google";
        if (claims.picture && !user.avatar?.startsWith("http")) {
          user.avatar = claims.picture;
        }
        await user.save();
      } else {
        user = await User.create({
          fullName: claims.name || email.split("@")[0],
          email,
          googleId,
          authProvider: "google",
          avatar: claims.picture,
          role: saved.role, // from the server-side record, not from the URL
          // Placeholder values the user can update later
          phoneNumber: "0000000000",
          location: "Not specified",
        });
      }
    }

    // 7. One-time login code instead of putting the JWT in the URL
    const loginCode = randomToken();
    await LoginTicket.create({
      ticketHash: hashToken(loginCode),
      user: user._id,
      expiresAt: new Date(Date.now() + LOGIN_CODE_TTL_MS),
    });

    const successUrl = new URL(`${getFrontendUrl()}/auth-success`);
    successUrl.searchParams.set("code", loginCode);
    res.setHeader("Referrer-Policy", "no-referrer");
    return res.redirect(successUrl.toString());
  } catch (err) {
    logSafeError("google_oauth_callback_failed", err, { statusCode: 500 });
    return redirectWithError(res, "server_error");
  }
};


export const exchangeLoginCode = async (req, res) => {
  const { code } = req.body || {};
  if (typeof code !== "string" || code.length < 20 || code.length > 200) {
    throw new BadRequestError("Invalid login code");
  }

  // Find and delete in one step, so each code works only once
  const ticket = await LoginTicket.findOneAndDelete({
    ticketHash: hashToken(code),
    expiresAt: { $gt: new Date() },
  });
  if (!ticket) {
    throw new BadRequestError("Login code is invalid or has expired");
  }

  const user = await User.findById(ticket.user);
  if (!user) {
    throw new BadRequestError("Login code is invalid or has expired");
  }

  const token = createJWT({ userId: user._id, id: user._id, role: user.role });

  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());

  res.status(StatusCodes.OK).json({ token, user: user.toJSON() });
};
