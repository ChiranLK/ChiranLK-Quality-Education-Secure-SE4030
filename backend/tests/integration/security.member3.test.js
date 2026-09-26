/**
 * tests/integration/security.member3.test.js
 * SE4030 Security Assignment - Member 3 Integration Tests
 * Covers: V6, V7, V14
 */

import { describe, it, expect, jest, beforeAll, afterAll, afterEach, beforeEach } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { connect, clearDatabase, closeDatabase } from "../setup/dbHandler.js";

// === MOCKS MUST BE DECLARED BEFORE DYNAMIC IMPORTS ===

jest.unstable_mockModule("../../services/googleCalendarService.js", () => ({
  createCalendarEvent:  jest.fn().mockResolvedValue("mock-event-id"),
  updateCalendarEvent:  jest.fn().mockResolvedValue(true),
  deleteCalendarEvent:  jest.fn().mockResolvedValue(true),
  initCalendar:         jest.fn(),
}));

jest.unstable_mockModule("../../utils/googleCalender.js", () => ({
  createOAuthClient: jest.fn().mockReturnValue({
    getToken: jest.fn().mockResolvedValue({ tokens: { access_token: "mock", refresh_token: "mock" } }),
  }),
  getAuthUrl:      jest.fn().mockReturnValue("https://mock-google-auth-url"),
  saveTokens:      jest.fn().mockResolvedValue(undefined),
  getAuthedClient: jest.fn().mockResolvedValue({ mock: "oauth2client" }),
  loadTokens:      jest.fn().mockResolvedValue({ access_token: "mock" }),
}));

jest.unstable_mockModule("googleapis", () => ({
  google: {
    calendar: jest.fn().mockReturnValue({
      events: {
        insert: jest.fn().mockResolvedValue({
          data: { id: "mock-cal-event-id", summary: "Mock Event" },
        }),
      },
    }),
  },
}));

jest.unstable_mockModule("../../Controllers/emailController.js", () => ({
  sendTestEmail: jest.fn((req, res) => {
    res.status(200).json({ msg: "Mock test email sent", mocked: true });
  }),
}));

jest.unstable_mockModule("../../Controllers/feedbackEmailController.js", () => ({
  sendFeedbackNotification: jest.fn((req, res) => {
    res.status(200).json({ msg: "Mock feedback notification sent", mocked: true });
  }),
}));

// === DYNAMIC IMPORTS AFTER MOCKS ===
const express = (await import("express")).default;
const cookieParser = (await import("cookie-parser")).default;
const { errorHandler } = await import("../../Middleware/errorHandler.js");
const tutoringSessionRouter = (await import("../../Routes/tutoringSessionRouter.js")).default;
const emailRoutes = (await import("../../Routes/emailRoutes.js")).default;
const feedbackEmailRoutes = (await import("../../Routes/feedbackEmailRoutes.js")).default;
const googleCalendarRouter = (await import("../../Routes/googleCalenderRouter.js")).default;
const User = (await import("../../Models/UserModel.js")).default;
const TutoringSession = (await import("../../models/TutoringSessionModel.js")).default;

const testApp = express();
testApp.use(express.json());
testApp.use(cookieParser());
testApp.use("/api/tutoring-sessions", tutoringSessionRouter);
testApp.use("/api/email",             emailRoutes);
testApp.use("/api/email",             feedbackEmailRoutes);
testApp.use("/api/google-calendar",   googleCalendarRouter);
testApp.use(errorHandler);

const JWT_SECRET = process.env.JWT_SECRET || "test_secret_key_12345";
const makeToken = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });

let tutorId, studentId, adminId;
let tutorToken, studentToken, adminToken;

const futureDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString();
};

const validSessionBody = () => ({
  title:       "SE4030 Test Session - Synthetic Data",
  subject:     "mathematics",
  description: "Integration test session - fake data only",
  schedule: { date: futureDate(), startTime: "09:00", endTime: "10:00" },
  capacity: { maxParticipants: 5 },
  level:    "intermediate",
  location: { type: "online" },
});

beforeAll(async () => {
  await connect();

  const admin = await User.create({ fullName: "Test Admin", email: "admin@example.test", password: "hashedpassword", role: "admin" });
  const tutor = await User.create({ fullName: "Test Tutor One", email: "tutor1@example.test", password: "hashedpassword", role: "tutor" });
  const student = await User.create({ fullName: "Test Student One", email: "student1@example.test", password: "hashedpassword", role: "user" });

  adminId = admin._id.toString(); tutorId = tutor._id.toString(); studentId = student._id.toString();
  adminToken = makeToken({ userId: adminId, role: "admin" }); tutorToken = makeToken({ userId: tutorId, role: "tutor" }); studentToken = makeToken({ userId: studentId, role: "user" });
});

afterAll(async () => { await clearDatabase(); await closeDatabase(); });
afterEach(async () => { await TutoringSession.deleteMany({}); });

describe("V6 - Restrict access to student personal information", () => {
  describe("GET /api/tutoring-sessions - authentication gate", () => {
    it("V6-T01: No token -> 401 Unauthorized", async () => {
      const res = await request(testApp).get("/api/tutoring-sessions").expect(401);
      expect(res.body).toMatchObject({ message: expect.stringMatching(/auth/i) });
    });
    it("V6-T02: Invalid Bearer token -> 401 Unauthorized", async () => {
      const res = await request(testApp).get("/api/tutoring-sessions").set("Authorization", "Bearer invalid.fake.token.xyz").expect(401);
      expect(res.body).toMatchObject({ message: expect.stringMatching(/auth/i) });
    });
    it("V6-T03: Valid student token -> 200 OK", async () => {
      await request(testApp).get("/api/tutoring-sessions").set("Authorization", `Bearer ${studentToken}`).expect(200);
    });
    it("V6-T04: Valid tutor token -> 200 OK", async () => {
      await request(testApp).get("/api/tutoring-sessions").set("Authorization", `Bearer ${tutorToken}`).expect(200);
    });
  });

  describe("GET /api/tutoring-sessions - response data minimization (PII removal)", () => {
    beforeEach(async () => {
      const res = await request(testApp).post("/api/tutoring-sessions").set("Authorization", `Bearer ${tutorToken}`).send(validSessionBody());
      const sid = res.body.session?._id;
      if (sid) {
        await TutoringSession.findByIdAndUpdate(sid, {
          $push: { participants: { userId: studentId, joinedAt: new Date() } },
          $inc:  { "capacity.currentEnrolled": 1 },
        });
      }
    });
    it("V6-T05: participants field is ABSENT from listing response", async () => {
      const res = await request(testApp).get("/api/tutoring-sessions").set("Authorization", `Bearer ${studentToken}`).expect(200);
      const sessions = res.body.sessions ?? res.body;
      sessions.forEach((s) => { expect(s).not.toHaveProperty("participants"); });
    });
    it("V6-T06: tutor object does NOT contain email in listing", async () => {
      const res = await request(testApp).get("/api/tutoring-sessions").set("Authorization", `Bearer ${studentToken}`).expect(200);
      const sessions = res.body.sessions ?? res.body;
      sessions.forEach((s) => { if (s.tutor && typeof s.tutor === "object") { expect(s.tutor).not.toHaveProperty("email"); } });
    });
    it("V6-T07: Tutor can still create a session (regression)", async () => {
      const res = await request(testApp).post("/api/tutoring-sessions").set("Authorization", `Bearer ${tutorToken}`).send(validSessionBody()).expect(201);
      expect(res.body.session).toHaveProperty("_id");
    });
    it("V6-T08: Student can join a session (regression)", async () => {
      const createRes = await request(testApp).post("/api/tutoring-sessions").set("Authorization", `Bearer ${tutorToken}`).send(validSessionBody());
      const sid = createRes.body.session._id;
      await request(testApp).post(`/api/tutoring-sessions/${sid}/join`).set("Authorization", `Bearer ${studentToken}`).expect(200);
    });
  });
});

describe("V7 - Secure email and calendar endpoints", () => {
  describe("POST /api/google-calendar/events", () => {
    const calBody = { summary: "SE4030 Test Event", start: "2026-10-01T10:00:00Z", end: "2026-10-01T11:00:00Z" };
    it("V7-T01: No token -> 401", async () => { await request(testApp).post("/api/google-calendar/events").send(calBody).expect(401); });
    it("V7-T02: Invalid token -> 401", async () => { await request(testApp).post("/api/google-calendar/events").set("Authorization", "Bearer x").send(calBody).expect(401); });
    it("V7-T03: Student role -> 403 Forbidden", async () => { await request(testApp).post("/api/google-calendar/events").set("Authorization", `Bearer ${studentToken}`).send(calBody).expect(403); });
    it("V7-T04: Admin with valid body -> mock 201", async () => {
      const res = await request(testApp).post("/api/google-calendar/events").set("Authorization", `Bearer ${adminToken}`).send(calBody).expect(201);
      expect(res.body).toMatchObject({ id: "mock-cal-event-id" });
    });
    it("V7-T05: Tutor with valid body -> mock 201", async () => { await request(testApp).post("/api/google-calendar/events").set("Authorization", `Bearer ${tutorToken}`).send(calBody).expect(201); });
    it("V7-T06: Admin missing summary -> 400", async () => {
      const res = await request(testApp).post("/api/google-calendar/events").set("Authorization", `Bearer ${adminToken}`).send({ start: "2026-10-01T10:00:00Z", end: "2026-10-01T11:00:00Z" }).expect(400);
      expect(res.body.message).toMatch(/summary/i);
    });
    it("V7-T07: Admin missing start -> 400", async () => { await request(testApp).post("/api/google-calendar/events").set("Authorization", `Bearer ${adminToken}`).send({ summary: "Test", end: "2026-10-01T11:00:00Z" }).expect(400); });
  });

  describe("GET /api/google-calendar/status", () => {
    it("V7-T08: No token -> 401", async () => { await request(testApp).get("/api/google-calendar/status").expect(401); });
    it("V7-T09: Student token -> 403", async () => { await request(testApp).get("/api/google-calendar/status").set("Authorization", `Bearer ${studentToken}`).expect(403); });
    it("V7-T10: Admin token -> 200 with boolean fields, no token values", async () => {
      const res = await request(testApp).get("/api/google-calendar/status").set("Authorization", `Bearer ${adminToken}`).expect(200);
      expect(typeof res.body.authenticated).toBe("boolean");
      expect(res.body).not.toHaveProperty("tokenPath");
      expect(res.body).not.toHaveProperty("tokens");
      expect(res.body).not.toHaveProperty("access_token");
    });
  });

  describe("GET /api/email/test-email", () => {
    it("V7-T11: No token -> 401", async () => { await request(testApp).get("/api/email/test-email").expect(401); });
    it("V7-T12: Student token -> 403", async () => { await request(testApp).get("/api/email/test-email").set("Authorization", `Bearer ${studentToken}`).expect(403); });
    it("V7-T13: Admin token -> mock 200 (no real email)", async () => {
      const res = await request(testApp).get("/api/email/test-email").set("Authorization", `Bearer ${adminToken}`).expect(200);
      expect(res.body.mocked).toBe(true);
    });
  });

  describe("POST /api/email/feedback-notify", () => {
    const fbBody = { studentName: "Test", studentEmail: "test@example.com", rating: 5, message: "Integration test feedback", course: "SE4030", tutorName: "Tutor" };
    it("V7-T14: No token -> 401", async () => { await request(testApp).post("/api/email/feedback-notify").send(fbBody).expect(401); });
    it("V7-T15: Invalid token -> 401", async () => { await request(testApp).post("/api/email/feedback-notify").set("Authorization", "Bearer x").send(fbBody).expect(401); });
    it("V7-T16: Authenticated student -> mock 200", async () => {
      const res = await request(testApp).post("/api/email/feedback-notify").set("Authorization", `Bearer ${studentToken}`).send(fbBody).expect(200);
      expect(res.body.mocked).toBe(true);
    });
  });

  describe("GET /api/google-calendar/callback", () => {
    it("V7-T17: No token -> 401", async () => { await request(testApp).get("/api/google-calendar/callback?code=fake-code-123").expect(401); });
    it("V7-T18: Admin with code -> response has NO token fields", async () => {
      const res = await request(testApp).get("/api/google-calendar/callback?code=fake-code-123").set("Authorization", `Bearer ${adminToken}`).expect(200);
      expect(res.body).not.toHaveProperty("tokens");
      expect(res.body).not.toHaveProperty("access_token");
      expect(res.body.msg).toMatch(/secure/i);
    });
    it("V7-T19: Admin without code -> 400", async () => { await request(testApp).get("/api/google-calendar/callback").set("Authorization", `Bearer ${adminToken}`).expect(400); });
  });
});

describe("V14 - Prevent unsafe user-controlled regex queries", () => {
  beforeEach(async () => {
    // Create base synthetic sessions
    await request(testApp).post("/api/tutoring-sessions").set("Authorization", `Bearer ${tutorToken}`).send({ ...validSessionBody(), subject: "mathematics", title: "Math" });
    await request(testApp).post("/api/tutoring-sessions").set("Authorization", `Bearer ${tutorToken}`).send({ ...validSessionBody(), subject: "science", title: "Science" });
    
    // Create specific literal sessions
    await request(testApp).post("/api/tutoring-sessions").set("Authorization", `Bearer ${tutorToken}`).send({ ...validSessionBody(), subject: "C++", title: "Literal C++" });
    await request(testApp).post("/api/tutoring-sessions").set("Authorization", `Bearer ${tutorToken}`).send({ ...validSessionBody(), subject: "^^^", title: "Literal Caret" });
    await request(testApp).post("/api/tutoring-sessions").set("Authorization", `Bearer ${tutorToken}`).send({ ...validSessionBody(), subject: "math.ematics", title: "Literal Dot" });
    await request(testApp).post("/api/tutoring-sessions").set("Authorization", `Bearer ${tutorToken}`).send({ ...validSessionBody(), subject: "a*b", title: "Literal Asterisk" });
    await request(testApp).post("/api/tutoring-sessions").set("Authorization", `Bearer ${tutorToken}`).send({ ...validSessionBody(), subject: "(advanced)", title: "Literal Parentheses" });
  });

  it("V14-T01: Normal text search -> 200 with matching results", async () => {
    const res = await request(testApp).get("/api/tutoring-sessions?subject=mathematics").set("Authorization", `Bearer ${studentToken}`).expect(200);
    const sessions = res.body.sessions ?? res.body;
    expect(sessions.length).toBeGreaterThan(0);
    sessions.forEach((s) => { if (s.subject) expect(s.subject.toLowerCase()).toContain("mathematics"); });
  });
  it("V14-T02: Case-insensitive preserved", async () => {
    const lRes = await request(testApp).get("/api/tutoring-sessions?subject=mathematics").set("Authorization", `Bearer ${studentToken}`).expect(200);
    const uRes = await request(testApp).get("/api/tutoring-sessions?subject=MATHEMATICS").set("Authorization", `Bearer ${studentToken}`).expect(200);
    expect((lRes.body.sessions ?? lRes.body).length).toBe((uRes.body.sessions ?? uRes.body).length);
  });
  it("V14-T03: C++ treated as literals -> 200", async () => {
    const res = await request(testApp).get("/api/tutoring-sessions?subject=C%2B%2B").set("Authorization", `Bearer ${studentToken}`).expect(200);
    const sessions = res.body.sessions ?? res.body;
    expect(sessions.length).toBe(1);
    expect(sessions[0].subject).toBe("c++");
  });
  it("V14-T04: Caret ^ treated as literal -> 200", async () => {
    const res = await request(testApp).get("/api/tutoring-sessions?subject=%5E%5E%5E").set("Authorization", `Bearer ${studentToken}`).expect(200);
    const sessions = res.body.sessions ?? res.body;
    expect(sessions.length).toBe(1);
    expect(sessions[0].subject).toBe("^^^");
  });
  it("V14-T05: Subject longer than 100 chars -> 400 Bad Request", async () => {
    const res = await request(testApp).get(`/api/tutoring-sessions?subject=${"a".repeat(101)}`).set("Authorization", `Bearer ${studentToken}`).expect(400);
    expect(res.body.message).toMatch(/100/);
  });
  it("V14-T06: Exactly 100 chars -> 200", async () => {
    await request(testApp).get(`/api/tutoring-sessions?subject=${"a".repeat(100)}`).set("Authorization", `Bearer ${studentToken}`).expect(200);
  });
  it("V14-T07: Empty subject -> 200", async () => {
    const res = await request(testApp).get("/api/tutoring-sessions?subject=").set("Authorization", `Bearer ${studentToken}`).expect(200);
    expect(Array.isArray(res.body.sessions ?? res.body)).toBe(true);
  });
  it("V14-T08: No subject param -> 200", async () => {
    const res = await request(testApp).get("/api/tutoring-sessions").set("Authorization", `Bearer ${studentToken}`).expect(200);
    expect(Array.isArray(res.body.sessions ?? res.body)).toBe(true);
  });
  it("V14-T09: Dot metacharacter . treated literally -> 200", async () => {
    const res = await request(testApp).get("/api/tutoring-sessions?subject=math.ematics").set("Authorization", `Bearer ${studentToken}`).expect(200);
    const sessions = res.body.sessions ?? res.body;
    expect(sessions.length).toBe(1);
    expect(sessions[0].subject).toBe("math.ematics");
  });
  it("V14-T10: Asterisk treated literally -> 200", async () => {
    const res = await request(testApp).get("/api/tutoring-sessions?subject=a*b").set("Authorization", `Bearer ${studentToken}`).expect(200);
    const sessions = res.body.sessions ?? res.body;
    expect(sessions.length).toBe(1);
    expect(sessions[0].subject).toBe("a*b");
  });
  it("V14-T11: Parentheses treated literally -> 200", async () => {
    const res = await request(testApp).get("/api/tutoring-sessions?subject=(advanced)").set("Authorization", `Bearer ${studentToken}`).expect(200);
    const sessions = res.body.sessions ?? res.body;
    expect(sessions.length).toBe(1);
    expect(sessions[0].subject).toBe("(advanced)");
  });
  it("V14-T12: Grade filter still works", async () => {
    await request(testApp).get("/api/tutoring-sessions?grade=intermediate").set("Authorization", `Bearer ${studentToken}`).expect(200);
  });
});
