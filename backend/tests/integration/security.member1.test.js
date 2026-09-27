/**
 * Member 1 (IT23472020 - Maduwantha) security regression tests
 * V1  - Google sign-up cannot create an admin account
 * V2  - Login token never travels in a URL (one-time code + POST exchange)
 * V10 - Rate limiting on login and password reset
 * OIDC - Authorization Code + PKCE, state and nonce
 *
 * Run from backend/:
 *   npm test -- --runInBand tests/integration/security.member1.test.js
 *
 * Uses an in-memory MongoDB, so no real database or Google account is touched.
 */
import { jest, describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

jest.setTimeout(60000);

// Test-only environment (fake values, never real secrets)
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_only_jwt_secret_member1_0123456789";
process.env.JWT_EXPIRE_IN = process.env.JWT_EXPIRE_IN || "1d";
process.env.GOOGLE_CLIENT_ID = "test-client-id.apps.googleusercontent.com";
process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
process.env.BACKEND_URL = "http://localhost:5000";
process.env.FRONTEND_URL = "http://localhost:5173";

let mongo;
let app;
let User, LoginTicket, OAuthState;
let sanitizeSignupRole, randomToken, hashToken, pkceChallenge;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  // Dynamic imports so the env values above are set first
  ({ default: User } = await import("../../models/UserModel.js"));
  ({ default: LoginTicket } = await import("../../models/LoginTicketModel.js"));
  ({ default: OAuthState } = await import("../../models/OAuthStateModel.js"));
  ({ sanitizeSignupRole, randomToken, hashToken, pkceChallenge } = await import(
    "../../utils/oauthSecurity.js"
  ));
  const { default: googleOAuthRouter } = await import("../../Routes/googleOAuthRouter.js");
  const { default: authRouter } = await import("../../Routes/authRouter.js");

  app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/google-oauth", googleOAuthRouter);
  app.use("/api/auth", authRouter);
  // Minimal error handler: turns custom errors (BadRequestError, etc.) into status codes
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    res.status(err.statusCode || err.status || 500).json({ msg: err.message });
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

// Helper: start Google sign-in and return the parsed redirect + cookie
const startSignIn = async (role) => {
  const res = await request(app).get(`/api/google-oauth/start?role=${encodeURIComponent(role)}`);
  const location = res.headers.location || "";
  const cookies = res.headers["set-cookie"] || [];
  return { res, url: location ? new URL(location) : null, cookies };
};

// Helper: a Google user in the DB (adjust fields if your UserModel requires more)
const createGoogleUser = () =>
  User.create({
    fullName: "Member One Test",
    email: `m1_${Date.now()}_${Math.random().toString(16).slice(2)}@example.com`,
    googleId: `sub-${Date.now()}`,
    authProvider: "google",
    role: "user",
    phoneNumber: "0000000000",
    location: "Not specified",
  });

// ---------------------------------------------------------------- V1
describe("V1 - Google sign-up role restriction", () => {
  test("allow-list keeps user and tutor", () => {
    expect(sanitizeSignupRole("user")).toBe("user");
    expect(sanitizeSignupRole("tutor")).toBe("tutor");
  });

  test.each([["admin"], ["ADMIN"], ["superadmin"], [""], [undefined], [null], [["admin"]], [{ role: "admin" }]])(
    "untrusted role %p falls back to user",
    (input) => {
      expect(sanitizeSignupRole(input)).toBe("user");
    }
  );

  test("role=admin on /start is stored as user for the sign-in attempt", async () => {
    await OAuthState.deleteMany({});
    const { res } = await startSignIn("admin");
    expect(res.status).toBe(302);
    const saved = await OAuthState.findOne({});
    expect(saved).not.toBeNull();
    expect(saved.role).toBe("user");
  });

  test("role=tutor on /start is kept as tutor", async () => {
    await OAuthState.deleteMany({});
    await startSignIn("tutor");
    const saved = await OAuthState.findOne({});
    expect(saved.role).toBe("tutor");
  });
});

// ---------------------------------------------------------------- V2
describe("V2 - one-time login code instead of token in URL", () => {
  let user;
  beforeEach(async () => {
    await LoginTicket.deleteMany({});
    user = await createGoogleUser();
  });

  const makeTicket = async (expiresInMs = 60000) => {
    const code = randomToken();
    await LoginTicket.create({
      ticketHash: hashToken(code),
      user: user._id,
      expiresAt: new Date(Date.now() + expiresInMs),
    });
    return code;
  };

  test("only the SHA-256 hash of the code is stored", async () => {
    const code = await makeTicket();
    expect(await LoginTicket.findOne({ ticketHash: code })).toBeNull();
    expect(await LoginTicket.findOne({ ticketHash: hashToken(code) })).not.toBeNull();
  });

  test("valid code exchanged by POST returns the session and sets httpOnly cookie", async () => {
    const code = await makeTicket();
    const res = await request(app).post("/api/google-oauth/exchange").send({ code });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.email).toBe(user.email);
    expect(res.body.user.password).toBeUndefined();
    const cookie = (res.headers["set-cookie"] || []).join(";");
    expect(cookie).toMatch(/token=/);
    expect(cookie).toMatch(/HttpOnly/i);
  });

  test("the same code cannot be used twice (replay blocked)", async () => {
    const code = await makeTicket();
    const first = await request(app).post("/api/google-oauth/exchange").send({ code });
    const second = await request(app).post("/api/google-oauth/exchange").send({ code });
    expect(first.status).toBe(200);
    expect(second.status).toBe(400);
    expect(second.body.token).toBeUndefined();
  });

  test("an expired code is rejected", async () => {
    const code = await makeTicket(-1000);
    const res = await request(app).post("/api/google-oauth/exchange").send({ code });
    expect(res.status).toBe(400);
  });

  test.each([[undefined], [""], ["short"], [12345], [{ $gt: "" }], ["x".repeat(500)]])(
    "invalid code %p is rejected",
    async (code) => {
      const res = await request(app).post("/api/google-oauth/exchange").send({ code });
      expect(res.status).toBe(400);
      expect(res.body.token).toBeUndefined();
    }
  );

  test("exchange does not work with GET (code never needs to be in a URL)", async () => {
    const code = await makeTicket();
    const res = await request(app).get(`/api/google-oauth/exchange?code=${code}`);
    expect(res.status).not.toBe(200);
  });
});

// ---------------------------------------------------------------- OIDC
describe("OpenID Connect - Authorization Code + PKCE", () => {
  beforeEach(async () => {
    await OAuthState.deleteMany({});
  });

  test("/start redirects to Google with openid scope, PKCE S256, state and nonce", async () => {
    const { res, url } = await startSignIn("user");
    expect(res.status).toBe(302);
    expect(url.hostname).toBe("accounts.google.com");
    const p = url.searchParams;
    expect(p.get("response_type")).toBe("code");
    expect(p.get("scope").split(" ")).toEqual(expect.arrayContaining(["openid", "email", "profile"]));
    expect(p.get("code_challenge_method")).toBe("S256");
    expect(p.get("code_challenge")).toEqual(expect.any(String));
    expect(p.get("state")).toEqual(expect.any(String));
    expect(p.get("nonce")).toEqual(expect.any(String));
    expect(p.get("access_type")).not.toBe("offline");
  });

  test("state cookie is httpOnly and state is stored only as a hash", async () => {
    const { url, cookies } = await startSignIn("user");
    const stateCookie = cookies.find((c) => c.startsWith("g_oauth_state="));
    expect(stateCookie).toBeDefined();
    expect(stateCookie).toMatch(/HttpOnly/i);

    const state = url.searchParams.get("state");
    expect(await OAuthState.findOne({ stateHash: state })).toBeNull();
    expect(await OAuthState.findOne({ stateHash: hashToken(state) })).not.toBeNull();
  });

  test("code_challenge matches the server-held verifier and nonce is saved", async () => {
    const { url } = await startSignIn("user");
    const saved = await OAuthState.findOne({ stateHash: hashToken(url.searchParams.get("state")) });
    expect(pkceChallenge(saved.codeVerifier)).toBe(url.searchParams.get("code_challenge"));
    expect(saved.nonce).toBe(url.searchParams.get("nonce"));
    expect(saved.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(saved.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 10 * 60 * 1000 + 5000);
  });

  test("callback without the state cookie is rejected (login CSRF)", async () => {
    const { url } = await startSignIn("user");
    const state = url.searchParams.get("state");
    const res = await request(app).get(`/api/google-oauth/callback?code=fake&state=${state}`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/\/auth-error/);
    expect(res.headers.location).not.toMatch(/token=/);
  });

  test("callback with a state that does not match the cookie is rejected", async () => {
    const { cookies } = await startSignIn("user");
    const cookieHeader = cookies.map((c) => c.split(";")[0]).join("; ");
    const res = await request(app)
      .get(`/api/google-oauth/callback?code=fake&state=${randomToken()}`)
      .set("Cookie", cookieHeader);
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/\/auth-error/);
  });

  test("callback with Google error (user cancelled) goes to a fixed error page", async () => {
    const res = await request(app).get("/api/google-oauth/callback?error=access_denied");
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/\/auth-error\?error=[a-z_]+$/);
  });
});

// ---------------------------------------------------------------- V10 (keep last: limiters keep counts in memory)
describe("V10 - rate limiting on authentication endpoints", () => {
  const hitUntilLimited = async (path, body, max = 60) => {
    for (let i = 1; i <= max; i++) {
      const res = await request(app).post(path).send(body);
      if (res.status === 429) return { attempts: i, res };
    }
    return { attempts: null, res: null };
  };

  test("repeated wrong logins are blocked with 429", async () => {
    const { attempts, res } = await hitUntilLimited("/api/auth/login", {
      email: "nobody-member1@example.com",
      password: "WrongPassword1!",
    });
    expect(attempts).not.toBeNull();
    expect(attempts).toBeGreaterThan(1); // real users still get some tries
    expect(attempts).toBeLessThanOrEqual(11); // limit is 10 failed attempts
    expect(res.body.msg).toEqual(expect.any(String));
    expect(res.headers).toHaveProperty("ratelimit-policy");
  });

  test("password reset requests are rate limited", async () => {
    const { attempts } = await hitUntilLimited("/api/auth/forgot-password", {
      email: "nobody-member1@example.com",
    });
    expect(attempts).not.toBeNull();
  });
});