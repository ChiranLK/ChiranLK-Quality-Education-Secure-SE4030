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
import { updateProfile } from "../../Controllers/authController.js";

const buildMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("profile update field allowlist", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findByIdAndUpdate = jest.fn();
  });

  test("allows legitimate tutor fields while excluding privileged fields", async () => {
    const updatedUser = {
      _id: "user-id",
      fullName: "Updated Tutor",
      email: "tutor@example.com",
      phoneNumber: "0771234567",
      location: "Colombo",
      grade: "",
      role: "tutor",
      avatar: "avatar.png",
      tutorProfile: { bio: "Updated bio" },
    };
    User.findByIdAndUpdate.mockResolvedValue(updatedUser);
    const req = {
      user: { _id: "user-id", role: "tutor" },
      body: {
        fullName: "Updated Tutor",
        role: "admin",
        isAdmin: true,
        verified: true,
        isVerified: true,
        password: "replacement",
        passwordHash: "attacker-controlled",
        googleId: "forged-google-id",
        oauthId: "forged-oauth-id",
        authProvider: "google",
        accountStatus: "approved",
        permissions: ["admin"],
        internalFlags: { trusted: true },
        resetPasswordToken: "attacker-controlled",
        _id: "replacement-id",
        createdAt: new Date(0),
        updatedAt: new Date(0),
        tutorProfile: {
          bio: "Updated bio",
          subjects: ["Mathematics"],
          availability: "available",
          isVerified: true,
          rating: { average: 5, count: 100 },
          ratingTotal: 500,
          sessionCount: 999,
        },
      },
    };
    const res = buildMockRes();

    await updateProfile(req, res);

    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      "user-id",
      {
        fullName: "Updated Tutor",
        "tutorProfile.bio": "Updated bio",
        "tutorProfile.subjects": ["Mathematics"],
        "tutorProfile.availability": "available",
      },
      { new: true, runValidators: true },
    );
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
  });

  test("allows legitimate student profile fields and ignores tutor-only data", async () => {
    const updatedUser = {
      _id: "student-id",
      fullName: "Updated Student",
      email: "student.updated@example.com",
      phoneNumber: "0712345678",
      location: "Kandy",
      grade: "Grade 11",
      role: "user",
      tutorProfile: undefined,
    };
    User.findByIdAndUpdate.mockResolvedValue(updatedUser);
    const req = {
      user: { _id: "student-id", role: "user" },
      body: {
        fullName: "Updated Student",
        email: "student.updated@example.com",
        phoneNumber: "0712345678",
        location: "Kandy",
        grade: "Grade 11",
        tutorProfile: {
          bio: "A student must not create tutor profile data",
          isVerified: true,
        },
      },
    };
    const res = buildMockRes();

    await updateProfile(req, res);

    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      "student-id",
      {
        fullName: "Updated Student",
        email: "student.updated@example.com",
        phoneNumber: "0712345678",
        location: "Kandy",
        grade: "Grade 11",
      },
      { new: true, runValidators: true },
    );
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
  });

  test("rejects an update containing only protected fields", async () => {
    const req = {
      user: { _id: "user-id", role: "user" },
      body: {
        role: "admin",
        isAdmin: true,
        verified: true,
        isVerified: true,
        password: "replacement",
        passwordHash: "attacker-controlled",
        googleId: "forged-google-id",
        oauthId: "forged-oauth-id",
        authProvider: "google",
        accountStatus: "approved",
        permissions: ["admin"],
        internalFlags: { trusted: true },
        _id: "replacement-id",
        createdAt: new Date(0),
        updatedAt: new Date(0),
        tutorProfile: {
          isVerified: true,
          rating: { average: 5, count: 100 },
          ratingTotal: 500,
          sessionCount: 999,
        },
      },
    };
    const res = buildMockRes();

    await updateProfile(req, res);

    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      msg: "At least one field must be provided to update",
    }));
  });
});
