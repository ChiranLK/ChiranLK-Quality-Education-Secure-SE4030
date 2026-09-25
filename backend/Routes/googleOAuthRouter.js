import { Router } from "express";
import {
  getGoogleAuthUrl,
  handleGoogleCallback,
  exchangeLoginCode,
} from "../Controllers/googleAuthController.js";
import { asyncHandler } from "../Middleware/asyncHandler.js";

const router = Router();

// Swap the one-time login code for a JWT
router.post("/exchange", asyncHandler(exchangeLoginCode));

// Get Google OAuth URL for sign-in/sign-up
router.get("/auth-url", asyncHandler(getGoogleAuthUrl));

// Google OAuth callback (GET - receives code from Google)
router.get("/callback", asyncHandler(handleGoogleCallback));

export default router;
