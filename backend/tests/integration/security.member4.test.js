/**
 * Member 4 security regression suite
 * NIMADITH LMH - IT23242272
 * Covers V9, V11, V12, and V13 without external network services.
 */

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import bcrypt from "bcryptjs";
import request from "supertest";

const SYNTHETIC_AUTH_TOKEN = "member4-synthetic-auth-marker";
const SYNTHETIC_STRONG_PASSWORD = ["M4", "Secure", "!", "2026"].join("");
const TEST_FRONTEND_ORIGIN = "http://frontend.example.test";

const userModelMock = {
  create: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndDelete: jest.fn(),
  countDocuments: jest.fn(),
  find: jest.fn(),
};

const studyMaterialModelMock = {
  deleteMany: jest.fn(),
};

const mailMocks = {
  sendLoginNotificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  sendPasswordChangedEmail: jest.fn(),
};

const createJWTMock = jest.fn(() => SYNTHETIC_AUTH_TOKEN);
const verifyJWTMock = jest.fn();
const oauthClientMock = {
  generateAuthUrl: jest.fn(),
  getToken: jest.fn(),
  setCredentials: jest.fn(),
};
const oauthUserInfoGetMock = jest.fn();
const OAuth2Mock = jest.fn(function OAuth2MockImplementation() {
  return oauthClientMock;
});

jest.unstable_mockModule("../../models/UserModel.js", () => ({
  default: userModelMock,
}));

jest.unstable_mockModule("../../models/StudyMaterialModel.js", () => ({
  default: studyMaterialModelMock,
}));

jest.unstable_mockModule("../../services/feedbackMailService.js", () => mailMocks);

jest.unstable_mockModule("../../utils/generateToken.js", () => ({
  createJWT: createJWTMock,
  verifyJWT: verifyJWTMock,
}));

jest.unstable_mockModule("googleapis", () => ({
  google: {
    auth: { OAuth2: OAuth2Mock },
    oauth2: jest.fn(() => ({
      userinfo: { get: oauthUserInfoGetMock },
    })),
  },
}));

const express = (await import("express")).default;
const cors = (await import("cors")).default;
const cookieParser = (await import("cookie-parser")).default;
const authRouter = (await import("../../Routes/authRouter.js")).default;
const googleOAuthRouter = (await import("../../Routes/googleOAuthRouter.js")).default;
const { errorHandler } = await import("../../Middleware/errorHandler.js");
const {
  GENERIC_SERVER_ERROR,
  sanitizeProductionErrorResponses,
} = await import("../../Middleware/errorResponseSanitizer.js");
const { securityHeaders } = await import("../../Middleware/securityHeaders.js");
const { BadRequestError } = await import("../../errors/customErrors.js");
const { logSafeError, logSafeEvent } = await import("../../utils/safeLogger.js");
const { hashPassword } = await import("../../utils/passwordUtils.js");
const {
  PASSWORD_POLICY_MESSAGE,
  meetsPasswordPolicy,
} = await import("../../utils/passwordPolicy.js");
const {
  getAuthCookieClearOptions,
  getAuthCookieOptions,
} = await import("../../utils/authCookie.js");

const testApp = express();
testApp.use(securityHeaders);
testApp.use(
  cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  }),
);
testApp.use(express.json());
testApp.use(express.urlencoded({ extended: true }));
testApp.use(cookieParser());
testApp.use(sanitizeProductionErrorResponses);

testApp.get("/api/member4-health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

testApp.get("/test/internal-error", (req, res, next) => {
  const error = new Error("Synthetic internal database exception");
  error.stack =
    "Error: Synthetic internal database exception\n" +
    "    at syntheticHandler (C:\\internal\\member4-controller.js:10:5)";
  next(error);
});

testApp.get("/test/controller-error", (req, res) => {
  res.status(500).json({
    message: "Synthetic controller implementation detail",
    stack: "C:\\internal\\controller.js:20:3",
  });
});

testApp.get("/test/bad-request", (req, res, next) => {
  next(new BadRequestError("Synthetic request validation failed"));
});

testApp.use("/api/auth", authRouter);
testApp.use("/api/google-oauth", googleOAuthRouter);
testApp.use(errorHandler);

const originalEnvironment = {
  nodeEnv: process.env.NODE_ENV,
  safeStacks: process.env.ENABLE_SAFE_STACK_LOGS,
  frontendUrl: process.env.FRONTEND_URL,
};

let consoleLogSpy;
let consoleErrorSpy;
let storedPasswordHash;

const buildStoredUser = (overrides = {}) => ({
  _id: "member4-user-id",
  fullName: "Member Four Synthetic User",
  email: "member4.user@example.test",
  password: storedPasswordHash,
  phoneNumber: "0700000000",
  location: "Test Location",
  grade: "",
  role: "user",
  avatar: "uploads/default-avatar.png",
  tutorProfile: undefined,
  googleId: "synthetic-google-id",
  authProvider: "local",
  save: jest.fn().mockResolvedValue(undefined),
  toJSON() {
    return {
      _id: this._id,
      fullName: this.fullName,
      email: this.email,
      role: this.role,
    };
  },
  ...overrides,
});

const registrationBody = (password = SYNTHETIC_STRONG_PASSWORD) => ({
  fullName: "Member Four Synthetic User",
  email: "member4.user@example.test",
  password,
  phoneNumber: "0700000000",
  location: "Test Location",
  role: "user",
});

const cookieParts = (response) => {
  const header = response.headers["set-cookie"]?.[0];
  expect(header).toBeDefined();
  const [pair, ...attributes] = header.split(";");
  return {
    pair,
    attributes: attributes.map((attribute) => attribute.trim().toLowerCase()),
  };
};

const restoreEnvironmentValue = (name, value) => {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
};

beforeAll(async () => {
  storedPasswordHash = await bcrypt.hash(SYNTHETIC_STRONG_PASSWORD, 4);
});

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NODE_ENV = "test";
  delete process.env.ENABLE_SAFE_STACK_LOGS;
  process.env.FRONTEND_URL = TEST_FRONTEND_ORIGIN;

  consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

  userModelMock.findOne.mockReset().mockResolvedValue(null);
  userModelMock.create.mockReset().mockImplementation(async (data) => ({
    _id: "created-member4-user-id",
    ...data,
  }));
  userModelMock.findById.mockReset().mockResolvedValue(null);
  userModelMock.findByIdAndDelete.mockReset().mockResolvedValue(null);
  userModelMock.countDocuments.mockReset().mockResolvedValue(2);

  mailMocks.sendLoginNotificationEmail.mockReset().mockResolvedValue(undefined);
  mailMocks.sendPasswordResetEmail.mockReset().mockResolvedValue(undefined);
  mailMocks.sendPasswordChangedEmail.mockReset().mockResolvedValue(undefined);
  createJWTMock.mockReset().mockReturnValue(SYNTHETIC_AUTH_TOKEN);
  verifyJWTMock.mockReset();

  oauthClientMock.generateAuthUrl.mockReset().mockReturnValue(
    "https://accounts.example.test/synthetic-oauth",
  );
  oauthClientMock.getToken.mockReset().mockResolvedValue({
    tokens: { access_token: "synthetic-provider-marker" },
  });
  oauthClientMock.setCredentials.mockReset().mockImplementation(() => {});
  oauthUserInfoGetMock.mockReset().mockResolvedValue({
    data: {
      id: "synthetic-google-id",
      email: "oidc.user@example.test",
      name: "Synthetic OIDC User",
      picture: "https://images.example.test/avatar.png",
    },
  });
});

afterEach(() => {
  consoleLogSpy.mockRestore();
  consoleErrorSpy.mockRestore();
  restoreEnvironmentValue("NODE_ENV", originalEnvironment.nodeEnv);
  restoreEnvironmentValue(
    "ENABLE_SAFE_STACK_LOGS",
    originalEnvironment.safeStacks,
  );
  restoreEnvironmentValue("FRONTEND_URL", originalEnvironment.frontendUrl);
});

describe("V9 - sensitive logging and sanitized error responses", () => {
  it("V9-T01: sensitive token, authorization, and cookie values are not logged", () => {
    const sensitiveMarker = "synthetic-sensitive-token-marker";

    logSafeEvent("authentication_checked", {
      outcome: "success",
      token: sensitiveMarker,
      authorization: `Bearer ${sensitiveMarker}`,
      cookie: `token=${sensitiveMarker}`,
    });

    const logged = JSON.stringify(consoleLogSpy.mock.calls);
    expect(logged).not.toContain(sensitiveMarker);
    expect(logged).not.toContain("authorization");
    expect(logged).not.toContain("cookie");
  });

  it("V9-T02: complete user, password, and token objects are not logged", () => {
    const sensitiveMarker = "synthetic-user-secret-marker";

    logSafeError("authentication_failed", new Error("Synthetic failure"), {
      count: 1,
      user: {
        email: "private.user@example.test",
        password: sensitiveMarker,
        token: sensitiveMarker,
      },
    });

    const logged = JSON.stringify(consoleErrorSpy.mock.calls);
    expect(logged).not.toContain(sensitiveMarker);
    expect(logged).not.toContain("private.user@example.test");
    expect(logged).not.toContain("password");
    expect(logged).toContain('"count":1');
  });

  it("V9-T03: production 500 responses hide stacks, paths, and exception details", async () => {
    process.env.NODE_ENV = "production";

    const responses = await Promise.all([
      request(testApp).get("/test/internal-error").expect(500),
      request(testApp).get("/test/controller-error").expect(500),
    ]);

    responses.forEach((response) => {
      const serialized = JSON.stringify(response.body);
      expect(response.body.message).toBe(GENERIC_SERVER_ERROR);
      expect(serialized).not.toContain("database exception");
      expect(serialized).not.toContain("implementation detail");
      expect(serialized).not.toContain("member4-controller.js");
      expect(serialized).not.toContain("C:\\internal");
      expect(response.body).not.toHaveProperty("stack");
    });
  });

  it("V9-T04: development diagnostics are opt-in and omit credential text", () => {
    const sensitiveMarker = "synthetic-development-credential";
    process.env.NODE_ENV = "development";
    process.env.ENABLE_SAFE_STACK_LOGS = "true";
    const error = new Error(`Authentication failed for ${sensitiveMarker}`);
    error.stack =
      `Error: Authentication failed for ${sensitiveMarker}\n` +
      "    at syntheticHandler (C:\\development\\auth.js:12:4)";

    logSafeError("development_auth_failure", error, {
      statusCode: 500,
      authorization: `Bearer ${sensitiveMarker}`,
    });

    const entry = consoleErrorSpy.mock.calls.at(-1)[1];
    expect(entry.errorType).toBe("Error");
    expect(entry.stack).toContain("syntheticHandler");
    expect(JSON.stringify(entry)).not.toContain(sensitiveMarker);
    expect(entry).not.toHaveProperty("authorization");
  });

  it("V9-T05: normal client error handling still returns its safe 400 message", async () => {
    const response = await request(testApp).get("/test/bad-request").expect(400);

    expect(response.body).toMatchObject({
      success: false,
      message: "Synthetic request validation failed",
      statusCode: 400,
    });
    expect(response.body).not.toHaveProperty("stack");
  });
});

describe("V11 - prevent email and role enumeration", () => {
  it("V11-T01: existing and non-existing emails receive identical safe responses", async () => {
    const existing = await request(testApp)
      .post("/api/auth/check-email")
      .send({ email: "  MEMBER4.USER@EXAMPLE.TEST " });
    const nonExisting = await request(testApp)
      .post("/api/auth/check-email")
      .send({ email: "absent.user@example.test" });

    expect(existing.status).toBe(200);
    expect(nonExisting.status).toBe(200);
    expect(existing.body).toEqual(nonExisting.body);
    expect(userModelMock.findOne).not.toHaveBeenCalled();
  });

  it("V11-T02: check-email never includes a role or echoed email", async () => {
    const response = await request(testApp)
      .post("/api/auth/check-email")
      .send({ email: "member4.user@example.test" })
      .expect(200);

    expect(response.body).not.toHaveProperty("role");
    expect(response.body).not.toHaveProperty("email");
    expect(JSON.stringify(response.body)).not.toMatch(/admin|tutor/i);
  });

  it("V11-T03: invalid email input is rejected with a safe validation response", async () => {
    const response = await request(testApp)
      .post("/api/auth/check-email")
      .send({ email: "not-an-email" })
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      msg: "A valid email address is required",
    });
    expect(response.body).not.toHaveProperty("role");
  });

  it("V11-T04: valid registration and login remain functional", async () => {
    userModelMock.findOne.mockResolvedValueOnce(null);
    userModelMock.create.mockResolvedValueOnce({ role: "user" });

    const registration = await request(testApp)
      .post("/api/auth/register")
      .send(registrationBody())
      .expect(201);

    const storedUser = buildStoredUser();
    userModelMock.findOne.mockResolvedValueOnce(storedUser);
    const login = await request(testApp)
      .post("/api/auth/login")
      .send({ email: storedUser.email, password: SYNTHETIC_STRONG_PASSWORD })
      .expect(200);

    expect(registration.body.msg).toMatch(/created/i);
    expect(login.body.user).toMatchObject({
      email: storedUser.email,
      role: "user",
    });
    expect(login.body.user).not.toHaveProperty("password");
    expect(mailMocks.sendLoginNotificationEmail).toHaveBeenCalledTimes(1);
  });
});

describe("V12 - strong password policy and secure seed credentials", () => {
  it("V12-T01: passwords below eight characters are rejected", () => {
    expect(meetsPasswordPolicy("Aa1!xyz")).toBe(false);
  });

  it.each([
    ["uppercase", "lowercase1!"],
    ["lowercase", "UPPERCASE1!"],
    ["number", "NoNumber!"],
    ["special character", "NoSpecial1"],
  ])("V12-T02: a password missing %s is rejected", (requirement, password) => {
    expect(requirement).toBeTruthy();
    expect(meetsPasswordPolicy(password)).toBe(false);
  });

  it("V12-T03: a valid strong password is accepted", () => {
    expect(meetsPasswordPolicy(SYNTHETIC_STRONG_PASSWORD)).toBe(true);
  });

  it("V12-T04: registration enforces the shared password policy", async () => {
    const response = await request(testApp)
      .post("/api/auth/register")
      .send(registrationBody("MissingSpecial1"))
      .expect(400);

    expect(response.body.message).toContain(PASSWORD_POLICY_MESSAGE);
    expect(userModelMock.create).not.toHaveBeenCalled();
  });

  it("V12-T05: the password reset/change flow rejects a weak password", async () => {
    const response = await request(testApp)
      .post("/api/auth/reset-password/synthetic-reset-code")
      .send({ password: "missinguppercase1!" })
      .expect(400);

    expect(response.body.message).toBe(PASSWORD_POLICY_MESSAGE);
    expect(userModelMock.findOne).not.toHaveBeenCalled();
  });

  it("V12-T06: the password reset/change flow accepts and hashes a strong password", async () => {
    const resetUser = buildStoredUser();
    userModelMock.findOne.mockResolvedValueOnce(resetUser);

    const response = await request(testApp)
      .post("/api/auth/reset-password/synthetic-reset-code")
      .send({ password: SYNTHETIC_STRONG_PASSWORD })
      .expect(200);

    expect(await bcrypt.compare(SYNTHETIC_STRONG_PASSWORD, resetUser.password)).toBe(
      true,
    );
    expect(resetUser.save).toHaveBeenCalledTimes(1);
    expect(response.body).not.toHaveProperty("password");
    expect(mailMocks.sendPasswordChangedEmail).toHaveBeenCalledTimes(1);
  });

  it("V12-T07: submitted passwords are neither returned nor logged", async () => {
    userModelMock.findOne.mockResolvedValueOnce(null);
    userModelMock.create.mockResolvedValueOnce({ role: "user" });

    const response = await request(testApp)
      .post("/api/auth/register")
      .send(registrationBody())
      .expect(201);

    const logged = JSON.stringify([
      ...consoleLogSpy.mock.calls,
      ...consoleErrorSpy.mock.calls,
    ]);
    expect(JSON.stringify(response.body)).not.toContain(SYNTHETIC_STRONG_PASSWORD);
    expect(logged).not.toContain(SYNTHETIC_STRONG_PASSWORD);
  });

  it("V12-T08: missing seed credentials stop before account creation", async () => {
    const seedNames = [
      "SEED_STUDENT_EMAIL",
      "SEED_STUDENT_PASSWORD",
      "SEED_TUTOR_EMAIL",
      "SEED_TUTOR_PASSWORD",
      "SEED_PRIMARY_ADMIN_EMAIL",
      "SEED_PRIMARY_ADMIN_PASSWORD",
      "SEED_SECONDARY_ADMIN_EMAIL",
      "SEED_SECONDARY_ADMIN_PASSWORD",
    ];
    const previousValues = Object.fromEntries(
      seedNames.map((name) => [name, process.env[name]]),
    );
    const previousFetch = global.fetch;
    const previousExitCode = process.exitCode;
    const fetchMock = jest.fn();

    try {
      seedNames.forEach((name) => {
        process.env[name] = "";
      });
      global.fetch = fetchMock;
      await import("../../seed-users.js");
      await new Promise((resolve) => setImmediate(resolve));

      expect(fetchMock).not.toHaveBeenCalled();
      expect(JSON.stringify(consoleLogSpy.mock.calls)).toContain(
        "user_seed_skipped_missing_credentials",
      );
    } finally {
      seedNames.forEach((name) =>
        restoreEnvironmentValue(name, previousValues[name]),
      );
      global.fetch = previousFetch;
      process.exitCode = previousExitCode ?? 0;
    }
  });

  it("V12-T09: password hashing uses bcrypt cost factor 12", async () => {
    const hash = await hashPassword(SYNTHETIC_STRONG_PASSWORD);

    expect(bcrypt.getRounds(hash)).toBe(12);
    expect(await bcrypt.compare(SYNTHETIC_STRONG_PASSWORD, hash)).toBe(true);
  });
});

describe("V13 - security headers and secure authentication cookies", () => {
  it("V13-T01: API responses include X-Content-Type-Options nosniff", async () => {
    const response = await request(testApp).get("/api/member4-health").expect(200);

    expect(response.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("V13-T02: API responses deny framing consistently", async () => {
    const response = await request(testApp).get("/api/member4-health").expect(200);

    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
  });

  it("V13-T03: the configured Content-Security-Policy preserves safe media sources", async () => {
    const response = await request(testApp).get("/api/member4-health").expect(200);
    const policy = response.headers["content-security-policy"];

    expect(policy).toBeDefined();
    expect(policy).toContain("default-src 'none'");
    expect(policy).toContain("img-src 'self' data: https:");
    expect(response.headers["cross-origin-resource-policy"]).toBe("cross-origin");
  });

  it("V13-T04: login cookies include HttpOnly, SameSite=Lax, path, and expiry", async () => {
    const storedUser = buildStoredUser();
    userModelMock.findOne.mockResolvedValueOnce(storedUser);

    const response = await request(testApp)
      .post("/api/auth/login")
      .send({ email: storedUser.email, password: SYNTHETIC_STRONG_PASSWORD })
      .expect(200);
    const { attributes } = cookieParts(response);

    expect(attributes).toContain("httponly");
    expect(attributes).toContain("samesite=lax");
    expect(attributes).toContain("path=/");
    expect(attributes.some((attribute) => attribute.startsWith("max-age="))).toBe(
      true,
    );
  });

  it("V13-T05: authentication and clear-cookie options are Secure in production", () => {
    process.env.NODE_ENV = "production";

    expect(getAuthCookieOptions()).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 86400000,
    });
    expect(getAuthCookieClearOptions()).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
    });
  });

  it("V13-T06: logout clears the cookie with compatible attributes", async () => {
    process.env.NODE_ENV = "production";
    const response = await request(testApp).post("/api/auth/logout").expect(200);
    const { pair, attributes } = cookieParts(response);

    expect(pair.endsWith("=")).toBe(true);
    expect(attributes).toContain("httponly");
    expect(attributes).toContain("secure");
    expect(attributes).toContain("samesite=lax");
    expect(attributes).toContain("path=/");
    expect(attributes.some((attribute) => attribute.startsWith("expires="))).toBe(
      true,
    );
  });

  it("V13-T07: OIDC authorization and credentialed CORS remain functional", async () => {
    const response = await request(testApp)
      .get("/api/google-oauth/auth-url?role=user")
      .set("Origin", TEST_FRONTEND_ORIGIN)
      .expect(200);

    expect(response.body.url).toBe("https://accounts.example.test/synthetic-oauth");
    expect(response.headers["access-control-allow-origin"]).toBe(
      TEST_FRONTEND_ORIGIN,
    );
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("V13-T08: mocked OIDC callback still redirects and sets protected cookies", async () => {
    const oidcUser = buildStoredUser({
      email: "oidc.user@example.test",
      authProvider: "google",
    });
    userModelMock.findOne.mockResolvedValueOnce(oidcUser);

    const response = await request(testApp)
      .get("/api/google-oauth/callback")
      .query({ code: "synthetic-code", state: JSON.stringify({ role: "user" }) })
      .expect(302);
    const redirect = new URL(response.headers.location);
    const { attributes } = cookieParts(response);

    expect(redirect.origin).toBe(TEST_FRONTEND_ORIGIN);
    expect(redirect.pathname).toBe("/auth-success");
    expect(attributes).toContain("httponly");
    expect(attributes).toContain("samesite=lax");
    expect(oauthClientMock.getToken).toHaveBeenCalledTimes(1);
    expect(oauthUserInfoGetMock).toHaveBeenCalledTimes(1);
  });
});
