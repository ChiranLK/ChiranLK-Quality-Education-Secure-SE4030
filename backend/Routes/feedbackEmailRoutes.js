import express from "express";
import { sendFeedbackNotification } from "../Controllers/feedbackEmailController.js";
import { protect } from "../Middleware/authMiddleware.js";

const router = express.Router();

// POST /api/email/feedback-notify
// V7-FIX: Require authentication. Before: anonymous callers could send admin notification
//         emails with arbitrary content (email spam / identity spoofing).
// After:  Only authenticated users can submit feedback notifications.
router.post("/feedback-notify", protect, sendFeedbackNotification);

export default router;