process.env.JWT_SECRET = "test_secret_key_12345";
process.env.NODE_ENV = "test";

import mongoose from "mongoose";
import request from "supertest";
import * as dbHandler from "../setup/dbHandler.js";
import { generateToken } from "../setup/testHelpers.js";
import User from "../../models/UserModel.js";
import app from "../setup/testApp.js";

const routeId = new mongoose.Types.ObjectId().toString();
const ADMIN_ROUTES = [
  { method: "get", path: "/api/auth/all-users" },
  { method: "delete", path: `/api/auth/users/${routeId}` },
  { method: "post", path: "/api/auth/setup-admin" },
  { method: "post", path: "/api/auth/create-admin" },
  { method: "get", path: "/api/feedbacks" },
  { method: "post", path: "/api/feedbacks/admin/create" },
  { method: "put", path: `/api/feedbacks/admin/${routeId}` },
  { method: "get", path: "/api/progress/admin/all" },
];

const adminAccountBody = (email) => ({
  fullName: "Created Admin",
  email,
  password: "password123",
  phoneNumber: "0771234567",
  location: "Colombo",
});

const callRoute = ({ method, path }, token, body = {}) => {
  const pendingRequest = request(app)[method](path);
  if (token) pendingRequest.set("Authorization", `Bearer ${token}`);
  return pendingRequest.send(body);
};

let student;
let tutor;
let admin;
let studentToken;
let tutorToken;
let adminToken;

beforeAll(async () => {
  await dbHandler.connect();
});

beforeEach(async () => {
  [student, tutor, admin] = await User.create([
    { fullName: "Student User", email: "student@example.com", role: "user" },
    { fullName: "Tutor User", email: "tutor@example.com", role: "tutor" },
    { fullName: "Admin User", email: "admin@example.com", role: "admin" },
  ]);

  studentToken = generateToken({ id: student._id.toString(), role: "user" });
  tutorToken = generateToken({ id: tutor._id.toString(), role: "tutor" });
  adminToken = generateToken({ id: admin._id.toString(), role: "admin" });
});

afterEach(async () => {
  await dbHandler.clearDatabase();
});

afterAll(async () => {
  await dbHandler.closeDatabase();
});

describe("centralized admin route authorization", () => {
  test.each(ADMIN_ROUTES)(
    "returns 401 before role authorization for unauthenticated $method $path",
    async (route) => {
      const response = await callRoute(route);

      expect(response.status).toBe(401);
    },
  );

  test.each(ADMIN_ROUTES)(
    "returns 403 for authenticated non-admins requesting $method $path",
    async (route) => {
      for (const token of [studentToken, tutorToken]) {
        const response = await callRoute(route, token);

        expect(response.status).toBe(403);
        expect(response.body.message).toBe("Not authorized to access this route");
      }
    },
  );

  test("permits an administrator to list users, feedback and progress", async () => {
    const responses = await Promise.all([
      callRoute(ADMIN_ROUTES[0], adminToken),
      callRoute(ADMIN_ROUTES[4], adminToken),
      callRoute(ADMIN_ROUTES[7], adminToken),
    ]);

    expect(responses.map(({ status }) => status)).toEqual([200, 200, 200]);
    expect(responses[0].body.users).toBeDefined();
    expect(responses[1].body.feedbacks).toBeDefined();
    expect(responses[2].body.progress).toBeDefined();
  });

  test("permits an administrator to delete a user", async () => {
    const target = await User.create({
      fullName: "Deletion Target",
      email: "delete@example.com",
      role: "user",
    });

    const response = await callRoute(
      { method: "delete", path: `/api/auth/users/${target._id}` },
      adminToken,
    );

    expect(response.status).toBe(200);
    expect(await User.findById(target._id)).toBeNull();
  });

  test("permits only an administrator to provision admins", async () => {
    const createResponse = await callRoute(
      ADMIN_ROUTES[3],
      adminToken,
      adminAccountBody("created-admin@example.com"),
    );
    const setupResponse = await callRoute(
      ADMIN_ROUTES[2],
      adminToken,
      adminAccountBody("setup-admin@example.com"),
    );

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.admin.role).toBe("admin");
    expect(setupResponse.status).toBe(201);
    expect(setupResponse.body.admin.role).toBe("admin");
  });

  test("permits an administrator to create and update feedback", async () => {
    const createResponse = await callRoute(
      ADMIN_ROUTES[5],
      adminToken,
      {
        studentId: student._id.toString(),
        tutorId: tutor._id.toString(),
        rating: 4,
        message: "Created by an administrator",
      },
    );

    expect(createResponse.status).toBe(201);

    const updateResponse = await callRoute(
      { method: "put", path: `/api/feedbacks/admin/${createResponse.body.feedback._id}` },
      adminToken,
      { rating: 5, message: "Updated by an administrator" },
    );

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.feedback.rating).toBe(5);
  });
});
