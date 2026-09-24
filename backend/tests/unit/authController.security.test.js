import { jest } from "@jest/globals";
import { StatusCodes } from "http-status-codes";

jest.mock("../../models/UserModel.js");
jest.mock("../../models/StudyMaterialModel.js");
jest.mock("../../services/feedbackMailService.js", () => ({
  sendLoginNotificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  sendPasswordChangedEmail: jest.fn(),
}));

import User from "../../models/UserModel.js";
import { register } from "../../Controllers/authController.js";
import { BadRequestError } from "../../errors/customErrors.js";

const buildMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const registrationBody = (overrides = {}) => ({
  fullName: "Test Student",
  email: "student@example.com",
  password: "password123",
  phoneNumber: "0771234567",
  location: "Colombo",
  ...overrides,
});

describe("registration access control", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.create = jest.fn();
  });

  test("rejects admin self-registration", async () => {
    const req = { body: registrationBody({ role: "admin" }) };

    await expect(register(req, buildMockRes())).rejects.toThrow(BadRequestError);
    expect(User.create).not.toHaveBeenCalled();
  });

  test("defaults a registration without a role to user and ignores extra fields", async () => {
    User.create.mockResolvedValue({ role: "user" });
    const req = {
      body: registrationBody({
        grade: "Grade 10",
        isVerified: true,
        resetPasswordToken: "attacker-controlled",
      }),
    };
    const res = buildMockRes();

    await register(req, res);

    expect(User.create).toHaveBeenCalledWith({
      fullName: "Test Student",
      email: "student@example.com",
      password: expect.any(String),
      phoneNumber: "0771234567",
      location: "Colombo",
      role: "user",
      grade: "Grade 10",
    });
    expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
  });

  test("preserves tutor self-registration with controlled tutor defaults", async () => {
    User.create.mockResolvedValue({ role: "tutor" });
    const req = {
      body: registrationBody({
        role: "tutor",
        subjects: ["Mathematics", "PHYSICS"],
        tutorProfile: { isVerified: true, rating: { average: 5, count: 100 } },
      }),
    };

    await register(req, buildMockRes());

    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
      role: "tutor",
      tutorProfile: {
        subjects: ["mathematics", "physics"],
        availability: "available",
        sessionCount: 0,
        rating: { average: 0, count: 0 },
        isVerified: false,
      },
    }));
  });
});
