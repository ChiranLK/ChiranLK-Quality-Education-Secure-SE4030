import { google } from "googleapis";
import User from "../models/UserModel.js";
import { createJWT } from "../utils/generateToken.js";
import { StatusCodes } from "http-status-codes";
import {
  UnauthenticatedError,
  BadRequestError,
} from "../errors/customErrors.js";
import { sanitizeSignupRole, randomToken, hashToken } from "../utils/oauthSecurity.js";
import LoginTicket from "../models/LoginTicketModel.js";

const getOAuth2Client = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/google-oauth/callback`
  );
};

// Get Google OAuth URL
export const getGoogleAuthUrl = (req, res) => {
  const role = sanitizeSignupRole(req.query.role);
  const oauth2Client = getOAuth2Client();
  
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    state: JSON.stringify({ role }),
    prompt: "consent",
  });

  res.json({ url });
};

// Handle Google OAuth callback (backend callback URL)
export const handleGoogleCallback = async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      throw new BadRequestError("Authorization code is required");
    }

    // Parse state to get role
    let state_data = { role: "user" };
    try {
      if (state) {
        state_data = JSON.parse(decodeURIComponent(state));
      }
    } catch (e) {
      console.log("Could not parse state");
    }

    const oauth2Client = getOAuth2Client();

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info from Google
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    const { id: googleId, email, name, picture } = userInfo.data;

    if (!email) {
      throw new BadRequestError("Email is required from Google account");
    }

    // Check if user already exists
    let user = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { googleId }],
    });

    if (user) {
      // User exists - update if googleId not set
      if (!user.googleId) {
        user.googleId = googleId;
        user.authProvider = "google";
        if (picture) user.avatar = picture;
        await user.save();
      }
    } else {
      // Create new user
      user = await User.create({
        fullName: name || email.split("@")[0],
        email: email.toLowerCase(),
        googleId,
        authProvider: "google",
        avatar: picture,
        role: sanitizeSignupRole(state_data.role),
        // Set placeholder values for required fields (user can update later)
        phoneNumber: "0000000000",
        location: "Not specified",
      });
    }

    // SECURITY: never put the JWT or user data in the URL.
    // Send a random one-time code instead. The frontend swaps it for the
    // token with a POST request (see exchangeLoginCode below).
    const loginCode = randomToken();
    await LoginTicket.create({
      ticketHash: hashToken(loginCode),
      user: user._id,
      expiresAt: new Date(Date.now() + 60 * 1000), // valid for 60 seconds
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const successUrl = new URL(`${frontendUrl}/auth-success`);
    successUrl.searchParams.set("code", loginCode);

    res.setHeader("Referrer-Policy", "no-referrer");
    res.redirect(successUrl.toString());
  } catch (error) {
    // Keep error details in the server log only, never in the URL
    console.error("Google OAuth error:", error.message);

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const errorUrl = new URL(`${frontendUrl}/auth-error`);
    errorUrl.searchParams.set("error", "server_error");
    res.redirect(errorUrl.toString());
  }

};

// POST /api/google-oauth/exchange  { code }
// Swaps the one-time login code for the JWT.
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

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    maxAge: 24 * 60 * 60 * 1000,
  });

  res.status(StatusCodes.OK).json({ token, user: user.toJSON() });
};

// Get Google Auth URL for Calendar (separate from sign-in)
export const getCalendarAuthUrl = (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar"],
    prompt: "consent",
  });

  res.json({ url });
};
