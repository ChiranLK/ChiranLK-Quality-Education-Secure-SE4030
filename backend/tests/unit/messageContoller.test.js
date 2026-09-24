
import { jest } from "@jest/globals";
import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";

// ─── Mock the model and service layers ───────────────────────────────────────
jest.mock("../../models/MessageModel.js");
jest.mock("../../services/messageService.js");

import Message from "../../models/MessageModel.js";
import {
  deleteMessage,
  updateMessage,
} from "../../Controllers/messageContoller.js";
import { authenticateUser } from "../../Middleware/authMiddleware.js";

// ─── Shared builders ─────────────────────────────────────────────────────────
const buildMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const buildUser = (userId = new mongoose.Types.ObjectId().toString()) => ({
  userId,
  email: "user@test.com",
  role: "user",
});

const buildMessage = (createdBy) => ({
  _id: new mongoose.Types.ObjectId(),
  title: "Sample Message",
  message: "This is a sample message for testing",
  createdBy,
  category: "Mathematics",
  language: "English",
  requiresTranslation: false,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe("message update field allowlist", () => {
  const validId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
    Message.findById = jest.fn();
    Message.findByIdAndUpdate = jest.fn();
  });

  test("excludes ownership and system-managed fields from the update", async () => {
    const user = buildUser();
    const existingMessage = buildMessage(user.userId);
    const updatedMessage = { ...existingMessage, title: "Updated title" };
    const populate = jest.fn().mockResolvedValue(updatedMessage);
    Message.findById.mockResolvedValue(existingMessage);
    Message.findByIdAndUpdate.mockReturnValue({ populate });
    const req = {
      user,
      params: { id: validId },
      body: {
        title: "Updated title",
        category: "Science",
        language: "English",
        owner: "forged-owner",
        userId: "forged-user",
        studentId: "forged-student",
        tutorId: "forged-tutor",
        createdBy: new mongoose.Types.ObjectId().toString(),
        senderId: "forged-sender",
        requiresTranslation: true,
        createdAt: new Date(0),
        unknownField: "not allowed",
      },
    };
    const res = buildMockRes();

    await updateMessage(req, res);

    expect(Message.findByIdAndUpdate).toHaveBeenCalledWith(
      validId,
      {
        title: "Updated title",
        category: "Science",
        language: "English",
      },
      { new: true, runValidators: true },
    );
    expect(populate).toHaveBeenCalledWith("createdBy", "fullName email role");
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
  });

  test("returns 403 when another student attempts to update the request", async () => {
    const ownerId = new mongoose.Types.ObjectId().toString();
    const user = buildUser();
    Message.findById.mockResolvedValue(buildMessage(ownerId));
    const req = {
      user,
      params: { id: validId },
      body: { title: "Hijacked request", createdBy: user.userId },
    };
    const res = buildMockRes();

    await updateMessage(req, res);

    expect(Message.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(StatusCodes.FORBIDDEN);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      msg: "You are not authorized to update this message",
    });
  });

  test("returns 404 when the help request does not exist", async () => {
    Message.findById.mockResolvedValue(null);
    const req = {
      user: buildUser(),
      params: { id: validId },
      body: { title: "Updated title" },
    };
    const res = buildMockRes();

    await updateMessage(req, res);

    expect(Message.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      msg: "Message not found",
    });
  });

  test("returns 400 when only protected ownership fields are supplied", async () => {
    const user = buildUser();
    Message.findById.mockResolvedValue(buildMessage(user.userId));
    const req = {
      user,
      params: { id: validId },
      body: {
        createdBy: new mongoose.Types.ObjectId().toString(),
        userId: "forged-user",
        studentId: "forged-student",
        tutorId: "forged-tutor",
      },
    };
    const res = buildMockRes();

    await updateMessage(req, res);

    expect(Message.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
  });

  test("rejects a request without authentication before controller access", () => {
    const req = { cookies: {}, headers: {} };
    const next = jest.fn();

    try {
      authenticateUser(req, {}, next);
      throw new Error("Expected authenticateUser to reject the request");
    } catch (error) {
      expect(error.statusCode).toBe(StatusCodes.UNAUTHORIZED);
      expect(error.message).toBe("Authentication invalid");
    }
    expect(next).not.toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  deleteMessage
// ════════════════════════════════════════════════════════════════════════════
describe("🗑️  deleteMessage controller", () => {
  const validId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup Message methods as mock functions
    Message.findById = jest.fn();
    Message.findByIdAndDelete = jest.fn();
  });

  // ✅ Success — message deleted successfully
  test("should return 200 with success message after deletion", async () => {
    const user = buildUser();
    const message = buildMessage(user.userId);

    const req = { user, params: { id: validId } };
    const res = buildMockRes();

    // Mock Message.findById to return the message
    Message.findById.mockResolvedValue(message);
    // Mock Message.findByIdAndDelete to simulate deletion
    Message.findByIdAndDelete.mockResolvedValue(true);

    await deleteMessage(req, res);

    expect(Message.findById).toHaveBeenCalledWith(validId);
    expect(Message.findByIdAndDelete).toHaveBeenCalledWith(validId);
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Message deleted successfully"
    });
  });

  // ❌ Error — message not found
  test("should return 400 when message does not exist", async () => {
    const user = buildUser();
    const req = { user, params: { id: validId } };
    const res = buildMockRes();

    // Mock Message.findById to return null (message not found)
    Message.findById.mockResolvedValue(null);

    await deleteMessage(req, res);

    expect(Message.findById).toHaveBeenCalledWith(validId);
    expect(Message.findByIdAndDelete).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      msg: "Message not found"
    });
  });

  // ❌ Error — user not authorized to delete
  test("should return 400 when user is not the creator of the message", async () => {
    const creator = new mongoose.Types.ObjectId().toString();
    const unauthorizedUser = buildUser(); // Different user
    const message = buildMessage(creator);

    const req = { user: unauthorizedUser, params: { id: validId } };
    const res = buildMockRes();

    // Mock Message.findById to return the message
    Message.findById.mockResolvedValue(message);

    await deleteMessage(req, res);

    expect(Message.findById).toHaveBeenCalledWith(validId);
    expect(Message.findByIdAndDelete).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      msg: "You are not authorized to delete this message"
    });
  });

  // ❌ Error — database query fails
  test("should return 500 when database query fails", async () => {
    const user = buildUser();
    const req = { user, params: { id: validId } };
    const res = buildMockRes();

    const dbError = new Error("Database connection failed");
    Message.findById.mockRejectedValue(dbError);

    await deleteMessage(req, res);

    expect(Message.findById).toHaveBeenCalledWith(validId);
    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Failed to delete message",
      error: "Database connection failed"
    });
  });

  // ❌ Error — deletion fails
  test("should return 500 when deletion operation fails", async () => {
    const user = buildUser();
    const message = buildMessage(user.userId);

    const req = { user, params: { id: validId } };
    const res = buildMockRes();

    Message.findById.mockResolvedValue(message);
    const deleteError = new Error("Deletion operation failed");
    Message.findByIdAndDelete.mockRejectedValue(deleteError);

    await deleteMessage(req, res);

    expect(Message.findById).toHaveBeenCalledWith(validId);
    expect(Message.findByIdAndDelete).toHaveBeenCalledWith(validId);
    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Failed to delete message",
      error: "Deletion operation failed"
    });
  });
});
