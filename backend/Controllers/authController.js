import User from "../models/UserModel.js";
import StudyMaterial from "../models/StudyMaterialModel.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { createJWT } from "../utils/generateToken.js";
import { hashPassword } from "../utils/passwordUtils.js";
import {
  meetsPasswordPolicy,
  PASSWORD_POLICY_MESSAGE,
} from "../utils/passwordPolicy.js";
import { StatusCodes } from "http-status-codes";
import {
  UnauthenticatedError,
  NotFoundError,
  BadRequestError,
} from "../errors/customErrors.js";
import {
  sendLoginNotificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
} from "../services/feedbackMailService.js";
import { logSafeError, logSafeEvent } from "../utils/safeLogger.js";

const PUBLIC_SELF_REGISTRATION_ROLES = Object.freeze(["user", "tutor"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const publicErrorMessage = (error, fallback) =>
  error?.statusCode && error.statusCode < 500 ? error.message : fallback;

// Register a new user or tutor
export const register = async (req, res) => {
  const { email, password, role, subjects, grade } = req.body || {};
  if (!email || !password) {
    throw new BadRequestError("Email and password are required");
  }
  if (!meetsPasswordPolicy(password)) {
    throw new BadRequestError(PASSWORD_POLICY_MESSAGE);
  }

  const selfRegistrationRole = role || "user";
  if (!PUBLIC_SELF_REGISTRATION_ROLES.includes(selfRegistrationRole)) {
    throw new BadRequestError("Invalid role for self-registration");
  }

  const userData = {
    fullName: req.body.fullName,
    email,
    password: await hashPassword(password),
    phoneNumber: req.body.phoneNumber,
    location: req.body.location,
    role: selfRegistrationRole,
  };

  if (selfRegistrationRole === "tutor") {

    // Validate subjects for tutors
    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      throw new BadRequestError("Subjects are required for tutor registration");
    }

    // Initialize tutorProfile with subjects
    userData.tutorProfile = {
      subjects: subjects.map(s => s.toLowerCase()),
      availability: "available",
      sessionCount: 0,
      rating: {
        average: 0,
        count: 0,
      },
      isVerified: false,
    };
  } else {
    // Save grade for students
    if (grade) userData.grade = grade;
  }

  const user = await User.create(userData);

  const message =
    user.role === "tutor"
      ? "Tutor registered successfully"
      : "User Created Successfully";

  res.status(StatusCodes.CREATED).json({ msg: message });
};

// Login user/tutor and set JWT token in cookie
export const login = async (req, res) => {
  const { email, password, role } = req.body || {};
  if (!email || !password) {
    throw new BadRequestError("Email and password are required");
  }

  // Optionally filter by role if provided in request
  const query = { email };
  if (role) query.role = role;

  const user = await User.findOne(query);
  const isValidUser = user && (await bcrypt.compare(password, user.password));
  if (!isValidUser) throw new UnauthenticatedError("Invalid credentials");

  const oneday = 24 * 60 * 60 * 1000;

  // Keep both keys if you have middleware expecting either `id` or `userId`
  const token = createJWT({ userId: user._id, id: user._id, role: user.role });

  res.cookie("token", token, {
    httpOnly: true,
    expires: new Date(Date.now() + oneday),
    secure: process.env.NODE_ENV === "production",
  });

  const roleMessage = user.role === "tutor" ? "Tutor logged in" : "User logged in";

  const responseData = {
    msg: roleMessage,
    token,
    user: {
      _id: user._id,
      fullName: user.fullName,
      name: user.fullName || user.email,
      email: user.email,
      phoneNumber: user.phoneNumber,
      location: user.location,
      grade: user.grade || "",
      role: user.role,
      avatar: user.avatar,
      tutorProfile: user.tutorProfile,
    },
  };
  // Fire-and-forget: send login notification email (never delays response)
  sendLoginNotificationEmail({
    fullName: user.fullName,
    email: user.email,
    role: user.role,
  });

  res.status(StatusCodes.OK).json(responseData);
};

export const logout = (req, res) => {
  res.cookie("token", "logout", {
    httpOnly: true,
    expires: new Date(Date.now()),
  });
  res.status(StatusCodes.OK).json({ msg: "User logged out" });
};

// Retained for API compatibility. Never disclose account existence or role.
export const checkEmail = async (req, res) => {
  const email =
    typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";

  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      msg: "A valid email address is required",
    });
  }

  return res.status(StatusCodes.OK).json({
    success: true,
    msg: "If the email is registered, continue with the standard sign-in or recovery flow.",
  });
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      throw new BadRequestError("User ID not found in request");
    }

    const { fullName, email, phoneNumber, location, grade, tutorProfile } = req.body;

    if (!fullName && !email && !phoneNumber && !location && !grade && !tutorProfile) {
      throw new BadRequestError("At least one field must be provided to update");
    }

    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (email) updateData.email = email;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (location) updateData.location = location;
    if (grade !== undefined) updateData.grade = grade;
    if (tutorProfile) updateData.tutorProfile = tutorProfile;

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      throw new NotFoundError("User not found");
    }

    res.status(StatusCodes.OK).json({
      msg: "Profile updated successfully",
      user: {
        _id: updatedUser._id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber,
        location: updatedUser.location,
        grade: updatedUser.grade || "",
        role: updatedUser.role,
        avatar: updatedUser.avatar,
        tutorProfile: updatedUser.tutorProfile,
      },
    });
  } catch (error) {
    logSafeError("profile_update_failed", error, {
      statusCode: error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
    });
    
    if (error.code === 11000) {
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        msg: "Email already exists",
      });
    }
    
    // Return proper error response with details
    const statusCode = error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
    const errorMsg = publicErrorMessage(error, "Failed to update profile");
    
    res.status(statusCode).json({
      success: false,
      msg: errorMsg,
    });
  }
};

// Create a new admin user (only existing admins can create new admins)
export const createAdmin = async (req, res) => {
  try {
    const { email, password, fullName, phoneNumber, location } = req.body;

    // Validate required fields
    if (!email || !password || !fullName || !phoneNumber || !location) {
      throw new BadRequestError(
        "Email, password, full name, phone number, and location are all required"
      );
    }
    if (!meetsPasswordPolicy(password)) {
      throw new BadRequestError(PASSWORD_POLICY_MESSAGE);
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new BadRequestError("Email already exists");
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new admin user
    const adminUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
      phoneNumber,
      location,
      role: "admin",
    });

    logSafeEvent("admin_account_created", { outcome: "success" });

    res.status(StatusCodes.CREATED).json({
      msg: "Admin account created successfully",
      admin: {
        _id: adminUser._id,
        fullName: adminUser.fullName,
        email: adminUser.email,
        phoneNumber: adminUser.phoneNumber,
        location: adminUser.location,
        role: adminUser.role,
      },
    });
  } catch (error) {
    logSafeError("admin_account_creation_failed", error, {
      statusCode: error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
    });

    if (error.code === 11000) {
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        msg: "Email already exists",
      });
    }

    const statusCode = error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
    const errorMsg = publicErrorMessage(error, "Failed to create admin account");

    res.status(statusCode).json({
      success: false,
      msg: errorMsg,
    });
  }
};

// Setup initial admin if no admin exists (only works if there are zero admins)
export const setupInitialAdmin = async (req, res) => {
  try {
    const { email, password, fullName, phoneNumber, location } = req.body;

    // Validate required fields
    if (!email || !password || !fullName || !phoneNumber || !location) {
      throw new BadRequestError(
        "Email, password, full name, phone number, and location are all required"
      );
    }
    if (!meetsPasswordPolicy(password)) {
      throw new BadRequestError(PASSWORD_POLICY_MESSAGE);
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new BadRequestError("Email already exists");
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new admin user
    const adminUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
      phoneNumber,
      location,
      role: "admin",
    });

    logSafeEvent("initial_admin_account_created", { outcome: "success" });

    res.status(StatusCodes.CREATED).json({
      msg: "Admin account created successfully",
      admin: {
        _id: adminUser._id,
        fullName: adminUser.fullName,
        email: adminUser.email,
        phoneNumber: adminUser.phoneNumber,
        location: adminUser.location,
        role: adminUser.role,
      },
    });
  } catch (error) {
    logSafeError("initial_admin_setup_failed", error, {
      statusCode: error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
    });

    if (error.code === 11000) {
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        msg: "Email already exists",
      });
    }

    const statusCode = error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
    const errorMsg = publicErrorMessage(error, "Failed to create admin account");

    res.status(statusCode).json({
      success: false,
      msg: errorMsg,
    });
  }
};

// Get current authenticated user
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -resetPasswordToken -resetPasswordExpiry');
    
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        msg: 'User not found',
      });
    }

    res.status(StatusCodes.OK).json({
      _id: user._id,
      fullName: user.fullName,
      name: user.fullName || user.email,
      email: user.email,
      phoneNumber: user.phoneNumber,
      location: user.location,
      grade: user.grade || "",
      role: user.role,
      avatar: user.avatar,
      tutorProfile: user.tutorProfile,
    });
  } catch (error) {
    logSafeError("current_user_fetch_failed", error, {
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    });
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      msg: 'Failed to fetch user',
    });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    // Only admins can fetch all users
    if (req.user.role !== 'admin') {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        msg: 'Only admins can access this resource',
      });
    }

    const { role, search } = req.query;
    let query = {};

    // Filter by role if provided
    if (role && ['user', 'tutor', 'admin'].includes(role)) {
      query.role = role;
    }

    // Search by name or email
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query).select('-password -resetPasswordToken -resetPasswordExpiry').sort({ createdAt: -1 });

    res.status(StatusCodes.OK).json({
      success: true,
      count: users.length,
      users: users.map(user => ({
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        location: user.location,
        role: user.role,
        avatar: user.avatar,
        tutorProfile: user.tutorProfile,
        createdAt: user.createdAt,
      })),
    });
  } catch (error) {
    logSafeError("user_list_fetch_failed", error, {
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    });
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      msg: 'Failed to fetch users',
    });
  }
};

// Delete a user (admin only)
export const deleteUser = async (req, res) => {
  try {
    // Only admins can delete users
    if (req.user.role !== 'admin') {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        msg: 'Only admins can delete users',
      });
    }

    const { userId } = req.params;

    // Validate userId
    if (!userId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        msg: 'User ID is required',
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        msg: 'User not found',
      });
    }

    // Prevent deleting the only admin
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount === 1) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          msg: 'Cannot delete the only admin user',
        });
      }
    }

    // Cascade delete associated study materials
    await StudyMaterial.deleteMany({ uploadedBy: userId });

    // Delete the user
    await User.findByIdAndDelete(userId);

    res.status(StatusCodes.OK).json({
      success: true,
      msg: 'User deleted successfully',
    });
  } catch (error) {
    logSafeError("user_deletion_failed", error, {
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    });
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      msg: 'Failed to delete user',
    });
  }
};

// Upload or update user avatar
export const uploadAvatar = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!req.file) {
      throw new BadRequestError("Please upload an image file");
    }
    
    // req.file.path is the full Cloudinary HTTPS URL (set by CloudinaryStorage)
    const avatarUrl = req.file.path;
    
    const updatedUser = await User.findByIdAndUpdate(
      userId, 
      { avatar: avatarUrl }, 
      { new: true, runValidators: true }
    );
    
    if (!updatedUser) {
      throw new NotFoundError("User not found");
    }
    
    res.status(StatusCodes.OK).json({
      success: true,
      msg: "Profile picture updated successfully",
      avatar: avatarUrl,
      user: {
        _id: updatedUser._id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        role: updatedUser.role,
      }
    });
  } catch (error) {
    logSafeError("avatar_upload_failed", error, {
      statusCode: error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
    });
    const statusCode = error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
    res.status(statusCode).json({
      success: false,
      msg: publicErrorMessage(error, "Failed to update profile picture"),
    });
  }
};

// Delete own profile
export const deleteMyProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Prevent deleting the only admin
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          msg: "Cannot delete the only admin user account",
        });
      }
    }

    // Delete the user
    await User.findByIdAndDelete(userId);
    
    // Clear the auth cookie so user is logged out
    res.cookie("token", "logout", {
      httpOnly: true,
      expires: new Date(Date.now()),
    });

    res.status(StatusCodes.OK).json({
      success: true,
      msg: "Your profile has been deleted successfully",
    });
  } catch (error) {
    logSafeError("profile_deletion_failed", error, {
      statusCode: error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
    });
    const statusCode = error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
    res.status(statusCode).json({
      success: false,
      msg: publicErrorMessage(error, 'Failed to delete profile'),
    });
  }
};

// Remove user avatar (reset to default)
export const removeAvatar = async (req, res) => {
  try {
    const userId = req.user._id;
    // Clear the avatar — frontend will fall back to UI-avatars initials
    const defaultAvatar = "";

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { avatar: defaultAvatar },
      { new: true }
    );

    if (!updatedUser) throw new NotFoundError("User not found");

    res.status(StatusCodes.OK).json({
      success: true,
      msg: "Profile picture removed successfully",
      avatar: defaultAvatar,
    });
  } catch (error) {
    logSafeError("avatar_removal_failed", error, {
      statusCode: error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
    });
    const statusCode = error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
    res.status(statusCode).json({
      success: false,
      msg: publicErrorMessage(error, "Failed to remove profile picture"),
    });
  }
};

// ─── FORGOT PASSWORD ────────────────────────────────────────────────────────
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) throw new BadRequestError("Email is required");

  const user = await User.findOne({ email });

  // Always respond the same way to prevent email enumeration
  const genericMsg = "If that email exists, a reset link has been sent.";

  if (!user) {
    return res.status(StatusCodes.OK).json({ msg: genericMsg });
  }

  // Generate a random token
  const rawToken = crypto.randomBytes(32).toString("hex");
  // Store only the hash in DB (security best practice)
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  await user.save();

  // Build the reset URL pointing to the frontend
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${rawToken}`;

  await sendPasswordResetEmail({
    fullName: user.fullName,
    email: user.email,
    resetUrl,
  });

  res.status(StatusCodes.OK).json({ msg: genericMsg });
};

// ─── RESET PASSWORD ─────────────────────────────────────────────────────────
export const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!token) throw new BadRequestError("Reset token is required");
  if (!meetsPasswordPolicy(password)) {
    throw new BadRequestError(PASSWORD_POLICY_MESSAGE);
  }

  // Hash the raw token from the URL to compare with DB
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpiry: { $gt: new Date() }, // must not be expired
  });

  if (!user) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      msg: "Reset link is invalid or has expired. Please request a new one.",
    });
  }

  // Update password and clear reset token
  user.password = await hashPassword(password);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpiry = undefined;
  await user.save();

  // Send confirmation email (fire-and-forget)
  sendPasswordChangedEmail({ fullName: user.fullName, email: user.email });

  res.status(StatusCodes.OK).json({
    success: true,
    msg: "Password reset successfully. You can now log in with your new password.",
  });
};

