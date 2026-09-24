process.env.JWT_SECRET = "test_secret_key_12345";
process.env.NODE_ENV = "test";

import request from "supertest";
import * as dbHandler from "../setup/dbHandler.js";
import { generateToken } from "../setup/testHelpers.js";
import User from "../../models/UserModel.js";
import app from "../setup/testApp.js";

const validRegistration = (overrides = {}) => ({
  fullName: "Registration Test",
  email: "registration@example.com",
  password: "password123",
  phoneNumber: "0771234567",
  location: "Colombo",
  ...overrides,
});

beforeAll(async () => {
  await dbHandler.connect();
});

afterEach(async () => {
  await dbHandler.clearDatabase();
});

afterAll(async () => {
  await dbHandler.closeDatabase();
});

describe("public registration roles", () => {
  test("rejects an admin role and does not create an account", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send(validRegistration({ role: "admin" }));

    expect(response.status).toBe(400);
    expect(await User.countDocuments()).toBe(0);
  });

  test("still permits student self-registration", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send(validRegistration({ role: "user" }));

    expect(response.status).toBe(201);
    const createdUser = await User.findOne({ email: "registration@example.com" });
    expect(createdUser.role).toBe("user");
  });

  test("still permits tutor self-registration", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send(validRegistration({ role: "tutor", subjects: ["Mathematics"] }));

    expect(response.status).toBe(201);
    const createdTutor = await User.findOne({ email: "registration@example.com" });
    expect(createdTutor.role).toBe("tutor");
    expect(createdTutor.tutorProfile.isVerified).toBe(false);
  });
});

describe("admin route guards", () => {
  let userToken;
  let tutorToken;
  let adminToken;

  beforeEach(async () => {
    const [user, tutor, admin] = await User.create([
      { fullName: "Normal User", email: "user@example.com", role: "user" },
      { fullName: "Tutor User", email: "tutor@example.com", role: "tutor" },
      { fullName: "Admin User", email: "admin@example.com", role: "admin" },
    ]);
    userToken = generateToken({ id: user._id.toString(), role: "user" });
    tutorToken = generateToken({ id: tutor._id.toString(), role: "tutor" });
    adminToken = generateToken({ id: admin._id.toString(), role: "admin" });
  });

  test.each([
    ["GET", "/api/auth/all-users"],
    ["GET", "/api/feedbacks"],
    ["GET", "/api/progress/admin/all"],
    ["POST", "/api/auth/create-admin"],
  ])("returns 401 for an unauthenticated admin request to %s %s", async (method, path) => {
    const response = await request(app)[method.toLowerCase()](path);

    expect(response.status).toBe(401);
  });

  test.each([
    ["GET", "/api/auth/all-users"],
    ["GET", "/api/feedbacks"],
    ["GET", "/api/progress/admin/all"],
  ])("denies authenticated students and tutors before accessing %s %s", async (method, path) => {
    for (const token of [userToken, tutorToken]) {
      const response = await request(app)
        [method.toLowerCase()](path)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Not authorized to access this route");
    }
  });

  test("does not allow body role manipulation to bypass authorization", async () => {
    for (const token of [userToken, tutorToken]) {
      const response = await request(app)
        .post("/api/auth/create-admin")
        .set("Authorization", `Bearer ${token}`)
        .send(validRegistration({
          email: `new-admin-${token === userToken ? "student" : "tutor"}@example.com`,
          role: "admin",
        }));

      expect(response.status).toBe(403);
    }

    expect(await User.countDocuments({ role: "admin" })).toBe(1);
  });

  test.each([
    ["/api/auth/all-users", "users"],
    ["/api/feedbacks", "feedbacks"],
    ["/api/progress/admin/all", "progress"],
  ])("allows an admin to access %s", async (path, responseKey) => {
    const response = await request(app)
      .get(path)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body[responseKey]).toBeDefined();
  });
});
