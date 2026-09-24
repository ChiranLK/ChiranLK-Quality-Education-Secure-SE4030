process.env.JWT_SECRET = "test_secret_key_12345";
process.env.NODE_ENV = "test";

import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import request from "supertest";
import * as dbHandler from "../setup/dbHandler.js";
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

describe("public email/password registration", () => {
  test("registers a valid student and hashes the password", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send(validRegistration({ role: "user", grade: "Grade 10" }));

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ msg: "User Created Successfully" });

    const student = await User.findOne({ email: "registration@example.com" }).select("+password");
    expect(student.role).toBe("user");
    expect(student.grade).toBe("Grade 10");
    expect(student.password).not.toBe("password123");
    await expect(bcrypt.compare("password123", student.password)).resolves.toBe(true);
  });

  test("registers a valid tutor with controlled tutor defaults", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send(validRegistration({
        email: "tutor@example.com",
        role: "tutor",
        subjects: ["Mathematics", "PHYSICS"],
      }));

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ msg: "Tutor registered successfully" });

    const tutor = await User.findOne({ email: "tutor@example.com" });
    expect(tutor.role).toBe("tutor");
    expect(tutor.tutorProfile.subjects).toEqual(["mathematics", "physics"]);
    expect(tutor.tutorProfile.isVerified).toBe(false);
    expect(tutor.tutorProfile.rating.average).toBe(0);
    expect(tutor.tutorProfile.rating.count).toBe(0);
  });

  test.each(["admin", "owner"])("rejects the public role %s", async (role) => {
    const response = await request(app)
      .post("/api/auth/register")
      .send(validRegistration({ role }));

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid role for self-registration");
    expect(await User.countDocuments()).toBe(0);
  });

  test("does not store client-supplied privileged or internal fields", async () => {
    const attackerChosenId = new mongoose.Types.ObjectId();
    const forgedTimestamp = new Date("2000-01-01T00:00:00.000Z");
    const response = await request(app)
      .post("/api/auth/register")
      .send(validRegistration({
        _id: attackerChosenId.toString(),
        role: "user",
        verified: true,
        isVerified: true,
        googleId: "attacker-google-id",
        authProvider: "google",
        avatar: "https://attacker.invalid/avatar.png",
        passwordHash: "attacker-hash",
        permissions: ["admin"],
        accountStatus: "privileged",
        resetPasswordToken: "attacker-reset-token",
        createdAt: forgedTimestamp.toISOString(),
        tutorProfile: {
          isVerified: true,
          rating: { average: 5, count: 999 },
          sessionCount: 999,
        },
      }));

    expect(response.status).toBe(201);
    const student = await User.findOne({ email: "registration@example.com" });
    expect(student._id.equals(attackerChosenId)).toBe(false);
    expect(student.role).toBe("user");
    expect(student.googleId).toBeUndefined();
    expect(student.authProvider).toBe("local");
    expect(student.avatar).toBe("uploads/default-avatar.png");
    expect(student.resetPasswordToken).toBeUndefined();
    expect(student.tutorProfile.isVerified).toBe(false);
    expect(student.tutorProfile.rating.average).toBe(0);
    expect(student.tutorProfile.rating.count).toBe(0);
    expect(student.tutorProfile.sessionCount).toBe(0);
    expect(student.createdAt.getTime()).not.toBe(forgedTimestamp.getTime());
    expect(student.toObject()).not.toHaveProperty("permissions");
    expect(student.toObject()).not.toHaveProperty("accountStatus");
    expect(student.toObject()).not.toHaveProperty("passwordHash");
  });
});
