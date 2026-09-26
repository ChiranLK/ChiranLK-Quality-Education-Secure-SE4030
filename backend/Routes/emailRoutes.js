import express from "express";
import { sendTestEmail } from "../Controllers/emailController.js";
import { protect, authorizePermissions } from "../Middleware/authMiddleware.js";

const router = express.Router();

// GET /api/email/test-email
// V7-FIX: Only admins can trigger a test email. Before: no authentication required.
router.get("/test-email", protect, authorizePermissions("admin"), sendTestEmail);

export default router;