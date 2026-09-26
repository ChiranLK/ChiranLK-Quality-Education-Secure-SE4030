import { Router } from "express";
import {
  startGoogleSignIn,
  handleGoogleCallback,
  exchangeLoginCode,
} from "../Controllers/googleAuthController.js";
import { asyncHandler } from "../Middleware/asyncHandler.js";

const router = Router();

// "Sign in with Google" – OpenID Connect Authorization Code flow + PKCE
// 1) Browser goes here; we create state/nonce/PKCE and redirect to Google
router.get("/start", asyncHandler(startGoogleSignIn));

// 2) Google redirects back here with ?code&state
router.get("/callback", asyncHandler(handleGoogleCallback));

// 3) Frontend swaps the one-time login code for a JWT
router.post("/exchange", asyncHandler(exchangeLoginCode));

export default router;
